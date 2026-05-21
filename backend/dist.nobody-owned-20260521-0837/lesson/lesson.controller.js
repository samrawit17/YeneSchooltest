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
exports.LessonController = void 0;
const common_1 = require("@nestjs/common");
const lesson_service_1 = require("./lesson.service");
const dto_1 = require("./dto");
const create_lesson_bundle_dto_1 = require("./dto/create-lesson-bundle.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let LessonController = class LessonController {
    lessonService;
    constructor(lessonService) {
        this.lessonService = lessonService;
    }
    async createBundle(createLessonBundleDto, req) {
        return this.lessonService.createLessonBundle(createLessonBundleDto, req.user.id, req.user.schoolId);
    }
    async updateBundle(id, updateLessonBundleDto, req) {
        return this.lessonService.updateLessonBundle(id, updateLessonBundleDto, req.user.id, req.user.schoolId);
    }
    async submitForReview(id, req) {
        return this.lessonService.submitForReview(id, req.user.id, req.user.schoolId);
    }
    async approveLesson(id, req) {
        return this.lessonService.approveLesson(id, req.user.id, req.user.schoolId);
    }
    async rejectLesson(id, reason, req) {
        return this.lessonService.rejectLesson(id, req.user.id, req.user.schoolId, reason || undefined);
    }
    async getPendingReview(req, departmentId) {
        return this.lessonService.getPendingReviewLessons(req.user.schoolId, departmentId);
    }
    async submitHomework(homeworkId, submitHomeworkDto, req) {
        return this.lessonService.submitHomework(homeworkId, req.user.id, submitHomeworkDto);
    }
    async gradeHomework(submissionId, gradeHomeworkDto, req) {
        return this.lessonService.gradeHomework(submissionId, req.user.id, gradeHomeworkDto);
    }
    async getCoverageReport(query, req) {
        return this.lessonService.getLessonCoverageReport(query, req.user.schoolId);
    }
    async getLessonWithLock(id, req) {
        return this.lessonService.getLessonWithContentLock(id, req.user.id, req.user.schoolId);
    }
    async findAll(query, req) {
        const { role, id, schoolId } = req.user;
        return this.lessonService.findAll(query, schoolId, id, role);
    }
    async getFormData(req) {
        const { id: teacherId, schoolId } = req.user;
        return this.lessonService.getFormData(teacherId, schoolId);
    }
    async findOne(id, req) {
        const { role, id: userId, schoolId } = req.user;
        return this.lessonService.findOne(id, schoolId, role, userId);
    }
    async update(id, updateLessonDto, req) {
        return this.lessonService.update(id, updateLessonDto, req.user.id, req.user.schoolId);
    }
    async delete(id, req) {
        const { id: userId, schoolId } = req.user;
        return this.lessonService.remove(id, userId, schoolId);
    }
};
exports.LessonController = LessonController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_lesson_bundle_dto_1.CreateLessonBundleDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "createBundle", null);
__decorate([
    (0, common_1.Put)('bundle/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_lesson_bundle_dto_1.UpdateLessonBundleDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "updateBundle", null);
__decorate([
    (0, common_1.Patch)(':id/submit-review'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "submitForReview", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "approveLesson", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "rejectLesson", null);
__decorate([
    (0, common_1.Get)('pending-review'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "getPendingReview", null);
__decorate([
    (0, common_1.Post)('homework/:homeworkId/submit'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Param)('homeworkId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_lesson_bundle_dto_1.SubmitHomeworkDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "submitHomework", null);
__decorate([
    (0, common_1.Post)('submissions/:submissionId/grade'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('submissionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_lesson_bundle_dto_1.GradeHomeworkDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "gradeHomework", null);
__decorate([
    (0, common_1.Get)('coverage/report'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_lesson_bundle_dto_1.LessonCoverageQueryDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "getCoverageReport", null);
__decorate([
    (0, common_1.Get)(':id/with-lock'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "getLessonWithLock", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LessonQueryDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('form-data'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "getFormData", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateLessonDto, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "delete", null);
exports.LessonController = LessonController = __decorate([
    (0, common_1.Controller)('lessons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [lesson_service_1.LessonService])
], LessonController);
//# sourceMappingURL=lesson.controller.js.map