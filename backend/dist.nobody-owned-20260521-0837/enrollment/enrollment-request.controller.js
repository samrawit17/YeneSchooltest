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
exports.EnrollmentRequestController = void 0;
const common_1 = require("@nestjs/common");
const enrollment_request_service_1 = require("./enrollment-request.service");
const enrollment_request_dto_1 = require("./dto/enrollment-request.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const client_1 = require("@prisma/client");
let EnrollmentRequestController = class EnrollmentRequestController {
    enrollmentService;
    constructor(enrollmentService) {
        this.enrollmentService = enrollmentService;
    }
    async getPublicSchools() {
        const schools = await this.enrollmentService.getPublicSchools();
        return { success: true, data: schools };
    }
    async createEnrollmentRequest(dto) {
        const enrollment = await this.enrollmentService.createEnrollmentRequest(dto);
        return {
            success: true,
            message: 'Enrollment request submitted successfully. You will be notified once reviewed by the school.',
            data: {
                id: enrollment.id,
                status: enrollment.status,
                referenceNumber: enrollment.referenceNumber,
            },
        };
    }
    async checkCapacity(schoolId, grade) {
        const capacity = await this.enrollmentService.checkGradeCapacity(schoolId, Number(grade));
        return { success: true, data: capacity };
    }
    async getAvailableGrades(schoolId) {
        const grades = Array.from({ length: 12 }, (_, i) => ({
            grade: i + 1,
        }));
        return { success: true, data: grades };
    }
    async getEnrollmentStatus(schoolId) {
        const status = await this.enrollmentService.getEnrollmentStatus(schoolId);
        return { success: true, data: status };
    }
    async listRequests(query) {
        const result = await this.enrollmentService.listEnrollmentRequests(query);
        return { success: true, ...result };
    }
    async getStats(schoolId, academicYearId) {
        const stats = await this.enrollmentService.getEnrollmentStats(schoolId, academicYearId);
        return { success: true, data: stats };
    }
    async getRequest(id, schoolId) {
        const enrollment = await this.enrollmentService.getEnrollmentRequest(id, schoolId);
        return { success: true, data: enrollment };
    }
    async approveEnrollment(id, schoolId, req) {
        const result = await this.enrollmentService.approveEnrollment(id, schoolId, req.user.id);
        return {
            success: true,
            message: 'Enrollment approved successfully. Credentials generated.',
            data: result,
        };
    }
    async rejectEnrollment(id, schoolId, reason) {
        if (!reason) {
            return { success: false, message: 'Rejection reason is required' };
        }
        const enrollment = await this.enrollmentService.rejectEnrollment(id, schoolId, reason);
        return {
            success: true,
            message: 'Enrollment rejected.',
            data: enrollment,
        };
    }
    async waitlistEnrollment(id, schoolId) {
        const enrollment = await this.enrollmentService.waitlistEnrollment(id, schoolId);
        return {
            success: true,
            message: 'Student added to waitlist.',
            data: enrollment,
        };
    }
    async cancelEnrollment(id, schoolId) {
        const enrollment = await this.enrollmentService.cancelEnrollment(id, schoolId);
        return {
            success: true,
            message: 'Enrollment request cancelled.',
            data: enrollment,
        };
    }
    async sendCredentials(id, schoolId, body) {
        const enrollment = await this.enrollmentService.getEnrollmentRequest(id, schoolId);
        if (enrollment.status !== client_1.EnrollmentRequestStatus.APPROVED) {
            return { success: false, message: 'Enrollment must be approved first' };
        }
        return {
            success: true,
            message: 'Credentials ready to send',
            data: {
                student: {
                    email: enrollment.user?.email,
                },
                note: 'Email/SMS sending will be implemented with notification service',
            },
        };
    }
};
exports.EnrollmentRequestController = EnrollmentRequestController;
__decorate([
    (0, common_1.Get)('schools'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getPublicSchools", null);
__decorate([
    (0, common_1.Post)('request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [enrollment_request_dto_1.CreateEnrollmentRequestDto]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "createEnrollmentRequest", null);
__decorate([
    (0, common_1.Get)('capacity/:grade'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Param)('grade')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "checkCapacity", null);
__decorate([
    (0, common_1.Get)('grades'),
    __param(0, (0, common_1.Query)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getAvailableGrades", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Query)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getEnrollmentStatus", null);
__decorate([
    (0, common_1.Get)('requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [enrollment_request_dto_1.EnrollmentQueryDto]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('requests/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getRequest", null);
__decorate([
    (0, common_1.Post)('requests/:id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "approveEnrollment", null);
__decorate([
    (0, common_1.Post)('requests/:id/reject'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "rejectEnrollment", null);
__decorate([
    (0, common_1.Post)('requests/:id/waitlist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "waitlistEnrollment", null);
__decorate([
    (0, common_1.Delete)('requests/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "cancelEnrollment", null);
__decorate([
    (0, common_1.Post)('requests/:id/send-credentials'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "sendCredentials", null);
exports.EnrollmentRequestController = EnrollmentRequestController = __decorate([
    (0, common_1.Controller)('enrollment'),
    __metadata("design:paramtypes", [enrollment_request_service_1.EnrollmentRequestService])
], EnrollmentRequestController);
//# sourceMappingURL=enrollment-request.controller.js.map