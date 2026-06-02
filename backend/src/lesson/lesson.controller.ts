import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto, UpdateLessonDto, LessonQueryDto } from './dto';
import {
  CreateLessonBundleDto,
  UpdateLessonBundleDto,
  SubmitHomeworkDto,
  GradeHomeworkDto,
  LessonCoverageQueryDto,
} from './dto/create-lesson-bundle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@RequiresFeature('LESSON_MANAGEMENT')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // ===== Bundle Endpoints =====

  /**
   * Create Lesson Bundle - All-in-One lesson creation
   * Includes: Lesson + Homework + Resources + Ethiopian curriculum tags
   */
  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  async createBundle(
    @Body() createLessonBundleDto: CreateLessonBundleDto,
    @Request() req,
  ) {
    return this.lessonService.createLessonBundle(
      createLessonBundleDto,
      req.user.id,
      req.user.schoolId,
    );
  }

  /**
   * Update Lesson Bundle
   */
  @Put('bundle/:id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  async updateBundle(
    @Param('id') id: string,
    @Body() updateLessonBundleDto: UpdateLessonBundleDto,
    @Request() req,
  ) {
    return this.lessonService.updateLessonBundle(
      id,
      updateLessonBundleDto,
      req.user.id,
      req.user.schoolId,
    );
  }

  // ===== HoD Workflow Endpoints =====

  /**
   * Submit lesson for review (DRAFT -> PENDING_REVIEW)
   */
  @Patch(':id/submit-review')
  @Roles(Role.TEACHER)
  async submitForReview(@Param('id') id: string, @Request() req) {
    return this.lessonService.submitForReview(
      id,
      req.user.id,
      req.user.schoolId,
    );
  }

  /**
   * Approve lesson (PENDING_REVIEW -> PUBLISHED) - HoD only
   */
  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async approveLesson(@Param('id') id: string, @Request() req) {
    return this.lessonService.approveLesson(id, req.user.id, req.user.schoolId);
  }

  /**
   * Reject lesson (PENDING_REVIEW -> DRAFT) - HoD only
   */
  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async rejectLesson(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.lessonService.rejectLesson(
      id,
      req.user.id,
      req.user.schoolId,
      reason || undefined,
    );
  }

  /**
   * Get lessons pending review (For HoD dashboard)
   */
  @Get('pending-review')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async getPendingReview(
    @Request() req,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.lessonService.getPendingReviewLessons(
      req.user.schoolId,
      departmentId,
    );
  }

  // ===== Homework Endpoints =====

  /**
   * Submit homework (Student)
   */
  @Post('homework/:homeworkId/submit')
  @Roles(Role.STUDENT)
  async submitHomework(
    @Param('homeworkId') homeworkId: string,
    @Body() submitHomeworkDto: SubmitHomeworkDto,
    @Request() req,
  ) {
    return this.lessonService.submitHomework(
      homeworkId,
      req.user.id,
      submitHomeworkDto,
    );
  }

  /**
   * Grade homework (Teacher)
   */
  @Post('submissions/:submissionId/grade')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  async gradeHomework(
    @Param('submissionId') submissionId: string,
    @Body() gradeHomeworkDto: GradeHomeworkDto,
    @Request() req,
  ) {
    return this.lessonService.gradeHomework(
      submissionId,
      req.user.id,
      gradeHomeworkDto,
    );
  }

  // ===== Lesson Coverage Report =====

  /**
   * Get Lesson Coverage Report
   */
  @Get('coverage/report')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getCoverageReport(
    @Query() query: LessonCoverageQueryDto,
    @Request() req,
  ) {
    return this.lessonService.getLessonCoverageReport(query, req.user.schoolId);
  }

  // ===== Finance Content Lock =====

  /**
   * Get lesson with content lock check (for students with outstanding fees)
   */
  @Get(':id/with-lock')
  @Roles(Role.STUDENT)
  async getLessonWithLock(@Param('id') id: string, @Request() req) {
    return this.lessonService.getLessonWithContentLock(
      id,
      req.user.id,
      req.user.schoolId,
    );
  }

  // ===== Original Endpoints (Backward Compatible) =====

  // NOTE: legacy simple create removed. Use POST /lessons with the bundle payload.

  @Get()
  async findAll(@Query() query: LessonQueryDto, @Request() req) {
    const { role, id, schoolId } = req.user;
    return this.lessonService.findAll(query, schoolId, id, role);
  }

  @Get('form-data')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  async getFormData(@Request() req) {
    const { id: teacherId, schoolId } = req.user;
    return this.lessonService.getFormData(teacherId, schoolId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const { role, id: userId, schoolId } = req.user;
    return this.lessonService.findOne(id, schoolId, role, userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  async update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Request() req,
  ) {
    return this.lessonService.update(
      id,
      updateLessonDto,
      req.user.id,
      req.user.schoolId,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  async delete(@Param('id') id: string, @Request() req) {
    const { id: userId, schoolId } = req.user;
    return this.lessonService.remove(id, userId, schoolId);
  }

  // Direct publish endpoint removed to enforce HoD review workflow.
  // Teachers should call PATCH /lessons/:id/submit-review and HoD calls PATCH /lessons/:id/approve.
}
