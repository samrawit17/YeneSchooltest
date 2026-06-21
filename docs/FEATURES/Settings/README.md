# Settings Module

> Purpose: Platform-wide and per-school settings management.

---

## Responsibilities
- Platform-level settings (global configurations)
- Per-school settings (customizable per tenant)
- Feature flags and toggles
- Configuration validation

## Features
- Key-value platform settings
- Structured school settings
- Settings UI for admin/superadmin
- Configuration change audit

## Database Entities
- `PlatformSetting` — id, key, value, type, description
- `SchoolSetting` — id, schoolId, key, value
- `SchoolSettings` — id, schoolId, structured JSON

## Related Documents
- `backend/src/platform-settings/` — Implementation
- `backend/src/school-settings/` — Implementation
- `frontend/src/lib/api/platform.ts` — API client
- `frontend/src/lib/api/school-settings.ts` — API client
