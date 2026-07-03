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
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const rate_limit_decorator_1 = require("../infrastructure/rate-limit/rate-limit.decorator");
let EnrollmentRequestController = class EnrollmentRequestController {
    enrollmentService;
    constructor(enrollmentService) {
        this.enrollmentService = enrollmentService;
    }
    getAuthenticatedSchoolId(req) {
        const schoolId = req?.user?.schoolId;
        if (!schoolId) {
            throw new common_1.ForbiddenException('School not found in authenticated user');
        }
        return schoolId;
    }
    async getPublicSchools() {
        const schools = await this.enrollmentService.getPublicSchools();
        return { success: true, data: schools };
    }
    async getPublicSchoolById(id) {
        const school = await this.enrollmentService.getPublicSchoolById(id);
        if (!school) {
            return { success: false, message: 'School not found' };
        }
        return { success: true, data: school };
    }
    async getPublicSchoolByUrlSlug(slug) {
        const school = await this.enrollmentService.getPublicSchoolByUrlSlug(slug);
        if (!school) {
            return { success: false, message: 'School not found' };
        }
        return { success: true, data: school };
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
        const grades = await this.enrollmentService.getAvailableGrades(schoolId);
        return { success: true, data: grades };
    }
    async getEnrollmentStatus(schoolId) {
        const status = await this.enrollmentService.getEnrollmentStatus(schoolId);
        return { success: true, data: status };
    }
    async listRequests(query, req) {
        const result = await this.enrollmentService.listEnrollmentRequests({
            ...query,
            schoolId: this.getAuthenticatedSchoolId(req),
        });
        return { success: true, ...result };
    }
    async getStats(req, academicYearId) {
        const stats = await this.enrollmentService.getEnrollmentStats(this.getAuthenticatedSchoolId(req), academicYearId);
        return { success: true, data: stats };
    }
    async getRequest(id, req) {
        const enrollment = await this.enrollmentService.getEnrollmentRequest(id, this.getAuthenticatedSchoolId(req));
        return { success: true, data: enrollment };
    }
    async approveEnrollment(id, req) {
        const result = await this.enrollmentService.approveEnrollment(id, this.getAuthenticatedSchoolId(req), req.user.id);
        return {
            success: true,
            message: 'Enrollment approved successfully. Credentials generated.',
            data: result,
        };
    }
    async rejectEnrollment(id, reason, req) {
        if (!reason) {
            return { success: false, message: 'Rejection reason is required' };
        }
        const enrollment = await this.enrollmentService.rejectEnrollment(id, this.getAuthenticatedSchoolId(req), reason);
        return {
            success: true,
            message: 'Enrollment rejected.',
            data: enrollment,
        };
    }
    async waitlistEnrollment(id, req) {
        const enrollment = await this.enrollmentService.waitlistEnrollment(id, this.getAuthenticatedSchoolId(req));
        return {
            success: true,
            message: 'Student added to waitlist.',
            data: enrollment,
        };
    }
    async cancelEnrollment(id, req) {
        const enrollment = await this.enrollmentService.cancelEnrollment(id, this.getAuthenticatedSchoolId(req));
        return {
            success: true,
            message: 'Enrollment request cancelled.',
            data: enrollment,
        };
    }
    async sendCredentials(id, body, req) {
        const enrollment = await this.enrollmentService.getEnrollmentRequest(id, this.getAuthenticatedSchoolId(req));
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
    (0, common_1.Get)('school/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getPublicSchoolById", null);
__decorate([
    (0, common_1.Get)('school-url/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getPublicSchoolByUrlSlug", null);
__decorate([
    (0, common_1.Post)('request'),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 5, windowSec: 600 }),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('ENROLLMENT_MANAGEMENT'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [enrollment_request_dto_1.EnrollmentQueryDto, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('ENROLLMENT_MANAGEMENT'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('requests/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('ENROLLMENT_MANAGEMENT'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "getRequest", null);
__decorate([
    (0, common_1.Post)('requests/:id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('ENROLLMENT_MANAGEMENT'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "approveEnrollment", null);
__decorate([
    (0, common_1.Post)('requests/:id/reject'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('ENROLLMENT_MANAGEMENT'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "rejectEnrollment", null);
__decorate([
    (0, common_1.Post)('requests/:id/waitlist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('ENROLLMENT_MANAGEMENT'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "waitlistEnrollment", null);
__decorate([
    (0, common_1.Delete)('requests/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "cancelEnrollment", null);
__decorate([
    (0, common_1.Post)('requests/:id/send-credentials'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EnrollmentRequestController.prototype, "sendCredentials", null);
exports.EnrollmentRequestController = EnrollmentRequestController = __decorate([
    (0, common_1.Controller)('enrollment'),
    __metadata("design:paramtypes", [enrollment_request_service_1.EnrollmentRequestService])
], EnrollmentRequestController);
//# sourceMappingURL=enrollment-request.controller.js.map