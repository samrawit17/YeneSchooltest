import { EventBusService } from '../event-bus.service';
import { SyncService } from '../../../sync/sync.service';
export declare class SyncEventListener {
    private readonly eventBus;
    private readonly syncService;
    private readonly logger;
    constructor(eventBus: EventBusService, syncService: SyncService);
    private handleAttendanceBatch;
    private handleMarkEntryBatch;
    private handleSettingChanged;
}
