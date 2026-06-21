# Credentials Module

> Purpose: Bulk generation and management of user credentials.

---

## Responsibilities
- Generate usernames and passwords in bulk
- Distribute credentials to users
- Track credential generation and delivery
- Handle pending credentials

## Features
- Bulk credential generation for new users
- Configurable username patterns
- Temporary password generation
- Credential delivery tracking
- Pending credential queue

## Database Entities
- `PendingCredential` — id, schoolId, userId, username, tempPassword, delivered
- `CredentialGenerationLog` — id, schoolId, generatedBy, count, timestamp

## Permissions
- `ADMIN`: Generate and manage credentials
- `REGISTRAR`: Generate credentials for enrolled students

## Related Documents
- `backend/src/credential/`
- `frontend/src/lib/api/admin.ts`
