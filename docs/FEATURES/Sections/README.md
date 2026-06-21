# Sections Module

> Purpose: Class sections/streams management (A, B, C, etc.).

---

## Responsibilities
- Define sections within classes
- Assign students to sections
- Manage section capacity
- Section-level timetable and scheduling

## Features
- Section CRUD per class
- Section name/label configuration (A, B, C or Alpha, Beta, Gamma)
- Section capacity limits
- Section-level subject and teacher assignment (via ClassSubject)
- Section-level timetable slots

## Database Entities
- `Section` — id, schoolId, classId, name, capacity, academicYearId

## Permissions
- `ADMIN`: Manage sections
- `TEACHER`: View assigned sections

## Related Documents
- `backend/src/section/`
- `docs/FEATURES/Class-Subject/README.md`
- `frontend/src/lib/api/classes.ts`
