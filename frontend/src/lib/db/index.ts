/**
 * IndexedDB Database Configuration using Dexie.js
 * 
 * This module provides offline storage for:
 * - Attendance records
 * - Student data cache
 * - Form drafts
 * - Sync queue for pending operations
 */

import Dexie, { type Table } from 'dexie';

// ============================================
// INTERFACES
// ============================================

/** Student record cached for offline access */
export interface CachedStudent {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  classId: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  photo?: string;
  email?: string;
  phone?: string;
  enrollmentStatus: 'active' | 'inactive' | 'graduated' | 'suspended';
  cachedAt: number;
  updatedAt: number;
}

/** Cached timetable payload for offline access */
export interface CachedTimetable {
  id: string;
  ownerType: 'teacher' | 'student' | 'class';
  ownerId: string;
  slots: Record<string, unknown>[];
  schoolSettings?: Record<string, unknown>;
  cachedAt: number;
}

/** Offline attendance record */
export interface OfflineAttendance {
  id?: number;
  localId: string; // Unique local identifier for offline records
  studentId: string;
  sessionId: string;
  classId?: string;
  sectionId?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  recordedBy: string;
  recordedAt: string;
  isSynced: boolean;
  syncedAt?: string;
  conflictStatus?: 'none' | 'pending' | 'resolved' | 'conflict';
  serverVersion?: number;
  lastModified: string;
  deviceId?: string;
}

/** Attendance session for offline */
export interface OfflineAttendanceSession {
  id: string;
  classId: string;
  className: string;
  subjectId?: string;
  subjectName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  recordedBy: string;
  isSynced: boolean;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  cachedAt: number;
}

/** Form draft for offline storage */
export interface FormDraft {
  id?: number;
  formType: 'attendance' | 'grading' | 'enrollment' | 'communication' | 'custom';
  formId?: string;
  formData: Record<string, unknown>;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isAutoSaved: boolean;
  lastSection?: string;
}

/** Sync queue item */
export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entity: 'attendance' | 'student' | 'grade' | 'enrollment' | 'message' | 'conversation' | 'announcement';
  entityId: string;
  payload: Record<string, unknown>;
  priority: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
  createdAt: string;
  lastAttempt?: string;
  error?: string;
  dependentOn?: number;
  deviceId?: string;
}

/** Sync metadata */
export interface SyncMetadata {
  id: number;
  lastSyncAt: string;
  lastSuccessfulSyncAt?: string;
  lastSyncStatus: 'success' | 'partial' | 'failed';
  pendingChanges: number;
  deviceId: string;
  serverVersion: number;
}

/** Conflict resolution record */
export interface ConflictRecord {
  id?: number;
  entity: string;
  entityId: string;
  localVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown>;
  conflictType: 'update_update' | 'update_delete' | 'delete_update';
  detectedAt: string;
  resolvedAt?: string;
  resolution?: 'local_wins' | 'server_wins' | 'merged';
  resolvedBy?: string;
}

/** Network status */
export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: 'wifi' | '4g' | '3g' | 'slow_2g' | 'offline';
  lastChecked: string;
  wasOffline: boolean;
}

// ============================================
// DATABASE CLASS
// ============================================

export class SMSDatabase extends Dexie {
  students!: Table<CachedStudent, string>;
  timetables!: Table<CachedTimetable, string>;
  attendance!: Table<OfflineAttendance, number>;
  attendanceSessions!: Table<OfflineAttendanceSession, string>;
  formDrafts!: Table<FormDraft, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  syncMetadata!: Table<SyncMetadata, number>;
  conflicts!: Table<ConflictRecord, number>;

  constructor() {
    super('SMSDatabase');

    this.version(1).stores({
      students: 'id, studentId, classId, sectionId, enrollmentStatus, cachedAt',
      attendance: '++id, localId, studentId, sessionId, date, isSynced, conflictStatus, lastModified',
      attendanceSessions: 'id, classId, date, isSynced, cachedAt',
      formDrafts: '++id, formType, formId, userId, createdAt',
      syncQueue: '++id, operation, entity, entityId, status, priority, createdAt',
      syncMetadata: 'id',
      conflicts: '++id, entity, entityId, conflictType, resolvedAt'
    });

    this.version(2).stores({
      timetables: 'id, ownerType, ownerId, cachedAt',
    }).upgrade(async () => {
      // v2 adds timetables table — existing v1 tables are unchanged,
      // so no data migration is needed. The upgrade handler prevents
      // Dexie from silently clearing the database on schema version bump.
    });
  }
}

// ============================================
// DATABASE INSTANCE
// ============================================

export const db = new SMSDatabase();

// ============================================
// DATABASE UTILITIES
// ============================================

/**
 * Clear all data from the database
 */
export async function clearDatabase(): Promise<void> {
  await Promise.all([
    db.students.clear(),
    db.timetables.clear(),
    db.attendance.clear(),
    db.attendanceSessions.clear(),
    db.formDrafts.clear(),
    db.syncQueue.clear(),
    db.syncMetadata.clear(),
    db.conflicts.clear(),
  ]);
}

/**
 * Get database size estimate
 */
export async function getDatabaseSize(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return { usage: 0, quota: 0 };
}

/**
 * Export database for backup
 */
export async function exportDatabase(): Promise<Record<string, unknown>> {
  const [students, timetables, attendance, sessions, drafts, syncQueue, conflicts] = await Promise.all([
    db.students.toArray(),
    db.timetables.toArray(),
    db.attendance.toArray(),
    db.attendanceSessions.toArray(),
    db.formDrafts.toArray(),
    db.syncQueue.toArray(),
    db.conflicts.toArray()
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      students,
      timetables,
      attendance,
      attendanceSessions: sessions,
      formDrafts: drafts,
      syncQueue,
      conflicts
    }
  };
}

/**
 * Import database from backup
 */
export async function importDatabase(backup: Record<string, unknown>): Promise<void> {
  if (!backup.data || typeof backup.data !== 'object') {
    throw new Error('Invalid backup format: missing or invalid "data" field');
  }

  const data = backup.data as Record<string, unknown[]>;
  
  // Validate table names
  const validTables = ['students', 'timetables', 'attendance', 'attendanceSessions', 'formDrafts', 'syncQueue', 'conflicts'];
  for (const key of Object.keys(data)) {
    if (!validTables.includes(key)) {
      throw new Error(`Unknown table in backup: "${key}"`);
    }
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid data for table "${key}": expected array`);
    }
  }

  // Handle legacy export where 'attendanceSessions' was renamed to 'sessions'
  if (data.sessions && !data.attendanceSessions) {
    data.attendanceSessions = data.sessions as OfflineAttendanceSession[];
  }

  await clearDatabase();
  
  const imports: Promise<unknown>[] = [];
  if (data.students) imports.push(db.students.bulkAdd(data.students as CachedStudent[]));
  if (data.timetables) imports.push(db.timetables.bulkAdd(data.timetables as CachedTimetable[]));
  if (data.attendance) imports.push(db.attendance.bulkAdd(data.attendance as OfflineAttendance[]));
  if (data.attendanceSessions) imports.push(db.attendanceSessions.bulkAdd(data.attendanceSessions as OfflineAttendanceSession[]));
  if (data.formDrafts) imports.push(db.formDrafts.bulkAdd(data.formDrafts as FormDraft[]));
  if (data.syncQueue) imports.push(db.syncQueue.bulkAdd(data.syncQueue as SyncQueueItem[]));
  if (data.conflicts) imports.push(db.conflicts.bulkAdd(data.conflicts as ConflictRecord[]));
  await Promise.all(imports);
}

export default db;
