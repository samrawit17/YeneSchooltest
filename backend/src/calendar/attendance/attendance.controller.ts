import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceSessionDto,
  BulkMarkAttendanceDto,
  SubmitSessionDto,
  OverrideAttendanceDto,
  AttendanceQueryDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestUser } from './interfaces/attendance.interfaces';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ==================== TEACHER ENDPOINTS ====================

  /**
   * GET /attendance/today
   * Get today's timetable slots for the authenticated teacher
   */
  @Get('today')
  @Permissions('attendance:take')
  getTodayTimetable(@Request() req: any, @Query() query: AttendanceQueryDto) {
    return this.attendanceService.getTodayTimetable(
      req.user as RequestUser,
      query.date,
      query.academicYearId,
    );
  }

  /**
   * POST /attendance/session/:slotId
   * Open/create an attendance session for a timetable slot
   */
  @Post('session/:slotId')
  @Permissions('attendance:take')
  createSession(
    @Request() req: any,
    @Param('slotId') slotId: string,
    @Body() dto: CreateAttendanceSessionDto,
  ) {
    return this.attendanceService.openAttendanceSession(
      req.user as RequestUser,
      slotId,
      dto.date,
    );
  }

  /**
   * GET /attendance/students
   * Get students for a class (for attendance marking)
   */
  @Get('students')
  @Permissions('attendance:take')
  getStudentsForAttendance(
    @Request() req: any,
    @Query('classId') classId: string | undefined,
    @Query('sectionId') sectionId: string | undefined,
    @Query('className') className: string | undefined,
    @Query('section') section: string | undefined,
    @Query('date') date?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.attendanceService.getStudentsForAttendance(
      req.user as RequestUser,
      className,
      section,
      date,
      classId,
      sectionId,
      academicYearId,
    );
  }

  /**
   * GET /attendance/session/:id
   * Get a specific attendance session
   */
  @Get('session/:id')
  @Permissions('attendance:take')
  getSession(@Request() req: any, @Param('id') sessionId: string) {
    return this.attendanceService.getSession(
      sessionId,
      req.user as RequestUser,
    );
  }

  /**
   * POST /attendance/session/:sessionId/records
   * Mark attendance for multiple students
   */
  @Post('session/:sessionId/records')
  @Permissions('attendance:take')
  markAttendance(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkMarkAttendanceDto,
  ) {
    return this.attendanceService.bulkMarkAttendance(
      req.user as RequestUser,
      sessionId,
      dto.records,
    );
  }

  /**
   * PUT /attendance/session/:id/submit
   * Submit an attendance session (locks it)
   */
  @Put('session/:id/submit')
  @Permissions('attendance:take')
  submitSession(@Request() req: any, @Param('id') sessionId: string) {
    return this.attendanceService.submitSession(
      req.user as RequestUser,
      sessionId,
    );
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * GET /attendance/me
   * Get the authenticated student's own attendance
   */
  @Get('me')
  @Permissions('attendance:read')
  getMyAttendance(@Request() req: any, @Query() query: AttendanceQueryDto) {
    return this.attendanceService.getMyAttendance(req.user, query);
  }

  /**
   * GET /attendance/me/summary
   * Get attendance summary for the authenticated student
   */
  @Get('me/summary')
  @Permissions('attendance:read')
  getMySummary(@Request() req: any, @Query() query: AttendanceQueryDto) {
    return this.attendanceService.getStudentAttendanceSummary(
      req.user,
      req.user.id,
      query.startDate,
      query.endDate,
    );
  }

  // ==================== STUDENT/PARENT ENDPOINTS ====================

  /**
   * GET /attendance/student/:id
   * Get attendance for a specific student (student's own, parent's child)
   */
  @Get('student/:id')
  @Permissions('attendance:read')
  getStudentAttendance(
    @Request() req: any,
    @Param('id') studentId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getStudentAttendance(
      req.user,
      studentId,
      query,
    );
  }

  /**
   * GET /attendance/student/:id/summary
   * Get attendance summary for a specific student
   */
  @Get('student/:id/summary')
  @Permissions('attendance:read')
  getStudentSummary(
    @Request() req: any,
    @Param('id') studentId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getStudentAttendanceSummary(
      req.user,
      studentId,
      query.startDate,
      query.endDate,
    );
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * GET /attendance/sessions
   * Get all attendance sessions with filters (Admin only)
   */
  @Get('sessions')
  @Permissions('attendance:read')
  getAllSessions(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: 'NOT_SUBMITTED' | 'SUBMITTED',
    @Query('grade') grade?: string,
    @Query('section') section?: string,
  ) {
    return this.attendanceService.getAllSessions(req.user, {
      startDate,
      endDate,
      classId,
      status,
      grade,
      section,
    } as any);
  }

  /**
   * GET /attendance/summary
   * Get attendance summary (Admin only)
   */
  @Get('summary')
  @Permissions('attendance:update')
  getSummary(@Request() req: any, @Query() query: AttendanceQueryDto) {
    return this.attendanceService.getSummary(req.user, query);
  }

  /**
   * GET /attendance/missing
   * Get classes with no attendance recorded for a given date (Admin only)
   */
  @Get('missing')
  @Permissions('attendance:update')
  getMissing(
    @Request() req: any,
    @Query('date') date: string,
    @Query('grade') grade?: string,
    @Query('section') section?: string,
  ) {
    return this.attendanceService.getMissingClasses(
      req.user,
      date,
      grade,
      section,
    );
  }

  /**
   * POST /attendance/missing/notify
   * Notify homeroom teachers about missing attendance (Admin only)
   */
  @Post('missing/notify')
  @Permissions('attendance:update')
  notifyMissing(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('grade') grade?: string,
    @Query('section') section?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.attendanceService.notifyMissingAttendance(
      req.user,
      targetDate,
      grade,
      section,
    );
  }

  /**
   * POST /attendance/check-reminders
   * Manually trigger the attendance reminder check (for testing)
   */
  @Post('check-reminders')
  @Permissions('attendance:update')
  async triggerReminderCheck() {
    // Call the scheduled task directly
    await this.attendanceService.handleAttendanceReminder();
    return { message: 'Attendance reminder check completed' };
  }

  /**
   * PUT /attendance/record/:id
   * Override an attendance record (Admin only)
   */
  @Put('record/:id')
  @Permissions('attendance:update')
  overrideRecord(
    @Request() req: any,
    @Param('id') recordId: string,
    @Body() dto: OverrideAttendanceDto,
  ) {
    return this.attendanceService.overrideAttendance(req.user, recordId, dto);
  }

  // ==================== DASHBOARD ENDPOINTS ====================

  /**
   * GET /attendance/dashboard/teacher
   * Get teacher dashboard data
   */
  @Get('dashboard/teacher')
  @Permissions('attendance:take')
  getTeacherDashboard(
    @Request() req: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.attendanceService.getTeacherDashboard(
      req.user as RequestUser,
      academicYearId,
    );
  }

  /**
   * GET /attendance/dashboard/student
   * Get student dashboard data
   */
  @Get('dashboard/student')
  @Permissions('attendance:read')
  getStudentDashboard(@Request() req: any) {
    return this.attendanceService.getStudentDashboard(req.user);
  }

  /**
   * GET /attendance/dashboard/parent/:studentId
   * Get parent dashboard data for a specific child
   */
  @Get('dashboard/parent/:studentId')
  @Permissions('attendance:read')
  getParentDashboard(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    return this.attendanceService.getParentDashboard(req.user, studentId);
  }

  /**
   * GET /attendance/dashboard/admin
   * Get admin dashboard data
   */
   @Get('dashboard/admin')
   @Permissions('attendance:read')
  getAdminDashboard(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('grade') grade?: string,
    @Query('section') section?: string,
    @Query('range') range?: string,
  ) {
    return this.attendanceService.getAdminDashboard(
      req.user,
      date,
      startDate,
      endDate,
      grade,
      section,
      range,
    );
  }
}
