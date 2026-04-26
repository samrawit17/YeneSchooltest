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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExamsService } from './exams.service';
import {
  CreateExamDto,
  UpdateExamDto,
  BulkExamResultDto,
  GetExamsFilterDto,
} from './dto/exams.dto';
import { Role } from '../auth/types/role.enum';

interface AuthRequest {
  user: {
    id: string;
    role: string;
    schoolId: string;
  };
}

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ==================== ADMIN ENDPOINTS ====================
  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async createExam(@Request() req: AuthRequest, @Body() dto: CreateExamDto) {
    return this.examsService.createExam(req.user.schoolId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.REGISTRAR)
  async getExams(@Request() req: AuthRequest, @Query() query: GetExamsFilterDto) {
    return this.examsService.getExams(req.user.schoolId, query);
  }

  // ==================== TEACHER ENDPOINTS (static routes before :id) ====================
  @Get('teacher/me')
  @Roles(Role.TEACHER)
  async getTeacherExams(
    @Request() req: AuthRequest,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.examsService.getTeacherExams(req.user.id, req.user.schoolId, {
      academicYearId,
      termId,
    });
  }

  // ==================== STUDENT ENDPOINTS (static routes before :id) ====================
  @Get('student/upcoming')
  @Roles(Role.STUDENT)
  async getMyUpcomingExams(@Request() req: AuthRequest) {
    return this.examsService.getStudentExams(req.user.id, req.user.schoolId);
  }

  @Get('student/results')
  @Roles(Role.STUDENT)
  async getMyResults(@Request() req: AuthRequest) {
    return this.examsService.getStudentResults(req.user.id, req.user.schoolId);
  }

  // ==================== PARENT ENDPOINTS (static routes before :id) ====================
  @Get('parent/child/:childId/upcoming')
  @Roles(Role.PARENT)
  async getChildUpcomingExams(
    @Request() req: AuthRequest,
    @Param('childId') childId: string,
  ) {
    await this.examsService.verifyParentChild(req.user.id, childId, req.user.schoolId);
    return this.examsService.getStudentExams(childId, req.user.schoolId);
  }

  @Get('parent/child/:childId/results')
  @Roles(Role.PARENT)
  async getChildResults(
    @Request() req: AuthRequest,
    @Param('childId') childId: string,
  ) {
    await this.examsService.verifyParentChild(req.user.id, childId, req.user.schoolId);
    return this.examsService.getStudentResults(childId, req.user.schoolId);
  }

  // ==================== FORM DATA ENDPOINTS (static routes before :id) ====================
  @Get('form-data/assessment')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAssessmentFormData(
    @Request() req: AuthRequest,
    @Query() query: any,
  ) {
    return this.examsService.getFormData(
      req.user.schoolId,
      query.academicYearId,
    );
  }

  @Post('publish')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async publishTermResults(
    @Request() req: AuthRequest,
    @Body() body: { academicYear: string; termId: string; classId: string },
  ) {
    return this.examsService.publishTermResults(req.user.schoolId, body);
  }

  @Post(':id/results')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  async enterExamResults(
    @Request() req: AuthRequest,
    @Param('id') examId: string,
    @Body() dto: BulkExamResultDto,
  ) {
    return this.examsService.enterExamResults(
      req.user.id,
      req.user.schoolId,
      examId,
      dto,
    );
  }

  // ==================== PARAMETERIZED ROUTES (after static ones) ====================
  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  async getExamById(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.examsService.getExamById(req.user.schoolId, id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async updateExam(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(req.user.schoolId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async deleteExam(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.examsService.deleteExam(req.user.schoolId, id);
  }
}
