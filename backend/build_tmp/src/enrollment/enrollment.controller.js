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
exports.EnrollmentController = void 0;
const common_1 = require("@nestjs/common");
const enrollment_service_1 = require("./enrollment.service");
const dto_1 = require("./dto");
let EnrollmentController = class EnrollmentController {
    enrollmentService;
    constructor(enrollmentService) {
        this.enrollmentService = enrollmentService;
    }
    async enrollmentLanding(enrollmentKey) {
        if (!enrollmentKey) {
            return {
                error: 'Missing enrollment key',
                message: 'Please provide a valid enrollment key',
                statusCode: common_1.HttpStatus.BAD_REQUEST,
            };
        }
        const school = await this.enrollmentService.resolveSchoolByKey(enrollmentKey);
        if (!school) {
            return {
                error: 'Invalid enrollment key',
                message: 'The provided enrollment key is not valid',
                statusCode: common_1.HttpStatus.NOT_FOUND,
            };
        }
        if (!school.isActive) {
            return {
                error: 'Enrollment closed',
                message: 'Enrollment is not currently available for this school',
                statusCode: common_1.HttpStatus.FORBIDDEN,
            };
        }
        const enrollmentToken = this.enrollmentService.generateEnrollmentToken(school.id);
        return {
            success: true,
            school: {
                id: school.id,
                name: school.name,
            },
            enrollmentToken,
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000',
        };
    }
    verifyToken(token) {
        const result = this.enrollmentService.verifyEnrollmentToken(token);
        return result;
    }
    async approveEnrollment(dto) {
        const result = await this.enrollmentService.approveEnrollment(dto.enrollmentId, dto.schoolId);
        return {
            success: true,
            message: 'Enrollment approved successfully',
            data: result,
        };
    }
    async rejectEnrollment(dto) {
        const result = await this.enrollmentService.rejectEnrollment(dto.enrollmentId, dto.schoolId, dto.rejectionReason);
        return {
            success: true,
            message: 'Enrollment rejected',
            data: result,
        };
    }
};
exports.EnrollmentController = EnrollmentController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "enrollmentLanding", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EnrollmentController.prototype, "verifyToken", null);
__decorate([
    (0, common_1.Post)('approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ApproveEnrollmentDto]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "approveEnrollment", null);
__decorate([
    (0, common_1.Post)('reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RejectEnrollmentDto]),
    __metadata("design:returntype", Promise)
], EnrollmentController.prototype, "rejectEnrollment", null);
exports.EnrollmentController = EnrollmentController = __decorate([
    (0, common_1.Controller)('enroll'),
    __metadata("design:paramtypes", [enrollment_service_1.EnrollmentService])
], EnrollmentController);
//# sourceMappingURL=enrollment.controller.js.map