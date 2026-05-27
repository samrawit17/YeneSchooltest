import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { CredentialService } from '../credential/credential.service';
export declare const SCHOOL_SETTING_KEYS: {
    readonly CURRICULUM_TYPE: "curriculum_type";
    readonly CALENDAR_TYPE: "calendar_type";
    readonly GRADE_SYSTEM: "grade_system";
    readonly FEE_STRUCTURE_MODE: "fee_structure_mode";
    readonly FEE_PAYMENT_DUE_DAY: "fee_payment_due_day";
    readonly FEE_DAILY_PENALTY_AMOUNT: "fee_daily_penalty_amount";
    readonly PARENT_VIEW_GRADES: "parent_view_grades";
    readonly ATTENDANCE_CUTOFF_TIME: "ATTENDANCE_CUTOFF_TIME";
    readonly DEFAULT_SECTION_CAPACITY: "DEFAULT_SECTION_CAPACITY";
    readonly SCHOOL_NAME: "school_name";
    readonly SCHOOL_ADDRESS: "school_address";
    readonly SCHOOL_PHONE: "school_phone";
    readonly SCHOOL_EMAIL: "school_email";
    readonly LOGO_URL: "logo_url";
    readonly THEME_COLOR: "theme_color";
    readonly BRAND_COLOR_IN_NAVIGATION: "BRAND_COLOR_IN_NAVIGATION";
    readonly CERTIFICATE_SETTINGS: "CERTIFICATE_SETTINGS";
    readonly CERTIFICATE_TEMPLATE: "certificate_template";
    readonly ID_CARD_TEMPLATE: "id_card_template";
    readonly TEACHER_PORTAL_ACCESS: "TEACHER_PORTAL_ACCESS";
    readonly STUDENT_PORTAL_ACCESS: "STUDENT_PORTAL_ACCESS";
    readonly PARENT_PORTAL_ACCESS: "PARENT_PORTAL_ACCESS";
    readonly FINANCE_PORTAL_ACCESS: "FINANCE_PORTAL_ACCESS";
    readonly REGISTRAR_PORTAL_ACCESS: "REGISTRAR_PORTAL_ACCESS";
};
export declare class SchoolSettingsService {
    private readonly prisma;
    private readonly cacheService;
    private readonly credentialService;
    constructor(prisma: PrismaService, cacheService: CacheService, credentialService: CredentialService);
    private readonly allowedCalendarTypes;
    private readonly allowedCurriculumTypes;
    private readonly allowedGradeSystems;
    private readonly allowedFeeStructureModes;
    private getSectionNameByIndex;
    private normalizeStudentName;
    private readonly booleanKeys;
    private getSettingCacheKey;
    private getAllSettingsCacheKey;
    private invalidateCache;
    private parseStoredValue;
    private serializeSettingValue;
    private normalizeSettingValue;
    private validateCalendarTypeOneTimeChange;
    private validateGradeSystemOneTimeChange;
    private validateCurriculumTypeOneTimeChange;
    getSetting(schoolId: string, key: string): Promise<any>;
    getAllSettings(schoolId: string): Promise<Record<string, any>>;
    setSetting(schoolId: string, key: string, value: any): Promise<{
        value: any;
        id: string;
        schoolId: string;
        updatedAt: Date;
        key: string;
    }>;
    private syncSectionCapacities;
    private autoCreateTermsForAcademicYears;
    private autoCreateGradeLevels;
    ensureDefaultClassesForAcademicYear(schoolId: string, academicYearId: string): Promise<{
        message: string;
    }>;
    private buildGradeLevelsFromRange;
    getGradeLevelsForSchool(schoolId: string): Promise<{
        name: string;
        level: number;
    }[]>;
    deleteSetting(schoolId: string, key: string): Promise<{
        message: string;
    }>;
    getEffectiveSetting(schoolId: string, key: string, platformValue?: any, systemDefault?: any): Promise<any>;
    batchUpdate(schoolId: string, settings: Record<string, any>): Promise<any[]>;
    getCurriculumType(schoolId: string): Promise<string>;
    getGradeSystem(schoolId: string): Promise<string>;
    getAcademicConfiguration(schoolId: string): Promise<{
        curriculumType: string;
        gradeSystem: string;
        activeAcademicYear: any;
        periods: any[];
    }>;
}
