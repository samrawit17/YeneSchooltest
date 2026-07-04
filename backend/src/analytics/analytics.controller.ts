import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { Role } from '../auth/types/role.enum';
import { AnalyticsService } from './analytics.service';
import { RankingQueryDto, AnalyticsQueryDto } from './dto/analytics.dto';

const ANALYTICS_GUARDS = [JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard];
const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER];

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string): string | undefined {
    return user?.role === Role.SUPER_ADMIN ? requestedSchoolId || user?.schoolId : user?.schoolId;
  }

  // ─── Rankings ─────────────────────────────────────────────────────

  @Get('rankings/students')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER)
  @Permissions('analytics:read')
  @RequiresFeature('STUDENT_RANKINGS')
  async studentRankings(@Query() query: RankingQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.analytics.rankings.getStudentRankings(query);
  }

  @Get('rankings/classes')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('analytics:read')
  @RequiresFeature('STUDENT_RANKINGS')
  async classRankings(@Query() query: RankingQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.analytics.rankings.getClassRankings(query);
  }

  @Get('rankings/student/:id/history')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(...ADMIN_ROLES, Role.TEACHER, Role.STUDENT)
  @Permissions('analytics:read')
  @RequiresFeature('STUDENT_RANKINGS')
  async studentRankingHistory(@Param('id') id: string) {
    return this.analytics.rankings.getStudentRankingHistory(id);
  }

  // ─── Advanced Analytics ───────────────────────────────────────────

  @Get('performance-trends')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('analytics:read')
  @RequiresFeature('ADVANCED_ANALYTICS')
  async performanceTrends(@Query() query: AnalyticsQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.analytics.advanced.getPerformanceTrends(query);
  }

  @Get('attendance-analytics')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('analytics:read')
  @RequiresFeature('ADVANCED_ANALYTICS')
  async attendanceAnalytics(@Query() query: AnalyticsQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.analytics.advanced.getAttendanceAnalytics(query);
  }

  @Get('financial-analytics')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(Role.FINANCE, ...ADMIN_ROLES)
  @Permissions('analytics:read', 'finance:reports:read')
  @RequiresFeature('ADVANCED_ANALYTICS')
  async financialAnalytics(@Query() query: AnalyticsQueryDto, @Request() req: any) {
    query.schoolId = this.resolveSchoolId(req.user, query.schoolId) as string;
    return this.analytics.advanced.getFinancialAnalytics(query);
  }

  @Get('school-overview')
  @UseGuards(...ANALYTICS_GUARDS)
  @Roles(...ADMIN_ROLES)
  @Permissions('analytics:read')
  @RequiresFeature('ADVANCED_ANALYTICS')
  async schoolOverview(@Query('schoolId') schoolId: string, @Request() req: any) {
    return this.analytics.advanced.getSchoolOverview(this.resolveSchoolId(req.user, schoolId) as string);
  }
}
