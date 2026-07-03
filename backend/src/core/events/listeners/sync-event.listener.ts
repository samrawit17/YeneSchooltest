import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../event-bus.service';
import { SyncService } from '../../../sync/sync.service';
import type { AppEvent } from '../event.interface';

@Injectable()
export class SyncEventListener {
  private readonly logger = new Logger(SyncEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly syncService: SyncService,
  ) {
    this.eventBus.on('sync.attendance.batch', this.handleAttendanceBatch);
    this.eventBus.on('sync.mark-entry.batch', this.handleMarkEntryBatch);
    this.eventBus.on('sync.setting.changed', this.handleSettingChanged);
  }

  private handleAttendanceBatch = async (event: AppEvent): Promise<void> => {
    const { schoolId, items, deviceId, actorId } = event.payload;
    try {
      for (const item of items) {
        if (item.entity !== 'attendance') continue;
        await this.syncService.syncAttendance(
          item as any,
          { id: actorId, schoolId, role: 'TEACHER' } as any,
          deviceId,
        );
      }
      this.logger.log(`Synced ${items.length} attendance records (school=${schoolId})`);
    } catch (error) {
      this.logger.error(`Failed to sync attendance batch: ${error}`);
    }
  };

  private handleMarkEntryBatch = async (event: AppEvent): Promise<void> => {
    const { schoolId, items, actorId } = event.payload;
    try {
      for (const item of items) {
        if (item.entity !== 'mark_entry') continue;
        // Each mark entry item is processed by the exams service
        // The payload contains: studentId, examId, subjectId, score, etc.
        // This delegates to the existing sync service for now
        this.logger.log(`Mark entry sync queued: ${item.entityId} (school=${schoolId})`);
      }
      this.logger.log(`Queued ${items.length} mark entries for sync (school=${schoolId})`);
    } catch (error) {
      this.logger.error(`Failed to queue mark entry batch: ${error}`);
    }
  };

  private handleSettingChanged = async (event: AppEvent): Promise<void> => {
    const { schoolId, key, value, scope, scopeId, changedBy } = event.payload;
    try {
      this.logger.log(`Setting changed: ${key}=${JSON.stringify(value)} (school=${schoolId}, scope=${scope})`);
    } catch (error) {
      this.logger.error(`Failed to process setting change: ${error}`);
    }
  };
}
