/**
 * Sync Service for Offline-First Functionality
 * 
 * Features:
 * - Auto-sync when internet is restored
 * - Conflict resolution (latest update wins)
 * - Retry logic with exponential backoff
 * - Priority-based sync queue
 */

import { db, type CachedStudent, type OfflineAttendance, type SyncQueueItem, type ConflictRecord } from './index';
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

    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[SyncService] Network online - starting sync');
      this.emitEvent({ type: 'sync_started', timestamp: new Date().toISOString() });
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[SyncService] Network offline - queuing operations');
    });

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { addEventListener: (type: string, cb: () => void) => void } }).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.isOnline = navigator.onLine;
        });
      }
    }
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
    await db.formDrafts.put({
      formType: 'grading',
      formId: String(payload.contextKey || payload.localId || Date.now()),
      formData: payload,
      userId: String(payload.userId || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false,
    });

    return this.addToQueue('create', 'grade', String(payload.contextKey || Date.now()), payload, 7);
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

  /**
   * Get attendance records pending sync
   */
  async getPendingAttendance(): Promise<OfflineAttendance[]> {
    return db.attendance
      .where('isSynced')
      .equals(0)
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
        conflict.entity as 'attendance' | 'student' | 'grade' | 'enrollment',
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
    return db.conflicts
      .where('resolvedAt')
      .equals('')
      .toArray();
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
        try {
          // Mark as in progress
          await db.syncQueue.update(item.id!, {
            status: 'in_progress',
            lastAttempt: new Date().toISOString()
          });

          // Attempt sync
          await this.syncItem(item);
          
          // Mark as completed
          await db.syncQueue.update(item.id!, { status: 'completed' });
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
          
          await db.syncQueue.update(item.id!, {
            retryCount: newRetryCount,
            status: newStatus,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
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
    if (item.entity === 'grade') {
      await api.post('/grading/teacher/grades/bulk', item.payload, {
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
        skipAuthErrorRedirect: true,
      } as any);
      return;
    }

    if (item.entity === 'announcement') {
      const { localId, userId, ...data } = item.payload;
      await api.post('/announcements', data, {
        skipAuthErrorRedirect: true,
      } as any);
      return;
    }

    const response = await api.post(
      `/api/sync/${item.entity}`,
      {
        operation: item.operation,
        entityId: item.entityId,
        payload: item.payload,
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
    
    const idsToDelete = failedItems.filter((i: SyncQueueItem) => i.id !== undefined).map((i: SyncQueueItem) => i.id!);
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
