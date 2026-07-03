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
exports.RegistrarController = void 0;
const common_1 = require("@nestjs/common");
const registrar_service_1 = require("./registrar.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let RegistrarController = class RegistrarController {
    registrarService;
    constructor(registrarService) {
        this.registrarService = registrarService;
    }
    async createStudent(body, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.createStudent(body, schoolId, req.user.id);
    }
    async getStudents(req, status, grade) {
        const schoolId = req.user.schoolId;
        const filters = {
            status: status,
            grade: grade ? parseInt(grade) : undefined,
        };
        return this.registrarService.getStudents(schoolId, filters);
    }
    async getStudentById(studentId, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.getStudentById(studentId, schoolId);
    }
    async updateStudent(studentId, body, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.updateStudent(studentId, schoolId, body);
    }
    async getPendingEnrollments(req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.getPendingEnrollments(schoolId);
    }
    async getEnrollments(req, status, page) {
        const schoolId = req.user.schoolId;
        const pageNum = page ? parseInt(page) : 1;
        return this.registrarService.getEnrollments(schoolId, status, pageNum);
    }
    async approveEnrollment(enrollmentId, body, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.approveEnrollment(enrollmentId, schoolId, body);
    }
    async approveEnrollmentAuto(enrollmentId, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.approveEnrollmentAuto(enrollmentId, schoolId);
    }
    async rejectEnrollment(enrollmentId, rejectionReason, req) {
        if (!rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required');
        }
        const schoolId = req.user.schoolId;
        return this.registrarService.rejectEnrollment(enrollmentId, schoolId, rejectionReason);
    }
    async assignClass(studentId, body, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.assignClass(studentId, schoolId, body);
    }
    async uploadDocuments(studentId, documents, req) {
        const schoolId = req.user.schoolId;
        return this.registrarService.uploadDocuments(studentId, schoolId, documents);
    }
};
exports.RegistrarController = RegistrarController;
__decorate([
    (0, common_1.Post)('students'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "createStudent", null);
__decorate([
    (0, common_1.Get)('students'),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('grade')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "getStudents", null);
__decorate([
    (0, common_1.Get)('students/:id'),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "getStudentById", null);
__decorate([
    (0, common_1.Put)('students/:id'),
    (0, permissions_decorator_1.Permissions)('student:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "updateStudent", null);
__decorate([
    (0, common_1.Get)('enrollments/pending'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "getPendingEnrollments", null);
__decorate([
    (0, common_1.Get)('enrollments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "getEnrollments", null);
__decorate([
    (0, common_1.Post)('enrollments/:id/approve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "approveEnrollment", null);
__decorate([
    (0, common_1.Post)('enrollments/:id/auto-approve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "approveEnrollmentAuto", null);
__decorate([
    (0, common_1.Post)('enrollments/:id/reject'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('rejectionReason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "rejectEnrollment", null);
__decorate([
    (0, common_1.Post)('students/:id/assign-class'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('class:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "assignClass", null);
__decorate([
    (0, common_1.Post)('students/:id/documents'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('document:upload'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('documents')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], RegistrarController.prototype, "uploadDocuments", null);
exports.RegistrarController = RegistrarController = __decorate([
    (0, common_1.Controller)('registrar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [registrar_service_1.RegistrarService])
], RegistrarController);
//# sourceMappingURL=registrar.controller.js.map