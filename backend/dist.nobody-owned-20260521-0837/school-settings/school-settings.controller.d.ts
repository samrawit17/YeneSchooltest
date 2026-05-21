import { SchoolSettingsService } from './school-settings.service';
export declare class SchoolSettingsController {
    private readonly schoolSettingsService;
    constructor(schoolSettingsService: SchoolSettingsService);
    getAllSettings(schoolId: string): Promise<Record<string, any>>;
    getSetting(schoolId: string, key: string): Promise<{
        key: string;
        value: any;
    }>;
    setSetting(schoolId: string, key: string, body: {
        value: any;
    }): Promise<{
        value: any;
        id: string;
        schoolId: string;
        updatedAt: Date;
        key: string;
    }>;
    deleteSetting(schoolId: string, key: string): Promise<{
        message: string;
    }>;
    batchUpdate(schoolId: string, settings: Record<string, any>): Promise<any[]>;
}
