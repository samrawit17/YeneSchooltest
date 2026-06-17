/**
 * React Hook for Offline-First Attendance
 * 
 * Features:
 * - Cache student data for offline access
 * - Queue attendance records when offline
 * - Auto-sync when connection restored
 * - Display sync status
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CachedStudent, type OfflineAttendance, type OfflineAttendanceSession } from '@/lib/db';
import { syncService } from '@/lib/db/sync-service';
import { studentsAPI } from '@/lib/api/students';

// ============================================
// TYPES
// ============================================

interface UseOfflineAttendanceOptions {
  classId?: string;
  date?: string;
  userId?: string;
  autoSync?: boolean;
}

interface AttendanceRecord extends OfflineAttendance {
  student?: CachedStudent;
}

interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
}

// ============================================
// HOOK
// ============================================

export function useOfflineAttendance(options: UseOfflineAttendanceOptions = {}) {
  const { classId, date, userId, autoSync = true } = options;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    isOnline: true,
    isSyncing: false
  });

  // Start auto-sync if enabled
  useEffect(() => {
    if (autoSync) {
      syncService.startAutoSync();
    }
    
    return () => {
      if (autoSync) {
        syncService.stopAutoSync();
      }
    };
  }, [autoSync]);

  // Poll sync status
  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        ...status
      }));
    };
    
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen to sync events
  useEffect(() => {
    const handleSyncComplete = () => {
      updateSyncStatus();
    };
    
    const handleSyncFailed = () => {
      updateSyncStatus();
    };
    
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        ...status
      }));
    };
    
    syncService.on('sync_completed', handleSyncComplete);
    syncService.on('sync_failed', handleSyncFailed);
    
    return () => {
      syncService.off('sync_completed', handleSyncComplete);
      syncService.off('sync_failed', handleSyncFailed);
    };
  }, []);

  // Get students for the class (cached)
  const students = useLiveQuery(async () => {
    if (!classId) return [];
    
    return db.students
      .where('classId')
      .equals(classId)
      .and(s => s.enrollmentStatus === 'active')
      .toArray();
  }, [classId]);

  // Get attendance records for the session
  const attendanceRecords = useLiveQuery(async () => {
    if (!date || !classId) return [];
    
    // Get session
    const sessions = await db.attendanceSessions
      .where(['classId', 'date'])
      .equals([classId, date])
      .toArray();
    
    if (sessions.length === 0) return [];
    
    const session = sessions[0];
    
    // Get attendance records for this session
    const records = await db.attendance
      .where('sessionId')
      .equals(session.id)
      .toArray();
    
    // Join with student data
    return records.map(record => ({
      ...record,
      student: students?.find(s => s.id === record.studentId)
    }));
  }, [classId, date, students]);

  // Get sessions for the date
  const sessions = useLiveQuery(async () => {
    if (!date) return [];
    
    return db.attendanceSessions
      .where('date')
      .equals(date)
      .toArray();
  }, [date]);

  // ============================================
  // METHODS
  // ============================================

  /**
    * Cache students from server
    */
  const cacheStudents = useCallback(async (classId: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await studentsAPI.getAll({ classId });
      
      const data = response.data;
      
      // Cache students in IndexedDB
      const studentsToCache: CachedStudent[] = (Array.isArray(data) ? data : data?.data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        firstName: s.firstName as string,
        lastName: s.lastName as string,
        studentId: s.studentId as string,
        classId: s.classId as string,
        className: s.className as string | undefined,
        sectionId: s.sectionId as string | undefined,
        sectionName: s.sectionName as string | undefined,
        photo: s.photo as string | undefined,
        email: s.email as string | undefined,
        phone: s.phone as string | undefined,
        enrollmentStatus: s.enrollmentStatus as 'active' | 'inactive' | 'graduated' | 'suspended',
        cachedAt: Date.now(),
        updatedAt: s.updatedAt as string || new Date().toISOString()
      }));
      
      await db.students.bulkPut(studentsToCache);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Record attendance for a student
   */
  const recordAttendance = useCallback(async (
    studentId: string,
    sessionId: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string
  ): Promise<string> => {
    const record: Omit<OfflineAttendance, 'id' | 'isSynced' | 'localId'> = {
      studentId,
      sessionId,
      date: new Date().toISOString().split('T')[0],
      status,
      remarks,
      recordedBy: userId || 'unknown',
      recordedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    return syncService.saveAttendanceOffline(record);
  }, [userId]);

  /**
   * Update attendance record
   */
  const updateAttendance = useCallback(async (
    localId: string,
    updates: Partial<Pick<OfflineAttendance, 'status' | 'remarks'>>
  ): Promise<void> => {
    // Get the current full record to send complete payload
    const existing = await db.attendance
      .where('localId')
      .equals(localId)
      .first();

    if (!existing) {
      throw new Error(`Attendance record ${localId} not found for update`);
    }

    const now = new Date().toISOString();
    const updatedRecord = {
      ...existing,
      ...updates,
      lastModified: now,
      isSynced: false,
    };

    await db.transaction('rw', db.attendance, async () => {
      await db.attendance
        .where('localId')
        .equals(localId)
        .modify({
          ...updates,
          lastModified: now,
          isSynced: false,
        });
    });
    
    // Re-queue for sync with full payload
    await syncService.addToQueue(
      'update',
      'attendance',
      localId,
      updatedRecord as unknown as Record<string, unknown>,
      8
    );
  }, []);

  /**
   * Create attendance session
   */
  const createSession = useCallback(async (
    classId: string,
    className: string,
    subjectId?: string,
    subjectName?: string
  ): Promise<string> => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    
    const session: OfflineAttendanceSession = {
      id: sessionId,
      classId,
      className,
      subjectId,
      subjectName,
      date: now.toISOString().split('T')[0],
      startTime: now.toTimeString().slice(0, 5),
      recordedBy: userId || 'unknown',
      isSynced: false,
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      cachedAt: Date.now()
    };
    
    await db.attendanceSessions.add(session);
    
    // Queue for sync
    await syncService.addToQueue('create', 'attendance', sessionId, session as unknown as Record<string, unknown>, 7);
    
    return sessionId;
  }, []);

  /**
   * Mark session as complete and update counts
   */
  const completeSession = useCallback(async (sessionId: string): Promise<void> => {
    const records = await db.attendance
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    
    await db.attendanceSessions.update(sessionId, {
      endTime: new Date().toTimeString().slice(0, 5),
      totalStudents: records.length,
      presentCount,
      absentCount,
      lateCount
    });
  }, []);

  /**
   * Get unsynced records count
   */
  const getUnsyncedCount = useCallback(async (): Promise<number> => {
    const all = await db.attendance.toArray();
    return all.filter((r) => r.isSynced === false).length;
  }, []);

  /**
   * Force sync now
   */
  const syncNow = useCallback(async () => {
    return syncService.syncNow();
  }, []);

  /**
   * Get student by ID from cache
   */
  const getStudent = useCallback(async (studentId: string): Promise<CachedStudent | undefined> => {
    return db.students.get(studentId);
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const unsyncedCount = useMemo(() => {
    return attendanceRecords?.filter(r => !r.isSynced).length || 0;
  }, [attendanceRecords]);

  const hasPendingChanges = useMemo(() => {
    return syncStatus.pendingCount > 0 || unsyncedCount > 0;
  }, [syncStatus.pendingCount, unsyncedCount]);

  return {
    // Data
    students,
    attendanceRecords,
    sessions,
    
    // State
    isLoading,
    error,
    syncStatus,
    hasPendingChanges,
    unsyncedCount,
    
    // Methods
    cacheStudents,
    recordAttendance,
    updateAttendance,
    createSession,
    completeSession,
    getUnsyncedCount,
    syncNow,
    getStudent
  };
}

export default useOfflineAttendance;
