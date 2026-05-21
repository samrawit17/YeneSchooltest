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
exports.SchoolController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const school_service_1 = require("./school.service");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let SchoolController = class SchoolController {
    schoolService;
    constructor(schoolService) {
        this.schoolService = schoolService;
    }
    async createSchool(body) {
        try {
            const createSchoolDto = {
                name: body.name,
                email: body.email,
                address: body.address,
                phone: body.phone,
            };
            return await this.schoolService.createSchool(createSchoolDto);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to create school: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getSchools() {
        try {
            return await this.schoolService.getSchools();
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get schools: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getSchoolById(id) {
        try {
            const school = await this.schoolService.getSchoolById(id);
            if (!school) {
                throw new common_1.HttpException('School not found', common_1.HttpStatus.NOT_FOUND);
            }
            return school;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get school: ' + error.message, error.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateSchool(id, body, req) {
        try {
            if ((req.user.role === role_enum_1.Role.ADMIN || req.user.role === role_enum_1.Role.IT_MANAGER) && req.user.schoolId !== id) {
                throw new common_1.HttpException('You can only update your own school', common_1.HttpStatus.FORBIDDEN);
            }
            const updateDto = {
                name: body.name,
                email: body.email,
                address: body.address,
                phone: body.phone,
                code: body.code,
                logoUrl: body.logoUrl ?? body.logo,
            };
            const school = await this.schoolService.updateSchool(id, updateDto);
            return school;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to update school: ' + error.message, error.status || common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async uploadLogo(id, file, req) {
        try {
            if (!file) {
                throw new common_1.HttpException('No file uploaded', common_1.HttpStatus.BAD_REQUEST);
            }
            if ((req.user.role === role_enum_1.Role.ADMIN || req.user.role === role_enum_1.Role.IT_MANAGER) && req.user.schoolId !== id) {
                throw new common_1.HttpException('You can only update your own school', common_1.HttpStatus.FORBIDDEN);
            }
            const logoUrl = await this.schoolService.uploadLogo(id, file);
            return { url: logoUrl };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to upload logo: ' + error.message, error.status || common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deleteSchool(id) {
        try {
            await this.schoolService.deleteSchool(id);
            return { message: 'School deleted successfully' };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to delete school: ' + error.message, error.status || common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.SchoolController = SchoolController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('school:create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchoolController.prototype, "createSchool", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('school:read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchoolController.prototype, "getSchools", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('school:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchoolController.prototype, "getSchoolById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SchoolController.prototype, "updateSchool", null);
__decorate([
    (0, common_1.Post)(':id/logo'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SchoolController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('school:deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchoolController.prototype, "deleteSchool", null);
exports.SchoolController = SchoolController = __decorate([
    (0, common_1.Controller)('schools'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [school_service_1.SchoolService])
], SchoolController);
//# sourceMappingURL=school.controller.js.map