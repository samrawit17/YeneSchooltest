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
exports.SchoolService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const platform_settings_service_1 = require("../platform-settings/platform-settings.service");
const subscription_service_1 = require("../subscription/subscription.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const audit_service_1 = require("../audit/audit.service");
const enrollment_util_1 = require("../common/utils/enrollment.util");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_service_1 = require("../storage/storage.service");
let SchoolService = class SchoolService {
    prismaService;
    platformSettingsService;
    subscriptionService;
    auditService;
    eventBus;
    storageService;
    constructor(prismaService, platformSettingsService, subscriptionService, auditService, eventBus, storageService) {
        this.prismaService = prismaService;
        this.platformSettingsService = platformSettingsService;
        this.subscriptionService = subscriptionService;
        this.auditService = auditService;
        this.eventBus = eventBus;
        this.storageService = storageService;
    }
    async createSchool(createSchoolDto) {
        await this.enforceMaxSchoolsAllowed();
        const { name, email, address, phone } = createSchoolDto;
        const enrollmentKey = (0, enrollment_util_1.generateEnrollmentKey)(name);
        const publicUrlSlug = await this.generateUniquePublicUrlSlug(name);
        const school = await this.prismaService.school.create({
            data: {
                name,
                email,
                enrollmentKey,
                publicUrlSlug,
                ...(address && { address }),
                ...(phone && { phone }),
            },
        });
        void this.eventBus.emit('school.created', {
            schoolId: school.id,
            schoolName: school.name,
            email: school.email,
        });
        const corePlan = await this.subscriptionService.getPlanByTier('CORE');
        if (corePlan?.id) {
            await this.subscriptionService.assignPlanToSchool(school.id, corePlan.id);
        }
        return this.prismaService.school.findUnique({
            where: { id: school.id },
            include: { plan: true },
        });
    }
    async enforceMaxSchoolsAllowed() {
        const rawLimit = await this.platformSettingsService.getSetting('MAX_SCHOOLS_ALLOWED');
        const maxSchoolsAllowed = this.parsePositiveInteger(rawLimit);
        if (!maxSchoolsAllowed) {
            return;
        }
        const currentSchoolCount = await this.prismaService.school.count();
        if (currentSchoolCount >= maxSchoolsAllowed) {
            throw new localization_1.LocalizedException('school.maximum_schools_limit_reached_the_platform_allows_school_f2229a84', undefined, undefined, 'Maximum schools limit reached. The platform allows ${maxSchoolsAllowed} school${maxSchoolsAllowed === 1 ? \'\' : \'s\'}.');
        }
    }
    parsePositiveInteger(value) {
        if (typeof value === 'number') {
            return Number.isInteger(value) && value > 0 ? value : null;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            const parsed = Number(trimmed);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        }
        return null;
    }
    async getSchools(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [schools, total, activeTotal, totalStudents] = await Promise.all([
            this.prismaService.school.findMany({
                skip,
                take: limit,
                include: { plan: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prismaService.school.count(),
            this.prismaService.school.count({ where: { isActive: true } }),
            this.prismaService.user.count({
                where: { role: client_1.Role.STUDENT, deletedAt: null },
            }),
        ]);
        const schoolIds = schools.map((school) => school.id);
        const [studentUserCounts, studentProfileCounts] = schoolIds.length
            ? await Promise.all([
                this.prismaService.user.groupBy({
                    by: ['schoolId'],
                    where: {
                        schoolId: { in: schoolIds },
                        role: client_1.Role.STUDENT,
                        deletedAt: null,
                    },
                    _count: { _all: true },
                }),
                this.prismaService.studentProfile.groupBy({
                    by: ['schoolId'],
                    where: { schoolId: { in: schoolIds } },
                    _count: { _all: true },
                }),
            ])
            : [[], []];
        const studentUserCountBySchool = new Map(studentUserCounts
            .filter((item) => item.schoolId)
            .map((item) => [item.schoolId, item._count._all]));
        const studentProfileCountBySchool = new Map(studentProfileCounts.map((item) => [item.schoolId, item._count._all]));
        return {
            data: schools.map((school) => ({
                ...school,
                studentCount: Math.max(studentUserCountBySchool.get(school.id) || 0, studentProfileCountBySchool.get(school.id) || 0),
            })),
            total,
            activeTotal,
            totalStudents,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getSchoolById(id) {
        return this.prismaService.school.findUnique({
            where: { id },
        });
    }
    async getSchoolByEnrollmentKey(enrollmentKey) {
        return this.prismaService.school.findUnique({
            where: { enrollmentKey },
        });
    }
    async getSchoolByPublicUrlSlug(publicUrlSlug) {
        return this.prismaService.school.findUnique({
            where: { publicUrlSlug },
        });
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
    async auditSchoolChange(schoolId, oldSchool, newSchool, context) {
        const changed = Object.keys(oldSchool).reduce((acc, key) => {
            const oldValue = oldSchool[key];
            const newValue = newSchool[key];
            if (JSON.stringify(oldValue ?? null) !== JSON.stringify(newValue ?? null)) {
                acc[key] = { oldValue: oldValue ?? null, newValue: newValue ?? null };
            }
            return acc;
        }, {});
        if (Object.keys(changed).length === 0)
            return;
        await this.auditService.log({
            actor: context.actor,
            schoolId,
            action: 'school.changed',
            entityType: 'School',
            entityId: schoolId,
            request: context.request,
            metadata: {
                changed,
                source: context.source || 'profile',
            },
        });
    }
    async updateSchool(id, data, context = {}) {
        const existing = await this.prismaService.school.findUnique({
            where: { id },
            select: {
                name: true,
                email: true,
                address: true,
                phone: true,
                code: true,
                logoUrl: true,
                publicUrlSlug: true,
            },
        });
        throw new localization_1.LocalizedException('school.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        if (data.publicUrlSlug) {
            data.publicUrlSlug = await this.normalizeUniquePublicUrlSlug(data.publicUrlSlug, id);
        }
        const school = await this.prismaService.school.update({
            where: { id },
            data,
        });
        await this.auditSchoolChange(id, existing, school, context);
        const changedFields = Object.keys(data).filter((key) => data[key] !== undefined);
        void this.eventBus.emit('school.updated', {
            schoolId: id,
            schoolName: school.name,
            changes: changedFields,
            updatedBy: context.actor?.id || null,
        });
        if (data.logoUrl !== undefined &&
            existing.logoUrl &&
            existing.logoUrl !== school.logoUrl) {
            await this.cleanupLocalUpload(existing.logoUrl);
        }
        return school;
    }
    async deleteSchool(id) {
        const school = await this.prismaService.school.findUnique({
            where: { id },
            select: { id: true, name: true },
        });
        if (!school) {
            throw new localization_1.LocalizedException('school.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        await this.prismaService.school.delete({
            where: { id },
        });
        void this.eventBus.emit('school.deleted', {
            schoolId: school.id,
            schoolName: school.name,
        });
    }
    async uploadLogo(schoolId, file, context = {}) {
        if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)) {
            throw new localization_1.LocalizedException('school.logo_must_be_png_jpg_jpeg_or_webp_2cf6cfc8', undefined, undefined, 'Logo must be PNG, JPG, JPEG, or WEBP');
        }
        if (file.size > 2 * 1024 * 1024) {
            throw new localization_1.LocalizedException('school.logo_must_be_less_than_2mb_3224a69c', undefined, undefined, 'Logo must be less than 2MB');
        }
        const existing = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { logoUrl: true },
        });
        throw new localization_1.LocalizedException('school.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        const extension = file.mimetype === 'image/png'
            ? '.png'
            : file.mimetype === 'image/webp'
                ? '.webp'
                : '.jpg';
        const fileName = `${schoolId}-${Date.now()}${extension}`;
        const storedFile = await this.storageService.upload(file.buffer, fileName, file.mimetype, { schoolId, folder: 'logos', generateName: false });
        const logoUrl = storedFile.url;
        await this.prismaService.school.update({
            where: { id: schoolId },
            data: { logoUrl },
        });
        await this.auditSchoolChange(schoolId, { logoUrl: existing.logoUrl }, { logoUrl }, { ...context, source: 'logo' });
        await this.cleanupLocalUpload(existing.logoUrl);
        return logoUrl;
    }
    slugify(value) {
        return (value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-') || 'school');
    }
    async generateUniquePublicUrlSlug(name) {
        const baseSlug = this.slugify(name);
        let slug = baseSlug;
        let suffix = 2;
        while (await this.prismaService.school.findUnique({
            where: { publicUrlSlug: slug },
            select: { id: true },
        })) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        return slug;
    }
    async normalizeUniquePublicUrlSlug(value, schoolId) {
        const slug = this.slugify(value);
        const existing = await this.prismaService.school.findUnique({
            where: { publicUrlSlug: slug },
            select: { id: true },
        });
        if (existing && existing.id !== schoolId) {
            throw new localization_1.LocalizedException('school.this_school_url_is_already_in_use_8558bc8a', undefined, undefined, 'This school URL is already in use');
        }
        return slug;
    }
};
exports.SchoolService = SchoolService;
exports.SchoolService = SchoolService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        platform_settings_service_1.PlatformSettingsService,
        subscription_service_1.SubscriptionService,
        audit_service_1.AuditService,
        event_bus_service_1.EventBusService,
        storage_service_1.StorageService])
], SchoolService);
//# sourceMappingURL=school.service.js.map