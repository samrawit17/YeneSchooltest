import { Controller, Get, Post, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { Role } from '../auth/types/role.enum';
import { ReportsService } from './reports.service';
import { PerformanceReportQuery, AttendanceReportQuery, FinanceReportQuery, ReportQueryDto } from './dto/reports.dto';

const REPORTS_GUARDS = [JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard];
const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER];

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string): string | undefined {
    return user?.role === Role.SUPER_ADMIN ? requestedSchoolId || user?.schoolId : user?.schoolId;
  }

  // ─── Academic Reports ─────────────────────────────────────────────

  @Get('academic/performance')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER, Role.TEACHER)
  @Permissions('reports:read')
  @RequiresFeature('GRADE_MANAGEMENT')
  async academicPerformance(@Query() query: PerformanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.academic.getPerformanceReport(query);
  }

  @Get('academic/exam-results')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER)
  @Permissions('reports:read')
  @RequiresFeature('EXAM_MANAGEMENT')
  async examResults(@Query() query: PerformanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.academic.getExamResultsReport(query);
  }

  @Get('academic/assessment-scores')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER)
  @Permissions('reports:read')
  @RequiresFeature('GRADE_MANAGEMENT')
  async assessmentScores(@Query() query: PerformanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.academic.getAssessmentScoresReport(query);
  }

  @Get('academic/report-cards')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER)
  @Permissions('reports:read')
  @RequiresFeature('REPORT_CARDS')
  async reportCards(@Query() query: PerformanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.academic.getReportCardsReport(query);
  }

  // ─── Attendance Reports ───────────────────────────────────────────

  @Get('attendance/summary')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER)
  @Permissions('reports:read')
  @RequiresFeature('ATTENDANCE_TRACKING')
  async attendanceSummary(@Query() query: AttendanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.attendance.getAttendanceSummary(query);
  }

  @Get('attendance/trends')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('reports:read')
  @RequiresFeature('ATTENDANCE_TRACKING')
  async attendanceTrends(@Query() query: AttendanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.attendance.getAttendanceTrends(query);
  }

  // ─── Student Reports ──────────────────────────────────────────────

  @Get('student/demographics')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.REGISTRAR)
  @Permissions('reports:read')
  @RequiresFeature('USER_MANAGEMENT')
  async studentDemographics(@Query() query: ReportQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.student.getDemographicsReport(query);
  }

  @Get('student/enrollment-trends')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.REGISTRAR)
  @Permissions('reports:read')
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  async enrollmentTrends(@Query() query: ReportQueryDto, @Request() req: any) {
    const schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.student.getEnrollmentTrends({ ...query, schoolId });
  }

  @Get('student/:id')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER, Role.REGISTRAR)
  @Permissions('reports:read')
  async studentDetail(@Param('id') id: string, @Request() req: any) {
    return this.reports.student.getStudentDetail(id);
  }

  // ─── Teacher Reports ──────────────────────────────────────────────

  @Get('teacher/performance')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('reports:read')
  @RequiresFeature('GRADE_MANAGEMENT')
  async teacherPerformance(@Query() query: ReportQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.teacher.getTeacherPerformanceReport(query);
  }

  @Get('teacher/leaderboard')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('reports:read')
  @RequiresFeature('ADVANCED_ANALYTICS')
  async teacherLeaderboard(@Query('schoolId') schoolId: string, @Request() req: any) {
    return this.reports.teacher.getTeacherLeaderboard(this.resolveSchoolId(req.user, schoolId) as string);
  }

  // ─── Discipline Reports ──────────────────────────────────────────

  @Get('discipline/incidents')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('reports:read')
  @RequiresFeature('DISCIPLINE_MANAGEMENT')
  async disciplineIncidents(@Query() query: ReportQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.discipline.getDisciplineReport(query);
  }

  @Get('discipline/trends')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('reports:read')
  @RequiresFeature('DISCIPLINE_MANAGEMENT')
  async disciplineTrends(@Query() query: ReportQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.discipline.getDisciplineTrends(query);
  }

  // ─── Finance Reports ─────────────────────────────────────────────

  @Get('finance/daily')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(Role.FINANCE, ...ADMIN_ROLES)
  @Permissions('finance:reports:read')
  @RequiresFeature('FINANCE_MANAGEMENT')
  async dailyFinance(@Query() query: FinanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.finance.getDailyCollection(query);
  }

  @Get('finance/monthly')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(Role.FINANCE, ...ADMIN_ROLES)
  @Permissions('finance:reports:read')
  @RequiresFeature('FINANCE_MANAGEMENT')
  async monthlyFinance(@Query() query: FinanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.finance.getMonthlyRevenue(query);
  }

  @Get('finance/outstanding')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(Role.FINANCE, ...ADMIN_ROLES)
  @Permissions('finance:reports:read')
  @RequiresFeature('FINANCE_MANAGEMENT')
  async outstandingFinance(@Query() query: FinanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.finance.getOutstandingBalances(query);
  }

  @Get('finance/overdue')
  @UseGuards(...REPORTS_GUARDS)
  @Roles(Role.FINANCE, ...ADMIN_ROLES)
  @Permissions('finance:reports:read')
  @RequiresFeature('FINANCE_MANAGEMENT')
  async overdueFinance(@Query() query: FinanceReportQuery, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.reports.finance.getOverdueFees(query);
  }
}
