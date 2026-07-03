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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const discount_policy_service_1 = require("../discount-policy/discount-policy.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const finance_dto_1 = require("./dto/finance.dto");
let FinanceController = class FinanceController {
    financeService;
    discountPolicyService;
    constructor(financeService, discountPolicyService) {
        this.financeService = financeService;
        this.discountPolicyService = discountPolicyService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN
            ? requestedSchoolId || user?.schoolId
            : user?.schoolId;
    }
    async sendPeriodFeeReminders(body, req) {
        try {
            const result = await this.financeService.sendPeriodFeeReminders(this.resolveSchoolId(req.user, body.schoolId), body.termId);
            return { success: true, ...result };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to send fee reminders');
        }
    }
    async getCurriculumInfo(schoolId, academicYearId, req) {
        const result = await this.financeService.getCurriculumInfo(this.resolveSchoolId(req?.user, schoolId), academicYearId);
        return { success: true, ...result };
    }
    async calculateInstallmentFees(dto, req) {
        const result = await this.financeService.calculateInstallmentFees({
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, ...result };
    }
    async generateInstallmentFees(dto, req) {
        const result = await this.financeService.generateInstallmentFees({
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, ...result };
    }
    async getBillingConfig(schoolId, academicYearId, req) {
        const config = await this.financeService.getBillingConfig(this.resolveSchoolId(req.user, schoolId), academicYearId);
        return { success: true, data: config };
    }
    async getFeeCollectionMode(schoolId, req) {
        const config = await this.financeService.getBillingConfig(this.resolveSchoolId(req.user, schoolId));
        const modeLabels = {
            MONTHLY: 'Monthly',
            QUARTERLY: 'Quarterly',
            SEMESTERLY: 'Semesterly',
            TERMLY: 'Termly',
            YEARLY: 'Full Year',
        };
        return {
            success: true,
            data: {
                mode: config.billingMode,
                modeLabel: modeLabels[config.billingMode] || config.billingMode,
                installmentCount: config.billingPeriodsPerYear,
                curriculumType: config.curriculumType,
            },
        };
    }
    async applyDiscountPolicy(req, studentFeeId, body) {
        const result = await this.discountPolicyService.applyToStudentFee(studentFeeId, body.discountPolicyId, req.user.schoolId);
        return { success: true, data: result };
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Post)('reminders/period-fees'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:read'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "sendPeriodFeeReminders", null);
__decorate([
    (0, common_1.Get)('curriculum-info'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getCurriculumInfo", null);
__decorate([
    (0, common_1.Post)('fee-calculation/installments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.CalculateInstallmentFeesDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "calculateInstallmentFees", null);
__decorate([
    (0, common_1.Post)('fee-structures/generate-installments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.GenerateInstallmentFeesDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "generateInstallmentFees", null);
__decorate([
    (0, common_1.Get)('billing-config'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getBillingConfig", null);
__decorate([
    (0, common_1.Get)('fee-collection-mode'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getFeeCollectionMode", null);
__decorate([
    (0, common_1.Post)('student-fees/:studentFeeId/apply-discount'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentFeeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "applyDiscountPolicy", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('FINANCE_MANAGEMENT'),
    __metadata("design:paramtypes", [finance_service_1.FinanceService,
        discount_policy_service_1.DiscountPolicyService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map