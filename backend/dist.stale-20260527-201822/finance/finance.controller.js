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
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const finance_dto_1 = require("./dto/finance.dto");
let FinanceController = class FinanceController {
    financeService;
    constructor(financeService) {
        this.financeService = financeService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN
            ? requestedSchoolId || user?.schoolId
            : user?.schoolId;
    }
    async createFeeStructure(dto, req) {
        const fs = await this.financeService.createFeeStructure({
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, data: fs };
    }
    async listFeeStructures(schoolId, academicYearId, termId, req) {
        const data = await this.financeService.listFeeStructures(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId);
        return { success: true, data };
    }
    async updateFeeStructure(id, schoolId, dto, req) {
        const fs = await this.financeService.updateFeeStructure(id, this.resolveSchoolId(req.user, schoolId), dto);
        return { success: true, data: fs };
    }
    async deleteFeeStructure(id, schoolId, req) {
        const fs = await this.financeService.deleteFeeStructure(id, this.resolveSchoolId(req.user, schoolId));
        return { success: true, data: fs };
    }
    async clearFeeStructures(schoolId, academicYearId, req) {
        const result = await this.financeService.deleteFeeStructuresBySchool(this.resolveSchoolId(req?.user, schoolId), academicYearId);
        return { success: true, data: result };
    }
    async generateStudentFees(dto, req) {
        const result = await this.financeService.generateStudentFees({
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, ...result };
    }
    async listStudentFees(query, req) {
        const result = await this.financeService.getStudentFees({
            ...query,
            schoolId: this.resolveSchoolId(req.user, query.schoolId),
            page: query.page ?? 1,
            limit: query.limit ?? 20,
        });
        return { success: true, ...result };
    }
    async recordPayment(dto, req) {
        try {
            const result = await this.financeService.recordPayment(req.user, dto);
            return { success: true, ...result };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to record payment');
        }
    }
    async reversePayment(paymentId, body, req) {
        try {
            const result = await this.financeService.reversePayment(req.user, this.resolveSchoolId(req.user, body.schoolId), paymentId, body.reason);
            return { success: true, ...result };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to reverse payment');
        }
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
    async dailyReport(query, req) {
        const result = await this.financeService.dailyCollectionReport({
            ...query,
            schoolId: this.resolveSchoolId(req.user, query.schoolId),
        });
        return { success: true, ...result };
    }
    async getAllPayments(schoolId, req) {
        const result = await this.financeService.getAllPayments(this.resolveSchoolId(req.user, schoolId));
        return { success: true, ...result };
    }
    async monthlyReport(schoolId, month, year, req) {
        const result = await this.financeService.monthlyRevenueReport(this.resolveSchoolId(req.user, schoolId), Number(month), Number(year));
        return { success: true, ...result };
    }
    async outstanding(schoolId, academicYearId, termId, calendarType, req) {
        const result = await this.financeService.outstandingBalancesReport(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId, calendarType);
        return { success: true, ...result };
    }
    async markOverdue(body, req) {
        const result = await this.financeService.markOverdueFees(this.resolveSchoolId(req.user, body.schoolId), body.academicYearId, body.termId);
        return { success: true, ...result };
    }
    async overdueReport(schoolId, academicYearId, termId, req) {
        const result = await this.financeService.getOverdueFeesReport(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId);
        return { success: true, ...result };
    }
    async auditLogs(schoolId, entityType, entityId, limit, req) {
        const result = await this.financeService.getAuditLogs(this.resolveSchoolId(req?.user, schoolId), entityType, entityId, limit ? Number(limit) : undefined);
        return { success: true, data: result };
    }
    async studentHistory(studentId, schoolId, req) {
        const result = await this.financeService.paymentHistoryForStudent(this.resolveSchoolId(req?.user, schoolId), studentId);
        return { success: true, ...result };
    }
    async getStudentFeeSummary(studentId, schoolId, academicYearId, termId, req) {
        const effectiveSchoolId = this.resolveSchoolId(req?.user, schoolId);
        await this.financeService.assertStudentFeeSummaryAccess(req?.user, effectiveSchoolId, studentId);
        const result = await this.financeService.getStudentFeeSummary(effectiveSchoolId, studentId, academicYearId, termId);
        return { success: true, ...result };
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
    async getFeeCollectionMode(schoolId, req) {
        const feeCollectionMode = await this.financeService.getFeeCollectionMode(this.resolveSchoolId(req.user, schoolId));
        const modeLabels = {
            MONTHLY: 'Monthly',
            QUARTERLY: 'Quarterly',
            SEMESTER: 'Semester',
            TERM: 'Term',
            YEARLY: 'Full Year',
        };
        return {
            success: true,
            data: {
                mode: feeCollectionMode,
                modeLabel: modeLabels[feeCollectionMode] || feeCollectionMode,
                installmentCount: await this.financeService.getInstallmentCount(feeCollectionMode),
            },
        };
    }
    async createDiscountPolicy(req, body) {
        const result = await this.financeService.createDiscountPolicy(req.user.schoolId, body);
        return { success: true, data: result };
    }
    async listDiscountPolicies(req, includeInactive = 'false') {
        const result = await this.financeService.listDiscountPolicies(req.user.schoolId, includeInactive === 'true');
        return { success: true, data: result };
    }
    async updateDiscountPolicy(req, id, body) {
        const result = await this.financeService.updateDiscountPolicy(id, req.user.schoolId, body);
        return { success: true, data: result };
    }
    async deleteDiscountPolicy(req, id) {
        const result = await this.financeService.deleteDiscountPolicy(id, req.user.schoolId);
        return { success: true, data: result };
    }
    async applyDiscountPolicy(req, studentFeeId, body) {
        const result = await this.financeService.applyDiscountPolicy(studentFeeId, body.discountPolicyId, req.user.schoolId);
        return { success: true, data: result };
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Post)('fee-structures'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.CreateFeeStructureDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createFeeStructure", null);
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
], FinanceController.prototype, "listFeeStructures", null);
__decorate([
    (0, common_1.Put)('fee-structures/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:fee_structure:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('schoolId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, finance_dto_1.UpdateFeeStructureDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateFeeStructure", null);
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
], FinanceController.prototype, "deleteFeeStructure", null);
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
], FinanceController.prototype, "clearFeeStructures", null);
__decorate([
    (0, common_1.Post)('student-fees/generate'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.GenerateStudentFeesDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "generateStudentFees", null);
__decorate([
    (0, common_1.Get)('student-fees'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.StudentFeesQueryDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listStudentFees", null);
__decorate([
    (0, common_1.Post)('payments/record'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:payments:record'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.RecordPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "recordPayment", null);
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
], FinanceController.prototype, "reversePayment", null);
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
    (0, common_1.Get)('reports/daily'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.ReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "dailyReport", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getAllPayments", null);
__decorate([
    (0, common_1.Get)('reports/monthly'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "monthlyReport", null);
__decorate([
    (0, common_1.Get)('reports/outstanding'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Query)('calendarType')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "outstanding", null);
__decorate([
    (0, common_1.Post)('fees/mark-overdue'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "markOverdue", null);
__decorate([
    (0, common_1.Get)('reports/overdue'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "overdueReport", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "auditLogs", null);
__decorate([
    (0, common_1.Get)('reports/student/:studentId/history'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "studentHistory", null);
__decorate([
    (0, common_1.Get)('student-fees/:studentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT, role_enum_1.Role.STUDENT, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __param(3, (0, common_1.Query)('termId')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getStudentFeeSummary", null);
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
    (0, common_1.Post)('discount-policies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createDiscountPolicy", null);
__decorate([
    (0, common_1.Get)('discount-policies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listDiscountPolicies", null);
__decorate([
    (0, common_1.Put)('discount-policies/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateDiscountPolicy", null);
__decorate([
    (0, common_1.Delete)('discount-policies/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteDiscountPolicy", null);
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map