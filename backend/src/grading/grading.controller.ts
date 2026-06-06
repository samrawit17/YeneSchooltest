import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GradingService } from './grading.service';
import {
  CreateGradeDto,
  UpdateGradeDto,
  BulkGradeEntryDto,
  GradeFilterDto,
  ApproveGradeDto,
  GradingComponentDto,
  GradeScaleDto,
  TeacherAssignmentDto,
} from './dto/grading.dto';
import { Role } from '../auth/types/role.enum';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

const CSV_FILE_TYPES = new Set([
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

function csvFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (CSV_FILE_TYPES.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new BadRequestException('File must be a CSV file'), false);
}

interface AuthRequest {
  user: {
    id: string;
    role: string;
    schoolId: string;
  };
}

@Controller('grading')
@UseGuards(AuthGuard('jwt'), RolesGuard, SubscriptionGuard)
@RequiresFeature('GRADE_MANAGEMENT')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  // ==================== TEACHER ENDPOINTS ====================

  /**
   * Get teacher's assigned subjects for grade entry
   */
  @Get('teacher/assignments')
  @Roles(Role.TEACHER)
  async getTeacherAssignments(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
  ) {
    return this.gradingService.getTeacherAssignments(
      req.user.id,
      req.user.schoolId,
      academicYear,
    );
  }

  /**
   * Get students for grade entry
   */
  @Get('teacher/students')
  @Roles(Role.TEACHER)
  async getStudentsForGradeEntry(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
    @Query('termId') termId: string,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
    @Query('subjectId') subjectId: string,
  ) {
    return this.gradingService.getStudentsForGradeEntry(
      req.user.id,
      req.user.schoolId,
      academicYear,
      termId,
      classId,
      sectionId,
      subjectId,
    );
  }

  /**
   * Enter grade for a student
   */
  @Post('teacher/grades')
  @Roles(Role.TEACHER)
  async enterGrade(@Request() req: AuthRequest, @Body() dto: CreateGradeDto) {
    return this.gradingService.enterGrade(req.user.id, req.user.schoolId, dto);
  }

  /**
   * Bulk enter grades for multiple students
   */
  @Post('teacher/grades/bulk')
  @Roles(Role.TEACHER)
  async bulkEnterGrades(
    @Request() req: AuthRequest,
    @Body() dto: BulkGradeEntryDto,
  ) {
    return this.gradingService.bulkEnterGrades(
      req.user.id,
      req.user.schoolId,
      dto,
    );
  }

  /**
   * Bulk upload grades from CSV file
   */
  @Post('teacher/grades/bulk-csv')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: csvFileFilter,
    }),
  )
  async bulkUploadFromCsv(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: {
      academicYear: string;
      termId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      assessmentType: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    
    const csvData = file.buffer.toString('utf-8');
    return this.gradingService.bulkUploadFromCsv(req.user.id, req.user.schoolId, {
      csvData,
      ...dto,
    });
  }

  /**
   * Download CSV template for grade entry
   */
  @Get('teacher/grades/template')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TEACHER)
  async downloadTemplate(
    @Request() req: AuthRequest,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
    @Query('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.gradingService.generateGradeTemplate(
      req.user.id,
      req.user.schoolId,
      classId,
      sectionId,
      subjectId,
      academicYear,
    );
  }

  /**
   * Save grade as draft
   */
  @Put('teacher/grades/:id/draft')
  @Roles(Role.TEACHER)
  async saveDraft(@Request() req: AuthRequest, @Param('id') gradeId: string) {
    return this.gradingService.saveDraft(req.user.id, req.user.schoolId, gradeId);
  }

  /**
   * Submit grade to registrar
   */
  @Put('teacher/grades/:id/submit')
  @Roles(Role.TEACHER)
  async submitToRegistrar(
    @Request() req: AuthRequest,
    @Param('id') gradeId: string,
  ) {
    return this.gradingService.submitToRegistrar(
      req.user.id,
      req.user.schoolId,
      gradeId,
    );
  }

  /**
   * Submit all grades for a subject to registrar
   */
  @Post('teacher/grades/submit-all')
  @Roles(Role.TEACHER)
  async submitAllToRegistrar(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
    @Query('termId') termId: string,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
    @Query('subjectId') subjectId: string,
  ) {
    return this.gradingService.submitAllToRegistrar(
      req.user.id,
      req.user.schoolId,
      academicYear,
      termId,
      classId,
      sectionId,
      subjectId,
    );
  }

  // ==================== REGISTRAR ENDPOINTS ====================

  /**
   * Get submitted grades for review
   */
  @Get('registrar/review')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async getGradesForReview(
    @Request() req: AuthRequest,
    @Query() filter: GradeFilterDto,
  ) {
    return this.gradingService.getGradesForReview(req.user.schoolId, filter);
  }

  /**
   * Get assessment scores for review
   */
  @Get('registrar/assessments')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async getAssessmentScoresForReview(
    @Request() req: AuthRequest,
    @Query() filter: GradeFilterDto,
  ) {
    return this.gradingService.getAssessmentScoresForReview(req.user.schoolId, filter);
  }

  /**
   * Review a grade (approve/reject)
   */
  @Put('registrar/grades/:id/review')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async reviewGrade(
    @Request() req: AuthRequest,
    @Param('id') gradeId: string,
    @Body() dto: ApproveGradeDto,
  ) {
    return this.gradingService.reviewGrade(
      req.user.id,
      req.user.schoolId,
      gradeId,
      dto,
    );
  }

  /**
   * Bulk approve grades
   */
  @Post('registrar/grades/bulk-approve')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async bulkApproveGrades(
    @Request() req: AuthRequest,
    @Body('gradeIds') gradeIds: string[],
  ) {
    return this.gradingService.bulkApproveGrades(
      req.user.id,
      req.user.schoolId,
      gradeIds,
    );
  }

  /**
   * Bulk reject grades
   */
  @Post('registrar/grades/bulk-reject')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async bulkRejectGrades(
    @Request() req: AuthRequest,
    @Body() body: { gradeIds: string[]; comment: string },
  ) {
    return this.gradingService.bulkRejectGrades(
      req.user.id,
      req.user.schoolId,
      body.gradeIds,
      body.comment,
    );
  }

  /**
   * Get subject performance report
   */
  @Get('registrar/reports/subject')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async getSubjectPerformanceReport(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
    @Query('termId') termId: string,
    @Query('subjectId') subjectId: string,
  ) {
    return this.gradingService.getSubjectPerformanceReport(
      req.user.schoolId,
      academicYear,
      termId,
      subjectId,
    );
  }

  /**
   * Get class summary report
   */
  @Get('registrar/reports/class')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async getClassSummaryReport(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
    @Query('termId') termId: string,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
  ) {
    return this.gradingService.getClassSummaryReport(
      req.user.schoolId,
      academicYear,
      termId,
      classId,
      sectionId,
    );
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Get own grades
   */
  @Get('student/grades')
  @Roles(Role.STUDENT)
  async getStudentGrades(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear?: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradingService.getStudentGrades(
      req.user.id,
      req.user.schoolId,
      academicYear,
      termId,
    );
  }

  // ==================== PARENT ENDPOINTS ====================

  /**
   * Get child's grades with analysis (GPA, ranking, curriculum periods)
   */
  @Get('parent/grades/:studentId')
  @Roles(Role.PARENT)
  async getChildGradesWithAnalysis(
    @Request() req: AuthRequest,
    @Param('studentId') childId: string,
    @Query('academicYear') academicYear?: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradingService.getChildGradesWithAnalysis(
      req.user.id,
      childId,
      req.user.schoolId,
      academicYear,
      termId,
    );
  }

  /**
   * Calculate rankings for curriculum period (usually called when term ends)
   */
  @Post('admin/calculate-rankings')
  @RequiresFeature('STUDENT_RANKINGS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async calculateRankings(
    @Request() req: AuthRequest,
    @Body()
    body: {
      academicYearId: string;
      termId?: string;
      classId?: string;
      sectionId?: string;
    },
  ) {
    return this.gradingService.calculatePeriodRankings(
      body.academicYearId,
      body.termId,
      body.classId,
      body.sectionId,
    );
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create grading components
   */
  @Post('admin/grading-components')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async createGradingComponents(
    @Request() req: AuthRequest,
    @Body() dto: GradingComponentDto[],
  ) {
    return this.gradingService.createGradingComponents(req.user.schoolId, dto);
  }

  /**
   * Get grading components
   */
  @Get('admin/grading-components')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  async getGradingComponents(@Request() req: AuthRequest) {
    return this.gradingService.getGradingComponents(req.user.schoolId);
  }

  /**
   * Get assessment types config (for teachers - lightweight version)
   */
  @Get('teacher/assessment-types')
  @Roles(Role.TEACHER)
  async getTeacherAssessmentTypes(@Request() req: AuthRequest) {
    return this.gradingService.getAssessmentTypes(req.user.schoolId);
  }

  /**
   * Get grading components for parents viewing published report cards
   */
  @Get('parent/grading-components')
  @Roles(Role.PARENT)
  async getParentGradingComponents(@Request() req: AuthRequest) {
    return this.gradingService.getGradingComponents(req.user.schoolId);
  }

  /**
   * Get assessment types config (admin only)
   */
  @Get('admin/assessment-types')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async getAssessmentTypes(@Request() req: AuthRequest) {
    return this.gradingService.getAssessmentTypes(req.user.schoolId);
  }

  /**
   * Create assessment types config (admin only)
   */
  @Post('admin/assessment-types')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async createAssessmentTypes(
    @Request() req: AuthRequest,
    @Body() dto: { code: string; name: string; percentage: number }[],
  ) {
    return this.gradingService.createAssessmentTypes(req.user.schoolId, dto);
  }

  /**
   * Create grade scale
   */
  @Post('admin/grade-scales')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async createGradeScales(
    @Request() req: AuthRequest,
    @Body() dto: GradeScaleDto[],
  ) {
    return this.gradingService.createGradeScales(req.user.schoolId, dto);
  }

  /**
   * Get grade scale
   */
  @Get('admin/grade-scales')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async getGradeScale(@Request() req: AuthRequest) {
    return this.gradingService.getGradeScale(req.user.schoolId);
  }

  /**
   * Assign teacher to subject/class/section
   */
  @Post('admin/teacher-assignments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async assignTeacher(@Request() req: AuthRequest, @Body() dto: TeacherAssignmentDto) {
    return this.gradingService.assignTeacher(req.user.schoolId, dto);
  }

  /**
   * Remove teacher assignment
   */
  @Delete('admin/teacher-assignments/:id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async removeTeacherAssignment(
    @Request() req: AuthRequest,
    @Param('id') assignmentId: string,
  ) {
    return this.gradingService.removeTeacherAssignment(
      req.user.schoolId,
      assignmentId,
    );
  }

  /**
   * Student: View final aggregated grades with period breakdown
   * Dynamically calculates based on curriculum type and period weights
   */
  @Get('student/final-grades')
  @Roles(Role.STUDENT, Role.ADMIN, Role.IT_MANAGER, Role.TEACHER, Role.SUPER_ADMIN)
  async getStudentFinalGrades(
    @Request() req: any,
    @Query('academicYear') academicYear: string,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
  ) {
    const targetStudentId =
      req.user.role === Role.STUDENT ? req.user.id : studentId;
    if (!targetStudentId) {
      throw new BadRequestException(
        'studentId is required for non-student users',
      );
    }

    return this.gradingService.getStudentFinalGrades(
      targetStudentId,
      req.user.schoolId,
      academicYear,
      classId,
      req.user.role === Role.STUDENT,
    );
  }

  /**
   * Parent: View child's final aggregated grades with period breakdown
   */
  @Get('parent/final-grades/:studentId')
  @Roles(Role.PARENT, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async getChildFinalGrades(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @Query('classId') classId?: string,
  ) {
    if (req.user.role === Role.PARENT) {
      return this.gradingService.getChildFinalGradesWithClass(
        req.user.id,
        studentId,
        req.user.schoolId,
        academicYear,
        classId,
      );
    }

    return this.gradingService.getStudentFinalGrades(
      studentId,
      req.user.schoolId,
      academicYear,
      classId,
      false,
    );
  }

  /**
   * Calculate final grade for a specific subject
   */
  @Get('subject/final-grade')
  @Roles(Role.TEACHER, Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER)
  async calculateSubjectFinalGrade(
    @Request() req: AuthRequest,
    @Query('studentId') studentId: string,
    @Query('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.gradingService.calculateFinalGrade(
      studentId,
      req.user.schoolId,
      subjectId,
      academicYear,
    );
  }

  /**
   * Verify student financial clearance - check if student can receive grades
   * Returns whether student has any outstanding fees
   */
  @Get('student/financial-clearance')
  @Roles(
    Role.STUDENT,
    Role.PARENT,
    Role.ADMIN, Role.IT_MANAGER,
    Role.TEACHER,
    Role.REGISTRAR,
    Role.FINANCE,
  )
  async verifyFinancialClearance(
    @Request() req: AuthRequest,
    @Query('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @Query('termId') termId?: string,
    @Query('checkOverdueOnly') checkOverdueOnly: string = 'true',
  ) {
    // For students/parents, verify they can only check their own
    if (req.user.role === Role.STUDENT) {
      studentId = req.user.id;
    }
    if (req.user.role === Role.PARENT) {
      // Verify parent-child relationship
      const isParent = await this.gradingService.verifyParentChild(
        req.user.id,
        studentId,
        req.user.schoolId,
      );
      if (!isParent) {
        throw new ForbiddenException(
          'Not authorized to view this student records',
        );
      }
    }
    return this.gradingService.verifyFinancialClearance(
      studentId,
      req.user.schoolId,
      academicYear,
      termId,
      checkOverdueOnly === 'true',
    );
  }

  // ==================== ADMIN - ENTRY PROGRESS ====================

/**
   * Get mark entry progress - percentage of grades entered per subject/class
   */
  @Get('admin/entry-progress')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.REGISTRAR)
  async getEntryProgress(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
    @Query('term') term: string,
  ) {
    return this.gradingService.getEntryProgress(
      req.user.schoolId,
      academicYear,
      term,
    );
  }

  /**
   * Send reminder to teachers who haven't completed grade entry
   */
  @Post('admin/send-reminder')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async sendReminder(
    @Request() req: AuthRequest,
    @Body() body: { academicYear: string; term: string },
  ) {
    return this.gradingService.sendReminder(
      req.user.schoolId,
      body.academicYear,
      body.term,
    );
  }

  // ==================== ADMIN - PUBLISH RESULTS ====================

  /**
   * Get publish checklist - assessments ready to be published
   */
  @Get('admin/publish-checklist')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.REGISTRAR)
  async getPublishChecklist(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
    @Query('term') term: string,
  ) {
    return this.gradingService.getPublishChecklist(
      req.user.schoolId,
      academicYear,
      term,
    );
  }

  /**
   * Bulk publish results to students and parents
   */
  @Post('admin/bulk-publish')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async bulkPublish(
    @Request() req: AuthRequest,
    @Body() body: { assessmentIds: string[]; notifyParents: boolean },
  ) {
    return this.gradingService.bulkPublish(
      req.user.schoolId,
      body.assessmentIds,
      body.notifyParents,
    );
  }

  /**
   * Get promotion list - students with promotion recommendations
   */
  @Get('admin/promotion-list')
  @RequiresFeature('STUDENT_PROMOTION')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.REGISTRAR)
  async getPromotionList(
    @Request() req: AuthRequest,
    @Query('academicYear') academicYear: string,
  ) {
    return this.gradingService.getPromotionList(req.user.schoolId, academicYear);
  }

  // ==================== ADMIN - PROMOTION ENGINE ====================

  /**
   * Override promotion recommendation for a student
   */
  @Post('admin/promotion-override')
  @RequiresFeature('STUDENT_PROMOTION')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async overridePromotion(
    @Request() req: AuthRequest,
    @Body() body: { studentId: string; recommendation: string },
  ) {
    return this.gradingService.overridePromotion(
      req.user.schoolId,
      body.studentId,
      body.recommendation,
    );
  }

  /**
   * Confirm promotions for the academic year
   */
  @Post('admin/confirm-promotions')
  @RequiresFeature('STUDENT_PROMOTION')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async confirmPromotions(
    @Request() req: AuthRequest,
    @Body() body: { academicYear: string; notifyParents: boolean },
  ) {
    return this.gradingService.confirmPromotions(
      req.user.schoolId,
      body.academicYear,
      body.notifyParents,
    );
  }

  /**
   * Bulk confirm all promotions
   */
  @Post('admin/bulk-confirm-promotions')
  @RequiresFeature('STUDENT_PROMOTION')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async bulkConfirmPromotions(
    @Request() req: AuthRequest,
    @Body() body: { academicYear: string; notifyParents: boolean },
  ) {
    return this.gradingService.bulkConfirmPromotions(
      req.user.schoolId,
      body.academicYear,
      body.notifyParents,
    );
  }
}
