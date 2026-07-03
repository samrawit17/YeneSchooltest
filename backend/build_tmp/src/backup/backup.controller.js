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
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const backup_service_1 = require("./backup.service");
const audit_service_1 = require("../audit/audit.service");
const school_backup_query_dto_1 = require("./dto/school-backup-query.dto");
let BackupController = class BackupController {
    backupService;
    auditService;
    constructor(backupService, auditService) {
        this.backupService = backupService;
        this.auditService = auditService;
    }
    async download(req, res) {
        const backup = await this.backupService.createPlatformBackup({
            downloadedBy: req.user?.id,
        });
        await this.auditService.log({
            actor: req.user,
            action: 'BACKUP_DOWNLOAD',
            entityType: 'PLATFORM_BACKUP',
            metadata: {
                fileName: backup.fileName,
                backupScope: 'PLATFORM',
            },
            request: this.auditService.fromRequest(req),
        });
        this.sendBackupFile(res, backup);
    }
    getSchoolBackupTypes() {
        return this.backupService.getSchoolBackupTypes();
    }
    async downloadSchoolBackup(req, schoolId, query, res) {
        const backup = await this.backupService.createSchoolBackup(schoolId, query.type, {
            downloadedBy: req.user?.id,
        });
        await this.auditService.log({
            actor: req.user,
            schoolId,
            action: 'BACKUP_DOWNLOAD',
            entityType: 'SCHOOL_BACKUP',
            entityId: schoolId,
            metadata: {
                fileName: backup.fileName,
                backupScope: 'SCHOOL',
                backupType: query.type,
            },
            request: this.auditService.fromRequest(req),
        });
        this.sendBackupFile(res, backup);
    }
    sendBackupFile(res, backup) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) {
                return;
            }
            cleanedUp = true;
            void this.backupService.cleanupBackup(backup.tempDir);
        };
        res.on('finish', cleanup);
        res.on('close', cleanup);
        res.sendFile(backup.zipPath);
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Get)('download'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "download", null);
__decorate([
    (0, common_1.Get)('school-types'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "getSchoolBackupTypes", null);
__decorate([
    (0, common_1.Get)('schools/:schoolId/download'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('schoolId')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, school_backup_query_dto_1.SchoolBackupQueryDto, Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "downloadSchoolBackup", null);
exports.BackupController = BackupController = __decorate([
    (0, common_1.Controller)('backups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [backup_service_1.BackupService,
        audit_service_1.AuditService])
], BackupController);
//# sourceMappingURL=backup.controller.js.map