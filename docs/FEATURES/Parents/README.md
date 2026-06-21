# Parents Module

> Purpose: Parent profile management, parent-student linking, and parent dashboard.

---

## Responsibilities
- Parent profile creation and management
- Parent-student relationship management
- Parent dashboard with children's data
- Communication between parents and teachers

## Features
- Parent profiles with contact info and relationship to students
- Multiple children linking (one parent, many students)
- Parent dashboard: view children's grades, attendance, timetable, fees, discipline
- Communication book for parent-teacher messaging

## Database Entities
- `ParentProfile` — id, schoolId, userId, firstName, lastName, phone, email, address
- `ParentStudent` — id, schoolId, parentId, studentId, relationship (FATHER/MOTHER/GUARDIAN/OTHER)

## Permissions
- `PARENT`: View linked children's data only (grades, attendance, fees, timetable, discipline)
- `ADMIN`: Create/manage parent profiles
- `REGISTRAR`: Link parents to students during enrollment

## Related Documents
- `docs/FEATURES/Students/README.md` — Student management
- `docs/FEATURES/Communication/README.md` — Parent-teacher communication
- `backend/src/parent/` — Implementation
- `frontend/src/lib/api/parent.ts` — API client
- `frontend/src/app/(dashboard)/parent/` — Parent dashboard pages
