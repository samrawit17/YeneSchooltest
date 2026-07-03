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
exports.AssessmentsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const role_enum_1 = require("../auth/types/role.enum");
const assessments_service_1 = require("./assessments.service");
const assessments_dto_1 = require("./dto/assessments.dto");
let AssessmentsController = class AssessmentsController {
    assessmentsService;
    constructor(assessmentsService) {
        this.assessmentsService = assessmentsService;
    }
    async getTeacherAssessments(req, query) {
        return this.assessmentsService.getTeacherAssessments(req.user.id, req.user.schoolId, query);
    }
    async getScoreEntry(req, id) {
        return this.assessmentsService.getScoreEntry(req.user.id, req.user.role, req.user.schoolId, id);
    }
    async saveScores(req, id, dto) {
        return this.assessmentsService.saveScores(req.user.id, req.user.role, req.user.schoolId, id, dto);
    }
    async getStudentUpcoming(req, academicYearId) {
        return this.assessmentsService.getStudentUpcoming(req.user.id, req.user.schoolId, academicYearId);
    }
    async getStudentResults(req, academicYearId, termId) {
        return this.assessmentsService.getStudentResults(req.user.id, req.user.schoolId, academicYearId, termId);
    }
    async getParentUpcoming(req, childId, academicYearId) {
        return this.assessmentsService.getParentUpcoming(req.user.id, childId, req.user.schoolId, academicYearId);
    }
    async getParentResults(req, childId, academicYearId, termId) {
        return this.assessmentsService.getParentResults(req.user.id, childId, req.user.schoolId, academicYearId, termId);
    }
    async getMissingMarks(req, query) {
        return this.assessmentsService.getMissingMarks(req.user.schoolId, query);
    }
    async getWeights(req) {
        return this.assessmentsService.getWeights(req.user.schoolId);
    }
    async updateWeights(req, dto) {
        return this.assessmentsService.updateWeights(req.user.schoolId, dto);
    }
    async createAssessment(req, dto) {
        return this.assessmentsService.createAssessment(req.user.schoolId, req.user.id, req.user.role, dto);
    }
    async listAssessments(req, query) {
        return this.assessmentsService.listAssessments(req.user.schoolId, query);
    }
    async clearAssessments(req) {
        return this.assessmentsService.clearAssessments(req.user.schoolId);
    }
    async getAssessmentById(req, id) {
        return this.assessmentsService.getAssessmentById(req.user.schoolId, id);
    }
    async updateAssessment(req, id, dto) {
        return this.assessmentsService.updateAssessment(req.user.schoolId, req.user.id, req.user.role, id, dto);
    }
    async addSubjects(req, id, dto) {
        return this.assessmentsService.addSubjects(req.user.schoolId, req.user.id, req.user.role, id, dto);
    }
    async lockAssessment(req, id) {
        return this.assessmentsService.lockAssessment(req.user.schoolId, id);
    }
};
exports.AssessmentsController = AssessmentsController;
__decorate([
    (0, common_1.Get)('teacher/me'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, assessments_dto_1.ListAssessmentsFilterDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getTeacherAssessments", null);
__decorate([
    (0, common_1.Get)('subjects/:id/score-entry'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getScoreEntry", null);
__decorate([
    (0, common_1.Post)('subjects/:id/scores'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assessments_dto_1.SaveAssessmentScoresDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "saveScores", null);
__decorate([
    (0, common_1.Get)('student/upcoming'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getStudentUpcoming", null);
__decorate([
    (0, common_1.Get)('student/results'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __param(2, (0, common_1.Query)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getStudentResults", null);
__decorate([
    (0, common_1.Get)('parent/child/:childId/upcoming'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('childId')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getParentUpcoming", null);
__decorate([
    (0, common_1.Get)('parent/child/:childId/results'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('childId')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __param(3, (0, common_1.Query)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getParentResults", null);
__decorate([
    (0, common_1.Get)('registrar/missing-marks'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, assessments_dto_1.ListAssessmentsFilterDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getMissingMarks", null);
__decorate([
    (0, common_1.Get)('config/weights'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getWeights", null);
__decorate([
    (0, common_1.Put)('config/weights'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, assessments_dto_1.UpdateAssessmentWeightsDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "updateWeights", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, assessments_dto_1.CreateAssessmentDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "createAssessment", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, assessments_dto_1.ListAssessmentsFilterDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "listAssessments", null);
__decorate([
    (0, common_1.Delete)('clear'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "clearAssessments", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "getAssessmentById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assessments_dto_1.UpdateAssessmentDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "updateAssessment", null);
__decorate([
    (0, common_1.Post)(':id/subjects'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assessments_dto_1.AddAssessmentSubjectsDto]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "addSubjects", null);
__decorate([
    (0, common_1.Post)(':id/lock'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AssessmentsController.prototype, "lockAssessment", null);
exports.AssessmentsController = AssessmentsController = __decorate([
    (0, common_1.Controller)('assessments'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [assessments_service_1.AssessmentsService])
], AssessmentsController);
//# sourceMappingURL=assessments.controller.js.map