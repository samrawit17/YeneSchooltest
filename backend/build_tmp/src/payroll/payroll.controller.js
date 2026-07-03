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
exports.PayrollController = void 0;
const common_1 = require("@nestjs/common");
const payroll_service_1 = require("./payroll.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const payroll_dto_1 = require("./payroll.dto");
let PayrollController = class PayrollController {
    payrollService;
    constructor(payrollService) {
        this.payrollService = payrollService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN
            ? requestedSchoolId || user?.schoolId
            : user?.schoolId;
    }
    async payrollStaff(schoolId, req) {
        const result = await this.payrollService.listPayrollStaff(this.resolveSchoolId(req.user, schoolId));
        return { success: true, data: result };
    }
    async payrollSalaries(schoolId, req) {
        const result = await this.payrollService.listPayrollSalaries(this.resolveSchoolId(req.user, schoolId));
        return { success: true, data: result };
    }
    async upsertPayrollSalary(dto, req) {
        const result = await this.payrollService.upsertPayrollSalary(req.user, {
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, data: result };
    }
    async payrollRuns(query, req) {
        const result = await this.payrollService.listPayrollRuns({
            ...query,
            schoolId: this.resolveSchoolId(req.user, query.schoolId),
        });
        return { success: true, ...result };
    }
    async createPayrollRun(dto, req) {
        const result = await this.payrollService.createPayrollRun(req.user, {
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, data: result };
    }
    async payrollRun(id, schoolId, req) {
        const result = await this.payrollService.getPayrollRun(this.resolveSchoolId(req.user, schoolId), id);
        return { success: true, data: result };
    }
    async updatePayrollRunStatus(id, dto, req) {
        const result = await this.payrollService.updatePayrollRunStatus(req.user, id, {
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, data: result };
    }
    async updatePayrollEntryStatus(id, dto, req) {
        const result = await this.payrollService.updatePayrollEntryStatus(req.user, id, {
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, data: result };
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)('staff'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "payrollStaff", null);
__decorate([
    (0, common_1.Get)('salaries'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "payrollSalaries", null);
__decorate([
    (0, common_1.Post)('salaries'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payroll_dto_1.UpsertPayrollSalaryDto, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "upsertPayrollSalary", null);
__decorate([
    (0, common_1.Get)('runs'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payroll_dto_1.PayrollQueryDto, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "payrollRuns", null);
__decorate([
    (0, common_1.Post)('runs'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payroll_dto_1.CreatePayrollRunDto, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "createPayrollRun", null);
__decorate([
    (0, common_1.Get)('runs/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "payrollRun", null);
__decorate([
    (0, common_1.Patch)('runs/:id/status'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:approve', 'finance:payroll:pay'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payroll_dto_1.UpdatePayrollRunStatusDto, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updatePayrollRunStatus", null);
__decorate([
    (0, common_1.Patch)('entries/:id/status'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payroll:pay'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payroll_dto_1.UpdatePayrollEntryStatusDto, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updatePayrollEntryStatus", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.Controller)('finance/payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('FINANCE_MANAGEMENT'),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map