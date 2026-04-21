import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';

@Injectable()
export class RolesService {
  constructor(private prismaService: PrismaService) {}

  async getRolePermissions(role: Role) {
    return this.prismaService.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });
  }

  async assignPermissionToRole(role: Role, permissionId: string) {
    return this.prismaService.rolePermission.create({
      data: { role, permissionId },
      include: { permission: true },
    });
  }

  async removePermissionFromRole(role: Role, permissionId: string) {
    return this.prismaService.rolePermission.delete({
      where: { role_permissionId: { role, permissionId } },
    });
  }
}
