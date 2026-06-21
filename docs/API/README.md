# API Documentation — YeneSchool

> Purpose: API specifications, endpoint references, and integration guidelines.

---

## API Base URL

- **Development**: `http://localhost:8001/api`
- **Production**: `https://yourdomain.com/api`
- **Authentication**: JWT in HTTP-only cookie (sent automatically with `withCredentials: true`)

## Conventions

| Convention | Standard |
|------------|----------|
| Format | RESTful JSON |
| Auth | JWT cookie (HTTP-only) |
| Scoping | `schoolId` from JWT (not in URL) |
| Pagination | `?page=1&limit=20` |
| Sorting | `?sort=field&order=asc` |
| Filtering | `?field=value` |
| Errors | `{ statusCode, message, error }` |
| Dates | ISO 8601 (Gregorian) or YYYY-MM-DD (Ethiopian) |

## API Groups

| Group | Base Path | Status | Spec |
|-------|-----------|--------|------|
| Auth | `/auth` | ✅ | [v1/auth.md](v1/auth.md) |
| Users | `/users` | ✅ | [v1/users.md](v1/users.md) |
| Schools | `/schools` | ✅ | [v1/schools.md](v1/schools.md) |
| Students | `/students` | ✅ | [v1/students.md](v1/students.md) |
| Teachers | `/teachers` | ✅ | [v1/teachers.md](v1/teachers.md) |
| Parents | `/parents` | ✅ | [v1/parents.md](v1/parents.md) |
| Classes | `/classes` | ✅ | [v1/classes.md](v1/classes.md) |
| Subjects | `/subjects` | ✅ | [v1/subjects.md](v1/subjects.md) |
| Attendance | `/attendance` | ✅ | [v1/attendance.md](v1/attendance.md) |
| Timetable | `/timetable` | ✅ | [v1/timetable.md](v1/timetable.md) |
| Exams | `/exams` | ⚠️ | [v1/exams.md](v1/exams.md) |
| Grading | `/grading` | ✅ | [v1/grading.md](v1/grading.md) |
| Finance | `/finance` | ✅ | [v1/finance.md](v1/finance.md) |
| Notifications | `/notifications` | ✅ | [v1/notifications.md](v1/notifications.md) |
| Sync | `/sync` | ⚠️ | [v1/sync.md](v1/sync.md) |
| Reports | `/reports` | ⚠️ | [v1/reports.md](v1/reports.md) |

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    { "field": "email", "message": "email must be a valid email address" }
  ]
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests (rate limited) |
| 503 | Maintenance Mode |

## Related Documents

- `ARCHITECTURE.md` (Section 7) — Data flow
- `docs/SECURITY.md` — Auth and rate limiting
- `docs/CODING_STANDARDS.md` — API conventions
- `backend/src/` — Implementation
- `frontend/src/lib/api/` — Frontend API clients
