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
exports.StudentController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const student_service_1 = require("./student.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const IMAGE_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const STUDENT_DOCUMENT_FILE_TYPES = new Set([
    ...IMAGE_FILE_TYPES,
    'application/pdf',
]);
function imageFileFilter(_req, file, callback) {
    if (IMAGE_FILE_TYPES.has(file.mimetype)) {
        callback(null, true);
        return;
    }
    callback(new common_1.BadRequestException('File must be a JPG, PNG, or WEBP image'), false);
}
function studentDocumentFileFilter(_req, file, callback) {
    if (STUDENT_DOCUMENT_FILE_TYPES.has(file.mimetype)) {
        callback(null, true);
        return;
    }
    callback(new common_1.BadRequestException('Document must be a PDF, JPG, PNG, or WEBP file'), false);
}
let StudentController = class StudentController {
    studentService;
    constructor(studentService) {
        this.studentService = studentService;
    }
    requireSchoolContext(req) {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            throw new common_1.BadRequestException('School context is required');
        }
        return schoolId;
    }
    async createStudent(createStudentDto, req) {
        const createdById = req.user.id;
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.createStudent({ ...createStudentDto, schoolId }, createdById);
    }
    async getStudents(req, classId, sectionId, section, status, grade, page, limit, search, rollNumber, year, academicYearId) {
        const schoolId = this.requireSchoolContext(req);
        if (classId) {
            return this.studentService.getStudentsByClassProxy(classId, sectionId || section, search, {
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 50,
            }, schoolId);
        }
        const requesterId = req.user.id;
        const requesterRole = req.user.role;
        const filters = {
            status: status,
            grade: grade ? parseInt(grade) : undefined,
            section: section || sectionId,
            academicYear: academicYearId || year,
        };
        const pagination = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        };
        return this.studentService.getStudents(schoolId, filters, pagination, requesterId, requesterRole, search, rollNumber);
    }
    async getStudentsForIdCards(req, grade, section, academicYear, search, studentIds) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.getStudentsForIdCards(schoolId, {
            grade,
            section,
            academicYear,
            search,
            studentIds: studentIds
                ? studentIds.split(',').filter(Boolean)
                : undefined,
        });
    }
    async getIdCardTemplate(req) {
        return this.studentService.getIdCardTemplate(this.requireSchoolContext(req));
    }
    async saveIdCardTemplate(req, body) {
        return this.studentService.saveIdCardTemplate(this.requireSchoolContext(req), body.template || {});
    }
    async uploadIdCardWatermark(req, file) {
        if (!file) {
            throw new common_1.BadRequestException('Watermark image is required');
        }
        const url = await this.studentService.uploadIdCardWatermark(this.requireSchoolContext(req), file);
        return { url };
    }
    async generateIdCardPdf(req, studentId, res) {
        const pdf = await this.studentService.generateIdCardPdf(this.requireSchoolContext(req), studentId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="id-card-${studentId}.pdf"`);
        res.send(pdf);
    }
    async generateIdCardsBulkPdf(req, body, res) {
        const zip = await this.studentService.generateIdCardBulkZip(this.requireSchoolContext(req), body.studentIds || []);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="id-cards.zip"');
        res.send(zip);
    }
    async getStudentById(studentId, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.getStudentById(studentId, schoolId);
    }
    async updateStudent(studentId, updateStudentDto, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.updateStudent(studentId, schoolId, updateStudentDto);
    }
    async getMyClassAssignment(req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.getMyClassAssignment(req.user.id, schoolId);
    }
    async getMyHomeroomStudents(req, academicYearId) {
        const schoolId = this.requireSchoolContext(req);
        const teacherId = req.user.id;
        const requesterRole = req.user.role;
        return this.studentService.getStudentsByHomeroomTeacher(schoolId, teacherId, requesterRole, academicYearId);
    }
    async getPendingEnrollments(req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.getPendingEnrollments(schoolId);
    }
    async approveEnrollment(enrollmentId, approveData, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.approveEnrollment(enrollmentId, schoolId, approveData);
    }
    async rejectEnrollment(enrollmentId, rejectionReason, req) {
        if (!rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required');
        }
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.rejectEnrollment(enrollmentId, schoolId, rejectionReason);
    }
    async assignClass(studentId, assignData, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.assignClass(studentId, schoolId, assignData);
    }
    async uploadDocuments(studentId, documents, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.uploadDocuments(studentId, schoolId, documents);
    }
    async deleteDocument(studentId, documentKey, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.deleteDocument(studentId, schoolId, documentKey);
    }
    async uploadDocumentFile(studentId, file, body, req) {
        const schoolId = this.requireSchoolContext(req);
        return this.studentService.uploadDocumentFile(studentId, schoolId, file, body);
    }
};
exports.StudentController = StudentController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "createStudent", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE, role_enum_1.Role.TEACHER),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('classId')),
    __param(2, (0, common_1.Query)('sectionId')),
    __param(3, (0, common_1.Query)('section')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('grade')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __param(8, (0, common_1.Query)('search')),
    __param(9, (0, common_1.Query)('rollNumber')),
    __param(10, (0, common_1.Query)('year')),
    __param(11, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getStudents", null);
__decorate([
    (0, common_1.Get)('id-cards'),
    (0, subscription_decorator_1.RequiresFeature)('STUDENT_ID_CARDS'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('grade')),
    __param(2, (0, common_1.Query)('section')),
    __param(3, (0, common_1.Query)('academicYear')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('studentIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getStudentsForIdCards", null);
__decorate([
    (0, common_1.Get)('id-cards/template'),
    (0, subscription_decorator_1.RequiresFeature)('STUDENT_ID_CARDS'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getIdCardTemplate", null);
__decorate([
    (0, common_1.Put)('id-cards/template'),
    (0, subscription_decorator_1.RequiresFeature)('STUDENT_ID_CARDS'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "saveIdCardTemplate", null);
__decorate([
    (0, common_1.Post)('id-cards/template/watermark'),
    (0, subscription_decorator_1.RequiresFeature)('STUDENT_ID_CARDS'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: imageFileFilter,
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "uploadIdCardWatermark", null);
__decorate([
    (0, common_1.Get)('id-cards/:studentId/pdf'),
    (0, subscription_decorator_1.RequiresFeature)('STUDENT_ID_CARDS'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "generateIdCardPdf", null);
__decorate([
    (0, common_1.Post)('id-cards/bulk-pdf'),
    (0, subscription_decorator_1.RequiresFeature)('STUDENT_ID_CARDS'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "generateIdCardsBulkPdf", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getStudentById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "updateStudent", null);
__decorate([
    (0, common_1.Get)('me/class'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getMyClassAssignment", null);
__decorate([
    (0, common_1.Get)('homeroom/me'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.TEACHER, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getMyHomeroomStudents", null);
__decorate([
    (0, common_1.Get)('enrollments/pending'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "getPendingEnrollments", null);
__decorate([
    (0, common_1.Post)('enrollments/:id/approve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "approveEnrollment", null);
__decorate([
    (0, common_1.Post)('enrollments/:id/reject'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:approve_enrollment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('rejectionReason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "rejectEnrollment", null);
__decorate([
    (0, common_1.Post)(':id/assign-class'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "assignClass", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('documents')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "uploadDocuments", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:documentKey'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('documentKey')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Post)(':id/documents/file'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('student:update'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: studentDocumentFileFilter,
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentController.prototype, "uploadDocumentFile", null);
exports.StudentController = StudentController = __decorate([
    (0, common_1.Controller)('students'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    __metadata("design:paramtypes", [student_service_1.StudentService])
], StudentController);
//# sourceMappingURL=student.controller.js.map