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
exports.FeeStructureController = void 0;
const common_1 = require("@nestjs/common");
const fee_structure_service_1 = require("./fee-structure.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const fee_structure_dto_1 = require("./fee-structure.dto");
let FeeStructureController = class FeeStructureController {
    feeStructureService;
    constructor(feeStructureService) {
        this.feeStructureService = feeStructureService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN ? requestedSchoolId || user?.schoolId : user?.schoolId;
    }
    async createFeeStructure(dto, req) {
        const fs = await this.feeStructureService.createFeeStructure({ ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
        return { success: true, data: fs };
    }
    async listFeeStructures(schoolId, academicYearId, termId, req) {
        const data = await this.feeStructureService.listFeeStructures(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId);
        return { success: true, data };
    }
    async updateFeeStructure(id, schoolId, dto, req) {
        const fs = await this.feeStructureService.updateFeeStructure(id, this.resolveSchoolId(req.user, schoolId), dto);
        return { success: true, data: fs };
    }
    async deleteFeeStructure(id, schoolId, req) {
        const fs = await this.feeStructureService.deleteFeeStructure(id, this.resolveSchoolId(req.user, schoolId));
        return { success: true, data: fs };
    }
    async clearFeeStructures(schoolId, academicYearId, req) {
        const result = await this.feeStructureService.deleteFeeStructuresBySchool(this.resolveSchoolId(req?.user, schoolId), academicYearId);
        return { success: true, data: result };
    }
    async calculateInstallmentFees(dto, req) {
        const result = await this.feeStructureService.calculateInstallmentFees({ ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
        return { success: true, ...result };
    }
    async generateInstallmentFees(dto, req) {
        const result = await this.feeStructureService.generateInstallmentFees({ ...dto, schoolId: this.resolveSchoolId(req.user, dto.schoolId) });
        return { success: true, ...result };
    }
    async getBillingConfig(schoolId, academicYearId, req) {
        const config = await this.feeStructureService.getBillingConfig(this.resolveSchoolId(req.user, schoolId), academicYearId);
        return { success: true, data: config };
    }
    async getFeeCollectionMode(schoolId, req) {
        const config = await this.feeStructureService.getBillingConfig(this.resolveSchoolId(req.user, schoolId));
        const modeLabels = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', SEMESTERLY: 'Semesterly', TERMLY: 'Termly', YEARLY: 'Full Year' };
        return { success: true, data: { mode: config.billingMode, modeLabel: modeLabels[config.billingMode] || config.billingMode, installmentCount: config.billingPeriodsPerYear, curriculumType: config.curriculumType } };
    }
    async getCurriculumInfo(schoolId, academicYearId, req) {
        const result = await this.feeStructureService.getCurriculumInfo(this.resolveSchoolId(req?.user, schoolId), academicYearId);
        return { success: true, ...result };
    }
};
exports.FeeStructureController = FeeStructureController;
__decorate([
    (0, common_1.Post)('fee-structures'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fee_structure_dto_1.CreateFeeStructureDto, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "createFeeStructure", null);
__decorate([
    (0, common_1.Get)('fee-structures'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "listFeeStructures", null);
__decorate([
    (0, common_1.Put)('fee-structures/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('schoolId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, fee_structure_dto_1.UpdateFeeStructureDto, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "updateFeeStructure", null);
__decorate([
    (0, common_1.Delete)('fee-structures/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "deleteFeeStructure", null);
__decorate([
    (0, common_1.Delete)('fee-structures'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:delete'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "clearFeeStructures", null);
__decorate([
    (0, common_1.Post)('fee-calculation/installments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fee_structure_dto_1.CalculateInstallmentFeesDto, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "calculateInstallmentFees", null);
__decorate([
    (0, common_1.Post)('fee-structures/generate-installments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fee_structure_dto_1.GenerateInstallmentFeesDto, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "generateInstallmentFees", null);
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
], FeeStructureController.prototype, "getBillingConfig", null);
__decorate([
    (0, common_1.Get)('fee-collection-mode'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FeeStructureController.prototype, "getFeeCollectionMode", null);
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
], FeeStructureController.prototype, "getCurriculumInfo", null);
exports.FeeStructureController = FeeStructureController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('FINANCE_MANAGEMENT'),
    __metadata("design:paramtypes", [fee_structure_service_1.FeeStructureService])
], FeeStructureController);
//# sourceMappingURL=fee-structure.controller.js.map