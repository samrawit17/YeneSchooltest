# Attendance API v1

> Attendance session and record endpoints.

---

## GET /attendance/sessions

List attendance sessions. Query: `?classId=xxx&date=2024-09-12&page=1&limit=20`

---

## POST /attendance/sessions

Create attendance session.

**Request:**
```json
{
  "classId": "cuid...",
  "date": "2024-09-12", // Ethiopian date
  "period": "MORNING"
}
```

---

## GET /attendance/records

Get attendance records for a session. Query: `?sessionId=xxx`

**Response:**
```json
{
  "session": { "...": "..." },
  "records": [
    { "studentId": "...", "student": { "name": "..." }, "status": "PRESENT" }
  ]
}
```

---

## POST /attendance/records

Mark attendance (batch).

**Request:**
```json
{
  "sessionId": "cuid...",
  "records": [
    { "studentId": "cuid...", "status": "PRESENT" },
    { "studentId": "cuid...", "status": "ABSENT" }
  ]
}
```

---

## PATCH /attendance/records/:id

Update individual attendance record status.
