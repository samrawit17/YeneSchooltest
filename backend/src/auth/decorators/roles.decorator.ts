import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role.enum';

export const ROLES_KEY = 'roles';
export const ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY = 'allow_super_admin_mixed_role';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const AllowSuperAdminMixedRole = () =>
  SetMetadata(ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY, true);
