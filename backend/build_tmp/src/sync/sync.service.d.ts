import { PrismaService } from '../prisma/prisma.service';
interface SyncAttendanceDto {
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
interface SyncResponseDto {
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
export declare class SyncService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    syncAttendance(dto: SyncAttendanceDto, user: {
        id?: string;
        schoolId?: string;
    }, deviceId?: string): Promise<SyncResponseDto>;
    private handleCreateAttendance;
    private handleUpdateAttendance;
    private handleDeleteAttendance;
    getStudentsForOffline(user: {
        schoolId?: string;
    }, classIds?: string[], sectionIds?: string[]): Promise<{
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
    private validateAttendanceScope;
    private normalizeAttendanceStatus;
    getConflicts(schoolId: string): Promise<Array<{
        id: string;
        entity: string;
        entityId: string;
        conflictType: string;
        detectedAt: string;
        localData: Record<string, unknown>;
        serverData: Record<string, unknown>;
    }>>;
    recordConflict(schoolId: string, entity: string, entityId: string, conflictType: string, localData: Record<string, unknown>, serverData: Record<string, unknown>, deviceId?: string): Promise<string>;
    resolveConflict(id: string, resolution: 'local_wins' | 'server_wins' | 'merged', data?: Record<string, unknown>, resolvedBy?: string): Promise<{
        success: boolean;
    }>;
    getSyncStatus(schoolId: string): Promise<{
        pendingCount: number;
        lastSyncAt: string;
        conflicts: number;
    }>;
}
export {};
