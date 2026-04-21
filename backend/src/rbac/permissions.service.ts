import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prismaService: PrismaService) {}

  async createPermission(data: {
    name: string;
    description: string;
    module: string;
    action: string;
  }) {
    return this.prismaService.permission.create({
      data,
    });
  }

  async getPermissions() {
    return this.prismaService.permission.findMany();
  }

  async getPermissionById(id: string) {
    return this.prismaService.permission.findUnique({
      where: { id },
    });
  }

  async getPermissionByName(name: string) {
    return this.prismaService.permission.findUnique({
      where: { name },
    });
  }

  async updatePermission(
    id: string,
    data: {
      name?: string;
      description?: string;
      module?: string;
      action?: string;
    },
  ) {
    return this.prismaService.permission.update({
      where: { id },
      data,
    });
  }

  async deletePermission(id: string) {
    return this.prismaService.permission.delete({
      where: { id },
    });
  }

  async getPermissionsByModule(module: string) {
    return this.prismaService.permission.findMany({
      where: { module },
    });
  }
}
