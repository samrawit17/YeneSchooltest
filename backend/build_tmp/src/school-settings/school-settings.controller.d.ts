import { SchoolSettingsService } from './school-settings.service';
export declare class SchoolSettingsController {
    private readonly schoolSettingsService;
    constructor(schoolSettingsService: SchoolSettingsService);
    private ensureCanReadSchoolSettings;
    private ensureCanManageSchoolSettings;
    private getMutationContext;
    getAllSettings(schoolId: string, req: any): Promise<Record<string, any>>;
    getSetting(schoolId: string, key: string, req: any): Promise<{
        key: string;
        value: any;
    }>;
    setSetting(schoolId: string, key: string, body: {
        value: any;
    }, req: any): Promise<{
        value: any;
        id: string;
        schoolId: string;
        updatedAt: Date;
        key: string;
    }>;
    uploadLoginImage(schoolId: string, file: Express.Multer.File, req: any): Promise<{
        url: string;
    }>;
    deleteSetting(schoolId: string, key: string, req: any): Promise<{
        message: string;
    }>;
    batchUpdate(schoolId: string, settings: Record<string, any>, req: any): Promise<any[]>;
}
