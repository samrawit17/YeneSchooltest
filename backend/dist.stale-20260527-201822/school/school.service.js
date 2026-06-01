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
const prisma_service_1 = require("../prisma/prisma.service");
const platform_settings_service_1 = require("../platform-settings/platform-settings.service");
const subscription_service_1 = require("../subscription/subscription.service");
const enrollment_util_1 = require("../common/utils/enrollment.util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let SchoolService = class SchoolService {
    prismaService;
    platformSettingsService;
    subscriptionService;
    constructor(prismaService, platformSettingsService, subscriptionService) {
        this.prismaService = prismaService;
        this.platformSettingsService = platformSettingsService;
        this.subscriptionService = subscriptionService;
    }
    async createSchool(createSchoolDto) {
        await this.enforceMaxSchoolsAllowed();
        const { name, email, address, phone } = createSchoolDto;
        const enrollmentKey = (0, enrollment_util_1.generateEnrollmentKey)(name);
        const school = await this.prismaService.school.create({
            data: {
                name,
                email,
                enrollmentKey,
                ...(address && { address }),
                ...(phone && { phone }),
            },
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
            throw new common_1.HttpException(`Maximum schools limit reached. The platform allows ${maxSchoolsAllowed} school${maxSchoolsAllowed === 1 ? '' : 's'}.`, common_1.HttpStatus.BAD_REQUEST);
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
    async getSchools() {
        return this.prismaService.school.findMany({
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });
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
    async updateSchool(id, data) {
        return this.prismaService.school.update({
            where: { id },
            data,
        });
    }
    async deleteSchool(id) {
        return this.prismaService.school.delete({
            where: { id },
        });
    }
    async uploadLogo(schoolId, file) {
        const backendPublicDir = path.join(process.cwd(), 'public', 'uploads', 'schools');
        const frontendPublicDir = path.join(process.cwd(), '..', 'frontend', 'public', 'uploads', 'schools');
        if (!fs.existsSync(backendPublicDir)) {
            fs.mkdirSync(backendPublicDir, { recursive: true });
        }
        if (!fs.existsSync(frontendPublicDir)) {
            fs.mkdirSync(frontendPublicDir, { recursive: true });
        }
        const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
        const backendFilePath = path.join(backendPublicDir, fileName);
        const frontendFilePath = path.join(frontendPublicDir, fileName);
        fs.writeFileSync(backendFilePath, file.buffer);
        fs.copyFileSync(backendFilePath, frontendFilePath);
        const logoUrl = `/uploads/schools/${fileName}`;
        await this.prismaService.school.update({
            where: { id: schoolId },
            data: { logoUrl },
        });
        return logoUrl;
    }
};
exports.SchoolService = SchoolService;
exports.SchoolService = SchoolService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        platform_settings_service_1.PlatformSettingsService,
        subscription_service_1.SubscriptionService])
], SchoolService);
//# sourceMappingURL=school.service.js.map