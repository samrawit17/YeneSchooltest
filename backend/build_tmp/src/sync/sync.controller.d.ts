import { EventBusService } from '../core/events/event-bus.service';
import { SyncService } from './sync.service';
declare class SyncAttendanceDto {
    operation: 'create' | 'update' | 'delete';
    entityId: string;
    payload: {
        studentId: string;
        classId: string;
        sectionId: string;
        date: string;
        status: string;
        remarks?: string;
        recordedById?: string;
        recordedBy?: string;
        localId?: string;
        deviceId?: string;
        lastModified: string;
    };
    localModified: string;
}
declare class SyncResponseDto {
    success: boolean;
    serverId?: string;
    version?: number;
    message?: string;
    serverVersion?: Record<string, unknown>;
    conflicts?: Array<{
        entity: string;
        entityId: string;
        serverData: Record<string, unknown>;
    }>;
}
declare class BatchSyncDto {
    items: Array<{
        operation: 'create' | 'update' | 'delete';
        entity: string;
        entityId: string;
        payload: Record<string, unknown>;
        localModified: string;
    }>;
}
declare class SyncStatusDto {
    pendingCount: number;
    lastSyncAt: string;
    conflicts: number;
}
export declare class SyncController {
    private readonly syncService;
    private readonly eventBus;
    private readonly logger;
    constructor(syncService: SyncService, eventBus: EventBusService);
    syncAttendance(dto: SyncAttendanceDto, req: any, deviceId?: string): Promise<SyncResponseDto>;
    batchSyncAttendance(dto: BatchSyncDto, req: any, deviceId?: string): Promise<{
        results: SyncResponseDto[];
        successful: number;
        failed: number;
    }>;
    enqueueSync(dto: BatchSyncDto, req: any, deviceId?: string): Promise<{
        accepted: number;
        total: number;
    }>;
    getStudentsForOffline(body: {
        classIds?: string[];
        sectionIds?: string[];
    }, req: any): Promise<{
        students: Array<{
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
            enrollmentStatus: string;
            updatedAt: string;
        }>;
        cachedAt: string;
    }>;
    getConflicts(req: any): Promise<Array<{
        id: string;
        entity: string;
        entityId: string;
        conflictType: string;
        detectedAt: string;
        localData: Record<string, unknown>;
        serverData: Record<string, unknown>;
    }>>;
    resolveConflict(id: string, body: {
        resolution: 'local_wins' | 'server_wins' | 'merged';
        data?: Record<string, unknown>;
    }, req: any): Promise<{
        success: boolean;
    }>;
    getSyncStatus(req: any): Promise<SyncStatusDto>;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
    }>;
}
export {};
