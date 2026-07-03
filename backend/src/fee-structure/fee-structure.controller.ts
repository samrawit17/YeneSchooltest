import {
  Controller, Post, Get, Put, Delete, Body, Query, Param, HttpCode, HttpStatus,
  UseGuards, Request,
} from '@nestjs/common';
import { FeeStructureService } from './fee-structure.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import {
  CreateFeeStructureDto, UpdateFeeStructureDto,
  CalculateInstallmentFeesDto, GenerateInstallmentFeesDto,
} from './fee-structure.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('FINANCE_MANAGEMENT')
export class FeeStructureController {
  constructor(private readonly feeStructureService: FeeStructureService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN ? requestedSchoolId || user?.schoolId : user?.schoolId;
  }

  @Post('fee-structures')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async createFeeStructure(@Body() dto: CreateFeeStructureDto, @Request() req: any) {
    const fs = await this.feeStructureService.createFeeStructure({ ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
    return { success: true, data: fs };
  }

  @Get('fee-structures')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async listFeeStructures(@Query('schoolId') schoolId: string, @Query('academicYearId') academicYearId?: string, @Query('termId') termId?: string, @Request() req?: any) {
    const data = await this.feeStructureService.listFeeStructures(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId);
    return { success: true, data };
  }

  @Put('fee-structures/:id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:update')
  async updateFeeStructure(@Param('id') id: string, @Body('schoolId') schoolId: string, @Body() dto: UpdateFeeStructureDto, @Request() req: any) {
    const fs = await this.feeStructureService.updateFeeStructure(id, this.resolveSchoolId(req.user, schoolId), dto);
    return { success: true, data: fs };
  }

  @Delete('fee-structures/:id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:delete')
  async deleteFeeStructure(@Param('id') id: string, @Query('schoolId') schoolId: string, @Request() req: any) {
    const fs = await this.feeStructureService.deleteFeeStructure(id, this.resolveSchoolId(req.user, schoolId));
    return { success: true, data: fs };
  }

  @Delete('fee-structures')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:delete')
  async clearFeeStructures(@Query('schoolId') schoolId: string, @Query('academicYearId') academicYearId?: string, @Request() req?: any) {
    const result = await this.feeStructureService.deleteFeeStructuresBySchool(this.resolveSchoolId(req?.user, schoolId), academicYearId);
    return { success: true, data: result };
  }

  @Post('fee-calculation/installments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async calculateInstallmentFees(@Body() dto: CalculateInstallmentFeesDto, @Request() req: any) {
    const result = await this.feeStructureService.calculateInstallmentFees({ ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
    return { success: true, ...result };
  }

  @Post('fee-structures/generate-installments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:create')
  async generateInstallmentFees(@Body() dto: GenerateInstallmentFeesDto, @Request() req: any) {
    const result = await this.feeStructureService.generateInstallmentFees({ ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
    return { success: true, ...result };
  }

  @Get('billing-config')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getBillingConfig(@Query('schoolId') schoolId: string, @Query('academicYearId') academicYearId: string, @Request() req: any) {
    const config = await this.feeStructureService.getBillingConfig(this.resolveSchoolId(req.user, schoolId), academicYearId);
    return { success: true, data: config };
  }

  @Get('fee-collection-mode')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getFeeCollectionMode(@Query('schoolId') schoolId: string, @Request() req: any) {
    const config = await this.feeStructureService.getBillingConfig(this.resolveSchoolId(req.user, schoolId));
    const modeLabels: Record<string, string> = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', SEMESTERLY: 'Semesterly', TERMLY: 'Termly', YEARLY: 'Full Year' };
    return { success: true, data: { mode: config.billingMode, modeLabel: modeLabels[config.billingMode] || config.billingMode, installmentCount: config.billingPeriodsPerYear, curriculumType: config.curriculumType } };
  }

  @Get('curriculum-info')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE)
  @Permissions('finance:fee_structure:read')
  async getCurriculumInfo(@Query('schoolId') schoolId: string, @Query('academicYearId') academicYearId: string, @Request() req?: any) {
    const result = await this.feeStructureService.getCurriculumInfo(this.resolveSchoolId(req?.user, schoolId), academicYearId);
    return { success: true, ...result };
  }
}
