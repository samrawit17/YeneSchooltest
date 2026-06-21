# API v1 Specifications

> Purpose: Index of all API endpoint specifications.

---

## API Client Modules (41)

Defined in `frontend/src/lib/api/`. Maps 1:1 to backend controllers.

| # | Module | File | Backend Module |
|---|--------|------|----------------|
| 1 | Academic Years | `academic-years.ts` | `academic-year/` |
| 2 | Academics | `academics.ts` | `academic-year/`, `term/` |
| 3 | Admin | `admin.ts` | `auth/`, `auto-assignment/`, `credential/` |
| 4 | Assessment | `assessment.ts` | `assessments/`, `exams/`, `grading/` |
| 5 | Attendance | `attendance.ts` | `calendar/attendance/` |
| 6 | Auth | `auth.ts` | `auth/` |
| 7 | Bulk Upload | `bulk-upload.ts` | `bulk-upload/` |
| 8 | Classes | `classes.ts` | `class/`, `section/` |
| 9 | Communications | `communications.ts` | `communication/`, `messaging/` |
| 10 | Content | `content.ts` | `announcement/`, `event/`, `lesson/` |
| 11 | Core (Axios) | `core.ts` | — (HTTP client) |
| 12 | Data Quality | `data-quality.ts` | `data-quality/` |
| 13 | Enrollment | `enrollment.ts` | `enrollment/` |
| 14 | Entry Progress | `entry-progress.ts` | `exams/` |
| 15 | Finance | `finance.ts` | `finance/` |
| 16 | Notifications | `notifications.ts` | `notification/` |
| 17 | Operations | `operations.ts` | `calendar/`, `search/` |
| 18 | Parent | `parent.ts` | `parent/` |
| 19 | People | `people.ts` | `discipline/`, `parent/` |
| 20 | Platform | `platform.ts` | `platform-settings/` |
| 21 | Practice Exams | `practice-exams.ts` | `practice-exams/` |
| 22 | Reporting | `reporting.ts` | `report-card/` |
| 23 | School Settings | `school-settings.ts` | `school-settings/` |
| 24 | Schools | `schools.ts` | `school/` |
| 25 | Siren | `siren.ts` | `siren/` |
| 26 | Siren Control | `siren-control.ts` | `siren/` |
| 27 | Siren Events | `siren-events.ts` | `siren/` |
| 28 | Siren Hardware | `siren-hardware.ts` | `siren/` |
| 29 | Siren Period Time | `siren-period-time.ts` | `period-time/` |
| 30 | Siren Schedules | `siren-schedules.ts` | `siren/` |
| 31 | Students | `students.ts` | `student/` |
| 32 | Subjects | `subjects.ts` | `subjects/` |
| 33 | Subscription | `subscription.ts` | `subscription/` |
| 34 | Superadmin | `superadmin.ts` | `dashboard/` |
| 35 | Teachers | `teachers.ts` | `teacher/` |
| 36 | Templates | `templates.ts` | `templates/` |
| 37 | Timetable | `timetable.ts` | `timetable-slot/` |
| 38 | Timetable Slots | `timetable-slots.ts` | `timetable-slot/` |
| 39 | Translation | `translation.ts` | `translation/` |
| 40 | Types | `types.ts` | — (shared types) |

## API Base URL
- Development: `http://localhost:8001/api`
- Production: `https://yourdomain.com/api`
- Auth: JWT in HTTP-only cookie (`withCredentials: true`)

## Convention Reference
| Convention | Standard |
|------------|----------|
| Format | RESTful JSON |
| Auth | JWT cookie (HTTP-only) |
| Scoping | `schoolId` from JWT |
| Pagination | `?page=1&limit=20` |
| Sorting | `?sort=field&order=asc` |
| Errors | `{ statusCode, message, error }` |

## Detailed Specs
- [auth.md](auth.md) — Authentication endpoints
- [students.md](students.md) — Student CRUD
- [attendance.md](attendance.md) — Attendance sessions & records
- [finance.md](finance.md) — Fee structures, payments, payroll
- [grading.md](grading.md) — Grading components & scores
- [sync.md](sync.md) — Offline sync
