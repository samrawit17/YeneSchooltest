/**
 * Sync Service for Offline-First Functionality
 * 
 * Features:
 * - Auto-sync when internet is restored
 * - Conflict resolution (latest update wins)
 * - Retry logic with exponential backoff
 * - Priority-based sync queue
 */

import { db, type CachedStudent, type OfflineAttendance, type OfflineMarkEntry, type CachedSetting, type CachedGradeAssignment, type CachedGradingComponent, type CachedGradeEntryData, type SyncQueueItem, type ConflictRecord } from './index';
import api from '@/lib/api/core';

// ============================================
// CONFIGURATION
// ============================================

interface SyncConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  syncIntervalMs: number;
  conflictResolutionStrategy: 'latest_wins' | 'server_wins' | 'local_wins' | 'manual';
}

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  batchSize: 50,
  syncIntervalMs: 30000, // 30 seconds
  conflictResolutionStrategy: 'latest_wins'
};

// ============================================
// TYPES
// ============================================

type SyncEventType = 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_detected' | 'item_synced';

interface SyncEvent {
  type: SyncEventType;
  timestamp: string;
  details?: Record<string, unknown>;
}

type SyncEventListener = (event: SyncEvent) => void;

// ============================================
// SYNC SERVICE CLASS
// ============================================

class SyncService {
  private config: SyncConfig;
  private isOnline: boolean = typeof navigator === 'undefined' ? true : navigator.onLine;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<SyncEventType, SyncEventListener[]> = new Map();
  private deviceId: string;
  private autoSyncRefCount: number = 0;

  private handleOnline: (() => void) | null = null;
  private handleOffline: (() => void) | null = null;
  private handleConnectionChange: (() => void) | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deviceId = this.generateDeviceId();
    
    this.setupNetworkListeners();
  }

  // ============================================
  // NETWORK DETECTION
  // ============================================

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    this.handleOnline = () => {
      this.isOnline = true;
      console.log('[SyncService] Network online - starting sync');
      this.emitEvent({ type: 'sync_started', timestamp: new Date().toISOString() });
      this.syncNow();
    };

    this.handleOffline = () => {
      this.isOnline = false;
      console.log('[SyncService] Network offline - queuing operations');
    };

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { addEventListener: (type: string, cb: () => void) => void } }).connection;
      if (connection) {
        this.handleConnectionChange = () => {
          this.isOnline = navigator.onLine;
        };
        connection.addEventListener('change', this.handleConnectionChange);
      }
    }
  }

  /**
   * Clean up all listeners and intervals. Call when the service is no longer needed
   * (e.g., on module cleanup / hot reload).
   */
  destroy(): void {
    this.stopAutoSync();

    if (typeof window !== 'undefined') {
      if (this.handleOnline) window.removeEventListener('online', this.handleOnline);
      if (this.handleOffline) window.removeEventListener('offline', this.handleOffline);

      if (this.handleConnectionChange && 'connection' in navigator) {
        const connection = (navigator as Navigator & { connection?: { removeEventListener: (type: string, cb: () => void) => void } }).connection;
        if (connection) {
          connection.removeEventListener('change', this.handleConnectionChange);
        }
      }
    }

    this.handleOnline = null;
    this.handleOffline = null;
    this.handleConnectionChange = null;
    this.eventListeners.clear();
  }

  private generateDeviceId(): string {
    if (typeof localStorage === 'undefined') {
      return 'server';
    }

    const stored = localStorage.getItem('sms_device_id');
    if (stored) return stored;
    
    const newId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('sms_device_id', newId);
    return newId;
  }

  // ============================================
  // EVENT SYSTEM
  // ============================================

  on(eventType: SyncEventType, listener: SyncEventListener): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  off(eventType: SyncEventType, listener: SyncEventListener): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emitEvent(event: SyncEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }

  // ============================================
  // SYNC QUEUE OPERATIONS
  // ============================================

  /**
   * Add item to sync queue
   */
  async addToQueue(
    operation: 'create' | 'update' | 'delete',
    entity: SyncQueueItem['entity'],
    entityId: string,
    payload: Record<string, unknown>,
    priority: number = 5
  ): Promise<number> {
    const item: SyncQueueItem = {
      operation,
      entity,
      entityId,
      payload,
      priority,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deviceId: this.deviceId
    };

    const id = await db.syncQueue.add(item);
    
    // Trigger sync if online
    if (this.isOnline) {
      this.syncNow();
    }
    
    return id;
  }

  /**
   * Get pending sync items
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    return db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .and((item: SyncQueueItem) => item.retryCount < item.maxRetries)
      .sortBy('priority');
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    failedCount: number;
    isOnline: boolean;
    isSyncing: boolean;
  }> {
    const [pending, failed] = await Promise.all([
      db.syncQueue.where('status').anyOf(['pending']).count(),
      db.syncQueue.where('status').equals('failed').count()
    ]);

    return {
      pendingCount: pending,
      failedCount: failed,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing
    };
  }

  // ============================================
  // ATTENDANCE SYNC
  // ============================================

  /**
   * Save attendance record locally and queue for sync
   */
  async saveAttendanceOffline(attendance: Omit<OfflineAttendance, 'id' | 'isSynced' | 'localId'>): Promise<string> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const record: OfflineAttendance = {
      ...attendance,
      localId,
      isSynced: false,
      lastModified: new Date().toISOString(),
      deviceId: this.deviceId
    };

    // Save to local database
    await db.attendance.add(record);

    // Queue for sync
    await this.addToQueue(
      'create',
      'attendance',
      localId,
      record as unknown as Record<string, unknown>,
      8 // High priority for attendance
    );

    return localId;
  }

  async cacheStudents(students: Array<Partial<CachedStudent> & { id: string }>): Promise<void> {
    const now = Date.now();
    await db.students.bulkPut(
      students.map((student) => ({
        firstName: '',
        lastName: '',
        studentId: student.id,
        classId: '',
        enrollmentStatus: 'active',
        updatedAt: now,
        ...student,
        cachedAt: now,
      } as CachedStudent))
    );
  }

  async getCachedStudents(classId: string, sectionId?: string): Promise<CachedStudent[]> {
    const students = await db.students.where('classId').equals(classId).toArray();
    return sectionId ? students.filter((student) => student.sectionId === sectionId) : students;
  }

  async cacheTeacherTimetable(
    teacherId: string,
    slots: Record<string, unknown>[],
    schoolSettings?: Record<string, unknown>,
  ): Promise<void> {
    await db.timetables.put({
      id: `teacher:${teacherId}`,
      ownerType: 'teacher',
      ownerId: teacherId,
      slots,
      schoolSettings,
      cachedAt: Date.now(),
    });
  }

  async getCachedTeacherTimetable(teacherId: string) {
    return db.timetables.get(`teacher:${teacherId}`);
  }

  async saveGradeDraftOffline(payload: Record<string, unknown>): Promise<number> {
    const contextKey = String(payload.contextKey || payload.localId || Date.now());
    await db.formDrafts.put({
      formType: 'grading',
      formId: contextKey,
      formData: payload,
      userId: String(payload.userId || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false,
    });

    return this.addToQueue('create', 'grade', contextKey, {
      ...payload,
      action: 'save-draft',
      contextKey,
    }, 7);
  }

  async queueGradeSubmissionOffline(payload: Record<string, unknown>): Promise<number> {
    const contextKey = String(payload.contextKey || payload.localId || Date.now());
    await db.formDrafts.put({
      formType: 'grading',
      formId: `${contextKey}:submit`,
      formData: payload,
      userId: String(payload.userId || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false,
    });

    return this.addToQueue('create', 'grade', contextKey, {
      ...payload,
      action: 'submit-all',
      contextKey,
    }, 9);
  }

  async saveMessageDraftOffline(payload: Record<string, unknown>): Promise<number> {
    await db.formDrafts.add({
      formType: 'communication',
      formId: String(payload.conversationId || payload.localId || Date.now()),
      formData: payload,
      userId: String(payload.userId || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false,
    });

    return this.addToQueue('create', 'message', String(payload.localId || Date.now()), payload, 6);
  }

  async saveAnnouncementDraftOffline(payload: Record<string, unknown>): Promise<number> {
    await db.formDrafts.add({
      formType: 'communication',
      formId: String(payload.localId || Date.now()),
      formData: payload,
      userId: String(payload.userId || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false,
    });

    return this.addToQueue('create', 'announcement', String(payload.localId || Date.now()), payload, 5);
  }

  // ============================================
  // MARK ENTRY OFFLINE
  // ============================================

  async saveMarkEntryOffline(data: {
    studentId: string;
    examId: string;
    subjectId: string;
    academicYearId: string;
    termId?: string;
    score: number;
    totalScore?: number;
    grade?: string;
    remarks?: string;
    recordedBy: string;
  }): Promise<string> {
    const localId = `mark_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    await db.markEntries.add({
      localId,
      studentId: data.studentId,
      examId: data.examId,
      subjectId: data.subjectId,
      academicYearId: data.academicYearId,
      termId: data.termId,
      score: data.score,
      totalScore: data.totalScore,
      grade: data.grade,
      remarks: data.remarks,
      recordedBy: data.recordedBy,
      recordedAt: now,
      isSynced: false,
      lastModified: now,
      deviceId: this.deviceId,
    });

    await this.addToQueue('create', 'mark_entry', localId, data, 6);
    return localId;
  }

  async cacheMarkSession(data: {
    examId: string;
    examName: string;
    subjectId: string;
    subjectName: string;
    classId: string;
    academicYearId: string;
    termId?: string;
    totalStudents: number;
    recordedBy: string;
  }): Promise<void> {
    await db.markSessions.put({
      id: `${data.examId}_${data.subjectId}_${data.classId}`,
      examId: data.examId,
      examName: data.examName,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      classId: data.classId,
      academicYearId: data.academicYearId,
      termId: data.termId,
      totalStudents: data.totalStudents,
      enteredCount: 0,
      recordedBy: data.recordedBy,
      isSynced: true,
      cachedAt: Date.now(),
    }, `${data.examId}_${data.subjectId}_${data.classId}`);
  }

  async getCachedMarkEntries(examId: string, subjectId: string): Promise<OfflineMarkEntry[]> {
    return db.markEntries
      .where({ examId, subjectId })
      .toArray();
  }

  // ============================================
  // GRADING DATA CACHE
  // ============================================

  async cacheTeacherAssignments(assignments: Array<{
    id: string;
    academicYearId: string;
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    type?: string;
    isHomeroom?: boolean;
  }>, userId: string): Promise<void> {
    const now = Date.now();
    await db.gradeAssignments.bulkPut(
      assignments.map((a) => ({
        id: a.id,
        academicYearId: a.academicYearId,
        subjectId: a.subjectId,
        subjectName: a.subjectName,
        classId: a.classId,
        className: a.className,
        sectionId: a.sectionId,
        sectionName: a.sectionName,
        type: a.type,
        isHomeroom: a.isHomeroom,
        userId,
        cachedAt: now,
      }))
    );
  }

  async getCachedTeacherAssignments(academicYearId: string, userId: string): Promise<CachedGradeAssignment[]> {
    return db.gradeAssignments
      .where({ academicYearId, userId })
      .toArray();
  }

  async clearCachedTeacherAssignments(academicYearId: string, userId: string): Promise<void> {
    await db.gradeAssignments
      .where({ academicYearId, userId })
      .delete();
  }

  async cacheGradingComponents(components: Array<{
    code: string;
    name: string;
    percentage: number;
  }>, academicYearId?: string): Promise<void> {
    const now = Date.now();
    await db.gradeComponents.bulkPut(
      components.map((c) => ({
        id: `${c.code}_${academicYearId || 'default'}`,
        code: c.code,
        name: c.name,
        percentage: c.percentage,
        academicYearId,
        cachedAt: now,
      }))
    );
  }

  async getCachedGradingComponents(academicYearId?: string): Promise<CachedGradingComponent[]> {
    if (academicYearId) {
      return db.gradeComponents
        .where('academicYearId')
        .equals(academicYearId)
        .toArray();
    }
    return db.gradeComponents.toArray();
  }

  async cacheGradeEntryData(data: {
    academicYearId: string;
    termId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
    students: Record<string, unknown>[];
    componentAvailability: Record<string, unknown>;
    gradingComponents: { code: string; name: string; percentage: number }[];
    isTermLocked: boolean;
    userId: string;
  }): Promise<void> {
    const id = `${data.classId}:${data.sectionId}:${data.subjectId}:${data.termId}`;
    const now = Date.now();
    await db.gradeEntryData.put({
      id,
      academicYearId: data.academicYearId,
      termId: data.termId,
      classId: data.classId,
      sectionId: data.sectionId,
      subjectId: data.subjectId,
      students: data.students,
      componentAvailability: data.componentAvailability,
      gradingComponents: data.gradingComponents,
      isTermLocked: data.isTermLocked,
      userId: data.userId,
      cachedAt: now,
      updatedAt: now,
    }, id);
  }

  async getCachedGradeEntryData(classId: string, sectionId: string, subjectId: string, termId: string): Promise<CachedGradeEntryData | undefined> {
    const id = `${classId}:${sectionId}:${subjectId}:${termId}`;
    return db.gradeEntryData.get(id);
  }

  async cacheComponentAvailability(availability: Record<string, unknown>, key: {
    academicYearId: string;
    termId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  }): Promise<void> {
    const id = `${key.classId}:${key.sectionId}:${key.subjectId}:${key.termId}`;
    await db.gradeAvailability.put({
      id,
      academicYearId: key.academicYearId,
      termId: key.termId,
      classId: key.classId,
      sectionId: key.sectionId,
      subjectId: key.subjectId,
      availability,
      cachedAt: Date.now(),
    }, id);
  }

  async getCachedComponentAvailability(classId: string, sectionId: string, subjectId: string, termId: string): Promise<Record<string, unknown> | undefined> {
    const id = `${classId}:${sectionId}:${subjectId}:${termId}`;
    const cached = await db.gradeAvailability.get(id);
    return cached?.availability;
  }

  // ============================================
  // SETTINGS OFFLINE
  // ============================================

  async cacheSetting(key: string, value: unknown, scope: 'school' | 'user' | 'global', scopeId: string): Promise<void> {
    await db.settings.put({
      id: `${scope}:${scopeId}:${key}`,
      key,
      value,
      scope,
      scopeId,
      cachedAt: Date.now(),
    }, `${scope}:${scopeId}:${key}`);
  }

  async getCachedSetting(key: string, scope: 'school' | 'user' | 'global', scopeId: string): Promise<unknown | null> {
    const setting = await db.settings.get(`${scope}:${scopeId}:${key}`);
    return setting?.value ?? null;
  }

  async saveSettingChangeOffline(key: string, value: unknown, scope: 'school' | 'user' | 'global', scopeId: string, changedBy: string): Promise<void> {
    await this.cacheSetting(key, value, scope, scopeId);
    await this.addToQueue('update', 'setting', `${scope}:${scopeId}:${key}`, { key, value, scope, scopeId, changedBy }, 8);
  }

  async getCachedSettingsByScope(scope: 'school' | 'user' | 'global', scopeId: string): Promise<Record<string, unknown>> {
    const all = await db.settings
      .where({ scope, scopeId })
      .toArray();
    return all.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  }

  /**
   * Get attendance records pending sync
   */
  async getPendingAttendance(): Promise<OfflineAttendance[]> {
    return db.attendance
      .filter((r) => r.isSynced === false)
      .toArray();
  }

  /**
   * Mark attendance as synced
   */
  async markAttendanceSynced(localId: string, serverId: string, serverVersion: number): Promise<void> {
    const records = await db.attendance
      .where('localId')
      .equals(localId)
      .toArray();
    
    if (records.length > 0) {
      const record = records[0];
      await db.attendance.update(record.id!, {
        isSynced: true,
        syncedAt: new Date().toISOString(),
        serverVersion
      });
    }
  }

  // ============================================
  // CONFLICT RESOLUTION
  // ============================================

  /**
   * Detect and handle conflicts
   */
  async handleConflict(
    entity: string,
    entityId: string,
    localVersion: Record<string, unknown>,
    serverVersion: Record<string, unknown>
  ): Promise<void> {
    const conflictType = this.detectConflictType(localVersion, serverVersion);
    
    const conflict: ConflictRecord = {
      entity,
      entityId,
      localVersion,
      serverVersion,
      conflictType,
      detectedAt: new Date().toISOString()
    };

    await db.conflicts.add(conflict);
    this.emitEvent({ 
      type: 'conflict_detected', 
      timestamp: new Date().toISOString(),
      details: { entity, entityId, conflictType }
    });

    // Auto-resolve based on strategy
    if (this.config.conflictResolutionStrategy !== 'manual') {
      await this.autoResolveConflict(conflict);
    }
  }

  private detectConflictType(
    localVersion: Record<string, unknown>,
    serverVersion: Record<string, unknown>
  ): 'update_update' | 'update_delete' | 'delete_update' {
    if (localVersion._deleted && !serverVersion._deleted) return 'delete_update';
    if (!localVersion._deleted && serverVersion._deleted) return 'update_delete';
    return 'update_update';
  }

  /**
   * Auto-resolve conflict based on strategy
   */
  private async autoResolveConflict(conflict: ConflictRecord): Promise<void> {
    let resolution: 'local_wins' | 'server_wins' | 'merged';
    let resolvedData: Record<string, unknown>;

    switch (this.config.conflictResolutionStrategy) {
      case 'latest_wins':
        const localModified = new Date(conflict.localVersion.lastModified as string || 0);
        const serverModified = new Date(conflict.serverVersion.lastModified as string || 0);
        
        if (localModified > serverModified) {
          resolution = 'local_wins';
          resolvedData = conflict.localVersion;
        } else {
          resolution = 'server_wins';
          resolvedData = conflict.serverVersion;
        }
        console.warn(
          `[SyncService] Conflict auto-resolved (latest_wins): ${conflict.entity}/${conflict.entityId}`,
          `→ ${resolution}, discarded version:`,
          resolution === 'local_wins' ? conflict.serverVersion : conflict.localVersion,
        );
        break;
        
      case 'server_wins':
        resolution = 'server_wins';
        resolvedData = conflict.serverVersion;
        break;
        
      case 'local_wins':
        resolution = 'local_wins';
        resolvedData = conflict.localVersion;
        break;
        
      default:
        return; // Manual resolution required
    }

    // Update the record with resolved data
    await this.applyResolution(conflict.id!, resolution, resolvedData);
  }

  /**
   * Apply conflict resolution
   */
  async applyResolution(
    conflictId: number,
    resolution: 'local_wins' | 'server_wins' | 'merged',
    resolvedData: Record<string, unknown>
  ): Promise<void> {
    const conflict = await db.conflicts.get(conflictId);
    if (!conflict) return;

    // Update conflict record
    await db.conflicts.update(conflictId, {
      resolution,
      resolvedAt: new Date().toISOString(),
      resolvedBy: this.deviceId
    });

    // Re-queue the resolved data for sync
    if (resolution === 'local_wins' || resolution === 'merged') {
      await this.addToQueue(
        'update',
        conflict.entity as 'attendance' | 'student' | 'grade' | 'enrollment' | 'mark_entry' | 'setting' | 'grade_assignment' | 'grade_component' | 'grade_entry',
        conflict.entityId,
        resolvedData,
        10 // High priority for resolved conflicts
      );
    }

    this.emitEvent({ 
      type: 'sync_completed', 
      timestamp: new Date().toISOString(),
      details: { conflictId, resolution }
    });
  }

  /**
   * Get unresolved conflicts
   */
  async getConflicts(): Promise<ConflictRecord[]> {
    const all = await db.conflicts.toArray();
    return all.filter((c) => !c.resolvedAt);
  }

  // ============================================
  // SYNC EXECUTION
  // ============================================

  /**
   * Trigger immediate sync
   */
  async syncNow(): Promise<{ success: boolean; synced: number; failed: number }> {
    this.isOnline = navigator.onLine;
    if (!this.isOnline || this.isSyncing) {
      return { success: false, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.emitEvent({ type: 'sync_started', timestamp: new Date().toISOString() });

    let synced = 0;
    let failed = 0;

    try {
      const pendingItems = await this.getPendingItems();
      
      for (const item of pendingItems) {
        if (!item.id) continue;

        try {
          // Mark as in progress (within a transaction)
          await db.transaction('rw', db.syncQueue, async () => {
            await db.syncQueue.update(item.id!, {
              status: 'in_progress',
              lastAttempt: new Date().toISOString()
            });
          });

          // Attempt sync
          await this.syncItem(item);
          
          // Mark as completed (within a transaction)
          await db.transaction('rw', db.syncQueue, async () => {
            await db.syncQueue.update(item.id!, { status: 'completed' });
          });
          synced++;
          
          this.emitEvent({ 
            type: 'item_synced', 
            timestamp: new Date().toISOString(),
            details: { entity: item.entity, entityId: item.entityId }
          });
          
        } catch (error) {
          // Increment retry count
          const newRetryCount = item.retryCount + 1;
          const newStatus = newRetryCount >= item.maxRetries ? 'failed' : 'pending';
          
          if (item.id) {
            await db.transaction('rw', db.syncQueue, async () => {
              await db.syncQueue.update(item.id!, {
                retryCount: newRetryCount,
                status: newStatus,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            });
          }
          
          failed++;
        }
      }

      this.emitEvent({ 
        type: 'sync_completed', 
        timestamp: new Date().toISOString(),
        details: { synced, failed }
      });

    } catch (error) {
      this.emitEvent({ 
        type: 'sync_failed', 
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      this.isSyncing = false;
    }

    return { success: failed === 0, synced, failed };
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const headers = { 'X-Device-ID': this.deviceId };

    if (item.entity === 'grade') {
      const action = String(item.payload.action || 'save-draft');
      if (action === 'submit-all') {
        const { action: _action, grades, contextKey, userId, ...params } = item.payload;
        await api.post('/grading/teacher/grades/bulk', { grades }, {
          headers,
          skipAuthErrorRedirect: true,
        } as any);
        await api.post('/grading/teacher/grades/submit-all', null, {
          headers,
          params,
          skipAuthErrorRedirect: true,
        } as any);
        return;
      }

      await api.post('/grading/teacher/grades/bulk', item.payload, {
        headers,
        skipAuthErrorRedirect: true,
      } as any);
      return;
    }

    if (item.entity === 'message') {
      const conversationId = item.payload.conversationId;
      const content = item.payload.content;
      if (!conversationId || !content) {
        throw new Error('conversationId and content are required to sync message drafts');
      }
      await api.post(`/messages/${conversationId}`, { content }, {
        headers,
        skipAuthErrorRedirect: true,
      } as any);
      return;
    }

    if (item.entity === 'announcement') {
      const { localId, userId, ...data } = item.payload;
      await api.post('/announcements', data, {
        headers,
        skipAuthErrorRedirect: true,
      } as any);
      return;
    }

    if (item.entity === 'mark_entry') {
      await api.post('/exams/marks/bulk', { marks: [item.payload] }, {
        headers,
        skipAuthErrorRedirect: true,
      } as any);

      await db.markEntries
        .where('localId')
        .equals(item.entityId)
        .modify({ isSynced: true, syncedAt: new Date().toISOString() });
      return;
    }

    if (item.entity === 'setting') {
      await api.post('/settings', item.payload, {
        headers,
        skipAuthErrorRedirect: true,
      } as any);
      return;
    }

    const response = await api.post(
      `/api/sync/${item.entity}`,
      {
        operation: item.operation,
        entityId: item.entityId,
        payload: {
          ...item.payload,
          deviceId: this.deviceId,
        },
        localModified: item.createdAt
      },
      {
        headers: { 'X-Device-ID': this.deviceId },
        skipAuthErrorRedirect: true,
      } as any
    );

    const result = response.data;
    if (result?.success === false && result.serverVersion) {
      await this.handleConflict(
        item.entity,
        item.entityId,
        item.payload,
        result.serverVersion
      );
      return;
    }
    
    // Update local record with server ID if needed
    if (item.entity === 'attendance' && item.operation === 'create') {
      await this.markAttendanceSynced(item.entityId, result.serverId, result.version);
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(): void {
    this.autoSyncRefCount++;
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncNow();
      }
    }, this.config.syncIntervalMs);
    
    // Initial sync
    this.syncNow();
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    this.autoSyncRefCount--;
    if (this.autoSyncRefCount > 0) return;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Clear failed sync items
   */
  async clearFailedItems(): Promise<number> {
    const failedItems = await db.syncQueue
      .where('status')
      .equals('failed')
      .toArray();
    
    const idsToDelete = failedItems
      .map((i: SyncQueueItem) => i.id)
      .filter((id): id is number => id !== undefined);
    await db.syncQueue.bulkDelete(idsToDelete);
    return failedItems.length;
  }

  /**
   * Force full re-sync
   */
  async forceFullSync(): Promise<void> {
    // Mark all pending items for re-sync
    await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .modify({ status: 'pending', retryCount: 0 });
    
    await this.syncNow();
  }
}

// ============================================
// EXPORTS
// ============================================

export const syncService = new SyncService();
export default syncService;
