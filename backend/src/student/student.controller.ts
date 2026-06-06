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
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentService } from './student.service';
import type {
  CreateStudentDto,
  UpdateStudentDto,
  ApproveEnrollmentDto,
  AssignClassDto,
} from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import type { Response } from 'express';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

const IMAGE_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const STUDENT_DOCUMENT_FILE_TYPES = new Set([
  ...IMAGE_FILE_TYPES,
  'application/pdf',
]);

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (IMAGE_FILE_TYPES.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new BadRequestException('File must be a JPG, PNG, or WEBP image'), false);
}

function studentDocumentFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (STUDENT_DOCUMENT_FILE_TYPES.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(
    new BadRequestException('Document must be a PDF, JPG, PNG, or WEBP file'),
    false,
  );
}

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:create')
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @Request() req,
  ) {
    const createdById = req.user.id;
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School context is required');
    }

    return this.studentService.createStudent(
      { ...createStudentDto, schoolId },
      createdById,
    );
  }

  // FIXED: Handle classId param for attendance/offline cache (proxies ClassService.getStudentsByClass)
  @Get()
  @Permissions('student:read')
  async getStudents(
    @Request() req,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('section') section?: string,
    @Query('status') status?: string,
    @Query('grade') grade?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('rollNumber') rollNumber?: string,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School context is required');
    }

    if (classId) {
      // Attendance/offline cache: delegate to ClassService for exact same logic as my-class page
      return this.studentService.getStudentsByClassProxy(
        classId,
        sectionId || section,
        search,
        {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 50,
        },
        schoolId,
      );
    }

    // Original student list logic
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const filters = {
      status: status as any,
      grade: grade ? parseInt(grade) : undefined,
      section: section || sectionId,
    };
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };
    return this.studentService.getStudents(
      schoolId,
      filters,
      pagination,
      requesterId,
      requesterRole,
      search,
      rollNumber,
    );
  }

  @Get('id-cards')
  @RequiresFeature('STUDENT_ID_CARDS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async getStudentsForIdCards(
    @Request() req,
    @Query('grade') grade?: string,
    @Query('section') section?: string,
    @Query('academicYear') academicYear?: string,
    @Query('search') search?: string,
    @Query('studentIds') studentIds?: string,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.getStudentsForIdCards(schoolId, {
      grade,
      section,
      academicYear,
      search,
      studentIds: studentIds
        ? studentIds.split(',').filter(Boolean)
        : undefined,
    });
  }

  @Get('id-cards/template')
  @RequiresFeature('STUDENT_ID_CARDS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async getIdCardTemplate(@Request() req) {
    return this.studentService.getIdCardTemplate(req.user.schoolId);
  }

  @Put('id-cards/template')
  @RequiresFeature('STUDENT_ID_CARDS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async saveIdCardTemplate(@Request() req, @Body() body: { template: Record<string, any> }) {
    return this.studentService.saveIdCardTemplate(req.user.schoolId, body.template || {});
  }

  @Post('id-cards/template/watermark')
  @RequiresFeature('STUDENT_ID_CARDS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadIdCardWatermark(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Watermark image is required');
    }
    const url = await this.studentService.uploadIdCardWatermark(req.user.schoolId, file);
    return { url };
  }

  @Get('id-cards/:studentId/pdf')
  @RequiresFeature('STUDENT_ID_CARDS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async generateIdCardPdf(
    @Request() req,
    @Param('studentId') studentId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.studentService.generateIdCardPdf(req.user.schoolId, studentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="id-card-${studentId}.pdf"`);
    res.send(pdf);
  }

  @Post('id-cards/bulk-pdf')
  @RequiresFeature('STUDENT_ID_CARDS')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async generateIdCardsBulkPdf(
    @Request() req,
    @Body() body: { studentIds: string[] },
    @Res() res: Response,
  ) {
    const zip = await this.studentService.generateIdCardBulkZip(
      req.user.schoolId,
      body.studentIds || [],
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="id-cards.zip"');
    res.send(zip);
  }

  @Get(':id')
  @Permissions('student:read')
  async getStudentById(@Param('id') studentId: string, @Request() req) {
    const schoolId = req.user.schoolId;
    return this.studentService.getStudentById(studentId, schoolId);
  }

  @Put(':id')
  @Permissions('student:update')
  async updateStudent(
    @Param('id') studentId: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.updateStudent(
      studentId,
      schoolId,
      updateStudentDto,
    );
  }

  @Get('me/class')
  @Roles(Role.STUDENT)
  @Permissions('timetable:read')
  async getMyClassAssignment(@Request() req) {
    const schoolId = req.user.schoolId;
    return this.studentService.getMyClassAssignment(req.user.id, schoolId);
  }

  @Get('homeroom/me')
  @Roles(Role.TEACHER, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  @Permissions('student:read')
  async getMyHomeroomStudents(@Request() req) {
    const schoolId = req.user.schoolId;
    const teacherId = req.user.id;
    const requesterRole = req.user.role;
    return this.studentService.getStudentsByHomeroomTeacher(
      schoolId,
      teacherId,
      requesterRole,
    );
  }

  @Get('enrollments/pending')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async getPendingEnrollments(@Request() req) {
    const schoolId = req.user.schoolId;
    return this.studentService.getPendingEnrollments(schoolId);
  }

  @Post('enrollments/:id/approve')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async approveEnrollment(
    @Param('id') enrollmentId: string,
    @Body() approveData: ApproveEnrollmentDto,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.approveEnrollment(
      enrollmentId,
      schoolId,
      approveData,
    );
  }

  @Post('enrollments/:id/reject')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async rejectEnrollment(
    @Param('id') enrollmentId: string,
    @Body('rejectionReason') rejectionReason: string,
    @Request() req,
  ) {
    if (!rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }
    const schoolId = req.user.schoolId;
    return this.studentService.rejectEnrollment(
      enrollmentId,
      schoolId,
      rejectionReason,
    );
  }

  // REGISTRAR: Assign/Update class for student
  @Post(':id/assign-class')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  async assignClass(
    @Param('id') studentId: string,
    @Body() assignData: AssignClassDto,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.assignClass(studentId, schoolId, assignData);
  }

  // REGISTRAR: Upload documents for student
  @Post(':id/documents')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  async uploadDocuments(
    @Param('id') studentId: string,
    @Body('documents') documents: any[],
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.uploadDocuments(studentId, schoolId, documents);
  }

  @Delete(':id/documents/:documentKey')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  async deleteDocument(
    @Param('id') studentId: string,
    @Param('documentKey') documentKey: string,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.deleteDocument(studentId, schoolId, documentKey);
  }

  @Post(':id/documents/file')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: studentDocumentFileFilter,
    }),
  )
  async uploadDocumentFile(
    @Param('id') studentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; type?: string; description?: string },
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.uploadDocumentFile(studentId, schoolId, file, body);
  }
}
