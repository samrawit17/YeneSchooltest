# Multi-Tenancy Module

> Purpose: Tenant isolation, school-level data separation, cross-cutting concerns.

---

## Responsibilities
- Enforce data isolation between schools sharing one database
- Provide tenant context to all services and queries
- Manage school-level settings and configuration
- Support SUPER_ADMIN cross-tenant operations

## Features
- Database-level isolation via `schoolId` column on all tenant-scoped tables
- Redis key namespacing (`school:{schoolId}:resource:{id}`)
- TenantGuard middleware validates `schoolId` from JWT
- School settings stored per-tenant in `SchoolSetting` and `SchoolSettings`
- Platform settings global across all tenants

## Business Rules
- Every DB query must include `schoolId` in WHERE clause
- `schoolId` always comes from JWT, never from request body/params
- 8 roles with SUPER_ADMIN being the only cross-tenant role
- Redis keys must always be prefixed with `school:{schoolId}:`
- Cross-school data access is a security violation for non-SUPER_ADMIN

## Database Entities
- `School` — id, name, slug, key, subscription status
- `SchoolSetting` — Per-school key/value settings
- `SchoolSettings` — Structured per-school configuration
- `PlatformSetting` — Global platform-level settings

## Permissions
- `SUPER_ADMIN`: Access all tenants, platform management
- All other roles: Scoped to their JWT `schoolId`

## Workflows
```
School Admin logs in → JWT contains schoolId
  → All subsequent requests carry schoolId in JWT
    → TenantGuard extracts and validates schoolId
      → All service methods filter by schoolId
```

## Validation Rules
- School slug must be unique
- School key must be unique
- School subscription status gates feature access via `FeatureGuard`

## Related Documents
- `ARCHITECTURE.md` (Section 4) — Multi-tenancy deep dive
- `docs/SECURITY.md` — Isolation enforcement
- `docs/BUSINESS_RULES.md` (Section 8) — MT rules
- `docs/DATABASE.md` — Schema patterns
