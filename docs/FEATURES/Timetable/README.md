# Timetable Module

> Purpose: Class scheduling, period management, and timetable visualization.

---

## Responsibilities
- Period time definitions (start/end times)
- Timetable slot management per class-section
- Timetable visualization (weekly calendar view)
- Break/lunch period configuration

## Features
- Configurable period times per school
- Timetable slots per class-section combination
- Weekly timetable view with drag-and-drop (planned)
- Teacher timetable view (shows assigned classes)
- Student timetable view
- Break and lunch period indicators

## Database Entities
- `PeriodTime` — id, schoolId, name, startTime, endTime, type (REGULAR/BREAK/LUNCH)
- `TimetableSlot` — id, schoolId, classId, sectionId, subjectId, teacherId, periodTimeId, dayOfWeek

## Permissions
- `ADMIN`: Create/manage timetable
- `TEACHER`: View own timetable
- `STUDENT`: View own class timetable
- `PARENT`: View children's timetable

## Business Rules
- A teacher can only be assigned to one class-subject at a time slot
- PeriodTimes define school-specific start/end times
- Day of week: 0=Sunday through 6=Saturday (Ethiopian week starts Sunday)

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 9) — Timetable rules
- `backend/src/timetable-slot/` — Implementation
- `backend/src/period-time/` — Period time implementation
- `frontend/src/lib/api/timetable.ts` — API client
- `frontend/src/lib/timetable.ts` — Display utilities
