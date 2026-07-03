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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const payments_dto_1 = require("./payments.dto");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN ? requestedSchoolId || user?.schoolId : user?.schoolId;
    }
    async recordPayment(dto, req) {
        try {
            const result = await this.paymentsService.recordPayment(req.user, { ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
            return { success: true, ...result };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to record payment');
        }
    }
    async reversePayment(paymentId, body, req) {
        try {
            const result = await this.paymentsService.reversePayment(req.user, this.resolveSchoolId(req.user, body.schoolId), paymentId, body.reason);
            return { success: true, ...result };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to reverse payment');
        }
    }
    async getAllPayments(schoolId, req) {
        const result = await this.paymentsService.getAllPayments(this.resolveSchoolId(req.user, schoolId));
        return { success: true, ...result };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('payments/record'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payments:record'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payments_dto_1.RecordPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Post)('payments/:paymentId/reverse'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payments:reverse'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "reversePayment", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getAllPayments", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('FINANCE_MANAGEMENT'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map