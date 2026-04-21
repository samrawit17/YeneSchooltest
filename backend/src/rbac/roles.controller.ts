import {
  Controller,
  Get,
  Post,
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
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  async getAllRoles() {
    try {
      const roles = Object.values(Role);
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const permissions = await this.rolesService.getRolePermissions(role);
          return {
            role,
            permissions: permissions.map((rp) => rp.permission),
          };
        }),
      );
      return rolesWithPermissions;
    } catch (error) {
      throw new HttpException(
        'Failed to get roles: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':role/permissions')
  async getRolePermissions(@Param('role') role: Role) {
    try {
      const permissions = await this.rolesService.getRolePermissions(role);
      return permissions.map((rp) => rp.permission);
    } catch (error) {
      throw new HttpException(
        'Failed to get role permissions: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':role/permissions')
  @Permissions('manage_roles')
  async assignPermissionToRole(
    @Param('role') role: Role,
    @Body() body: { permissionId: string },
  ) {
    try {
      const result = await this.rolesService.assignPermissionToRole(
        role,
        body.permissionId,
      );
      return {
        role: result.role,
        permission: result.permission,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to assign permission: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':role/permissions/:permissionId')
  @Permissions('manage_roles')
  async removePermissionFromRole(
    @Param('role') role: Role,
    @Param('permissionId') permissionId: string,
  ) {
    try {
      await this.rolesService.removePermissionFromRole(role, permissionId);
      return { message: 'Permission removed from role successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to remove permission: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
