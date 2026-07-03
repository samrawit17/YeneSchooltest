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
exports.ClassController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const class_service_1 = require("./class.service");
const role_enum_1 = require("../auth/types/role.enum");
const school_settings_service_1 = require("../school-settings/school-settings.service");
let ClassController = class ClassController {
    classService;
    schoolSettingsService;
    constructor(classService, schoolSettingsService) {
        this.classService = classService;
        this.schoolSettingsService = schoolSettingsService;
    }
    async create(req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.classService.create({
            schoolId,
            academicYearId: body.academicYearId,
            grade: body.grade,
            section: body.section,
            name: body.name,
        });
    }
    async findAll(req, academicYearId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.classService.findAll(schoolId, academicYearId);
    }
    async getGrades(req) {
        const { schoolId, role } = req.user;
        if (!schoolId) {
            return role === role_enum_1.Role.SUPER_ADMIN ? this.classService.getGrades() : [];
        }
        const gradeLevels = await this.schoolSettingsService.getGradeLevelsForSchool(schoolId);
        return gradeLevels.map((grade) => grade.level);
    }
    async search(req, query, academicYearId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        if (!query) {
            return { success: false, message: 'Search query is required' };
        }
        return this.classService.search(schoolId, query, academicYearId);
    }
    async findOne(req, id) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.classService.findOne(id, schoolId);
    }
    async update(req, id, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.classService.update(id, schoolId, {
            academicYearId: body.academicYearId,
            grade: body.grade,
            section: body.section,
            name: body.name,
            homeroomTeacherId: body.homeroomTeacherId,
        });
    }
    async setHomeroomTeacher(req, id, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.classService.update(id, schoolId, {
            homeroomTeacherId: body.homeroomTeacherId,
        });
    }
    async getStudentsByClass(id, req, sectionId, search, page, limit, orderBy) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        const pagination = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
            orderBy: orderBy || 'name',
        };
        return this.classService.getStudentsByClass(schoolId, id, sectionId, search, pagination, { id: req.user.id, role: req.user.role });
    }
    async getClassStats(req, id, sectionId) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.classService.getClassStats(schoolId, id, sectionId);
    }
    async delete(req, id) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.classService.delete(id, schoolId);
    }
};
exports.ClassController = ClassController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('class:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('grades/list'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "getGrades", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('class:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/homeroom-teacher'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('class:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "setHomeroomTeacher", null);
__decorate([
    (0, common_1.Get)(':id/students'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('sectionId')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('orderBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "getStudentsByClass", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('sectionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "getClassStats", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('class:delete'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClassController.prototype, "delete", null);
exports.ClassController = ClassController = __decorate([
    (0, common_1.Controller)('classes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [class_service_1.ClassService,
        school_settings_service_1.SchoolSettingsService])
], ClassController);
//# sourceMappingURL=class.controller.js.map