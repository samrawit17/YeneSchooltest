import {
  Controller, Post, Get, Patch, Body, Query, Param, HttpCode, HttpStatus,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import {
  UpsertPayrollSalaryDto, CreatePayrollRunDto, PayrollQueryDto,
  UpdatePayrollRunStatusDto, UpdatePayrollEntryStatusDto,
} from './payroll.dto';

@Controller('finance/payroll')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('FINANCE_MANAGEMENT')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN
      ? requestedSchoolId || user?.schoolId
      : user?.schoolId;
  }

  @Get('staff')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:read')
  async payrollStaff(@Query('schoolId') schoolId: string, @Request() req: any) {
    const result = await this.payrollService.listPayrollStaff(
      this.resolveSchoolId(req.user, schoolId),
    );
    return { success: true, data: result };
  }

  @Get('salaries')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:read')
  async payrollSalaries(@Query('schoolId') schoolId: string, @Request() req: any) {
    const result = await this.payrollService.listPayrollSalaries(
      this.resolveSchoolId(req.user, schoolId),
    );
    return { success: true, data: result };
  }

  @Post('salaries')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:manage')
  async upsertPayrollSalary(@Body() dto: UpsertPayrollSalaryDto, @Request() req: any) {
    const result = await this.payrollService.upsertPayrollSalary(req.user, {
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, data: result };
  }

  @Get('runs')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:read')
  async payrollRuns(@Query() query: PayrollQueryDto, @Request() req: any) {
    const result = await this.payrollService.listPayrollRuns({
      ...query,
      schoolId: this.resolveSchoolId(req.user, query.schoolId),
    });
    return { success: true, ...result };
  }

  @Post('runs')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:manage')
  async createPayrollRun(@Body() dto: CreatePayrollRunDto, @Request() req: any) {
    const result = await this.payrollService.createPayrollRun(req.user, {
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, data: result };
  }

  @Get('runs/:id')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:read')
  async payrollRun(@Param('id') id: string, @Query('schoolId') schoolId: string, @Request() req: any) {
    const result = await this.payrollService.getPayrollRun(
      this.resolveSchoolId(req.user, schoolId), id,
    );
    return { success: true, data: result };
  }

  @Patch('runs/:id/status')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:approve', 'finance:payroll:pay')
  async updatePayrollRunStatus(@Param('id') id: string, @Body() dto: UpdatePayrollRunStatusDto, @Request() req: any) {
    const result = await this.payrollService.updatePayrollRunStatus(req.user, id, {
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, data: result };
  }

  @Patch('entries/:id/status')
  @Roles(Role.FINANCE)
  @Permissions('finance:payroll:pay')
  async updatePayrollEntryStatus(@Param('id') id: string, @Body() dto: UpdatePayrollEntryStatusDto, @Request() req: any) {
    const result = await this.payrollService.updatePayrollEntryStatus(req.user, id, {
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, data: result };
  }
}
