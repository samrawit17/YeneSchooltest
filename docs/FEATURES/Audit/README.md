# Audit Module

> Purpose: System-wide audit logging for tracking all data changes.

---

## Responsibilities
- Track all CRUD operations on sensitive entities
- Provide audit trail for compliance and debugging
- Store before/after values for data changes

## Features
- Automatic audit logging for configurable entities
- Entity-level change tracking
- User attribution for all changes
- Timestamp-based audit trail
- Searchable audit logs

## Database Entities
- `SystemAuditLog` — id, schoolId, userId, action, entityType, entityId, oldValues (JSON), newValues (JSON), timestamp
- `FinanceAuditLog` — id, schoolId, userId, action, entityType, entityId, changes, timestamp
- `GradeChangeLog` — id, schoolId, gradeScoreId, userId, oldValue, newValue, reason

## Related Documents
- `backend/src/audit/`
- `docs/SECURITY.md`
