# Communication Book Module

> Purpose: Structured communication between teachers and parents about student progress.

---

## Responsibilities
- Parent-teacher communication tracking
- Communication categorization (academic, attendance, discipline, health, general)
- Acknowledgment workflow
- Communication history per student

## Features
- Create communication entries for students
- Categorize by type (ACADEMIC/ATTENDANCE/DISCIPLINE/HEALTH/GENERAL)
- Status workflow: OPEN → ACKNOWLEDGED → CLOSED
- Reply chain on communications
- Attachments support
- Parent notification on new communication

## Database Entities
- `Communication` — id, schoolId, studentId, authorId, category, subject, body, status
- `CommunicationReply` — id, schoolId, communicationId, authorId, body, createdAt

## Permissions
- `TEACHER`: Create communications for their students
- `PARENT`: View and reply to children's communications
- `ADMIN`: View all communications
- `STUDENT`: View own communications

## Related Documents
- `backend/src/communication/`
- `frontend/src/lib/api/communications.ts`
- `docs/FEATURES/Messaging/README.md`
