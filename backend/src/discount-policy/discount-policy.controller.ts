import { Controller, Get, Post, Put, Delete, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { DiscountPolicyService } from './discount-policy.service';

@Controller('finance/discount-policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountPolicyController {
  constructor(private readonly discountPolicyService: DiscountPolicyService) {}

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async create(@Request() req: any, @Body() body: { name: string; discountType: string; discountValue: number; isActive?: boolean; criteria?: string }) {
    const result = await this.discountPolicyService.create(req.user.schoolId, body);
    return { success: true, data: result };
  }

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.FINANCE)
  async list(@Request() req: any, @Query('includeInactive') includeInactive: string = 'false') {
    const result = await this.discountPolicyService.list(req.user.schoolId, includeInactive === 'true');
    return { success: true, data: result };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async update(@Request() req: any, @Param('id') id: string, @Body() body: { name?: string; discountType?: string; discountValue?: number; isActive?: boolean; criteria?: string }) {
    const result = await this.discountPolicyService.update(id, req.user.schoolId, body);
    return { success: true, data: result };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async delete(@Request() req: any, @Param('id') id: string) {
    const result = await this.discountPolicyService.delete(id, req.user.schoolId);
    return { success: true, data: result };
  }
}
