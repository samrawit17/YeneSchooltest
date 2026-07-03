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
exports.StudentFeeController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const student_fee_service_1 = require("./student-fee.service");
const student_fee_dto_1 = require("./student-fee.dto");
let StudentFeeController = class StudentFeeController {
    studentFeeService;
    constructor(studentFeeService) {
        this.studentFeeService = studentFeeService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN
            ? requestedSchoolId || user?.schoolId
            : user?.schoolId;
    }
    async generateStudentFees(dto, req) {
        const result = await this.studentFeeService.generateStudentFees({
            ...dto,
            schoolId: this.resolveSchoolId(req.user, dto.schoolId),
        });
        return { success: true, ...result };
    }
    async listStudentFees(query, req) {
        const result = await this.studentFeeService.getStudentFees({
            ...query,
            schoolId: this.resolveSchoolId(req.user, query.schoolId),
            page: query.page ?? 1,
            limit: query.limit ?? 20,
        });
        return { success: true, ...result };
    }
    async getStudentFeeSummary(studentId, schoolId, academicYearId, termId, req) {
        const effectiveSchoolId = this.resolveSchoolId(req?.user, schoolId);
        await this.studentFeeService.assertStudentFeeSummaryAccess(req?.user, effectiveSchoolId, studentId);
        const result = await this.studentFeeService.getStudentFeeSummary(effectiveSchoolId, studentId, academicYearId, termId);
        return { success: true, ...result };
    }
};
exports.StudentFeeController = StudentFeeController;
__decorate([
    (0, common_1.Post)('student-fees/generate'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [student_fee_dto_1.GenerateStudentFeesDto, Object]),
    __metadata("design:returntype", Promise)
], StudentFeeController.prototype, "generateStudentFees", null);
__decorate([
    (0, common_1.Get)('student-fees'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('finance:student_fees:read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [student_fee_dto_1.StudentFeesQueryDto, Object]),
    __metadata("design:returntype", Promise)
], StudentFeeController.prototype, "listStudentFees", null);
__decorate([
    (0, common_1.Get)('student-fees/:studentId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT, role_enum_1.Role.STUDENT, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.FINANCE, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __param(3, (0, common_1.Query)('termId')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], StudentFeeController.prototype, "getStudentFeeSummary", null);
exports.StudentFeeController = StudentFeeController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('FINANCE_MANAGEMENT'),
    __metadata("design:paramtypes", [student_fee_service_1.StudentFeeService])
], StudentFeeController);
//# sourceMappingURL=student-fee.controller.js.map