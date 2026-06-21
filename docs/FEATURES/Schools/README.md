# Schools Module

> Purpose: School (tenant) management, subscription plans, and school-level configuration.

---

## Responsibilities
- School CRUD operations
- School subscription management (CORE/STANDARD/ULTIMATE)
- School settings and configuration
- School year counter management
- School-level feature gating via subscriptions

## Features
- School profile management (name, address, logo, contact)
- School slug/key for public enrollment URLs
- Subscription plan assignment
- Feature gating based on subscription tier
- School settings (configured via PlatformSetting + SchoolSetting)
- Academic year management per school

## Database Entities
- `School` — id, name, slug, key, logo, address, phone, email, subscriptionId
- `SchoolSetting` — id, schoolId, key, value
- `SchoolSettings` — id, schoolId, structured settings JSON
- `SchoolYearCounter` — id, schoolId, academicYearId, counter, prefix
- `Subscription` — id, schoolId, planId, startDate, endDate, status
- `Plan` — id, name (CORE/STANDARD/ULTIMATE), features, price

## Permissions
- `SUPER_ADMIN`: Full school management, cross-school operations
- `ADMIN`: Manage own school settings

## Related Documents
- `docs/FEATURES/Multi-tenancy/README.md` — Tenant isolation
- `docs/FEATURES/Settings/README.md` — School settings
- `backend/src/school/` — Implementation
- `backend/src/subscription/` — Subscription implementation
- `frontend/src/lib/api/schools.ts` — API client
