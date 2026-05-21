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
exports.GradingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const grading_service_1 = require("./grading.service");
const grading_dto_1 = require("./dto/grading.dto");
const role_enum_1 = require("../auth/types/role.enum");
let GradingController = class GradingController {
    gradingService;
    constructor(gradingService) {
        this.gradingService = gradingService;
    }
    async getTeacherAssignments(req, academicYear) {
        return this.gradingService.getTeacherAssignments(req.user.id, req.user.schoolId, academicYear);
    }
    async getStudentsForGradeEntry(req, academicYear, termId, classId, sectionId, subjectId) {
        return this.gradingService.getStudentsForGradeEntry(req.user.id, req.user.schoolId, academicYear, termId, classId, sectionId, subjectId);
    }
    async enterGrade(req, dto) {
        return this.gradingService.enterGrade(req.user.id, req.user.schoolId, dto);
    }
    async bulkEnterGrades(req, dto) {
        return this.gradingService.bulkEnterGrades(req.user.id, req.user.schoolId, dto);
    }
    async bulkUploadFromCsv(req, file, dto) {
        if (!file) {
            throw new common_1.BadRequestException('CSV file is required');
        }
        const csvData = file.buffer.toString('utf-8');
        return this.gradingService.bulkUploadFromCsv(req.user.id, req.user.schoolId, {
            csvData,
            ...dto,
        });
    }
    async downloadTemplate(req, classId, sectionId, subjectId, academicYear) {
        return this.gradingService.generateGradeTemplate(req.user.id, req.user.schoolId, classId, sectionId, subjectId, academicYear);
    }
    async saveDraft(req, gradeId) {
        return this.gradingService.saveDraft(req.user.id, req.user.schoolId, gradeId);
    }
    async submitToRegistrar(req, gradeId) {
        return this.gradingService.submitToRegistrar(req.user.id, req.user.schoolId, gradeId);
    }
    async submitAllToRegistrar(req, academicYear, termId, classId, sectionId, subjectId) {
        return this.gradingService.submitAllToRegistrar(req.user.id, req.user.schoolId, academicYear, termId, classId, sectionId, subjectId);
    }
    async getGradesForReview(req, filter) {
        return this.gradingService.getGradesForReview(req.user.schoolId, filter);
    }
    async getAssessmentScoresForReview(req, filter) {
        return this.gradingService.getAssessmentScoresForReview(req.user.schoolId, filter);
    }
    async reviewGrade(req, gradeId, dto) {
        return this.gradingService.reviewGrade(req.user.id, req.user.schoolId, gradeId, dto);
    }
    async bulkApproveGrades(req, gradeIds) {
        return this.gradingService.bulkApproveGrades(req.user.id, req.user.schoolId, gradeIds);
    }
    async bulkRejectGrades(req, body) {
        return this.gradingService.bulkRejectGrades(req.user.id, req.user.schoolId, body.gradeIds, body.comment);
    }
    async getSubjectPerformanceReport(req, academicYear, termId, subjectId) {
        return this.gradingService.getSubjectPerformanceReport(req.user.schoolId, academicYear, termId, subjectId);
    }
    async getClassSummaryReport(req, academicYear, termId, classId, sectionId) {
        return this.gradingService.getClassSummaryReport(req.user.schoolId, academicYear, termId, classId, sectionId);
    }
    async getStudentGrades(req, academicYear, termId) {
        return this.gradingService.getStudentGrades(req.user.id, req.user.schoolId, academicYear, termId);
    }
    async getChildGradesWithAnalysis(req, childId, academicYear, termId) {
        return this.gradingService.getChildGradesWithAnalysis(req.user.id, childId, req.user.schoolId, academicYear, termId);
    }
    async calculateRankings(req, body) {
        return this.gradingService.calculatePeriodRankings(body.academicYearId, body.termId, body.classId, body.sectionId);
    }
    async createGradingComponents(req, dto) {
        return this.gradingService.createGradingComponents(req.user.schoolId, dto);
    }
    async getGradingComponents(req) {
        return this.gradingService.getGradingComponents(req.user.schoolId);
    }
    async getTeacherAssessmentTypes(req) {
        return this.gradingService.getAssessmentTypes(req.user.schoolId);
    }
    async getParentGradingComponents(req) {
        return this.gradingService.getGradingComponents(req.user.schoolId);
    }
    async getAssessmentTypes(req) {
        return this.gradingService.getAssessmentTypes(req.user.schoolId);
    }
    async createAssessmentTypes(req, dto) {
        return this.gradingService.createAssessmentTypes(req.user.schoolId, dto);
    }
    async createGradeScales(req, dto) {
        return this.gradingService.createGradeScales(req.user.schoolId, dto);
    }
    async getGradeScale(req) {
        return this.gradingService.getGradeScale(req.user.schoolId);
    }
    async assignTeacher(req, dto) {
        return this.gradingService.assignTeacher(req.user.schoolId, dto);
    }
    async removeTeacherAssignment(req, assignmentId) {
        return this.gradingService.removeTeacherAssignment(req.user.schoolId, assignmentId);
    }
    async getStudentFinalGrades(req, academicYear, classId, studentId) {
        const targetStudentId = req.user.role === role_enum_1.Role.STUDENT ? req.user.id : studentId;
        if (!targetStudentId) {
            throw new common_1.BadRequestException('studentId is required for non-student users');
        }
        return this.gradingService.getStudentFinalGrades(targetStudentId, req.user.schoolId, academicYear, classId, req.user.role === role_enum_1.Role.STUDENT);
    }
    async getChildFinalGrades(req, studentId, academicYear, classId) {
        if (req.user.role === role_enum_1.Role.PARENT) {
            return this.gradingService.getChildFinalGradesWithClass(req.user.id, studentId, req.user.schoolId, academicYear, classId);
        }
        return this.gradingService.getStudentFinalGrades(studentId, req.user.schoolId, academicYear, classId, false);
    }
    async calculateSubjectFinalGrade(req, studentId, subjectId, academicYear) {
        return this.gradingService.calculateFinalGrade(studentId, req.user.schoolId, subjectId, academicYear);
    }
    async verifyFinancialClearance(req, studentId, academicYear, termId, checkOverdueOnly = 'true') {
        if (req.user.role === role_enum_1.Role.STUDENT) {
            studentId = req.user.id;
        }
        if (req.user.role === role_enum_1.Role.PARENT) {
            const isParent = await this.gradingService.verifyParentChild(req.user.id, studentId, req.user.schoolId);
            if (!isParent) {
                throw new common_1.ForbiddenException('Not authorized to view this student records');
            }
        }
        return this.gradingService.verifyFinancialClearance(studentId, req.user.schoolId, academicYear, termId, checkOverdueOnly === 'true');
    }
    async getEntryProgress(req, academicYear, term) {
        return this.gradingService.getEntryProgress(req.user.schoolId, academicYear, term);
    }
    async sendReminder(req, body) {
        return this.gradingService.sendReminder(req.user.schoolId, body.academicYear, body.term);
    }
    async getPublishChecklist(req, academicYear, term) {
        return this.gradingService.getPublishChecklist(req.user.schoolId, academicYear, term);
    }
    async bulkPublish(req, body) {
        return this.gradingService.bulkPublish(req.user.schoolId, body.assessmentIds, body.notifyParents);
    }
    async getPromotionList(req, academicYear) {
        return this.gradingService.getPromotionList(req.user.schoolId, academicYear);
    }
    async overridePromotion(req, body) {
        return this.gradingService.overridePromotion(req.user.schoolId, body.studentId, body.recommendation);
    }
    async confirmPromotions(req, body) {
        return this.gradingService.confirmPromotions(req.user.schoolId, body.academicYear, body.notifyParents);
    }
    async bulkConfirmPromotions(req, body) {
        return this.gradingService.bulkConfirmPromotions(req.user.schoolId, body.academicYear, body.notifyParents);
    }
};
exports.GradingController = GradingController;
__decorate([
    (0, common_1.Get)('teacher/assignments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getTeacherAssignments", null);
__decorate([
    (0, common_1.Get)('teacher/students'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Query)('classId')),
    __param(4, (0, common_1.Query)('sectionId')),
    __param(5, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getStudentsForGradeEntry", null);
__decorate([
    (0, common_1.Post)('teacher/grades'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, grading_dto_1.CreateGradeDto]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "enterGrade", null);
__decorate([
    (0, common_1.Post)('teacher/grades/bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, grading_dto_1.BulkGradeEntryDto]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "bulkEnterGrades", null);
__decorate([
    (0, common_1.Post)('teacher/grades/bulk-csv'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "bulkUploadFromCsv", null);
__decorate([
    (0, common_1.Get)('teacher/grades/template'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('classId')),
    __param(2, (0, common_1.Query)('sectionId')),
    __param(3, (0, common_1.Query)('subjectId')),
    __param(4, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Put)('teacher/grades/:id/draft'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "saveDraft", null);
__decorate([
    (0, common_1.Put)('teacher/grades/:id/submit'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "submitToRegistrar", null);
__decorate([
    (0, common_1.Post)('teacher/grades/submit-all'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Query)('classId')),
    __param(4, (0, common_1.Query)('sectionId')),
    __param(5, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "submitAllToRegistrar", null);
__decorate([
    (0, common_1.Get)('registrar/review'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, grading_dto_1.GradeFilterDto]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getGradesForReview", null);
__decorate([
    (0, common_1.Get)('registrar/assessments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, grading_dto_1.GradeFilterDto]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getAssessmentScoresForReview", null);
__decorate([
    (0, common_1.Put)('registrar/grades/:id/review'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, grading_dto_1.ApproveGradeDto]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "reviewGrade", null);
__decorate([
    (0, common_1.Post)('registrar/grades/bulk-approve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('gradeIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "bulkApproveGrades", null);
__decorate([
    (0, common_1.Post)('registrar/grades/bulk-reject'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "bulkRejectGrades", null);
__decorate([
    (0, common_1.Get)('registrar/reports/subject'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getSubjectPerformanceReport", null);
__decorate([
    (0, common_1.Get)('registrar/reports/class'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, common_1.Query)('classId')),
    __param(4, (0, common_1.Query)('sectionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getClassSummaryReport", null);
__decorate([
    (0, common_1.Get)('student/grades'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getStudentGrades", null);
__decorate([
    (0, common_1.Get)('parent/grades/:studentId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Query)('academicYear')),
    __param(3, (0, common_1.Query)('termId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getChildGradesWithAnalysis", null);
__decorate([
    (0, common_1.Post)('admin/calculate-rankings'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "calculateRankings", null);
__decorate([
    (0, common_1.Post)('admin/grading-components'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "createGradingComponents", null);
__decorate([
    (0, common_1.Get)('admin/grading-components'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getGradingComponents", null);
__decorate([
    (0, common_1.Get)('teacher/assessment-types'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getTeacherAssessmentTypes", null);
__decorate([
    (0, common_1.Get)('parent/grading-components'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getParentGradingComponents", null);
__decorate([
    (0, common_1.Get)('admin/assessment-types'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getAssessmentTypes", null);
__decorate([
    (0, common_1.Post)('admin/assessment-types'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "createAssessmentTypes", null);
__decorate([
    (0, common_1.Post)('admin/grade-scales'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "createGradeScales", null);
__decorate([
    (0, common_1.Get)('admin/grade-scales'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getGradeScale", null);
__decorate([
    (0, common_1.Post)('admin/teacher-assignments'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, grading_dto_1.TeacherAssignmentDto]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "assignTeacher", null);
__decorate([
    (0, common_1.Delete)('admin/teacher-assignments/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "removeTeacherAssignment", null);
__decorate([
    (0, common_1.Get)('student/final-grades'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('classId')),
    __param(3, (0, common_1.Query)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getStudentFinalGrades", null);
__decorate([
    (0, common_1.Get)('parent/final-grades/:studentId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Query)('academicYear')),
    __param(3, (0, common_1.Query)('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getChildFinalGrades", null);
__decorate([
    (0, common_1.Get)('subject/final-grade'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('studentId')),
    __param(2, (0, common_1.Query)('subjectId')),
    __param(3, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "calculateSubjectFinalGrade", null);
__decorate([
    (0, common_1.Get)('student/financial-clearance'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT, role_enum_1.Role.PARENT, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('studentId')),
    __param(2, (0, common_1.Query)('academicYear')),
    __param(3, (0, common_1.Query)('termId')),
    __param(4, (0, common_1.Query)('checkOverdueOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "verifyFinancialClearance", null);
__decorate([
    (0, common_1.Get)('admin/entry-progress'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('term')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getEntryProgress", null);
__decorate([
    (0, common_1.Post)('admin/send-reminder'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "sendReminder", null);
__decorate([
    (0, common_1.Get)('admin/publish-checklist'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __param(2, (0, common_1.Query)('term')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getPublishChecklist", null);
__decorate([
    (0, common_1.Post)('admin/bulk-publish'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "bulkPublish", null);
__decorate([
    (0, common_1.Get)('admin/promotion-list'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getPromotionList", null);
__decorate([
    (0, common_1.Post)('admin/promotion-override'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "overridePromotion", null);
__decorate([
    (0, common_1.Post)('admin/confirm-promotions'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "confirmPromotions", null);
__decorate([
    (0, common_1.Post)('admin/bulk-confirm-promotions'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "bulkConfirmPromotions", null);
exports.GradingController = GradingController = __decorate([
    (0, common_1.Controller)('grading'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [grading_service_1.GradingService])
], GradingController);
//# sourceMappingURL=grading.controller.js.map