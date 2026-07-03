import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { Role } from '../auth/types/role.enum';
import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('FINANCE_MANAGEMENT')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN
      ? requestedSchoolId || user?.schoolId
      : user?.schoolId;
  }

  @Get('reports/daily')
  @Roles(Role.FINANCE, Role.ADMIN, Role.IT_MANAGER)
  @Permissions('finance:reports:read')
  async dailyReport(@Query() query: ReportQueryDto, @Request() req: any) {
    const result = await this.reportsService.dailyCollectionReport({
      ...query,
      schoolId: this.resolveSchoolId(req.user, query.schoolId),
    });
    return { success: true, ...result };
  }

  @Get('reports/monthly')
  @Roles(Role.FINANCE, Role.ADMIN, Role.IT_MANAGER)
  @Permissions('finance:reports:read')
  async monthlyReport(
    @Query('schoolId') schoolId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Request() req: any,
  ) {
    const result = await this.reportsService.monthlyRevenueReport(
      this.resolveSchoolId(req.user, schoolId),
      Number(month),
      Number(year),
    );
    return { success: true, ...result };
  }

  @Get('reports/outstanding')
  @Roles(Role.FINANCE, Role.ADMIN, Role.IT_MANAGER)
  @Permissions('finance:reports:read')
  async outstanding(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
    @Query('calendarType') calendarType?: 'ETHIOPIAN' | 'GREGORIAN',
    @Request() req?: any,
  ) {
    const result = await this.reportsService.outstandingBalancesReport(
      this.resolveSchoolId(req?.user, schoolId),
      academicYearId,
      termId,
      calendarType,
    );
    return { success: true, ...result };
  }

  @Post('fees/mark-overdue')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:student_fees:generate')
  async markOverdue(
    @Body() body: { schoolId: string; academicYearId: string; termId?: string },
    @Request() req: any,
  ) {
    const result = await this.reportsService.markOverdueFees(
      this.resolveSchoolId(req.user, body.schoolId),
      body.academicYearId,
      body.termId,
    );
    return { success: true, ...result };
  }

  @Get('reports/overdue')
  @Roles(Role.FINANCE, Role.ADMIN, Role.IT_MANAGER)
  @Permissions('finance:reports:read')
  async overdueReport(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
    @Request() req?: any,
  ) {
    const result = await this.reportsService.getOverdueFeesReport(
      this.resolveSchoolId(req?.user, schoolId),
      academicYearId,
      termId,
    );
    return { success: true, ...result };
  }

  @Get('audit-logs')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:reports:read')
  async auditLogs(
    @Query('schoolId') schoolId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any,
  ) {
    const result = await this.reportsService.getAuditLogs(
      this.resolveSchoolId(req?.user, schoolId),
      entityType,
      entityId,
      limit ? Number(limit) : undefined,
      from,
      to,
    );
    return { success: true, data: result };
  }

  @Get('reports/student/:studentId/history')
  @Roles(Role.FINANCE, Role.ADMIN, Role.IT_MANAGER)
  @Permissions('finance:reports:read')
  async studentHistory(
    @Param('studentId') studentId: string,
    @Query('schoolId') schoolId: string,
    @Request() req?: any,
  ) {
    const result = await this.reportsService.paymentHistoryForStudent(
      this.resolveSchoolId(req?.user, schoolId),
      studentId,
    );
    return { success: true, ...result };
  }
}
