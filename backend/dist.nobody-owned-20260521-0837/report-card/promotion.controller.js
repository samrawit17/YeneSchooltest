"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionController = void 0;
const common_1 = require("@nestjs/common");
const report_card_service_1 = require("./report-card.service");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let PromotionController = class PromotionController {
    reportCardService;
    prisma;
    constructor(reportCardService, prisma) {
        this.reportCardService = reportCardService;
        this.prisma = prisma;
    }
    async getPromotionCandidates(req, classId, query) {
        const academicYear = query.academicYear ||
            (await this.getActiveAcademicYear(req.user.schoolId));
        return this.reportCardService.getPromotionCandidates(classId, academicYear, {
            minAverageGrade: 50,
            minAttendance: 75,
            allowFailedSubjects: 2,
        });
    }
    async getNextClassOptions(classId, query) {
        return this.reportCardService.getNextClassOptions(classId, query.toAcademicYear);
    }
    async promoteStudent(req, body) {
        return this.reportCardService.promoteStudent({
            schoolId: req.user.schoolId,
            studentId: body.studentId,
            fromClassId: body.fromClassId,
            fromAcademicYear: body.fromAcademicYear,
            toClassId: body.toClassId,
            toAcademicYear: body.toAcademicYear,
            status: 'PROMOTED',
        });
    }
    async bulkPromote(req, body) {
        return this.reportCardService.bulkPromoteStudents({
            schoolId: req.user.schoolId,
            fromClassId: body.fromClassId,
            toClassId: body.toClassId,
            fromAcademicYear: body.fromAcademicYear,
            toAcademicYear: body.toAcademicYear,
            studentIds: body.studentIds || [],
            promoteAll: body.promoteAll || false,
            minAverageGrade: body.minAverageGrade || 50,
            minAttendance: body.minAttendance || 75,
        });
    }
    async getPromotionHistory(req, query) {
        return this.reportCardService.getPromotionHistory(req.user.schoolId, query);
    }
    async getActiveAcademicYear(schoolId) {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { name: true },
        });
        return academicYear?.name || new Date().getFullYear().toString();
    }
};
exports.PromotionController = PromotionController;
__decorate([
    (0, common_1.Get)('candidates/:classId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('promotion:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('classId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PromotionController.prototype, "getPromotionCandidates", null);
__decorate([
    (0, common_1.Get)('next-classes/:classId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('promotion:read'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PromotionController.prototype, "getNextClassOptions", null);
__decorate([
    (0, common_1.Post)('single'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('promotion:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PromotionController.prototype, "promoteStudent", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('promotion:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PromotionController.prototype, "bulkPromote", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('promotion:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PromotionController.prototype, "getPromotionHistory", null);
exports.PromotionController = PromotionController = __decorate([
    (0, common_1.Controller)('promotion'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [report_card_service_1.ReportCardService,
        prisma_service_1.PrismaService])
], PromotionController);
//# sourceMappingURL=promotion.controller.js.map