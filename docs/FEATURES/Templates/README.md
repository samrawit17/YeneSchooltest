# Templates Module

> Purpose: Document templates for certificates, ID cards, and other school documents.

---

## Responsibilities
- Define document templates
- Generate documents from templates
- Manage template layouts and variables
- Support multiple template types

## Features
- Template types: CERTIFICATE, ID_CARD
- HTML-based template layout with variables
- PDF generation from templates
- Template preview
- Variable substitution (student name, school name, date, etc.)

## Database Entities
- `Template` — id, schoolId, name, type (CERTIFICATE/ID_CARD), layout (JSON/HTML), variables (JSON)

## Permissions
- `ADMIN`: Manage templates
- `REGISTRAR`: Use templates for document generation

## Related Documents
- `backend/src/templates/`
- `frontend/src/lib/api/templates.ts`
