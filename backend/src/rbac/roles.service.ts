import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { Role } from '../auth/types/role.enum';

@Injectable()
export class RolesService {
  constructor(
    private prismaService: PrismaService,
    private eventBus: EventBusService,
  ) {}

  async getRolePermissions(role: Role) {
    return this.prismaService.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });
  }

  async assignPermissionToRole(role: Role, permissionId: string) {
    const result = await this.prismaService.rolePermission.create({
      data: { role, permissionId },
      include: { permission: true },
    });

    void this.eventBus.emit('role.permission.assigned', {
      role: result.role,
      permissionId: result.permissionId,
      permissionName: result.permission.name,
    });

    return result;
  }

  async removePermissionFromRole(role: Role, permissionId: string) {
    const permission = await this.prismaService.permission.findUnique({
      where: { id: permissionId },
      select: { name: true },
    });

    await this.prismaService.rolePermission.delete({
      where: { role_permissionId: { role, permissionId } },
    });

    void this.eventBus.emit('role.permission.removed', {
      role,
      permissionId,
      permissionName: permission?.name || permissionId,
    });
  }
}
