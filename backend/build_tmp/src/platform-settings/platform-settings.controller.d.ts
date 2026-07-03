import { PlatformSettingsService } from './platform-settings.service';
export declare class PlatformSettingsController {
    private readonly platformSettingsService;
    constructor(platformSettingsService: PlatformSettingsService);
    getAllSettings(): Promise<Record<string, any>>;
    getFeatureFlags(): Promise<Record<string, boolean>>;
    getSetting(key: string): Promise<{
        key: string;
        value: unknown;
    }>;
    setSetting(key: string, body: {
        value: any;
    }): Promise<{
        value: unknown;
        updatedAt: Date;
        key: string;
    }>;
    deleteSetting(key: string): Promise<{
        message: string;
    }>;
    batchUpdate(settings: Record<string, any>): Promise<{
        value: unknown;
        updatedAt: Date;
        key: string;
    }[]>;
}
