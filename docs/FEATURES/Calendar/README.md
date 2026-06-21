# Calendar Module

> Purpose: School calendar management with Ethiopian/Gregorian support.

---

## Responsibilities
- Calendar event management
- Ethiopian/Gregorian calendar toggle
- Academic calendar display
- Event categorization

## Features
- School events with dates, descriptions, categories
- Calendar type toggle (Ethiopian/Gregorian) per user preference
- Event visibility controls
- Integration with assessments and exams
- react-big-calendar with Ethiopian calendar adapter

## Database Entities
- `SchoolEvent` — id, schoolId, title, description, startDate, endDate, calendarType, category
- `CalendarContext` — React context providing calendar mode to all components

## Permissions
- `ADMIN`: Create/manage events
- All roles: View calendar

## Related Documents
- `backend/src/calendar/`
- `frontend/src/context/CalendarContext.tsx`
- `frontend/src/components/BigCalendar.tsx`
