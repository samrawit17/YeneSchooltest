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
exports.AutoAssignmentController = void 0;
const common_1 = require("@nestjs/common");
const auto_assignment_service_1 = require("./auto-assignment.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let AutoAssignmentController = class AutoAssignmentController {
    autoAssignmentService;
    constructor(autoAssignmentService) {
        this.autoAssignmentService = autoAssignmentService;
    }
    async autoAssignEnrollment(enrollmentId, req) {
        const schoolId = req.user.schoolId;
        return this.autoAssignmentService.autoAssignStudent(enrollmentId, schoolId);
    }
    async bulkAutoAssign(body, req) {
        const schoolId = req.user.schoolId;
        return this.autoAssignmentService.bulkAutoAssign(body.enrollmentIds, schoolId);
    }
    async reassignEnrollment(enrollmentId, req) {
        const schoolId = req.user.schoolId;
        return this.autoAssignmentService.reAssignStudent(enrollmentId, schoolId);
    }
    async getStudentAssignment(studentId, req) {
        const schoolId = req.user.schoolId;
        return this.autoAssignmentService.getStudentAssignment(studentId, schoolId);
    }
    async getClassCapacity(academicYear, grade, req) {
        const schoolId = req.user.schoolId;
        const gradeNum = parseInt(grade, 10);
        if (!academicYear || isNaN(gradeNum)) {
            return {
                error: 'Missing required parameters: academicYear and grade',
            };
        }
        const academicYearRecord = await this.autoAssignmentService.findAcademicYearByName(schoolId, academicYear);
        if (!academicYearRecord) {
            return {
                error: 'Academic year not found: ' + academicYear,
            };
        }
        return this.autoAssignmentService.getClassCapacityInfo(schoolId, academicYearRecord.id, gradeNum);
    }
    async approveAndAssign(body, req) {
        const schoolId = req.user.schoolId;
        return this.autoAssignmentService.autoAssignStudent(body.enrollmentId, schoolId);
    }
};
exports.AutoAssignmentController = AutoAssignmentController;
__decorate([
    (0, common_1.Post)('enrollments/:enrollmentId/auto-assign'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('enrollmentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutoAssignmentController.prototype, "autoAssignEnrollment", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AutoAssignmentController.prototype, "bulkAutoAssign", null);
__decorate([
    (0, common_1.Post)('enrollments/:enrollmentId/reassign'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('enrollmentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutoAssignmentController.prototype, "reassignEnrollment", null);
__decorate([
    (0, common_1.Get)('students/:studentId/assignment'),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutoAssignmentController.prototype, "getStudentAssignment", null);
__decorate([
    (0, common_1.Get)('capacity'),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Query)('academicYear')),
    __param(1, (0, common_1.Query)('grade')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AutoAssignmentController.prototype, "getClassCapacity", null);
__decorate([
    (0, common_1.Post)('approve-and-assign'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AutoAssignmentController.prototype, "approveAndAssign", null);
exports.AutoAssignmentController = AutoAssignmentController = __decorate([
    (0, common_1.Controller)('auto-assignment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [auto_assignment_service_1.AutoAssignmentService])
], AutoAssignmentController);
//# sourceMappingURL=auto-assignment.controller.js.map