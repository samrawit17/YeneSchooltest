import { Role } from '../types/role.enum';
export declare const ROLES_KEY = "roles";
export declare const ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY = "allow_super_admin_mixed_role";
export declare const Roles: (...roles: Role[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const AllowSuperAdminMixedRole: () => import("@nestjs/common").CustomDecorator<string>;
