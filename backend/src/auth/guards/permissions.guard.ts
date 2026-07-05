import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '../types/role.enum';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService, // Retained for backwards compatibility with test files
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.url || request.path;

    if (!user) {
      return !requiredPermissions; // Permission-protected routes require authentication.
    }

    // Allow users to access their own profile strictly without further permission checks
    if (
      path &&
      (path.includes('/auth/users/me') || path.includes('/users/me'))
    ) {
      return true;
    }

    // Ensure all authenticated users have a valid role assigned
    if (!user.role) {
      this.logger.warn(`User ${user.id} has no role assigned`);
      return false;
    }

    // Extract potential resource tenant (schoolId)
    const body = request.body;
    const params = request.params;
    const query = request.query;
    const resourceSchoolId =
      body?.schoolId || params?.schoolId || query?.schoolId;

    // ==========================================
    // MULTI-TENANT ISOLATION RULES
    // ==========================================

    // If a user is bound to a school (most roles), they can only access that school's data.
    // Super Admins typically have no schoolId and thus can access any school's data if they have the permission.
    if (user.schoolId && resourceSchoolId && resourceSchoolId !== user.schoolId) {
      this.logger.warn(`User ${user.id} (School: ${user.schoolId}) attempted to access resource in School: ${resourceSchoolId}`);
      return false;
    }

    // Special SUPER_ADMIN restrictions
    if (user.role === Role.SUPER_ADMIN) {
      // Super Admin can ONLY perform platform-level actions or school-level READ/MANAGE if permitted.
      // But we strictly block they from having a "home school" context for operations that assume it.
      if (user.schoolId) {
          this.logger.error(`SUPER_ADMIN ${user.id} has a schoolId assigned, which is invalid for platform-level role.`);
          return false;
      }
    }

    if (!requiredPermissions) {
      return true;
    }

    // ==========================================
    // UNIFIED PERMISSION EVALUATION 
    // ==========================================

    const userPermissions: string[] = user.permissions || [];

    // SUPER_ADMIN bypass: this role has unrestricted platform-level access
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    return hasPermission;
  }
}
