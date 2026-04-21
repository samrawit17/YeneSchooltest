# School Management System - Offline-First Architecture

## Overview

This project implements an offline-first school management system using:
- **Next.js** - Frontend framework
- **NestJS** - Backend API framework
- **IndexedDB (Dexie.js)** - Offline storage
- **Offline-first** - Work without internet, sync when available

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Pages/    │  │  Components │  │  React Hooks        │   │
│  │   API Routes│  │             │  │  - useOffline...    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Dexie.js (IndexedDB)                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │Students  │ │Attendance│ │FormDrafts│ │SyncQueue │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Sync Service                                │   │
│  │  - Auto-sync when online                                │   │
│  │  - Conflict resolution (latest wins)                   │   │
│  │  - Retry with exponential backoff                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   REST API  │  │  Services   │  │  Prisma ORM         │   │
│  │  /sync/*    │  │ SyncService │  │  (PostgreSQL)       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. IndexedDB Storage (Dexie.js)

The frontend uses IndexedDB for offline storage with these tables:

```typescript
// Database Schema
students         // Cached student data
attendance       // Offline attendance records
attendanceSessions // Attendance sessions
formDrafts       // Saved form drafts
syncQueue        // Pending sync operations
syncMetadata     // Sync status tracking
conflicts        // Conflict resolution records
```

### 2. Offline-First Attendance

The attendance system works completely offline:

1. **Cache Students**: Students are cached to IndexedDB when online
2. **Record Offline**: Teachers mark attendance without internet
3. **Queue for Sync**: Records are saved locally and queued for sync
4. **Auto-Sync**: When internet returns, data syncs automatically

### 3. Sync Service

The sync service handles:

- **Auto-sync**: Starts automatically when connection is restored
- **Conflict Resolution**: Latest timestamp wins by default
- **Retry Logic**: Exponential backoff for failed syncs
- **Priority Queue**: Critical data (attendance) syncs first

### 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/attendance` | Sync single attendance record |
| POST | `/api/sync/attendance/batch` | Batch sync attendance |
| POST | `/api/sync/students` | Get students for caching |
| GET | `/api/sync/status` | Get sync status |
| GET | `/api/sync/conflicts` | Get unresolved conflicts |
| POST | `/api/sync/conflicts/:id/resolve` | Resolve a conflict |

## Usage

### Using the Offline Hook

```typescript
import { useOfflineAttendance } from '@/hooks/useOfflineAttendance';

function AttendanceComponent({ classId, userId }) {
  const {
    students,
    attendanceRecords,
    syncStatus,
    recordAttendance,
    cacheStudents
  } = useOfflineAttendance({ classId });

  // Cache students on mount
  useEffect(() => {
    cacheStudents(classId);
  }, [classId]);

  // Record attendance
  const handleMarkPresent = async (studentId) => {
    await recordAttendance(studentId, sessionId, 'present');
  };
}
```

### Using Form Drafts

```typescript
import { useFormDrafts } from '@/hooks/useFormDrafts';

function MyForm() {
  const { draft, saveDraft, clearDraft } = useFormDrafts<MyFormData>({
    formType: 'attendance',
    formId: 'session-123',
    userId: 'user-456'
  });

  // Auto-save on change
  const handleChange = (data) => {
    saveDraft(data);
  };
}
```

## Folder Structure

```
frontend/src/
├── lib/
│   ├── db/
│   │   ├── index.ts          # Database schema & types
│   │   └── sync-service.ts   # Sync logic
│   └── offline/              # Documentation
├── hooks/
│   ├── useOfflineAttendance.ts  # Attendance hook
│   ├── useFormDrafts.ts         # Form draft hook
│   ├── useNetworkStatus.tsx    # Network detection
│   └── useOfflineAttendance.ts # Main attendance hook
└── components/
    └── (Integrated into teacher/attendance page)

backend/src/
└── sync/
    ├── sync.module.ts    # NestJS module
    ├── sync.controller.ts # REST endpoints
    └── sync.service.ts  # Business logic
```

## Best Practices

### 1. Offline-First Design
- Always assume the user might be offline
- Cache critical data (students, classes) proactively
- Queue all writes to IndexedDB first
- Sync in the background

### 2. Conflict Resolution
- Use timestamps for conflict detection
- Implement "latest wins" as default strategy
- Provide manual resolution for critical conflicts
- Log conflicts for debugging

### 3. Performance
- Limit IndexedDB queries to needed data
- Use pagination for large datasets
- Implement debouncing for auto-save
- Clear old data periodically

### 4. Security
- Always validate data on the server
- Use JWT authentication for sync endpoints
- Track device IDs for audit
- Sanitize user input

## Configuration

### Sync Service Options

```typescript
const syncService = new SyncService({
  maxRetries: 3,              // Max retry attempts
  retryDelayMs: 1000,         // Initial delay
  batchSize: 50,              // Items per batch
  syncIntervalMs: 30000,       // Auto-sync interval
  conflictResolutionStrategy: 'latest_wins'
});
```

### Database Schema Version

When updating the schema, increment the version number:

```typescript
this.version(2).stores({
  students: 'id, studentId, classId',
  // Add new tables or indexes
});
```

## Troubleshooting

### Data Not Syncing
1. Check if online: `navigator.onLine`
2. Check sync queue: `syncService.getSyncStatus()`
3. Force sync: `syncService.syncNow()`

### Conflicts
1. Get conflicts: `syncService.getConflicts()`
2. Resolve manually or let auto-resolve handle it
3. Check server logs for conflict details

### Performance Issues
1. Clear old cached data periodically
2. Limit batch sizes
3. Use indexes on frequently queried fields

## License

This project is part of the School Management System.
