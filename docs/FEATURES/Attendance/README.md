# Attendance Module

> Purpose: Student attendance tracking with offline-first capability and Ethiopian calendar awareness.

---

## Responsibilities
- Daily attendance recording per class/section
- Offline attendance capture (Dexie.js IndexedDB)
- Attendance syncing when connection restored
- Attendance reports and statistics
- Attendance sessions management

## Features
- Online attendance recording with real-time save
- Offline attendance capture (works without internet)
- Automatic sync when connection restored (with conflict resolution)
- Attendance sessions tied to date, period, and class
- Multiple statuses: PRESENT, ABSENT, LATE, EXCUSED
- Attendance reports per student, class, and date range

## Business Rules
- Conflict resolution: server timestamp wins by default
- Attendance records tied to AttendanceSession (date + period + class)
- Teacher can only mark attendance for assigned classes
- Offline data syncs when `useNetworkStatus` detects connectivity

## Database Entities
- `AttendanceSession` — id, schoolId, classId, date, period, teacherId
- `AttendanceRecord` — id, schoolId, sessionId, studentId, status, markedAt
- `Attendance` — id, schoolId, studentId, date, status, classId

## Permissions
- `TEACHER`: Mark attendance for assigned classes
- `ADMIN`: View all attendance, run reports
- `PARENT`: View linked children's attendance
- `STUDENT`: View own attendance

## Workflows
```
Online:
  Teacher opens attendance page → Selects class/date → Marks status per student
    → Saved to DB immediately

Offline:
  Teacher opens attendance page (offline) → Selects class/date → Marks status
    → Saved to Dexie.js IndexedDB
      → Network restored → sync-service.ts pushes to backend
        → SyncModule resolves conflicts → Server merges or flags SyncConflict
```

## Validation Rules
- One attendance record per student per session
- Attendance can only be marked for current or past dates
- Session must belong to the teacher's assigned class

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /attendance/sessions | List attendance sessions |
| POST | /attendance/sessions | Create session |
| GET | /attendance/records | Get attendance records |
| POST | /attendance/records | Mark attendance |
| PATCH | /attendance/records/:id | Update attendance status |
| POST | /sync | Push offline attendance data |

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 6) — Attendance rules
- `frontend/src/lib/db/` — Dexie.js IndexedDB setup
- `frontend/src/hooks/useOfflineAttendance.ts` — Offline hook
- `frontend/src/lib/api/attendance.ts` — API client
- `backend/src/sync/` — Sync module with conflict resolution
