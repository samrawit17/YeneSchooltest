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
exports.ExamsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const exams_service_1 = require("./exams.service");
const exams_dto_1 = require("./dto/exams.dto");
const role_enum_1 = require("../auth/types/role.enum");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
let ExamsController = class ExamsController {
    examsService;
    constructor(examsService) {
        this.examsService = examsService;
    }
    async createExam(req, dto) {
        return this.examsService.createExam(req.user.schoolId, dto);
    }
    async getExams(req, query) {
        return this.examsService.getExams(req.user.schoolId, query);
    }
    async getTeacherExams(req, academicYearId, termId) {
        return this.examsService.getTeacherExams(req.user.id, req.user.schoolId, {
            academicYearId,
            termId,
        });
    }
    async getMyUpcomingExams(req) {
        return this.examsService.getStudentExams(req.user.id, req.user.schoolId);
    }
    async getMyResults(req) {
        return this.examsService.getStudentResults(req.user.id, req.user.schoolId);
    }
    async getChildUpcomingExams(req, childId) {
        await this.examsService.verifyParentChild(req.user.id, childId, req.user.schoolId);
        return this.examsService.getStudentExams(childId, req.user.schoolId);
    }
    async getChildResults(req, childId) {
        await this.examsService.verifyParentChild(req.user.id, childId, req.user.schoolId);
        return this.examsService.getStudentResults(childId, req.user.schoolId);
    }
    async getAssessmentFormData(req, query) {
        return this.examsService.getFormData(req.user.schoolId, query.academicYearId);
    }
    async publishTermResults(req, body) {
        return this.examsService.publishTermResults(req.user.schoolId, body);
    }
    async enterExamResults(req, examId, dto) {
        return this.examsService.enterExamResults(req.user.id, req.user.schoolId, examId, dto);
    }
    async getExamById(req, id) {
        return this.examsService.getExamById(req.user.schoolId, id);
    }
    async updateExam(req, id, dto) {
        return this.examsService.updateExam(req.user.schoolId, id, dto);
    }
    async deleteExam(req, id) {
        return this.examsService.deleteExam(req.user.schoolId, id);
    }
};
exports.ExamsController = ExamsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exams_dto_1.CreateExamDto]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "createExam", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exams_dto_1.GetExamsFilterDto]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getExams", null);
__decorate([
    (0, common_1.Get)('teacher/me'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Query)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getTeacherExams", null);
__decorate([
    (0, common_1.Get)('student/upcoming'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getMyUpcomingExams", null);
__decorate([
    (0, common_1.Get)('student/results'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getMyResults", null);
__decorate([
    (0, common_1.Get)('parent/child/:childId/upcoming'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getChildUpcomingExams", null);
__decorate([
    (0, common_1.Get)('parent/child/:childId/results'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('childId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getChildResults", null);
__decorate([
    (0, common_1.Get)('form-data/assessment'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getAssessmentFormData", null);
__decorate([
    (0, common_1.Post)('publish'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "publishTermResults", null);
__decorate([
    (0, common_1.Post)(':id/results'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, exams_dto_1.BulkExamResultDto]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "enterExamResults", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "getExamById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, exams_dto_1.UpdateExamDto]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "updateExam", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExamsController.prototype, "deleteExam", null);
exports.ExamsController = ExamsController = __decorate([
    (0, common_1.Controller)('exams'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_MANAGEMENT'),
    __metadata("design:paramtypes", [exams_service_1.ExamsService])
], ExamsController);
//# sourceMappingURL=exams.controller.js.map