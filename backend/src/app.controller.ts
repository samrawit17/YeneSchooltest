import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { Permissions } from './auth/decorators/permissions.decorator';
import { Role } from './auth/types/role.enum';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))
  getProtected(@Request() req) {
    return {
      message: 'Protected route accessed',
      user: req.user,
    };
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  getAdmin(@Request() req) {
    return {
      message: 'Admin route accessed',
      user: req.user,
    };
  }

  @Get('permissions')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
  @Permissions('view_roles', 'view_users')
  getPermissions(@Request() req) {
    return {
      message: 'Permissions route accessed',
      user: req.user,
    };
  }
}
