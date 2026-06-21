# Staff Module

> Purpose: Non-teaching staff management and HR operations.

---

## Status: ⚠️ Partial

## Responsibilities
- Non-teaching staff profile management
- Staff department assignment
- Staff attendance tracking (via finance/payroll)
- Staff document management

## Features
- Staff profiles (admin, finance, IT, registrar, etc.)
- Department assignment
- Staff document management (contracts, certificates)
- Integration with payroll for salary processing

## Database Entities
- `Department` — id, schoolId, name, headId
- Staff profiles managed via `User` model with role assignment

## Related Documents
- `docs/FEATURES/Teachers/README.md` — Teaching staff
- `backend/src/registrar/` — Related implementation
