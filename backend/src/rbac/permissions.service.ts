import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';

@Injectable()
export class PermissionsService {
  constructor(
    private prismaService: PrismaService,
    private eventBus: EventBusService,
  ) {}

  async createPermission(data: {
    name: string;
    description: string;
    module: string;
    action: string;
  }) {
    const permission = await this.prismaService.permission.create({
      data,
    });

    void this.eventBus.emit('permission.created', {
      permissionId: permission.id,
      name: permission.name,
      module: permission.module,
    });

    return permission;
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
    const oldPermission = await this.prismaService.permission.findUnique({
      where: { id },
      select: { name: true },
    });

    const permission = await this.prismaService.permission.update({
      where: { id },
      data,
    });

    const changes = Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined);
    void this.eventBus.emit('permission.updated', {
      permissionId: permission.id,
      name: permission.name,
      changes,
    });

    return permission;
  }

  async deletePermission(id: string) {
    const permission = await this.prismaService.permission.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    await this.prismaService.permission.delete({
      where: { id },
    });

    if (permission) {
      void this.eventBus.emit('permission.deleted', {
        permissionId: permission.id,
        name: permission.name,
      });
    }
  }

  async getPermissionsByModule(module: string) {
    return this.prismaService.permission.findMany({
      where: { module },
    });
  }
}
