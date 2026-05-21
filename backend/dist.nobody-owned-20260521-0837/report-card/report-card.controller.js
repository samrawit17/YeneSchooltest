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
exports.ReportCardController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const report_card_service_1 = require("./report-card.service");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let ReportCardController = class ReportCardController {
    reportCardService;
    prisma;
    constructor(reportCardService, prisma) {
        this.reportCardService = reportCardService;
        this.prisma = prisma;
    }
    async generateReportCard(req, body) {
        const academicYear = body.academicYearId
            ? await this.getAcademicYearName(req.user.schoolId, body.academicYearId)
            : await this.getActiveAcademicYear(req.user.schoolId);
        return this.reportCardService.generateReportCard({
            schoolId: req.user.schoolId,
            studentId: body.studentId,
            classId: body.classId,
            sectionId: body.sectionId,
            academicYear,
            termId: body.termId,
            termName: body.termName,
            generatedById: req.user.id,
        });
    }
    async bulkGenerate(req, body) {
        const academicYear = body.academicYearId
            ? await this.getAcademicYearName(req.user.schoolId, body.academicYearId)
            : await this.getActiveAcademicYear(req.user.schoolId);
        return this.reportCardService.bulkGenerate({
            schoolId: req.user.schoolId,
            classId: body.classId,
            sectionId: body.sectionId,
            academicYear,
            termId: body.termId,
            termName: body.termName,
            generatedById: req.user.id,
        });
    }
    async getReportCards(req, query) {
        return this.reportCardService.getReportCards(req.user.schoolId, query);
    }
    async getPublishSummary(req, query) {
        return this.reportCardService.getPublishSummary(req.user.schoolId, query.academicYearId, query.termId);
    }
    async getParentPresentationReport(req, query) {
        return this.reportCardService.getParentPresentationReport(req.user.schoolId, query);
    }
    async downloadParentPresentationPdf(req, query, res) {
        const pdf = await this.reportCardService.generateParentPresentationPdf(req.user.schoolId, query);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="term-performance-brief.pdf"');
        res.send(pdf);
    }
    async downloadParentPresentationExcel(req, query, res) {
        const excel = await this.reportCardService.generateParentPresentationExcel(req.user.schoolId, query);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="term-performance-brief.xlsx"');
        res.send(excel);
    }
    async getMyPublishedReportCards(req, query) {
        return this.reportCardService.getPublishedReportCardsForStudent(req.user.schoolId, req.user.id, {
            academicYear: query.academicYear,
            term: query.term,
        });
    }
    async getStudentReportCards(req, studentId) {
        return this.reportCardService.getReportCards(req.user.schoolId, {
            studentId,
        });
    }
    async getPublishedReportCardsForParent(req, childId, query) {
        return this.reportCardService.getPublishedReportCardsForParent(req.user.id, childId, {
            academicYear: query.academicYear,
            term: query.term,
        });
    }
    async getClassReportCards(req, classId, query) {
        return this.reportCardService.getReportCards(req.user.schoolId, {
            classId,
            academicYear: query.academicYear,
            term: query.term,
        });
    }
    async getCertificateTemplate(req) {
        return this.reportCardService.getCertificateTemplate(req.user.schoolId);
    }
    async saveCertificateTemplate(req, body) {
        return this.reportCardService.saveCertificateTemplate(req.user.schoolId, body.template || {});
    }
    async uploadCertificateWatermark(req, file) {
        if (!file) {
            throw new common_1.BadRequestException('Watermark image is required');
        }
        const url = await this.reportCardService.uploadCertificateWatermark(req.user.schoolId, file);
        return { url };
    }
    async getCertificatePayload(req, id) {
        return this.reportCardService.getCertificatePayload(id, req.user.schoolId);
    }
    async generateCertificatePdf(req, id, res) {
        const pdf = await this.reportCardService.generateCertificatePdf(req.user.schoolId, id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`);
        res.send(pdf);
    }
    async generateCertificateBulkZip(req, body, res) {
        const zip = await this.reportCardService.generateCertificateBulkZip(req.user.schoolId, body.reportCardIds || []);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="certificates.zip"');
        res.send(zip);
    }
    async getReportCardById(req, id) {
        return this.reportCardService.getReportCardById(id, req.user.schoolId);
    }
    async updateRemarks(req, id, body) {
        return this.reportCardService.updateRemarks(id, req.user.schoolId, body);
    }
    async publishReportCards(req, body) {
        return this.reportCardService.publishReportCards(body.ids, req.user.schoolId);
    }
    async publishResultsForClass(req, body) {
        return this.reportCardService.publishResultsForClass({
            schoolId: req.user.schoolId,
            academicYearId: body.academicYearId,
            termId: body.termId,
            classId: body.classId,
            notifyStudents: body.notifyStudents,
            notifyParents: body.notifyParents,
        });
    }
    async unpublishReportCards(req, body) {
        return this.reportCardService.unpublishReportCards(body.ids, req.user.schoolId);
    }
    async calculateRanks(req, body) {
        return this.reportCardService.calculateRanks(req.user.schoolId, body.classId, body.academicYear, body.term);
    }
    async deleteReportCard(req, id) {
        return this.reportCardService.deleteReportCard(id, req.user.schoolId);
    }
    async getActiveAcademicYear(schoolId) {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { name: true },
        });
        return academicYear?.name || new Date().getFullYear().toString();
    }
    async getAcademicYearName(schoolId, academicYearId) {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, id: academicYearId },
            select: { name: true },
        });
        if (!academicYear?.name) {
            throw new common_1.HttpException('Academic year not found', common_1.HttpStatus.BAD_REQUEST);
        }
        return academicYear.name;
    }
};
exports.ReportCardController = ReportCardController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "generateReportCard", null);
__decorate([
    (0, common_1.Post)('bulk-generate'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "bulkGenerate", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getReportCards", null);
__decorate([
    (0, common_1.Get)('publish-summary'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getPublishSummary", null);
__decorate([
    (0, common_1.Get)('parent-presentation'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getParentPresentationReport", null);
__decorate([
    (0, common_1.Get)('parent-presentation/pdf'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "downloadParentPresentationPdf", null);
__decorate([
    (0, common_1.Get)('parent-presentation/excel'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "downloadParentPresentationExcel", null);
__decorate([
    (0, common_1.Get)('student/published'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getMyPublishedReportCards", null);
__decorate([
    (0, common_1.Get)('student/:studentId'),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getStudentReportCards", null);
__decorate([
    (0, common_1.Get)('parent/:childId/published'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('childId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getPublishedReportCardsForParent", null);
__decorate([
    (0, common_1.Get)('class/:classId'),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('classId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getClassReportCards", null);
__decorate([
    (0, common_1.Get)('certificate-template'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getCertificateTemplate", null);
__decorate([
    (0, common_1.Put)('certificate-template'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "saveCertificateTemplate", null);
__decorate([
    (0, common_1.Post)('certificate-template/watermark'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:update'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "uploadCertificateWatermark", null);
__decorate([
    (0, common_1.Get)(':id/certificate'),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getCertificatePayload", null);
__decorate([
    (0, common_1.Get)(':id/certificate-pdf'),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "generateCertificatePdf", null);
__decorate([
    (0, common_1.Post)('certificate-pdf/bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "generateCertificateBulkZip", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('report_card:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "getReportCardById", null);
__decorate([
    (0, common_1.Put)(':id/remarks'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.TEACHER, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "updateRemarks", null);
__decorate([
    (0, common_1.Put)('publish'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:publish'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "publishReportCards", null);
__decorate([
    (0, common_1.Post)('publish/class'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:publish'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "publishResultsForClass", null);
__decorate([
    (0, common_1.Put)('unpublish'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:publish'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "unpublishReportCards", null);
__decorate([
    (0, common_1.Post)('calculate-ranks'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "calculateRanks", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('report_card:delete'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportCardController.prototype, "deleteReportCard", null);
exports.ReportCardController = ReportCardController = __decorate([
    (0, common_1.Controller)('report-cards'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [report_card_service_1.ReportCardService,
        prisma_service_1.PrismaService])
], ReportCardController);
//# sourceMappingURL=report-card.controller.js.map