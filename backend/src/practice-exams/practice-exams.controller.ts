import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { PracticeExamsService } from './practice-exams.service';

@Controller('practice-exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PracticeExamsController {
  constructor(private readonly service: PracticeExamsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  listAdmin(@Request() req, @Query() query: any) {
    return this.service.listAdmin(req.user.schoolId, query, req.user.id, req.user.role);
  }

  @Get('teacher/submissions')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  listTeacherSubmissions(@Request() req, @Query() query: any) {
    return this.service.listTeacherSubmissions(req.user.schoolId, req.user.id, req.user.role, query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  createExam(@Request() req, @Body() body: any) {
    return this.service.createExam(req.user.schoolId, req.user.id, body, req.user.role);
  }

  @Get(':examId')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  getExam(@Request() req, @Param('examId') examId: string) {
    return this.service.getAdminExam(req.user.schoolId, examId, req.user.id, req.user.role);
  }

  @Patch(':examId')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  updateExam(@Request() req, @Param('examId') examId: string, @Body() body: any) {
    return this.service.updateExam(req.user.schoolId, examId, body, req.user.id, req.user.role);
  }

  @Delete(':examId')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  deleteExam(@Request() req, @Param('examId') examId: string) {
    return this.service.deleteExam(req.user.schoolId, examId, req.user.id, req.user.role);
  }

  @Post(':examId/questions')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  addQuestion(@Request() req, @Param('examId') examId: string, @Body() body: any) {
    return this.service.addQuestion(req.user.schoolId, examId, body, req.user.id, req.user.role);
  }

  @Post(':examId/questions/import')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  importQuestions(@Request() req, @Param('examId') examId: string, @Body() body: { csv: string }) {
    return this.service.importQuestions(req.user.schoolId, examId, body.csv || '', req.user.id, req.user.role);
  }

  @Patch(':examId/questions/:questionId')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  updateQuestion(@Request() req, @Param('examId') examId: string, @Param('questionId') questionId: string, @Body() body: any) {
    return this.service.updateQuestion(req.user.schoolId, examId, questionId, body, req.user.id, req.user.role);
  }

  @Delete(':examId/questions/:questionId')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  deleteQuestion(@Request() req, @Param('examId') examId: string, @Param('questionId') questionId: string) {
    return this.service.deleteQuestion(req.user.schoolId, examId, questionId, req.user.id, req.user.role);
  }

  @Get(':examId/results')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.TEACHER)
  getResults(@Request() req, @Param('examId') examId: string) {
    return this.service.getExamResults(req.user.schoolId, examId, req.user.id, req.user.role);
  }

  @Get('student/available/list')
  @Roles(Role.STUDENT)
  listAvailable(@Request() req) {
    return this.service.listAvailableForStudent(req.user.schoolId, req.user.id);
  }

  @Post('student/:examId/start')
  @Roles(Role.STUDENT)
  startAttempt(@Request() req, @Param('examId') examId: string, @Body() body: any) {
    return this.service.startAttempt(req.user.schoolId, req.user.id, examId, body.accessCode);
  }

  @Get('student/attempts/:attemptId')
  @Roles(Role.STUDENT)
  getAttempt(@Request() req, @Param('attemptId') attemptId: string) {
    return this.service.getAttemptForStudent(req.user.schoolId, req.user.id, attemptId);
  }

  @Post('student/attempts/:attemptId/autosave')
  @Roles(Role.STUDENT)
  autosave(@Request() req, @Param('attemptId') attemptId: string, @Body() body: any) {
    return this.service.autosave(req.user.schoolId, req.user.id, attemptId, body.answers || []);
  }

  @Post('student/attempts/:attemptId/submit')
  @Roles(Role.STUDENT)
  submit(@Request() req, @Param('attemptId') attemptId: string, @Body() body: any) {
    return this.service.submitAttempt(req.user.schoolId, req.user.id, attemptId, body.answers || []);
  }
}
