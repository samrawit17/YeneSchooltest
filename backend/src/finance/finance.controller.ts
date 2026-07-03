import {
  Controller,
  Post,
  Get,
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
import { DiscountPolicyService } from '../discount-policy/discount-policy.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import {
  CalculateInstallmentFeesDto,
  GenerateInstallmentFeesDto,
} from './dto/finance.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('FINANCE_MANAGEMENT')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly discountPolicyService: DiscountPolicyService,
  ) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN
      ? requestedSchoolId || user?.schoolId
      : user?.schoolId;
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
   * Get billing configuration for a school.
   */
  @Get('billing-config')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getBillingConfig(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Request() req: any,
  ) {
    const config = await this.financeService.getBillingConfig(
      this.resolveSchoolId(req.user, schoolId),
      academicYearId,
    );
    return { success: true, data: config };
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
    const config = await this.financeService.getBillingConfig(
      this.resolveSchoolId(req.user, schoolId),
    );
    const modeLabels: Record<string, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMESTERLY: 'Semesterly',
      TERMLY: 'Termly',
      YEARLY: 'Full Year',
    };
    return {
      success: true,
      data: {
        mode: config.billingMode,
        modeLabel: modeLabels[config.billingMode] || config.billingMode,
        installmentCount: config.billingPeriodsPerYear,
        curriculumType: config.curriculumType,
      },
    };
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
    const result = await this.discountPolicyService.applyToStudentFee(
      studentFeeId,
      body.discountPolicyId,
      req.user.schoolId,
    );
    return { success: true, data: result };
  }
}
