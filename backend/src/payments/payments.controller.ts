import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { RecordPaymentDto } from './payments.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('FINANCE_MANAGEMENT')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN ? requestedSchoolId || user?.schoolId : user?.schoolId;
  }

  @Post('payments/record')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FINANCE)
  @Permissions('finance:payments:record')
  async recordPayment(@Body() dto: RecordPaymentDto, @Request() req: any) {
    try {
      const result = await this.paymentsService.recordPayment(req.user, { ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
      return { success: true, ...result };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to record payment');
    }
  }

  @Post('payments/:paymentId/reverse')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FINANCE)
  @Permissions('finance:payments:reverse')
  async reversePayment(@Param('paymentId') paymentId: string, @Body() body: { schoolId: string; reason?: string }, @Request() req: any) {
    try {
      const result = await this.paymentsService.reversePayment(req.user, this.resolveSchoolId(req.user, body.schoolId), paymentId, body.reason);
      return { success: true, ...result };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to reverse payment');
    }
  }

  @Get('payments')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE, Role.REGISTRAR)
  @Permissions('finance:reports:read')
  async getAllPayments(@Query('schoolId') schoolId: string, @Request() req: any) {
    const result = await this.paymentsService.getAllPayments(this.resolveSchoolId(req.user, schoolId));
    return { success: true, ...result };
  }
}
