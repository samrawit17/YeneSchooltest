import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
export declare class PlatformSettingsService {
    private readonly prisma;
    private readonly cacheService;
    constructor(prisma: PrismaService, cacheService: CacheService);
    private getSettingCacheKey;
    private getAllSettingsCacheKey;
    private invalidateCache;
    getSetting(key: string): Promise<unknown>;
    getAllSettings(): Promise<Record<string, any>>;
    setSetting(key: string, value: any): Promise<{
        value: unknown;
        updatedAt: Date;
        key: string;
    }>;
    deleteSetting(key: string): Promise<{
        message: string;
    }>;
    getEffectiveSetting(key: string, systemDefault?: any): Promise<any>;
    isMaintenanceModeEnabled(): Promise<boolean>;
    batchUpdate(settings: Record<string, any>): Promise<{
        value: unknown;
        updatedAt: Date;
        key: string;
    }[]>;
    getAttendanceCutoffTime(schoolId?: string): Promise<{
        hour: number;
        minute: number;
    }>;
    setAttendanceCutoffTime(schoolId: string, hour: number, minute: number): Promise<void>;
    private toBoolean;
    private serializeValue;
    private parseStoredValue;
}
