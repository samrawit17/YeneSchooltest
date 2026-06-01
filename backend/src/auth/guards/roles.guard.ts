import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY,
  ROLES_KEY,
} from '../decorators/roles.decorator';
import { Role } from '../types/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const normalizedUserRole = String(user?.role || '').trim().toUpperCase();
    const normalizedRequiredRoles = requiredRoles.map((role) =>
      String(role || '').trim().toUpperCase(),
    );
    const allowSuperAdminMixedRole = this.reflector.getAllAndOverride<boolean>(
      ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      !allowSuperAdminMixedRole &&
      normalizedUserRole === Role.SUPER_ADMIN &&
      normalizedRequiredRoles.some((role) => role !== Role.SUPER_ADMIN)
    ) {
      return false;
    }

    const isAllowed =
      user &&
      normalizedRequiredRoles.some((role) => role === normalizedUserRole);

    return isAllowed;
  }
}
