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
exports.BulkUploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const bulk_upload_service_1 = require("./bulk-upload.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const audit_service_1 = require("../audit/audit.service");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const MAX_STUDENT_BULK_UPLOAD_ROWS = 50;
const MAX_STAFF_BULK_UPLOAD_ROWS = 100;
const ALLOWED_CSV_MIME_TYPES = new Set([
    'text/csv',
    'text/plain',
    'application/csv',
    'application/vnd.ms-excel',
    'application/octet-stream',
]);
let BulkUploadController = class BulkUploadController {
    bulkUploadService;
    auditService;
    constructor(bulkUploadService, auditService) {
        this.bulkUploadService = bulkUploadService;
        this.auditService = auditService;
    }
    async uploadBulkStaff(file, dto, req) {
        try {
            const content = this.readValidatedCsvFile(file, MAX_STAFF_BULK_UPLOAD_ROWS);
            const records = this.bulkUploadService.parseCSV(content).map((record) => ({
                ...record,
                email: undefined,
                student_email: undefined,
            }));
            this.assertRowLimit(records.length, MAX_STAFF_BULK_UPLOAD_ROWS, 'staff');
            const result = await this.bulkUploadService.processBulkStaff(req.user.schoolId, req.user.id, records, dto.academicYear);
            await this.auditService.log({
                actor: req.user,
                action: 'BULK_IMPORT',
                entityType: 'STAFF',
                schoolId: req.user.schoolId,
                metadata: this.buildBulkUploadAuditMetadata(file, records.length, result),
                request: this.auditService.fromRequest(req),
            });
            return result;
        }
        catch (error) {
            await this.auditService.log({
                actor: req.user,
                action: 'BULK_IMPORT_REJECTED',
                entityType: 'STAFF',
                schoolId: req.user.schoolId,
                metadata: {
                    fileName: file?.originalname,
                    mimeType: file?.mimetype,
                    size: file?.size,
                    reason: error instanceof Error ? error.message : String(error),
                },
                request: this.auditService.fromRequest(req),
            });
            throw error;
        }
    }
    async uploadBulkStudentsAuto(file, dto, req) {
        try {
            const content = this.readValidatedCsvFile(file, MAX_STUDENT_BULK_UPLOAD_ROWS);
            const records = this.bulkUploadService.parseCSV(content, true);
            this.assertRowLimit(records.length, MAX_STUDENT_BULK_UPLOAD_ROWS, 'student');
            const result = await this.bulkUploadService.processBulkStudentsWithAssignment(req.user.schoolId, req.user.id, records, dto.academicYear);
            await this.auditService.log({
                actor: req.user,
                action: 'BULK_IMPORT',
                entityType: 'STUDENT',
                schoolId: req.user.schoolId,
                metadata: this.buildBulkUploadAuditMetadata(file, records.length, result),
                request: this.auditService.fromRequest(req),
            });
            return result;
        }
        catch (error) {
            await this.auditService.log({
                actor: req.user,
                action: 'BULK_IMPORT_REJECTED',
                entityType: 'STUDENT',
                schoolId: req.user.schoolId,
                metadata: {
                    fileName: file?.originalname,
                    mimeType: file?.mimetype,
                    size: file?.size,
                    reason: error instanceof Error ? error.message : String(error),
                },
                request: this.auditService.fromRequest(req),
            });
            throw error;
        }
    }
    async generateReport(body, res) {
        if (!body.credentials || body.credentials.length === 0) {
            throw new common_1.BadRequestException('No credentials provided for report');
        }
        const csv = this.bulkUploadService.generateCredentialReport(body.credentials);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="credentials_${timestamp}.csv"`);
        res.send(Buffer.from(csv, 'utf-8'));
    }
    getTemplate(type = 'student', res) {
        let template;
        if (type === 'staff') {
            template = `full_name,email,phone,role\nAli Ahmed,ali@example.com,0911111111,teacher\nAbebe Tesfaye,abebe@example.com,0922222222,finance\nRegistrar User,reg@example.com,0944444444,registrar`;
        }
        else if (type === 'students-auto') {
            template = `first_name,middle_name,last_name,fan,student_code,roll_number,phone,gender,mother_name,mother_phone,current_class,section,stream,parent_name,parent_phone,relation\nStudentFirstName,MiddleName,LastName,123456789012,STU-001,1,0911111111,MALE,MotherFullName,0933333333,11,A,NATURAL,ParentFullName,0922222222,Father`;
        }
        else {
            template = `first_name,middle_name,last_name,email,phone,gender,current_class,gender,next_class\nAli,Ahmed,Tesfaye,,0911111111,MALE,9,10`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bulk_upload_${type}_template.csv"`);
        res.send(Buffer.from(template, 'utf-8'));
    }
    async getPendingCredentials(req, includeSent, role, limit, offset) {
        return this.bulkUploadService.getPendingCredentials(req.user.schoolId, {
            includeSent: includeSent === 'true',
            role,
            limit: limit ? parseInt(limit) : 100,
            offset: offset ? parseInt(offset) : 0,
        });
    }
    async markCredentialSent(req, id, body) {
        const credential = await this.bulkUploadService.markCredentialSent(req.user.schoolId, id, body.sentVia || 'EMAIL');
        return {
            status: 'success',
            message: 'Credential marked as sent',
            credential,
        };
    }
    async deleteCredential(req, id) {
        await this.bulkUploadService.deletePendingCredential(id, req.user.schoolId);
        return { status: 'success', message: 'Credential deleted successfully' };
    }
    async exportCredentials(req, res, includeSent, role) {
        const csv = await this.bulkUploadService.exportPendingCredentials(req.user.schoolId, {
            includeSent: includeSent === 'true',
            role,
        });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="credentials_export_${timestamp}.csv"`);
        res.send(Buffer.from(csv, 'utf-8'));
    }
    async rebalanceSections(dto, req) {
        if (!dto.gradeName)
            throw new common_1.BadRequestException('Grade name is required');
        return this.bulkUploadService.rebalanceGradeSections(req.user.schoolId, dto.gradeName, dto.academicYear);
    }
    readValidatedCsvFile(file, maxRows) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        if (!file.buffer?.length) {
            throw new common_1.BadRequestException('Uploaded CSV file is empty');
        }
        const fileName = String(file.originalname || '').toLowerCase();
        if (!fileName.endsWith('.csv')) {
            throw new common_1.BadRequestException('Only CSV files are accepted for bulk upload');
        }
        if (file.mimetype && !ALLOWED_CSV_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported CSV file type: ${file.mimetype}`);
        }
        if (file.buffer.includes(0)) {
            throw new common_1.BadRequestException('Uploaded file is not a valid text CSV file');
        }
        const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
        const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
        if (lines.length < 2) {
            throw new common_1.BadRequestException('CSV file must have a header row and at least one data row');
        }
        if (lines.length - 1 > maxRows) {
            throw new common_1.BadRequestException(`Bulk upload is limited to ${maxRows} rows per upload. Your file has ${lines.length - 1} rows.`);
        }
        return content;
    }
    assertRowLimit(count, maxRows, label) {
        if (count > maxRows) {
            throw new common_1.BadRequestException(`Bulk ${label} upload is limited to ${maxRows} records per upload. Your file has ${count} records.`);
        }
    }
    buildBulkUploadAuditMetadata(file, recordCount, result) {
        return {
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            recordCount,
            status: result?.status,
            successfulCount: result?.successfulCount,
            failedCount: result?.failedCount,
            skippedCount: result?.skippedCount,
        };
    }
};
exports.BulkUploadController = BulkUploadController;
__decorate([
    (0, common_1.Post)('staff'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "uploadBulkStaff", null);
__decorate([
    (0, common_1.Post)('students-auto'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "uploadBulkStudentsAuto", null);
__decorate([
    (0, common_1.Post)('report'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Get)('template'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BulkUploadController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Get)('credentials'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('includeSent')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "getPendingCredentials", null);
__decorate([
    (0, common_1.Post)('credentials/:id/mark-sent'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "markCredentialSent", null);
__decorate([
    (0, common_1.Post)('credentials/:id/delete'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "deleteCredential", null);
__decorate([
    (0, common_1.Get)('credentials/export'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('includeSent')),
    __param(3, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "exportCredentials", null);
__decorate([
    (0, common_1.Post)('rebalance'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BulkUploadController.prototype, "rebalanceSections", null);
exports.BulkUploadController = BulkUploadController = __decorate([
    (0, common_1.Controller)('bulk-upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('BULK_OPERATIONS'),
    __metadata("design:paramtypes", [bulk_upload_service_1.BulkUploadService,
        audit_service_1.AuditService])
], BulkUploadController);
//# sourceMappingURL=bulk-upload.controller.js.map