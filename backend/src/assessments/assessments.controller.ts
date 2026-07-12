import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/types/role.enum';
import { AssessmentsService } from './assessments.service';
import {
  AddAssessmentSubjectsDto,
  CreateAssessmentDto,
  ListAssessmentsFilterDto,
  SaveAssessmentScoresDto,
  UpdateAssessmentDto,
  UpdateAssessmentWeightsDto,
} from './dto/assessments.dto';

interface AuthRequest {
  user: {
    id: string;
    role: string;
    schoolId: string;
  };
}

@Controller('assessments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('teacher/me')
  @Roles(Role.TEACHER)
  async getTeacherAssessments(
    @Request() req: AuthRequest,
    @Query() query: ListAssessmentsFilterDto,
  ) {
    return this.assessmentsService.getTeacherAssessments(
      req.user.id,
      req.user.schoolId,
      query,
    );
  }

  @Get('subjects/:id/score-entry')
  @Roles(Role.TEACHER, Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async getScoreEntry(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.assessmentsService.getScoreEntry(
      req.user.id,
      req.user.role,
      req.user.schoolId,
      id,
    );
  }

  @Post('subjects/:id/scores')
  @Roles(Role.TEACHER, Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async saveScores(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: SaveAssessmentScoresDto,
  ) {
    return this.assessmentsService.saveScores(
      req.user.id,
      req.user.role,
      req.user.schoolId,
      id,
      dto,
    );
  }

  @Get('student/upcoming')
  @Roles(Role.STUDENT)
  async getStudentUpcoming(
    @Request() req: AuthRequest,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.assessmentsService.getStudentUpcoming(
      req.user.id,
      req.user.schoolId,
      academicYearId,
    );
  }

  @Get('student/results')
  @Roles(Role.STUDENT)
  async getStudentResults(
    @Request() req: AuthRequest,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.assessmentsService.getStudentResults(
      req.user.id,
      req.user.schoolId,
      academicYearId,
      termId,
    );
  }

  @Get('parent/child/:childId/upcoming')
  @Roles(Role.PARENT)
  async getParentUpcoming(
    @Request() req: AuthRequest,
    @Param('childId') childId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.assessmentsService.getParentUpcoming(
      req.user.id,
      childId,
      req.user.schoolId,
      academicYearId,
    );
  }

  @Get('parent/child/:childId/results')
  @Roles(Role.PARENT)
  async getParentResults(
    @Request() req: AuthRequest,
    @Param('childId') childId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.assessmentsService.getParentResults(
      req.user.id,
      childId,
      req.user.schoolId,
      academicYearId,
      termId,
    );
  }

  @Get('registrar/missing-marks')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async getMissingMarks(
    @Request() req: AuthRequest,
    @Query() query: ListAssessmentsFilterDto,
  ) {
    return this.assessmentsService.getMissingMarks(req.user.schoolId, query);
  }

  @Get('config/weights')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.REGISTRAR)
  async getWeights(@Request() req: AuthRequest) {
    return this.assessmentsService.getWeights(req.user.schoolId);
  }

  @Put('config/weights')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async updateWeights(
    @Request() req: AuthRequest,
    @Body() dto: UpdateAssessmentWeightsDto,
  ) {
    return this.assessmentsService.updateWeights(req.user.schoolId, dto);
  }

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  async createAssessment(
    @Request() req: AuthRequest,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.createAssessment(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      dto,
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.REGISTRAR)
  async listAssessments(
    @Request() req: AuthRequest,
    @Query() query: ListAssessmentsFilterDto,
  ) {
    return this.assessmentsService.listAssessments(req.user.schoolId, query);
  }

  @Delete('clear')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async clearAssessments(@Request() req: AuthRequest) {
    return this.assessmentsService.clearAssessments(req.user.schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.REGISTRAR, Role.TEACHER)
  async getAssessmentById(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.assessmentsService.getAssessmentById(req.user.schoolId, id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async updateAssessment(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessmentsService.updateAssessment(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  @Post(':id/subjects')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  async addSubjects(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: AddAssessmentSubjectsDto,
  ) {
    return this.assessmentsService.addSubjects(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  @Post(':id/lock')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async lockAssessment(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.assessmentsService.lockAssessment(req.user.schoolId, id);
  }

  @Post(':id/unlock')
  @Roles(Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN)
  async unlockAssessment(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.assessmentsService.unlockAssessment(req.user.schoolId, id);
  }
}
