"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolSettingsService = exports.SCHOOL_SETTING_KEYS = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
const credential_service_1 = require("../credential/credential.service");
const subscription_service_1 = require("../subscription/subscription.service");
const audit_service_1 = require("../audit/audit.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_service_1 = require("../storage/storage.service");
const DEFAULT_PERIOD_CONFIGS = {
    SEMESTER: [
        { name: 'Semester 1', order: 1, percentageWeight: 50 },
        { name: 'Semester 2', order: 2, percentageWeight: 50 },
    ],
    QUARTER: [
        { name: 'Quarter 1', order: 1, percentageWeight: 25 },
        { name: 'Quarter 2', order: 2, percentageWeight: 25 },
        { name: 'Quarter 3', order: 3, percentageWeight: 25 },
        { name: 'Quarter 4', order: 4, percentageWeight: 25 },
    ],
    TERM: [
        { name: 'Term 1', order: 1, percentageWeight: 33.33 },
        { name: 'Term 2', order: 2, percentageWeight: 33.33 },
        { name: 'Term 3', order: 3, percentageWeight: 33.34 },
    ],
};
const buildPeriodDateRanges = (startDate, endDate, periodConfig) => {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const totalDuration = endMs - startMs;
    let currentStart = startMs;
    return periodConfig.map((config, index) => {
        const isLastPeriod = index === periodConfig.length - 1;
        const duration = totalDuration * (config.percentageWeight / 100);
        const periodStart = new Date(currentStart);
        const periodEnd = isLastPeriod
            ? new Date(endMs)
            : new Date(currentStart + duration);
        currentStart = periodEnd.getTime();
        return {
            ...config,
            startDate: periodStart,
            endDate: periodEnd,
        };
    });
};
exports.SCHOOL_SETTING_KEYS = {
    CURRICULUM_TYPE: 'curriculum_type',
    CALENDAR_TYPE: 'calendar_type',
    GRADE_SYSTEM: 'grade_system',
    FEE_STRUCTURE_MODE: 'fee_structure_mode',
    FEE_PAYMENT_DUE_DAY: 'fee_payment_due_day',
    FEE_DAILY_PENALTY_AMOUNT: 'fee_daily_penalty_amount',
    FAMILY_DISCOUNT_ENABLED: 'family_discount_enabled',
    FAMILY_DISCOUNT_MIN_STUDENTS: 'family_discount_min_students',
    FAMILY_DISCOUNT_PERCENT: 'family_discount_percent',
    FAMILY_DISCOUNT_FEE_TYPES: 'family_discount_fee_types',
    PARENT_VIEW_GRADES: 'parent_view_grades',
    ATTENDANCE_CUTOFF_TIME: 'ATTENDANCE_CUTOFF_TIME',
    SCHOOL_START_TIME: 'SCHOOL_START_TIME',
    SCHOOL_END_TIME: 'SCHOOL_END_TIME',
    MAX_PERIODS_PER_DAY: 'MAX_PERIODS_PER_DAY',
    DEFAULT_SECTION_CAPACITY: 'DEFAULT_SECTION_CAPACITY',
    SCHOOL_NAME: 'school_name',
    SCHOOL_ADDRESS: 'school_address',
    SCHOOL_PHONE: 'school_phone',
    SCHOOL_EMAIL: 'school_email',
    LOGO_URL: 'logo_url',
    LOGIN_IMAGE_URL: 'login_image_url',
    THEME_COLOR: 'theme_color',
    BRAND_COLOR_IN_NAVIGATION: 'BRAND_COLOR_IN_NAVIGATION',
    CUSTOM_BRANDING: 'CUSTOM_BRANDING',
    CERTIFICATE_SETTINGS: 'CERTIFICATE_SETTINGS',
    CERTIFICATE_TEMPLATE: 'certificate_template',
    ID_CARD_TEMPLATE: 'id_card_template',
    TEACHER_PORTAL_ACCESS: 'TEACHER_PORTAL_ACCESS',
    STUDENT_PORTAL_ACCESS: 'STUDENT_PORTAL_ACCESS',
    PARENT_PORTAL_ACCESS: 'PARENT_PORTAL_ACCESS',
    FINANCE_PORTAL_ACCESS: 'FINANCE_PORTAL_ACCESS',
    REGISTRAR_PORTAL_ACCESS: 'REGISTRAR_PORTAL_ACCESS',
    SCHOOL_STARTS_AT: 'SCHOOL_STARTS_AT',
    REGISTRATION_STARTS_AT: 'REGISTRATION_STARTS_AT',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE',
    PROMOTION_MIN_AVERAGE_GRADE: 'PROMOTION_MIN_AVERAGE_GRADE',
    PROMOTION_MIN_ATTENDANCE: 'PROMOTION_MIN_ATTENDANCE',
    PROMOTION_ALLOW_FAILED_SUBJECTS: 'PROMOTION_ALLOW_FAILED_SUBJECTS',
};
const SCHOOL_SETTING_KEY_ALIASES = {
    PARENT_VIEW_GRADES: exports.SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES,
};
let SchoolSettingsService = class SchoolSettingsService {
    prisma;
    cacheService;
    credentialService;
    subscriptionService;
    auditService;
    storageService;
    constructor(prisma, cacheService, credentialService, subscriptionService, auditService, storageService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
        this.credentialService = credentialService;
        this.subscriptionService = subscriptionService;
        this.auditService = auditService;
        this.storageService = storageService;
    }
    allowedCalendarTypes = ['GREGORIAN', 'ETHIOPIAN'];
    allowedCurriculumTypes = [
        'SEMESTER',
        'QUARTER',
        'TERM',
        'CUSTOM',
    ];
    allowedGradeSystems = [
        '1-8',
        '1-10',
        '1-12',
        'K-8',
        'K-12',
        'PRE-K-12',
        '9-12',
    ];
    allowedFeeStructureModes = [
        'MONTHLY',
        'QUARTERLY',
        'SEMESTER',
        'TERM',
        'YEARLY',
    ];
    getSectionNameByIndex(index) {
        let current = index;
        let name = '';
        do {
            name = String.fromCharCode(65 + (current % 26)) + name;
            current = Math.floor(current / 26) - 1;
        } while (current >= 0);
        return name;
    }
    normalizeStudentName(name) {
        return String(name || '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    booleanKeys = new Set([
        exports.SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES,
        exports.SCHOOL_SETTING_KEYS.BRAND_COLOR_IN_NAVIGATION,
        'ALLOW_SELF_ENROLLMENT',
        'ATTENDANCE_TRACKING',
        'LATE_MARKING',
        'ANNOUNCEMENTS_ENABLED',
        exports.SCHOOL_SETTING_KEYS.TEACHER_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.STUDENT_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.PARENT_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.FINANCE_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.REGISTRAR_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_ENABLED,
        exports.SCHOOL_SETTING_KEYS.CUSTOM_BRANDING,
        'PARENT_VIEW_ATTENDANCE',
        'SELF_ENROLLMENT_ACTIVE',
        exports.SCHOOL_SETTING_KEYS.MAINTENANCE_MODE,
    ]);
    tierLevels = {
        CORE: 1,
        STANDARD: 2,
        ULTIMATE: 3,
    };
    settingRequirements = new Map([
        ['ATTENDANCE_TRACKING', { requiredFeature: 'ATTENDANCE_TRACKING' }],
        [exports.SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES, { requiredFeature: 'REPORT_CARDS' }],
        [exports.SCHOOL_SETTING_KEYS.FEE_STRUCTURE_MODE, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.FEE_PAYMENT_DUE_DAY, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.FEE_DAILY_PENALTY_AMOUNT, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_ENABLED, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_MIN_STUDENTS, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_PERCENT, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_FEE_TYPES, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        ['ANNOUNCEMENTS_ENABLED', { requiredFeature: 'ANNOUNCEMENTS' }],
        ['SELF_ENROLLMENT_ACTIVE', { requiredFeature: 'ENROLLMENT_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.TEACHER_PORTAL_ACCESS, { requiredFeature: 'USER_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.STUDENT_PORTAL_ACCESS, { requiredFeature: 'USER_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.PARENT_PORTAL_ACCESS, { requiredFeature: 'PARENT_PORTAL' }],
        [exports.SCHOOL_SETTING_KEYS.FINANCE_PORTAL_ACCESS, { requiredFeature: 'FINANCE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.REGISTRAR_PORTAL_ACCESS, { requiredFeature: 'ENROLLMENT_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY, { requiredFeature: 'ACADEMIC_STRUCTURE' }],
        [exports.SCHOOL_SETTING_KEYS.MAX_PERIODS_PER_DAY, { requiredFeature: 'ACADEMIC_STRUCTURE' }],
        [exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME, { requiredFeature: 'TIMETABLE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME, { requiredFeature: 'TIMETABLE_MANAGEMENT' }],
        [exports.SCHOOL_SETTING_KEYS.CUSTOM_BRANDING, { requiredTier: 'ULTIMATE' }],
        [exports.SCHOOL_SETTING_KEYS.THEME_COLOR, { requiredFeature: 'CUSTOM_BRANDING' }],
        [exports.SCHOOL_SETTING_KEYS.BRAND_COLOR_IN_NAVIGATION, { requiredFeature: 'CUSTOM_BRANDING' }],
    ]);
    allowedSettingKeys = new Set([
        ...Object.values(exports.SCHOOL_SETTING_KEYS),
        ...Object.keys(SCHOOL_SETTING_KEY_ALIASES),
        'ALLOW_SELF_ENROLLMENT',
        'ATTENDANCE_TRACKING',
        'LATE_MARKING',
        'ANNOUNCEMENTS_ENABLED',
        'PARENT_VIEW_ATTENDANCE',
        'SELF_ENROLLMENT_ACTIVE',
        'MAINTENANCE_MODE',
    ]);
    getSettingCacheKey(schoolId, key) {
        return `school-settings:${schoolId}:key:${key}`;
    }
    getAllSettingsCacheKey(schoolId) {
        return `school-settings:${schoolId}:all`;
    }
    async invalidateCache(schoolId, keys = []) {
        await this.cacheService.del(this.getAllSettingsCacheKey(schoolId), ...keys.map((key) => this.getSettingCacheKey(schoolId, key)));
    }
    parseStoredValue(rawValue) {
        try {
            return JSON.parse(rawValue);
        }
        catch {
            return rawValue;
        }
    }
    serializeSettingValue(value) {
        if (typeof value === 'string')
            return value;
        return JSON.stringify(value);
    }
    timeToMinutes(time) {
        const [hour, minute] = time.split(':').map(Number);
        return hour * 60 + minute;
    }
    canonicalizeSettingKey(key) {
        return SCHOOL_SETTING_KEY_ALIASES[key] || key;
    }
    assertAllowedSettingKey(key) {
        const canonicalKey = this.canonicalizeSettingKey(key);
        if (!this.allowedSettingKeys.has(canonicalKey)) {
            throw new localization_1.LocalizedException('school_settings.unsupported_school_setting_a3d6c066', undefined, undefined, 'Unsupported school setting: ${key}');
        }
        return canonicalKey;
    }
    getSettingKeyAliases(key) {
        const canonicalKey = this.canonicalizeSettingKey(key);
        return [
            canonicalKey,
            ...Object.entries(SCHOOL_SETTING_KEY_ALIASES)
                .filter(([, value]) => value === canonicalKey)
                .map(([alias]) => alias),
        ];
    }
    normalizeSettingValue(key, value) {
        key = this.assertAllowedSettingKey(key);
        if (this.booleanKeys.has(key)) {
            if (typeof value === 'boolean')
                return value;
            if (value === 'true' || value === 'false')
                return value === 'true';
            throw new localization_1.LocalizedException('school_settings.invalid_boolean_value_for_521115ee', undefined, undefined, 'Invalid boolean value for ${key}');
        }
        if (key === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedCalendarTypes.includes(normalizedValue)) {
                throw new localization_1.LocalizedException('school_settings.invalid_calendar_type_allowed_values_e9ff3fe3', undefined, undefined, 'Invalid calendar type. Allowed values: ${this.allowedCalendarTypes.join(\', \')}');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedCurriculumTypes.includes(normalizedValue)) {
                throw new localization_1.LocalizedException('school_settings.invalid_curriculum_type_allowed_values_70df644e', undefined, undefined, 'Invalid curriculum type. Allowed values: ${this.allowedCurriculumTypes.join(\', \')}');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedGradeSystems.includes(normalizedValue)) {
                throw new localization_1.LocalizedException('school_settings.invalid_grade_system_allowed_values_f7e91627', undefined, undefined, 'Invalid grade system. Allowed values: ${this.allowedGradeSystems.join(\', \')}');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FEE_STRUCTURE_MODE) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedFeeStructureModes.includes(normalizedValue)) {
                throw new localization_1.LocalizedException('school_settings.invalid_fee_structure_mode_allowed_values_83602f22', undefined, undefined, 'Invalid fee structure mode. Allowed values: ${this.allowedFeeStructureModes.join(\', \')}');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FEE_PAYMENT_DUE_DAY) {
            const day = Number(value);
            if (!Number.isInteger(day) || day < 1 || day > 31) {
                throw new localization_1.LocalizedException('school_settings.must_be_an_integer_between_1_and_31_18dff748', undefined, undefined, '${key} must be an integer between 1 and 31');
            }
            return day;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FEE_DAILY_PENALTY_AMOUNT) {
            const amount = Number(value);
            if (!Number.isFinite(amount) || amount < 0) {
                throw new localization_1.LocalizedException('school_settings.fee_daily_penalty_amount_must_be_a_number_greater_than_or_eq_160eaec7', undefined, undefined, 'fee_daily_penalty_amount must be a number greater than or equal to 0');
            }
            return Math.round(amount * 100) / 100;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_MIN_STUDENTS) {
            const count = Number(value);
            if (!Number.isInteger(count) || count < 2 || count > 20) {
                throw new localization_1.LocalizedException('school_settings.family_discount_min_students_must_be_an_integer_between_2_an_87877355', undefined, undefined, 'family_discount_min_students must be an integer between 2 and 20');
            }
            return count;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_PERCENT) {
            const percent = Number(value);
            if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
                throw new localization_1.LocalizedException('school_settings.family_discount_percent_must_be_a_number_between_0_and_100_fb08ad90', undefined, undefined, 'family_discount_percent must be a number between 0 and 100');
            }
            return Math.round(percent * 100) / 100;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_FEE_TYPES) {
            const rawValues = Array.isArray(value)
                ? value
                : String(value || '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
            const normalizedValues = Array.from(new Set(rawValues.map((item) => String(item).trim().toUpperCase())));
            if (normalizedValues.length === 0) {
                throw new localization_1.LocalizedException('school_settings.family_discount_fee_types_must_include_at_least_one_fee_type_14e35e8f', undefined, undefined, 'family_discount_fee_types must include at least one fee type');
            }
            return normalizedValues.join(',');
        }
        if (key === exports.SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY) {
            const capacity = Number(value);
            if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 200) {
                throw new localization_1.LocalizedException('school_settings.default_section_capacity_must_be_an_integer_between_1_and_20_a7922512', undefined, undefined, 'DEFAULT_SECTION_CAPACITY must be an integer between 1 and 200');
            }
            return capacity;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.MAX_PERIODS_PER_DAY) {
            const maxPeriods = Number(value);
            if (!Number.isInteger(maxPeriods) || maxPeriods < 1 || maxPeriods > 12) {
                throw new localization_1.LocalizedException('school_settings.max_periods_per_day_must_be_an_integer_between_1_and_12_e6961a9a', undefined, undefined, 'MAX_PERIODS_PER_DAY must be an integer between 1 and 12');
            }
            return maxPeriods;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.ATTENDANCE_CUTOFF_TIME ||
            key === exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME ||
            key === exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME) {
            const normalizedValue = String(value || '').trim();
            const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedValue);
            if (!isValidTime) {
                throw new localization_1.LocalizedException('school_settings.must_be_in_24_hour_hh_mm_format_828539f7', undefined, undefined, '${key} must be in 24-hour HH:mm format');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.SCHOOL_STARTS_AT ||
            key === exports.SCHOOL_SETTING_KEYS.REGISTRATION_STARTS_AT) {
            const normalizedValue = String(value || '').trim();
            const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue);
            if (!isValidDate) {
                throw new localization_1.LocalizedException('school_settings.must_be_a_valid_date_in_yyyy_mm_dd_format_2906279a', undefined, undefined, '${key} must be a valid date in YYYY-MM-DD format');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.THEME_COLOR) {
            const normalizedValue = String(value || '').trim();
            const isValidHexColor = /^#([0-9A-Fa-f]{6})$/.test(normalizedValue);
            if (!isValidHexColor) {
                throw new localization_1.LocalizedException('school_settings.must_be_a_valid_hex_color_in_rrggbb_format_e575c851', undefined, undefined, '${key} must be a valid hex color in #RRGGBB format');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.LOGIN_IMAGE_URL) {
            const normalizedValue = String(value || '').trim();
            if (!normalizedValue)
                return '';
            const isValidRelativeUpload = /^\/uploads\/[A-Za-z0-9._~/-]+$/.test(normalizedValue);
            const isValidHttpUrl = /^https?:\/\/\S+$/i.test(normalizedValue);
            if (!isValidRelativeUpload && !isValidHttpUrl) {
                throw new localization_1.LocalizedException('school_settings.must_be_an_uploaded_image_path_or_a_valid_url_4480bbf6', undefined, undefined, '${key} must be an uploaded image path or a valid URL');
            }
            return normalizedValue;
        }
        return value;
    }
    async enforceSubscriptionAccess(schoolId, key) {
        const requirement = this.settingRequirements.get(key);
        if (!requirement)
            return;
        const schoolPlan = await this.subscriptionService.getSchoolPlan(schoolId);
        if (!schoolPlan) {
            throw new localization_1.LocalizedException('school_settings.setting_requires_an_active_subscription_ad44de6f', undefined, undefined, 'Setting ${key} requires an active subscription');
        }
        if (requirement.requiredTier &&
            this.tierLevels[schoolPlan.tier] < this.tierLevels[requirement.requiredTier]) {
            throw new localization_1.LocalizedException('school_settings.setting_requires_the_plan_fb922f27', undefined, undefined, 'Setting ${key} requires the ${requirement.requiredTier} plan');
        }
        if (requirement.requiredFeature &&
            !schoolPlan.features?.includes(requirement.requiredFeature)) {
            throw new localization_1.LocalizedException('school_settings.setting_requires_the_feature_bc0c49ae', undefined, undefined, 'Setting ${key} requires the ${requirement.requiredFeature} feature');
        }
    }
    async validateSchoolDayBounds(schoolId, key, value, pendingSettings) {
        if (key !== exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME &&
            key !== exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME) {
            return;
        }
        const pendingStartTime = pendingSettings?.[exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME];
        const pendingEndTime = pendingSettings?.[exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME];
        const storedStartTime = key === exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME
            ? value
            : pendingStartTime !== undefined && pendingStartTime !== null
                ? String(pendingStartTime)
                : (await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME)) || '08:00';
        const storedEndTime = key === exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME
            ? value
            : pendingEndTime !== undefined && pendingEndTime !== null
                ? String(pendingEndTime)
                : (await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME)) || '15:00';
        if (this.timeToMinutes(storedStartTime) >= this.timeToMinutes(storedEndTime)) {
            throw new localization_1.LocalizedException('school_settings.school_start_time_must_be_before_school_end_time_ee85258f', undefined, undefined, 'School start time must be before school end time');
        }
    }
    async validateMaxPeriodsPerDay(schoolId, maxPeriods) {
        const existingPeriodCount = await this.prisma.periodTime.count({
            where: { schoolId },
        });
        if (existingPeriodCount > maxPeriods) {
            throw new localization_1.LocalizedException('school_settings.max_periods_per_day_cannot_be_lower_than_the_period_times_al_bbef891f', undefined, undefined, 'MAX_PERIODS_PER_DAY cannot be lower than the ${existingPeriodCount} period times already configured');
        }
    }
    async cleanupLocalUpload(url) {
        if (typeof url !== 'string' || !url.startsWith('/uploads/'))
            return;
        const publicRoot = path.resolve(process.cwd(), 'public');
        const target = path.resolve(publicRoot, url.replace(/^\/+/, ''));
        if (!target.startsWith(publicRoot + path.sep))
            return;
        try {
            await fs.promises.unlink(target);
        }
        catch {
        }
    }
    async auditSettingChange(schoolId, key, oldValue, newValue, context) {
        if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null)) {
            return;
        }
        await this.auditService.log({
            actor: context.actor,
            schoolId,
            action: 'school_setting.changed',
            entityType: 'SchoolSetting',
            entityId: `${schoolId}:${key}`,
            request: context.request,
            metadata: {
                key,
                oldValue: oldValue ?? null,
                newValue: newValue ?? null,
                source: context.source || 'single',
            },
        });
    }
    async uploadLoginImage(schoolId, file, context = {}) {
        if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)) {
            throw new localization_1.LocalizedException('school_settings.login_image_must_be_png_jpg_jpeg_or_webp_ade0dcc7', undefined, undefined, 'Login image must be PNG, JPG, JPEG, or WEBP');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new localization_1.LocalizedException('school_settings.login_image_must_be_less_than_5mb_325631ad', undefined, undefined, 'Login image must be less than 5MB');
        }
        const extension = file.mimetype === 'image/png'
            ? '.png'
            : file.mimetype === 'image/webp'
                ? '.webp'
                : '.jpg';
        const fileName = `login-${Date.now()}${extension}`;
        const storedFile = await this.storageService.upload(file.buffer, fileName, file.mimetype, { schoolId, folder: 'branding', generateName: false });
        const oldUrl = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.LOGIN_IMAGE_URL);
        const url = storedFile.url;
        await this.setSetting(schoolId, exports.SCHOOL_SETTING_KEYS.LOGIN_IMAGE_URL, url, {
            ...context,
            source: 'upload',
        });
        await this.cleanupLocalUpload(oldUrl);
        return url;
    }
    async validateCalendarTypeOneTimeChange(schoolId, incomingValue) {
        const existingCalendarType = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE);
        if (existingCalendarType === null || existingCalendarType === undefined) {
            return;
        }
        const existingYears = await this.prisma.academicYear.count({
            where: { schoolId },
        });
        if (existingYears > 0) {
            throw new localization_1.LocalizedException('school_settings.cannot_change_after_academic_year_is_created_this_protects_e_e1ea827b', undefined, undefined, 'Cannot change after academic year is created. This protects existing academic records and years.');
        }
        if (String(existingCalendarType).toUpperCase() !== incomingValue) {
            throw new localization_1.LocalizedException('school_settings.calendar_type_is_locked_and_can_only_be_set_once_changing_it_ed8abeb4', undefined, undefined, 'Calendar type is locked and can only be set once. Changing it later can corrupt date consistency.');
        }
    }
    async validateGradeSystemOneTimeChange(schoolId, incomingValue) {
        const existingGradeSystem = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM);
        if (existingGradeSystem === null || existingGradeSystem === undefined) {
            return;
        }
        if (String(existingGradeSystem).toUpperCase() !== incomingValue) {
            throw new localization_1.LocalizedException('school_settings.grade_system_is_locked_and_can_only_be_set_once_changing_it__1d9e6783', undefined, undefined, 'Grade system is locked and can only be set once. Changing it later can affect existing grade levels and classes.');
        }
    }
    async validateCurriculumTypeOneTimeChange(schoolId, incomingValue) {
        const existingCurriculumType = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE);
        if (existingCurriculumType !== null &&
            existingCurriculumType !== undefined &&
            String(existingCurriculumType).toUpperCase() !== incomingValue) {
            throw new localization_1.LocalizedException('school_settings.curriculum_system_is_locked_and_can_only_be_set_once_changin_7cfc1cae', undefined, undefined, 'Curriculum system is locked and can only be set once. Changing it later can affect terms, grading, fees, and academic records.');
        }
        const existingFees = await this.prisma.studentFee.count({
            where: { schoolId },
        });
        if (existingFees > 0) {
            throw new localization_1.LocalizedException('school_settings.cannot_change_curriculum_type_after_fees_have_been_generated_94a146c3', undefined, undefined, 'Cannot change curriculum type after fees have been generated. This would disrupt existing fee records and payments. Please set this at the start of the academic year.');
        }
    }
    async getSetting(schoolId, key) {
        const canonicalKey = this.canonicalizeSettingKey(key);
        const keyAliases = this.getSettingKeyAliases(canonicalKey);
        return this.cacheService.getOrSet(this.getSettingCacheKey(schoolId, canonicalKey), cache_constants_1.CACHE_TTL.SCHOOL_SETTINGS, async () => {
            const settings = await this.prisma.schoolSetting.findMany({
                where: {
                    schoolId,
                    key: { in: keyAliases },
                },
            });
            const setting = settings.find((item) => item.key === canonicalKey) || settings[0];
            return setting ? this.parseStoredValue(setting.value) : null;
        });
    }
    async getAllSettings(schoolId) {
        return this.cacheService.getOrSet(this.getAllSettingsCacheKey(schoolId), cache_constants_1.CACHE_TTL.SCHOOL_SETTINGS, async () => {
            const settings = await this.prisma.schoolSetting.findMany({
                where: { schoolId },
            });
            const result = {};
            for (const setting of settings) {
                const canonicalKey = this.canonicalizeSettingKey(setting.key);
                const parsedValue = this.parseStoredValue(setting.value);
                if (result[canonicalKey] === undefined || canonicalKey === setting.key) {
                    result[canonicalKey] = parsedValue;
                }
                if (canonicalKey !== setting.key) {
                    result[setting.key] = parsedValue;
                }
            }
            return result;
        });
    }
    async setSetting(schoolId, key, value, context = {}) {
        const canonicalKey = this.assertAllowedSettingKey(key);
        await this.enforceSubscriptionAccess(schoolId, canonicalKey);
        const normalizedValue = this.normalizeSettingValue(canonicalKey, value);
        const serializedValue = this.serializeSettingValue(normalizedValue);
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME ||
            canonicalKey === exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME) {
            await this.validateSchoolDayBounds(schoolId, canonicalKey, normalizedValue);
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
            await this.validateCalendarTypeOneTimeChange(schoolId, normalizedValue);
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            await this.validateGradeSystemOneTimeChange(schoolId, normalizedValue);
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
            await this.validateCurriculumTypeOneTimeChange(schoolId, normalizedValue);
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.MAX_PERIODS_PER_DAY) {
            await this.validateMaxPeriodsPerDay(schoolId, normalizedValue);
        }
        const oldValue = await this.getSetting(schoolId, canonicalKey);
        const setting = await this.prisma.schoolSetting.upsert({
            where: {
                schoolId_key: {
                    schoolId,
                    key: canonicalKey,
                },
            },
            update: { value: serializedValue },
            create: { schoolId, key: canonicalKey, value: serializedValue },
        });
        const legacyAliases = this.getSettingKeyAliases(canonicalKey).filter((item) => item !== canonicalKey);
        if (legacyAliases.length > 0) {
            await this.prisma.schoolSetting.deleteMany({
                where: { schoolId, key: { in: legacyAliases } },
            });
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE &&
            normalizedValue !== 'CUSTOM') {
            await this.autoCreateTermsForAcademicYears(schoolId, normalizedValue);
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            await this.autoCreateGradeLevels(schoolId, normalizedValue);
        }
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY) {
            const newCapacity = typeof normalizedValue === 'number'
                ? normalizedValue
                : parseInt(normalizedValue, 10);
            if (!isNaN(newCapacity) && newCapacity > 0) {
                await this.syncSectionCapacities(schoolId, newCapacity);
            }
        }
        await this.invalidateCache(schoolId, this.getSettingKeyAliases(canonicalKey));
        await this.auditSettingChange(schoolId, canonicalKey, oldValue, normalizedValue, context);
        return {
            ...setting,
            value: normalizedValue,
        };
    }
    async syncSectionCapacities(schoolId, capacity) {
        const studentClasses = await this.prisma.studentClass.findMany({
            where: { schoolId },
            include: {
                student: { select: { id: true, name: true } },
                class: {
                    select: {
                        id: true,
                        name: true,
                        academicYearId: true,
                        academicYear: { select: { name: true } },
                        grade: true,
                        gradeId: true,
                    },
                },
            },
        });
        const groupedByGradeYear = new Map();
        for (const row of studentClasses) {
            const key = `${row.class.academicYearId}:${row.class.name}`;
            if (!groupedByGradeYear.has(key))
                groupedByGradeYear.set(key, []);
            groupedByGradeYear.get(key).push(row);
        }
        await this.prisma.$transaction(async (tx) => {
            for (const [, group] of groupedByGradeYear) {
                const orderedStudents = [...group].sort((left, right) => this.normalizeStudentName(left.student?.name).localeCompare(this.normalizeStudentName(right.student?.name), undefined, { sensitivity: 'base' }));
                const totalSections = Math.max(1, Math.ceil(orderedStudents.length / capacity));
                if (orderedStudents.length === 0)
                    continue;
                const sampleClass = orderedStudents[0].class;
                let defaultClassConsumed = false;
                for (let index = 0; index < orderedStudents.length; index++) {
                    const item = orderedStudents[index];
                    const sectionName = this.getSectionNameByIndex(index % totalSections);
                    let cls = await tx.class.findFirst({
                        where: {
                            schoolId,
                            academicYearId: sampleClass.academicYearId,
                            name: sampleClass.name,
                            section: sectionName,
                        },
                    });
                    if (!cls && !defaultClassConsumed) {
                        const emptyClass = await tx.class.findFirst({
                            where: {
                                schoolId,
                                academicYearId: sampleClass.academicYearId,
                                name: sampleClass.name,
                                section: '',
                            },
                        });
                        if (emptyClass) {
                            cls = await tx.class.update({
                                where: { id: emptyClass.id },
                                data: {
                                    section: sectionName,
                                    grade: sampleClass.grade ?? undefined,
                                    gradeId: sampleClass.gradeId ?? undefined,
                                },
                            });
                            defaultClassConsumed = true;
                        }
                    }
                    if (!cls) {
                        cls = await tx.class.create({
                            data: {
                                schoolId,
                                academicYearId: sampleClass.academicYearId,
                                name: sampleClass.name,
                                section: sectionName,
                                grade: sampleClass.grade ?? undefined,
                                gradeId: sampleClass.gradeId ?? undefined,
                            },
                        });
                    }
                    let sec = await tx.section.findFirst({
                        where: { classId: cls.id, name: sectionName },
                    });
                    if (!sec) {
                        sec = await tx.section.create({
                            data: {
                                classId: cls.id,
                                name: sectionName,
                                capacity,
                            },
                        });
                    }
                    else if (sec.capacity !== capacity) {
                        sec = await tx.section.update({
                            where: { id: sec.id },
                            data: { capacity },
                        });
                    }
                    await tx.studentClass.update({
                        where: { id: item.id },
                        data: {
                            classId: cls.id,
                            sectionId: sec.id,
                        },
                    });
                    await tx.studentProfile.updateMany({
                        where: { userId: item.studentId },
                        data: {
                            className: cls.name,
                            section: sec.name,
                            rollNumber: '0',
                        },
                    });
                }
            }
            const sections = await tx.section.findMany({
                where: { class: { schoolId } },
            });
            for (const section of sections) {
                if (section.capacity !== capacity) {
                    await tx.section.update({
                        where: { id: section.id },
                        data: { capacity },
                    });
                }
            }
        });
        const academicYears = await this.prisma.academicYear.findMany({
            where: { schoolId },
            select: { name: true },
        });
        for (const academicYear of academicYears) {
            await this.credentialService.assignRollNumbersByAlphabet(schoolId, academicYear.name);
        }
    }
    async autoCreateTermsForAcademicYears(schoolId, curriculumType) {
        const academicYears = await this.prisma.academicYear.findMany({
            where: { schoolId },
            include: {
                terms: {
                    include: { subjectGrades: true },
                },
            },
        });
        const periodConfig = DEFAULT_PERIOD_CONFIGS[curriculumType];
        if (!periodConfig)
            return;
        for (const academicYear of academicYears) {
            const hasTermsWithGrades = academicYear.terms.some((term) => term.subjectGrades && term.subjectGrades.length > 0);
            if (hasTermsWithGrades) {
                await this.prisma.academicYear.update({
                    where: { id: academicYear.id },
                    data: { curriculumType },
                });
                continue;
            }
            await this.prisma.term.deleteMany({
                where: {
                    academicYearId: academicYear.id,
                    subjectGrades: { none: {} },
                },
            });
            await this.prisma.academicYear.update({
                where: { id: academicYear.id },
                data: { curriculumType },
            });
            await this.prisma.term.createMany({
                data: buildPeriodDateRanges(academicYear.startDate, academicYear.endDate, periodConfig).map((config) => ({
                    academicYearId: academicYear.id,
                    name: config.name,
                    order: config.order,
                    percentageWeight: config.percentageWeight,
                    startDate: config.startDate,
                    endDate: config.endDate,
                    isLocked: false,
                })),
            });
        }
    }
    async autoCreateGradeLevels(schoolId, range, academicYearId) {
        const grades = this.buildGradeLevelsFromRange(range);
        if (grades.length === 0)
            return;
        const targetYearIds = [];
        if (academicYearId) {
            targetYearIds.push(academicYearId);
        }
        else {
            const activeYear = await this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true },
            });
            if (activeYear?.id)
                targetYearIds.push(activeYear.id);
        }
        for (const grade of grades) {
            const gradeLevel = await this.prisma.gradeLevel.upsert({
                where: {
                    schoolId_level: {
                        schoolId,
                        level: grade.level,
                    },
                },
                update: { name: grade.name },
                create: {
                    schoolId,
                    name: grade.name,
                    level: grade.level,
                },
            });
            for (const yearId of targetYearIds) {
                const matchingClasses = await this.prisma.class.findMany({
                    where: {
                        schoolId,
                        academicYearId: yearId,
                        OR: [
                            { name: grade.name },
                            { gradeId: gradeLevel.id },
                            { grade: gradeLevel.level },
                        ],
                    },
                    include: {
                        sections: { select: { id: true } },
                        _count: {
                            select: {
                                sections: true,
                                studentClasses: true,
                                ClassSubject: true,
                                teacherAssignments: true,
                                timetableSlots: true,
                                assessmentSubjects: true,
                                contents: true,
                                enrollmentRequests: true,
                                attendances: true,
                                attendanceSessions: true,
                                exams: true,
                                communications: true,
                                reportCards: true,
                                subjectGrades: true,
                            },
                        },
                    },
                });
                const emptyDefaultClass = matchingClasses.find((cls) => cls.name === grade.name && cls.section === '');
                const hasRealClassForGrade = matchingClasses.some((cls) => cls.id !== emptyDefaultClass?.id &&
                    (cls.section !== '' || cls.sections.length > 0));
                if (!emptyDefaultClass && !hasRealClassForGrade) {
                    await this.prisma.class.create({
                        data: {
                            schoolId,
                            academicYearId: yearId,
                            name: grade.name,
                            section: '',
                            gradeId: gradeLevel.id,
                            grade: gradeLevel.level,
                        },
                    });
                    continue;
                }
                if (emptyDefaultClass) {
                    await this.prisma.class.update({
                        where: { id: emptyDefaultClass.id },
                        data: {
                            gradeId: gradeLevel.id,
                            grade: gradeLevel.level,
                        },
                    });
                }
                for (const existingClass of matchingClasses) {
                    if (existingClass.gradeId !== gradeLevel.id ||
                        existingClass.grade !== gradeLevel.level) {
                        await this.prisma.class.update({
                            where: { id: existingClass.id },
                            data: {
                                gradeId: gradeLevel.id,
                                grade: gradeLevel.level,
                            },
                        });
                    }
                }
                if (emptyDefaultClass && hasRealClassForGrade) {
                    const dependencyCount = emptyDefaultClass._count.sections +
                        emptyDefaultClass._count.studentClasses +
                        emptyDefaultClass._count.ClassSubject +
                        emptyDefaultClass._count.teacherAssignments +
                        emptyDefaultClass._count.timetableSlots +
                        emptyDefaultClass._count.assessmentSubjects +
                        emptyDefaultClass._count.contents +
                        emptyDefaultClass._count.enrollmentRequests +
                        emptyDefaultClass._count.attendances +
                        emptyDefaultClass._count.attendanceSessions +
                        emptyDefaultClass._count.exams +
                        emptyDefaultClass._count.communications +
                        emptyDefaultClass._count.reportCards +
                        emptyDefaultClass._count.subjectGrades;
                    if (dependencyCount === 0) {
                        await this.prisma.class.delete({
                            where: { id: emptyDefaultClass.id },
                        });
                    }
                }
            }
        }
        await this.prisma.gradeLevel.deleteMany({
            where: {
                schoolId,
                level: { notIn: grades.map((g) => g.level) },
                classes: { none: {} },
            },
        });
    }
    async ensureDefaultClassesForAcademicYear(schoolId, academicYearId) {
        const gradeSystem = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM);
        if (gradeSystem === null || gradeSystem === undefined) {
            return {
                message: 'Grade system not set; skipped default class creation',
            };
        }
        const normalizedRange = String(gradeSystem || '')
            .trim()
            .toUpperCase();
        await this.autoCreateGradeLevels(schoolId, normalizedRange, academicYearId);
        return { message: 'Default grade classes ensured for academic year' };
    }
    buildGradeLevelsFromRange(range) {
        const grades = [];
        const pushGradeRange = (start, end) => {
            for (let i = start; i <= end; i++)
                grades.push({ name: `Grade ${i}`, level: i });
        };
        switch (range) {
            case '1-8':
                pushGradeRange(1, 8);
                break;
            case '1-10':
                pushGradeRange(1, 10);
                break;
            case '1-12':
                pushGradeRange(1, 12);
                break;
            case 'K-8':
                grades.push({ name: 'Kindergarten', level: 0 });
                pushGradeRange(1, 8);
                break;
            case 'K-12':
                grades.push({ name: 'Kindergarten', level: 0 });
                pushGradeRange(1, 12);
                break;
            case 'PRE-K-12':
                grades.push({ name: 'Pre-Kindergarten', level: -1 });
                grades.push({ name: 'Kindergarten', level: 0 });
                pushGradeRange(1, 12);
                break;
            case '9-12':
                pushGradeRange(9, 12);
                break;
            default:
                throw new localization_1.LocalizedException('school_settings.unsupported_grade_system_9d1c933f', undefined, undefined, 'Unsupported grade system');
        }
        return grades;
    }
    async getGradeLevelsForSchool(schoolId) {
        const gradeSystem = await this.getGradeSystem(schoolId);
        return this.buildGradeLevelsFromRange(gradeSystem);
    }
    async deleteSetting(schoolId, key, context = {}) {
        const canonicalKey = this.assertAllowedSettingKey(key);
        await this.enforceSubscriptionAccess(schoolId, canonicalKey);
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE ||
            canonicalKey === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE ||
            canonicalKey === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            throw new localization_1.LocalizedException('school_settings.this_academic_setting_cannot_be_deleted_after_being_set_it_i_7f50bbf2', undefined, undefined, 'This academic setting cannot be deleted after being set. It is locked to preserve data consistency.');
        }
        const oldValue = await this.getSetting(schoolId, canonicalKey);
        await this.prisma.schoolSetting.deleteMany({
            where: {
                schoolId,
                key: { in: this.getSettingKeyAliases(canonicalKey) },
            },
        });
        await this.invalidateCache(schoolId, this.getSettingKeyAliases(canonicalKey));
        await this.auditSettingChange(schoolId, canonicalKey, oldValue, null, {
            ...context,
            source: context.source || 'delete',
        });
        if (canonicalKey === exports.SCHOOL_SETTING_KEYS.LOGIN_IMAGE_URL) {
            await this.cleanupLocalUpload(oldValue);
        }
        return { message: 'Setting deleted successfully' };
    }
    async getEffectiveSetting(schoolId, key, platformValue = null, systemDefault = null) {
        const schoolValue = await this.getSetting(schoolId, key);
        if (schoolValue !== null) {
            return schoolValue;
        }
        if (platformValue !== null) {
            return platformValue;
        }
        return systemDefault;
    }
    async batchUpdate(schoolId, settings, context = {}) {
        const entries = Object.entries(settings);
        const currentSettings = await this.getAllSettings(schoolId);
        const pendingSettings = { ...currentSettings };
        for (const [key, value] of entries) {
            const canonicalKey = this.assertAllowedSettingKey(key);
            await this.enforceSubscriptionAccess(schoolId, canonicalKey);
            const normalizedValue = this.normalizeSettingValue(canonicalKey, value);
            pendingSettings[canonicalKey] = normalizedValue;
            if (canonicalKey === exports.SCHOOL_SETTING_KEYS.SCHOOL_START_TIME ||
                canonicalKey === exports.SCHOOL_SETTING_KEYS.SCHOOL_END_TIME) {
                await this.validateSchoolDayBounds(schoolId, canonicalKey, normalizedValue, pendingSettings);
            }
            if (canonicalKey === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
                await this.validateCalendarTypeOneTimeChange(schoolId, normalizedValue);
            }
            if (canonicalKey === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
                await this.validateGradeSystemOneTimeChange(schoolId, normalizedValue);
            }
            if (canonicalKey === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
                await this.validateCurriculumTypeOneTimeChange(schoolId, normalizedValue);
            }
        }
        const results = [];
        for (const [key, value] of entries) {
            const result = await this.setSetting(schoolId, key, value, {
                ...context,
                source: 'batch',
            });
            results.push(result);
        }
        await this.invalidateCache(schoolId, Object.keys(settings).flatMap((key) => this.getSettingKeyAliases(key)));
        return results;
    }
    async getCurriculumType(schoolId) {
        const activeYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (activeYear) {
            return activeYear.curriculumType;
        }
        const setting = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE);
        return setting || 'SEMESTER';
    }
    async getGradeSystem(schoolId) {
        const setting = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM);
        return setting || '1-12';
    }
    async getAcademicConfiguration(schoolId) {
        const [curriculumType, gradeSystem, activeYear] = await Promise.all([
            this.getCurriculumType(schoolId),
            this.getGradeSystem(schoolId),
            this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                include: {
                    terms: { orderBy: { order: 'asc' } },
                },
            }),
        ]);
        return {
            curriculumType,
            gradeSystem,
            activeAcademicYear: activeYear,
            periods: activeYear?.terms || [],
        };
    }
};
exports.SchoolSettingsService = SchoolSettingsService;
exports.SchoolSettingsService = SchoolSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        credential_service_1.CredentialService,
        subscription_service_1.SubscriptionService,
        audit_service_1.AuditService,
        storage_service_1.StorageService])
], SchoolSettingsService);
//# sourceMappingURL=school-settings.service.js.map