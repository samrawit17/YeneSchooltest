import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateFeeStructureDto,
  UpdateFeeStructureDto,
  GenerateStudentFeesDto,
  StudentFeesQueryDto,
  RecordPaymentDto,
  ReportQueryDto,
  CalculateInstallmentFeesDto,
  GenerateInstallmentFeesDto,
} from './dto/finance.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN
      ? requestedSchoolId || user?.schoolId
      : user?.schoolId;
  }

  @Post('fee-structures')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async createFeeStructure(@Body() dto: CreateFeeStructureDto, @Request() req: any) {
    const fs = await this.financeService.createFeeStructure({
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, data: fs };
  }

  @Get('fee-structures')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async listFeeStructures(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
    @Request() req?: any,
  ) {
    const data = await this.financeService.listFeeStructures(
      this.resolveSchoolId(req?.user, schoolId),
      academicYearId,
      termId,
    );
    return { success: true, data };
  }

  @Put('fee-structures/:id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:update')
  async updateFeeStructure(
    @Param('id') id: string,
    @Body('schoolId') schoolId: string,
    @Body() dto: UpdateFeeStructureDto,
    @Request() req: any,
  ) {
    const fs = await this.financeService.updateFeeStructure(
      id,
      this.resolveSchoolId(req.user, schoolId),
      dto,
    );
    return { success: true, data: fs };
  }

  @Delete('fee-structures/:id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:delete')
  async deleteFeeStructure(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    const fs = await this.financeService.deleteFeeStructure(
      id,
      this.resolveSchoolId(req.user, schoolId),
    );
    return { success: true, data: fs };
  }

  @Delete('fee-structures')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:delete')
  async clearFeeStructures(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Request() req?: any,
  ) {
    const result = await this.financeService.deleteFeeStructuresBySchool(
      this.resolveSchoolId(req?.user, schoolId),
      academicYearId,
    );
    return { success: true, data: result };
  }

  @Post('student-fees/generate')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.FINANCE)
  @Permissions('finance:student_fees:generate')
  async generateStudentFees(@Body() dto: GenerateStudentFeesDto, @Request() req: any) {
    const result = await this.financeService.generateStudentFees({
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, ...result };
  }

  @Get('student-fees')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE, Role.REGISTRAR)
  @Permissions('finance:student_fees:read')
  async listStudentFees(@Query() query: StudentFeesQueryDto, @Request() req: any) {
    const result = await this.financeService.getStudentFees({
      ...query,
      schoolId: this.resolveSchoolId(req.user, query.schoolId),
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return { success: true, ...result };
  }

  @Post('payments/record')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FINANCE)
  @Permissions('finance:payments:record')
  async recordPayment(@Body() dto: RecordPaymentDto, @Request() req: any) {
    try {
      const result = await this.financeService.recordPayment(req.user, dto);
      return { success: true, ...result };
    } catch (error: any) {
      // Logging removed for production
      throw new BadRequestException(
        error.message || 'Failed to record payment',
      );
    }
  }

  @Post('payments/:paymentId/reverse')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FINANCE)
  @Permissions('finance:payments:reverse')
  async reversePayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { schoolId: string; reason?: string },
    @Request() req: any,
  ) {
    try {
      const result = await this.financeService.reversePayment(
        req.user,
        this.resolveSchoolId(req.user, body.schoolId),
        paymentId,
        body.reason,
      );
      return { success: true, ...result };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to reverse payment',
      );
    }
  }

  @Post('reminders/period-fees')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:student_fees:read')
  async sendPeriodFeeReminders(
    @Body() body: { schoolId: string; termId: string },
    @Request() req: any,
  ) {
    try {
      const result = await this.financeService.sendPeriodFeeReminders(
        this.resolveSchoolId(req.user, body.schoolId),
        body.termId,
      );
      return { success: true, ...result };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to send fee reminders',
      );
    }
  }

  @Get('reports/daily')
  @Roles(Role.FINANCE, Role.ADMIN, Role.IT_MANAGER)
  @Permissions('finance:reports:read')
  async dailyReport(@Query() query: ReportQueryDto, @Request() req: any) {
    const result = await this.financeService.dailyCollectionReport({
      ...query,
      schoolId: this.resolveSchoolId(req.user, query.schoolId),
    });
    return { success: true, ...result };
  }

  @Get('payments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE, Role.REGISTRAR)
  @Permissions('finance:reports:read')
  async getAllPayments(@Query('schoolId') schoolId: string, @Request() req: any) {
    const result = await this.financeService.getAllPayments(
      this.resolveSchoolId(req.user, schoolId),
    );
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
    const result = await this.financeService.monthlyRevenueReport(
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
    const result = await this.financeService.outstandingBalancesReport(
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
    const result = await this.financeService.markOverdueFees(
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
    const result = await this.financeService.getOverdueFeesReport(
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
    @Request() req?: any,
  ) {
    const result = await this.financeService.getAuditLogs(
      this.resolveSchoolId(req?.user, schoolId),
      entityType,
      entityId,
      limit ? Number(limit) : undefined,
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
    const result = await this.financeService.paymentHistoryForStudent(
      this.resolveSchoolId(req?.user, schoolId),
      studentId,
    );
    return { success: true, ...result };
  }

  // Student fee summary endpoint for parent/student portal
  @Get('student-fees/:studentId')
  @UseGuards(JwtAuthGuard)
  @Roles(
    Role.PARENT,
    Role.STUDENT,
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.FINANCE,
    Role.REGISTRAR,
    Role.SUPER_ADMIN,
  )
  async getStudentFeeSummary(
    @Param('studentId') studentId: string,
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
    @Request() req?: any,
  ) {
    const effectiveSchoolId = this.resolveSchoolId(req?.user, schoolId);
    await this.financeService.assertStudentFeeSummaryAccess(
      req?.user,
      effectiveSchoolId,
      studentId,
    );
    const result = await this.financeService.getStudentFeeSummary(
      effectiveSchoolId,
      studentId,
      academicYearId,
      termId,
    );
    return { success: true, ...result };
  }

  // Get curriculum info and terms for finance module
  @Get('curriculum-info')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getCurriculumInfo(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Request() req?: any,
  ) {
    const result = await this.financeService.getCurriculumInfo(
      this.resolveSchoolId(req?.user, schoolId),
      academicYearId,
    );
    return { success: true, ...result };
  }

  // ========================================================
  // INTELLIGENT FEE CALCULATION ENDPOINTS
  // ========================================================

  /**
   * Calculate installment fees based on school's fee collection mode
   * Returns the breakdown without creating anything
   */
  @Post('fee-calculation/installments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async calculateInstallmentFees(
    @Body() dto: CalculateInstallmentFeesDto,
    @Request() req: any,
  ) {
    const result = await this.financeService.calculateInstallmentFees({
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, ...result };
  }

  /**
   * Auto-generate installment fee structures based on school's fee collection mode
   * Creates multiple fee structures from a single annual fee
   */
  @Post('fee-structures/generate-installments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async generateInstallmentFees(
    @Body() dto: GenerateInstallmentFeesDto,
    @Request() req: any,
  ) {
    const result = await this.financeService.generateInstallmentFees({
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, ...result };
  }

  /**
   * Get fee collection mode for a school
   */
  @Get('fee-collection-mode')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getFeeCollectionMode(
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    const feeCollectionMode =
      await this.financeService.getFeeCollectionMode(
        this.resolveSchoolId(req.user, schoolId),
      );
    const modeLabels: Record<string, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMESTER: 'Semester',
      TERM: 'Term',
      YEARLY: 'Full Year',
    };
    return {
      success: true,
      data: {
        mode: feeCollectionMode,
        modeLabel: modeLabels[feeCollectionMode] || feeCollectionMode,
        installmentCount:
          await this.financeService.getInstallmentCount(feeCollectionMode),
      },
    };
  }

  // ==================== DISCOUNT POLICY ENDPOINTS ====================

  /**
   * Create a new discount policy
   */
  @Post('discount-policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async createDiscountPolicy(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      discountType: string;
      discountValue: number;
      isActive?: boolean;
      criteria?: string;
    },
  ) {
    const result = await this.financeService.createDiscountPolicy(
      req.user.schoolId,
      body,
    );
    return { success: true, data: result };
  }

  /**
   * List all discount policies
   */
  @Get('discount-policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.FINANCE)
  async listDiscountPolicies(
    @Request() req: any,
    @Query('includeInactive') includeInactive: string = 'false',
  ) {
    const result = await this.financeService.listDiscountPolicies(
      req.user.schoolId,
      includeInactive === 'true',
    );
    return { success: true, data: result };
  }

  /**
   * Update a discount policy
   */
  @Put('discount-policies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async updateDiscountPolicy(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      discountType?: string;
      discountValue?: number;
      isActive?: boolean;
      criteria?: string;
    },
  ) {
    const result = await this.financeService.updateDiscountPolicy(
      id,
      req.user.schoolId,
      body,
    );
    return { success: true, data: result };
  }

  /**
   * Delete a discount policy
   */
  @Delete('discount-policies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async deleteDiscountPolicy(@Request() req: any, @Param('id') id: string) {
    const result = await this.financeService.deleteDiscountPolicy(
      id,
      req.user.schoolId,
    );
    return { success: true, data: result };
  }

  /**
   * Apply discount policy to a student's fee
   */
  @Post('student-fees/:studentFeeId/apply-discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.FINANCE)
  async applyDiscountPolicy(
    @Request() req: any,
    @Param('studentFeeId') studentFeeId: string,
    @Body() body: { discountPolicyId: string },
  ) {
    const result = await this.financeService.applyDiscountPolicy(
      studentFeeId,
      body.discountPolicyId,
      req.user.schoolId,
    );
    return { success: true, data: result };
  }
}
