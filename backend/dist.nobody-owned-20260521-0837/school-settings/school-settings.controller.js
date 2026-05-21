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
exports.SchoolSettingsController = void 0;
const common_1 = require("@nestjs/common");
const school_settings_service_1 = require("./school-settings.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let SchoolSettingsController = class SchoolSettingsController {
    schoolSettingsService;
    constructor(schoolSettingsService) {
        this.schoolSettingsService = schoolSettingsService;
    }
    async getAllSettings(schoolId) {
        try {
            return await this.schoolSettingsService.getAllSettings(schoolId);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get settings: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getSetting(schoolId, key) {
        try {
            const value = await this.schoolSettingsService.getSetting(schoolId, key);
            return { key, value };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get setting: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async setSetting(schoolId, key, body) {
        try {
            const setting = await this.schoolSettingsService.setSetting(schoolId, key, body.value);
            return setting;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to update setting: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deleteSetting(schoolId, key) {
        try {
            return await this.schoolSettingsService.deleteSetting(schoolId, key);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to delete setting: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async batchUpdate(schoolId, settings) {
        try {
            return await this.schoolSettingsService.batchUpdate(schoolId, settings);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to batch update settings: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.SchoolSettingsController = SchoolSettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.PARENT, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Param)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchoolSettingsController.prototype, "getAllSettings", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.PARENT, role_enum_1.Role.TEACHER, role_enum_1.Role.STUDENT, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE),
    __param(0, (0, common_1.Param)('schoolId')),
    __param(1, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SchoolSettingsController.prototype, "getSetting", null);
__decorate([
    (0, common_1.Put)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Param)('schoolId')),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SchoolSettingsController.prototype, "setSetting", null);
__decorate([
    (0, common_1.Delete)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Param)('schoolId')),
    __param(1, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SchoolSettingsController.prototype, "deleteSetting", null);
__decorate([
    (0, common_1.Post)('batch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Param)('schoolId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchoolSettingsController.prototype, "batchUpdate", null);
exports.SchoolSettingsController = SchoolSettingsController = __decorate([
    (0, common_1.Controller)('schools/:schoolId/settings'),
    __metadata("design:paramtypes", [school_settings_service_1.SchoolSettingsService])
], SchoolSettingsController);
//# sourceMappingURL=school-settings.controller.js.map