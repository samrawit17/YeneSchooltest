/**
 * Database Index
 * 
 * Export all IndexedDB related modules
 */

export { db, SMSDatabase, clearDatabase, getDatabaseSize, exportDatabase, importDatabase } from './db/index';
export type { 
  CachedStudent, 
  OfflineAttendance, 
  OfflineAttendanceSession, 
  FormDraft, 
  SyncQueueItem, 
  SyncMetadata, 
  ConflictRecord, 
  NetworkStatus 
} from './db/index';

export { syncService } from './db/sync-service';
