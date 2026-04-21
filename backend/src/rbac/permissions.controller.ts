import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Post()
  @Permissions('manage_permissions')
  async createPermission(
    @Body()
    body: {
      name: string;
      description: string;
      module: string;
      action: string;
    },
  ) {
    try {
      const permission = await this.permissionsService.createPermission(body);
      return permission;
    } catch (error) {
      throw new HttpException(
        'Failed to create permission: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async getPermissions() {
    try {
      const permissions = await this.permissionsService.getPermissions();
      return permissions;
    } catch (error) {
      throw new HttpException(
        'Failed to get permissions: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getPermissionById(@Param('id') id: string) {
    try {
      const permission = await this.permissionsService.getPermissionById(id);
      if (!permission) {
        throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
      }
      return permission;
    } catch (error) {
      throw new HttpException(
        'Failed to get permission: ' + error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('module/:module')
  async getPermissionsByModule(@Param('module') module: string) {
    try {
      const permissions =
        await this.permissionsService.getPermissionsByModule(module);
      return permissions;
    } catch (error) {
      throw new HttpException(
        'Failed to get permissions by module: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @Permissions('manage_permissions')
  async updatePermission(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      module?: string;
      action?: string;
    },
  ) {
    try {
      const permission = await this.permissionsService.updatePermission(
        id,
        body,
      );
      return permission;
    } catch (error) {
      throw new HttpException(
        'Failed to update permission: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Permissions('manage_permissions')
  async deletePermission(@Param('id') id: string) {
    try {
      await this.permissionsService.deletePermission(id);
      return { message: 'Permission deleted successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to delete permission: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
