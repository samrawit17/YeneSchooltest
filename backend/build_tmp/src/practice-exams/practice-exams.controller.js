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
exports.PracticeExamsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const practice_exams_service_1 = require("./practice-exams.service");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
let PracticeExamsController = class PracticeExamsController {
    service;
    constructor(service) {
        this.service = service;
    }
    listAdmin(req, query) {
        return this.service.listAdmin(req.user.schoolId, query, req.user.id, req.user.role);
    }
    listTeacherSubmissions(req, query) {
        return this.service.listTeacherSubmissions(req.user.schoolId, req.user.id, req.user.role, query);
    }
    createExam(req, body) {
        return this.service.createExam(req.user.schoolId, req.user.id, body, req.user.role);
    }
    getExam(req, examId) {
        return this.service.getAdminExam(req.user.schoolId, examId, req.user.id, req.user.role);
    }
    updateExam(req, examId, body) {
        return this.service.updateExam(req.user.schoolId, examId, body, req.user.id, req.user.role);
    }
    deleteExam(req, examId) {
        return this.service.deleteExam(req.user.schoolId, examId, req.user.id, req.user.role);
    }
    addQuestion(req, examId, body) {
        return this.service.addQuestion(req.user.schoolId, examId, body, req.user.id, req.user.role);
    }
    importQuestions(req, examId, body) {
        return this.service.importQuestions(req.user.schoolId, examId, body.csv || '', req.user.id, req.user.role);
    }
    updateQuestion(req, examId, questionId, body) {
        return this.service.updateQuestion(req.user.schoolId, examId, questionId, body, req.user.id, req.user.role);
    }
    deleteQuestion(req, examId, questionId) {
        return this.service.deleteQuestion(req.user.schoolId, examId, questionId, req.user.id, req.user.role);
    }
    getResults(req, examId) {
        return this.service.getExamResults(req.user.schoolId, examId, req.user.id, req.user.role);
    }
    listAvailable(req) {
        return this.service.listAvailableForStudent(req.user.schoolId, req.user.id);
    }
    startAttempt(req, examId, body) {
        return this.service.startAttempt(req.user.schoolId, req.user.id, examId, body.accessCode);
    }
    getAttempt(req, attemptId) {
        return this.service.getAttemptForStudent(req.user.schoolId, req.user.id, attemptId);
    }
    autosave(req, attemptId, body) {
        return this.service.autosave(req.user.schoolId, req.user.id, attemptId, body.answers || []);
    }
    submit(req, attemptId, body) {
        return this.service.submitAttempt(req.user.schoolId, req.user.id, attemptId, body.answers || []);
    }
};
exports.PracticeExamsController = PracticeExamsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "listAdmin", null);
__decorate([
    (0, common_1.Get)('teacher/submissions'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "listTeacherSubmissions", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "createExam", null);
__decorate([
    (0, common_1.Get)(':examId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "getExam", null);
__decorate([
    (0, common_1.Patch)(':examId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "updateExam", null);
__decorate([
    (0, common_1.Delete)(':examId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "deleteExam", null);
__decorate([
    (0, common_1.Post)(':examId/questions'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "addQuestion", null);
__decorate([
    (0, common_1.Post)(':examId/questions/import'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "importQuestions", null);
__decorate([
    (0, common_1.Patch)(':examId/questions/:questionId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __param(2, (0, common_1.Param)('questionId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "updateQuestion", null);
__decorate([
    (0, common_1.Delete)(':examId/questions/:questionId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __param(2, (0, common_1.Param)('questionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "deleteQuestion", null);
__decorate([
    (0, common_1.Get)(':examId/results'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "getResults", null);
__decorate([
    (0, common_1.Get)('student/available/list'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "listAvailable", null);
__decorate([
    (0, common_1.Post)('student/:examId/start'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "startAttempt", null);
__decorate([
    (0, common_1.Get)('student/attempts/:attemptId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('attemptId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "getAttempt", null);
__decorate([
    (0, common_1.Post)('student/attempts/:attemptId/autosave'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('attemptId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "autosave", null);
__decorate([
    (0, common_1.Post)('student/attempts/:attemptId/submit'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('attemptId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PracticeExamsController.prototype, "submit", null);
exports.PracticeExamsController = PracticeExamsController = __decorate([
    (0, common_1.Controller)('practice-exams'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_MANAGEMENT'),
    __metadata("design:paramtypes", [practice_exams_service_1.PracticeExamsService])
], PracticeExamsController);
//# sourceMappingURL=practice-exams.controller.js.map