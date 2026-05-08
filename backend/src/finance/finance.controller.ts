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

  @Post('fee-structures')
  @Roles(Role.ADMIN, Role.FINANCE)
  async createFeeStructure(@Body() dto: CreateFeeStructureDto) {
    const fs = await this.financeService.createFeeStructure(dto);
    return { success: true, data: fs };
  }

  @Get('fee-structures')
  @Roles(Role.ADMIN, Role.FINANCE)
  async listFeeStructures(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
  ) {
    const data = await this.financeService.listFeeStructures(
      schoolId,
      academicYearId,
      termId,
    );
    return { success: true, data };
  }

  @Put('fee-structures/:id')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fee_structure:update')
  async updateFeeStructure(
    @Param('id') id: string,
    @Body('schoolId') schoolId: string,
    @Body() dto: UpdateFeeStructureDto,
  ) {
    const fs = await this.financeService.updateFeeStructure(id, schoolId, dto);
    return { success: true, data: fs };
  }

  @Delete('fee-structures/:id')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fee_structure:delete')
  async deleteFeeStructure(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
  ) {
    const fs = await this.financeService.deleteFeeStructure(id, schoolId);
    return { success: true, data: fs };
  }

  @Post('student-fees/generate')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.FINANCE)
  async generateStudentFees(@Body() dto: GenerateStudentFeesDto) {
    const result = await this.financeService.generateStudentFees(dto);
    return { success: true, ...result };
  }

  @Get('student-fees')
  @Roles(Role.ADMIN, Role.FINANCE, Role.REGISTRAR)
  async listStudentFees(@Query() query: StudentFeesQueryDto) {
    const result = await this.financeService.getStudentFees({
      ...query,
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

  @Get('reports/daily')
  @Roles(Role.FINANCE, Role.ADMIN)
  @Permissions('finance:reports:read')
  async dailyReport(@Query() query: ReportQueryDto) {
    const result = await this.financeService.dailyCollectionReport(query);
    return { success: true, ...result };
  }

  @Get('payments')
  @Roles(Role.ADMIN, Role.FINANCE, Role.REGISTRAR)
  async getAllPayments(@Query('schoolId') schoolId: string) {
    const result = await this.financeService.getAllPayments(schoolId);
    return { success: true, ...result };
  }

  @Get('reports/monthly')
  @Roles(Role.FINANCE, Role.ADMIN)
  @Permissions('finance:reports:read')
  async monthlyReport(
    @Query('schoolId') schoolId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const result = await this.financeService.monthlyRevenueReport(
      schoolId,
      Number(month),
      Number(year),
    );
    return { success: true, ...result };
  }

  @Get('reports/outstanding')
  @Roles(Role.FINANCE, Role.ADMIN)
  @Permissions('finance:reports:read')
  async outstanding(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
  ) {
    const result = await this.financeService.outstandingBalancesReport(
      schoolId,
      academicYearId,
      termId,
    );
    return { success: true, ...result };
  }

  @Post('fees/mark-overdue')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fees:update')
  async markOverdue(
    @Body() body: { schoolId: string; academicYearId: string; termId?: string },
  ) {
    const result = await this.financeService.markOverdueFees(
      body.schoolId,
      body.academicYearId,
      body.termId,
    );
    return { success: true, ...result };
  }

  @Get('reports/overdue')
  @Roles(Role.FINANCE, Role.ADMIN)
  @Permissions('finance:reports:read')
  async overdueReport(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
  ) {
    const result = await this.financeService.getOverdueFeesReport(
      schoolId,
      academicYearId,
      termId,
    );
    return { success: true, ...result };
  }

  @Get('audit-logs')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:reports:read')
  async auditLogs(
    @Query('schoolId') schoolId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: number,
  ) {
    const result = await this.financeService.getAuditLogs(
      schoolId,
      entityType,
      entityId,
      limit ? Number(limit) : undefined,
    );
    return { success: true, data: result };
  }

  @Get('reports/student/:studentId/history')
  @Roles(Role.FINANCE, Role.ADMIN)
  @Permissions('finance:reports:read')
  async studentHistory(
    @Param('studentId') studentId: string,
    @Query('schoolId') schoolId: string,
  ) {
    const result = await this.financeService.paymentHistoryForStudent(
      schoolId,
      studentId,
    );
    return { success: true, ...result };
  }

  // Student fee summary endpoint for parent/student portal
  @Get('student-fees/:studentId')
  @UseGuards(JwtAuthGuard)
  async getStudentFeeSummary(
    @Param('studentId') studentId: string,
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
  ) {
    const result = await this.financeService.getStudentFeeSummary(
      schoolId,
      studentId,
      academicYearId,
      termId,
    );
    return { success: true, ...result };
  }

  // Get curriculum info and terms for finance module
  @Get('curriculum-info')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getCurriculumInfo(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    const result = await this.financeService.getCurriculumInfo(
      schoolId,
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
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async calculateInstallmentFees(@Body() dto: CalculateInstallmentFeesDto) {
    const result = await this.financeService.calculateInstallmentFees(dto);
    return { success: true, ...result };
  }

  /**
   * Auto-generate installment fee structures based on school's fee collection mode
   * Creates multiple fee structures from a single annual fee
   */
  @Post('fee-structures/generate-installments')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async generateInstallmentFees(@Body() dto: GenerateInstallmentFeesDto) {
    const result = await this.financeService.generateInstallmentFees(dto);
    return { success: true, ...result };
  }

  /**
   * Get fee collection mode for a school
   */
  @Get('fee-collection-mode')
  @Roles(Role.ADMIN, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getFeeCollectionMode(@Query('schoolId') schoolId: string) {
    const feeCollectionMode =
      await this.financeService.getFeeCollectionMode(schoolId);
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.FINANCE)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.FINANCE)
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
