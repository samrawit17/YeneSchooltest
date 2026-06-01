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
    constructor(syncService: SyncService);
    syncAttendance(dto: SyncAttendanceDto, req: any, deviceId?: string): Promise<SyncResponseDto>;
    batchSyncAttendance(dto: BatchSyncDto, req: any, deviceId?: string): Promise<{
        results: SyncResponseDto[];
        successful: number;
        failed: number;
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
    getConflicts(): Promise<Array<{
        id: number;
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
    }): Promise<{
        success: boolean;
    }>;
    getSyncStatus(): Promise<SyncStatusDto>;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
    }>;
}
export {};
