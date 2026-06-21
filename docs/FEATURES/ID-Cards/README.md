# ID Cards Module

> Purpose: Student and staff ID card generation.

---

## Responsibilities
- Generate printable ID cards
- Customize ID card layout
- Batch ID card printing
- QR code integration

## Features
- Student ID card generation with photo
- Staff ID card generation
- Batch generation for classes/groups
- Customizable layout via templates
- QR code with student/school info
- Printable PDF output

## Database Entities
- `Template` — id, schoolId, type (CERTIFICATE/ID_CARD), layout JSON
- `Document` — id, schoolId, entityType, entityId, type, url

## Permissions
- `ADMIN`: Generate ID cards
- `REGISTRAR`: Generate student ID cards

## Related Documents
- `frontend/src/app/(dashboard)/admin/id-cards/`
- `frontend/src/components/StudentIdCard.tsx`
- `backend/src/templates/`
