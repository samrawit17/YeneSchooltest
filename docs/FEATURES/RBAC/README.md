# RBAC Module

> Purpose: Role-based access control system with fine-grained permissions.

---

## Responsibilities
- Define roles and their permissions
- Assign permissions to roles and individual users
- Enforce permission checks on API endpoints
- Provide permission management UI for superadmin

## Features
- 8 built-in roles: SUPER_ADMIN, ADMIN, IT_MANAGER, REGISTRAR, TEACHER, STUDENT, PARENT, FINANCE
- Fine-grained permissions (create/read/update/delete per entity)
- Role-permission mapping via `DEFAULT_ROLE_PERMISSIONS`
- User-specific permission overrides via `UserPermission`
- Permission check decorators: `@Roles()`, `@Permissions()`
- Guards: `RolesGuard`, `PermissionsGuard`

## Database Entities
- `Permission` — id, module, action, description
- `RolePermission` — id, role, permissionId
- `UserPermission` — id, userId, permissionId, granted

## Default Role Permissions
Defined in `backend/src/auth/constants/default-permissions.constant.ts`

## Permission Check Flow
```
Request → JwtAuthGuard → RolesGuard (check role) → PermissionsGuard (check specific permission)
```

## Related Documents
- `backend/src/rbac/`
- `backend/src/auth/guards/`
- `backend/src/auth/constants/default-permissions.constant.ts`
- `docs/SECURITY.md`
