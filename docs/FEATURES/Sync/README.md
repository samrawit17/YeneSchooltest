# Sync Module (Offline)

> Purpose: Offline data synchronization with conflict resolution.

---

## Status: ⚠️ Partial — SyncService and conflict resolution — verify completeness

## Responsibilities
- Receive offline data pushes from clients
- Resolve conflicts between server and client data
- Log sync operations for auditing
- Provide conflict resolution UI

## Features
- Bulk operation sync endpoint
- Conflict detection (timestamp-based)
- Automatic conflict resolution (server timestamp wins)
- Manual conflict resolution via admin UI
- Sync operation logging
- Conflict review and resolution queue

## Database Entities
- `SyncConflict` — id, schoolId, entityType, entityId, clientData (JSON), serverData (JSON), resolved, resolution
- `SyncLog` — id, schoolId, userId, operationCount, conflicts, status, timestamp

## Offline Sync Flow
```
Client stores data offline (Dexie.js)
  → Network restored
    → POST /sync with batched operations
      → Server processes operations
        → If conflicts: created SyncConflict
          → Admin resolves conflicts
```

## Related Documents
- `backend/src/sync/`
- `frontend/src/lib/db/` — Dexie.js IndexedDB setup
- `frontend/src/lib/db/sync-service.ts` — Sync service
- `frontend/src/hooks/useNetworkStatus.tsx` — Network detection
