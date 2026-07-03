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
exports.TeacherController = void 0;
const common_1 = require("@nestjs/common");
const teacher_service_1 = require("./teacher.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let TeacherController = class TeacherController {
    teacherService;
    constructor(teacherService) {
        this.teacherService = teacherService;
    }
    async getTeachers(req, page, limit, search, status, classId, sectionId, subject) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            const pageNum = page ? parseInt(page, 10) : 1;
            const limitNum = limit ? parseInt(limit, 10) : 10;
            return this.teacherService.getTeachers(req.user.schoolId, {
                page: pageNum,
                limit: limitNum,
                search,
                status,
                classId,
                sectionId,
                subject,
            });
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get teachers: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTeacherById(teacherId, req) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            const teacher = await this.teacherService.getTeacherById(teacherId, req.user.schoolId);
            if (!teacher) {
                throw new common_1.HttpException('Teacher not found', common_1.HttpStatus.NOT_FOUND);
            }
            return teacher;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get teacher: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getMyAssignments(req, academicYear) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.teacherService.getMyAssignments(req.user.id, req.user.schoolId, academicYear);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get assignments: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTeacherAssignments(teacherId, req) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.teacherService.getMyAssignments(teacherId, req.user.schoolId);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get assignments: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.TeacherController = TeacherController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('user:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('classId')),
    __param(6, (0, common_1.Query)('sectionId')),
    __param(7, (0, common_1.Query)('subject')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], TeacherController.prototype, "getTeachers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('user:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TeacherController.prototype, "getTeacherById", null);
__decorate([
    (0, common_1.Get)('me/assignments'),
    (0, permissions_decorator_1.Permissions)('teacher:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TeacherController.prototype, "getMyAssignments", null);
__decorate([
    (0, common_1.Get)(':id/assignments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('teacher:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TeacherController.prototype, "getTeacherAssignments", null);
exports.TeacherController = TeacherController = __decorate([
    (0, common_1.Controller)('teachers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [teacher_service_1.TeacherService])
], TeacherController);
//# sourceMappingURL=teacher.controller.js.map