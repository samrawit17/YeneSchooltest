import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { CacheService } from '../infrastructure/cache/cache.service';
export declare class PlatformSettingsService {
    private readonly prisma;
    private readonly eventBus;
    private readonly cacheService;
    constructor(prisma: PrismaService, eventBus: EventBusService, cacheService: CacheService);
    private getSettingCacheKey;
    private getAllSettingsCacheKey;
    private readonly defaultSettings;
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
    private normalizeSettingValue;
    private serializeValue;
    private parseStoredValue;
}
