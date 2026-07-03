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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const reports_dto_1 = require("./reports.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN
            ? requestedSchoolId || user?.schoolId
            : user?.schoolId;
    }
    async dailyReport(query, req) {
        const result = await this.reportsService.dailyCollectionReport({
            ...query,
            schoolId: this.resolveSchoolId(req.user, query.schoolId),
        });
        return { success: true, ...result };
    }
    async monthlyReport(schoolId, month, year, req) {
        const result = await this.reportsService.monthlyRevenueReport(this.resolveSchoolId(req.user, schoolId), Number(month), Number(year));
        return { success: true, ...result };
    }
    async outstanding(schoolId, academicYearId, termId, calendarType, req) {
        const result = await this.reportsService.outstandingBalancesReport(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId, calendarType);
        return { success: true, ...result };
    }
    async markOverdue(body, req) {
        const result = await this.reportsService.markOverdueFees(this.resolveSchoolId(req.user, body.schoolId), body.academicYearId, body.termId);
        return { success: true, ...result };
    }
    async overdueReport(schoolId, academicYearId, termId, req) {
        const result = await this.reportsService.getOverdueFeesReport(this.resolveSchoolId(req?.user, schoolId), academicYearId, termId);
        return { success: true, ...result };
    }
    async auditLogs(schoolId, entityType, entityId, limit, from, to, req) {
        const result = await this.reportsService.getAuditLogs(this.resolveSchoolId(req?.user, schoolId), entityType, entityId, limit ? Number(limit) : undefined, from, to);
        return { success: true, data: result };
    }
    async studentHistory(studentId, schoolId, req) {
        const result = await this.reportsService.paymentHistoryForStudent(this.resolveSchoolId(req?.user, schoolId), studentId);
        return { success: true, ...result };
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('reports/daily'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.FINANCE, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.ReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "dailyReport", null);
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
], ReportsController.prototype, "monthlyReport", null);
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
], ReportsController.prototype, "outstanding", null);
__decorate([
    (0, common_1.Post)('fees/mark-overdue'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "markOverdue", null);
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
], ReportsController.prototype, "overdueReport", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:reports:read'),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __param(6, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "auditLogs", null);
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
], ReportsController.prototype, "studentHistory", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('FINANCE_MANAGEMENT'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map