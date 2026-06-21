# Discipline Module

> Purpose: Student discipline incident tracking and behavioral management.

---

## Responsibilities
- Incident recording and categorization
- Disciplinary action tracking
- Parent notification of incidents
- Behavior reports and analytics

## Features
- Incident recording (type, date, description, severity)
- Action tracking (warning, detention, suspension, expulsion)
- Student discipline history
- Parent notification for incidents
- Discipline reports per student and class

## Database Entities
- `DisciplineIncident` — id, schoolId, studentId, type, severity, description, date, location, reportedBy, action, resolved

## Permissions
- `ADMIN`: Full discipline management
- `TEACHER`: Report incidents for their students
- `PARENT`: View linked children's incidents

## Related Documents
- `backend/src/discipline/` — Implementation
- `frontend/src/lib/api/people.ts` — API client
