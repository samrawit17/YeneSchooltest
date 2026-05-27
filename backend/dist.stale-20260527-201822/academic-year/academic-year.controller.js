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
exports.AcademicYearController = void 0;
const common_1 = require("@nestjs/common");
const academic_year_service_1 = require("./academic-year.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let AcademicYearController = class AcademicYearController {
    academicYearService;
    constructor(academicYearService) {
        this.academicYearService = academicYearService;
    }
    resolveSchoolId(user, requestedSchoolId) {
        return user?.role === role_enum_1.Role.SUPER_ADMIN
            ? requestedSchoolId || user?.schoolId
            : user?.schoolId;
    }
    async createAcademicYear(createDto, req) {
        return this.academicYearService.createAcademicYear({
            ...createDto,
            schoolId: this.resolveSchoolId(req.user, createDto.schoolId),
        });
    }
    async getAcademicYears(schoolId, req) {
        const effectiveSchoolId = this.resolveSchoolId(req.user, schoolId);
        return this.academicYearService.getAcademicYears(effectiveSchoolId);
    }
    async getActiveAcademicYear(schoolId, req) {
        const effectiveSchoolId = this.resolveSchoolId(req.user, schoolId);
        return this.academicYearService.getActiveAcademicYear(effectiveSchoolId);
    }
    async getAcademicYearById(id) {
        return this.academicYearService.getAcademicYearById(id);
    }
    async updateAcademicYear(id, updateDto) {
        return this.academicYearService.updateAcademicYear(id, updateDto);
    }
    async activateAcademicYear(id) {
        return this.academicYearService.activateAcademicYear(id);
    }
    async updateCurriculumType(id, dto) {
        return this.academicYearService.updateCurriculumType(id, dto);
    }
    async deleteAcademicYear(id) {
        return this.academicYearService.deleteAcademicYear(id);
    }
    async getCurrentTerm(schoolId, req) {
        const effectiveSchoolId = this.resolveSchoolId(req.user, schoolId);
        return this.academicYearService.getCurrentTerm(effectiveSchoolId);
    }
    async getTermsByAcademicYear(id) {
        const academicYear = await this.academicYearService.getAcademicYearById(id);
        return academicYear.terms;
    }
    async createTerm(academicYearId, createDto) {
        return this.academicYearService.createTerm(academicYearId, createDto);
    }
    async getTermById(termId) {
        return this.academicYearService.getTermById(termId);
    }
    async updateTerm(termId, updateDto) {
        return this.academicYearService.updateTerm(termId, updateDto);
    }
    async lockTerm(termId, isLocked) {
        return this.academicYearService.lockTerm(termId, isLocked);
    }
    async deleteTerm(termId) {
        return this.academicYearService.deleteTerm(termId);
    }
    async getPeriodWeights(id) {
        return this.academicYearService.getPeriodWeights(id);
    }
    async validatePeriodWeights(id) {
        const isValid = await this.academicYearService.validatePeriodWeights(id);
        return {
            isValid,
            message: isValid ? 'Weights sum to 100%' : 'Weights do not sum to 100%',
        };
    }
};
exports.AcademicYearController = AcademicYearController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "createAcademicYear", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getAcademicYears", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.PARENT, role_enum_1.Role.FINANCE, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getActiveAcademicYear", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('academic_year:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getAcademicYearById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "updateAcademicYear", null);
__decorate([
    (0, common_1.Put)(':id/activate'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:update'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "activateAcademicYear", null);
__decorate([
    (0, common_1.Put)(':id/curriculum-type'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "updateCurriculumType", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "deleteAcademicYear", null);
__decorate([
    (0, common_1.Get)('terms/current'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.PARENT, role_enum_1.Role.FINANCE, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Query)('schoolId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getCurrentTerm", null);
__decorate([
    (0, common_1.Get)(':id/terms'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getTermsByAcademicYear", null);
__decorate([
    (0, common_1.Post)(':id/terms'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "createTerm", null);
__decorate([
    (0, common_1.Get)('terms/:termId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getTermById", null);
__decorate([
    (0, common_1.Put)('terms/:termId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:update'),
    __param(0, (0, common_1.Param)('termId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "updateTerm", null);
__decorate([
    (0, common_1.Put)('terms/:termId/lock'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('academic_year:update'),
    __param(0, (0, common_1.Param)('termId')),
    __param(1, (0, common_1.Body)('isLocked')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "lockTerm", null);
__decorate([
    (0, common_1.Delete)('terms/:termId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('academic_year:delete'),
    __param(0, (0, common_1.Param)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "deleteTerm", null);
__decorate([
    (0, common_1.Get)(':id/period-weights'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "getPeriodWeights", null);
__decorate([
    (0, common_1.Get)(':id/validate-weights'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AcademicYearController.prototype, "validatePeriodWeights", null);
exports.AcademicYearController = AcademicYearController = __decorate([
    (0, common_1.Controller)('academic-years'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [academic_year_service_1.AcademicYearService])
], AcademicYearController);
//# sourceMappingURL=academic-year.controller.js.map