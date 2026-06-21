# Events Module

> Purpose: School events management and calendar integration.

---

## Responsibilities
- Create and manage school events
- Link events to assessments and exams
- Event visibility controls per role

## Features
- Event CRUD with date, time, location
- Event categories (academic, sports, holiday, meeting, etc.)
- Calendar integration
- Assessment/Exam linking

## Database Entities
- `SchoolEvent` — id, schoolId, title, description, startDate, endDate, category, assessmentId (optional)

## Permissions
- `ADMIN`: Full event management
- All roles: View events

## Related Documents
- `backend/src/event/`
- `frontend/src/lib/api/content.ts`
