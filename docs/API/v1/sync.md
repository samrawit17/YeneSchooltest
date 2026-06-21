# Sync API v1

> Offline data synchronization endpoints.

---

## POST /sync

Push offline data to server. Used by offline attendance sync.

**Request:**
```json
{
  "operations": [
    {
      "type": "CREATE",
      "entity": "AttendanceRecord",
      "data": { "studentId": "...", "sessionId": "...", "status": "PRESENT" },
      "clientTimestamp": "2024-09-12T10:30:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "status": "MERGED",
      "entityId": "cuid..."
    }
  ],
  "conflicts": []
}
```

---

## GET /sync/conflicts

List sync conflicts for resolution.

---

## POST /sync/conflicts/:id/resolve

Resolve a sync conflict (accept server or client version).
