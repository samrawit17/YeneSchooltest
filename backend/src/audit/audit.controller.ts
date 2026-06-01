import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllowSuperAdminMixedRole } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER)
  @AllowSuperAdminMixedRole()
  async list(
    @Request() req: any,
    @Query('schoolId') schoolId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
  ) {
    const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
    const resolvedSchoolId = isSuperAdmin ? schoolId || null : req.user?.schoolId;

    return {
      success: true,
      data: await this.auditService.findLogs({
        schoolId: resolvedSchoolId,
        action,
        entityType,
        limit: limit ? Number(limit) : undefined,
      }),
    };
  }
}
