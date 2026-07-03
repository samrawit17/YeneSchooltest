import { Role } from '../types/role.enum';
export declare const IT_MANAGER_FORBIDDEN_PERMISSIONS: readonly ["user:create", "user:update", "user:deactivate", "update_users", "delete_users", "student:create", "student:update", "student:approve_enrollment", "parent:create", "parent:update", "parent:link_student", "parent:unlink_student", "teacher:create", "teacher:update", "employee:create", "employee:update", "employee:delete"];
export declare const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]>;
