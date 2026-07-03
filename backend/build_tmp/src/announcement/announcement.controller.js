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
exports.AnnouncementController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const announcement_service_1 = require("./announcement.service");
const announcement_dto_1 = require("./dto/announcement.dto");
const storage_service_1 = require("../storage/storage.service");
const role_enum_1 = require("../auth/types/role.enum");
let AnnouncementController = class AnnouncementController {
    announcementService;
    storageService;
    constructor(announcementService, storageService) {
        this.announcementService = announcementService;
        this.storageService = storageService;
    }
    async findPublic(schoolId) {
        return this.announcementService.findPublic(schoolId);
    }
    async create(req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.announcementService.create(body, req.user.id, schoolId);
    }
    async findAll(req, role) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const userRole = role || req.user.role;
        return this.announcementService.findAll(schoolId, userRole, req.user.id);
    }
    async getActiveCount(req, role) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const userRole = role || req.user.role;
        const count = await this.announcementService.getActiveCount(schoolId, userRole);
        return { count };
    }
    async findOne(id, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.announcementService.findOne(id, schoolId);
    }
    async update(id, req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.announcementService.update(id, body, req.user.id, schoolId);
    }
    async delete(id, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.announcementService.delete(id, schoolId);
    }
    async attachFile(id, file, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            throw new common_1.BadRequestException('School ID is required');
        if (!file)
            throw new common_1.BadRequestException('File is required');
        const stored = await this.storageService.upload(file.buffer, file.originalname, file.mimetype, { schoolId, folder: 'announcements' });
        return this.announcementService.addAttachment(id, schoolId, {
            name: file.originalname,
            url: stored.url,
            mimeType: file.mimetype,
            size: file.size,
        });
    }
    async removeAttachment(id, attachmentIndex, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            throw new common_1.BadRequestException('School ID is required');
        return this.announcementService.removeAttachment(id, schoolId, attachmentIndex);
    }
    async togglePin(id, pinned, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            throw new common_1.BadRequestException('School ID is required');
        return this.announcementService.update(id, { isPinned: pinned }, req.user.id, schoolId);
    }
};
exports.AnnouncementController = AnnouncementController;
__decorate([
    (0, common_1.Get)('public'),
    __param(0, (0, common_1.Query)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "findPublic", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('announcement:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, announcement_dto_1.CreateAnnouncementDto]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('announcement:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('active-count'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "getActiveCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('announcement:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('announcement:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, announcement_dto_1.UpdateAnnouncementDto]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('announcement:delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/attach'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('announcement:update'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "attachFile", null);
__decorate([
    (0, common_1.Delete)(':id/attach/:attachmentIndex'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('announcement:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('attachmentIndex', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "removeAttachment", null);
__decorate([
    (0, common_1.Patch)(':id/pin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('announcement:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('pinned', common_1.ParseBoolPipe)),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "togglePin", null);
exports.AnnouncementController = AnnouncementController = __decorate([
    (0, common_1.Controller)('announcements'),
    __metadata("design:paramtypes", [announcement_service_1.AnnouncementService,
        storage_service_1.StorageService])
], AnnouncementController);
//# sourceMappingURL=announcement.controller.js.map