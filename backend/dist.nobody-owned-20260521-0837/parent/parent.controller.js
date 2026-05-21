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
exports.ParentController = void 0;
const common_1 = require("@nestjs/common");
const parent_service_1 = require("./parent.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const parent_dto_1 = require("./dto/parent.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let ParentController = class ParentController {
    parentService;
    constructor(parentService) {
        this.parentService = parentService;
    }
    async getMyProfile(req) {
        return this.parentService.getParentByUserId(req.user.id, req.user.schoolId);
    }
    async getMyChildren(req) {
        const children = await this.parentService.getChildrenByParentUserId(req.user.id, req.user.schoolId);
        return { children };
    }
    async getMyRelatedTeachers(req) {
        const teachers = await this.parentService.getRelatedTeachersByParentUserId(req.user.id, req.user.schoolId);
        return { teachers };
    }
    async getMyChildById(childId, req) {
        return this.parentService.getChildByIdForParent(req.user.id, childId, req.user.schoolId);
    }
    async getParents(req, search, page, limit) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.parentService.getParents(req.user.schoolId, {
            search,
            page: pageNum,
            limit: limitNum,
        });
    }
    async getParentById(parentId, req) {
        return this.parentService.getParentById(parentId, req.user.schoolId);
    }
    async updateParent(parentId, updateDto, req) {
        return this.parentService.updateParent(parentId, req.user.schoolId, updateDto);
    }
    async createParent(createParentDto, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            throw new common_1.BadRequestException('School context is required');
        }
        return this.parentService.createParent({ ...createParentDto, schoolId }, req.user.id);
    }
    async createParentAndLink(createParentAndLinkDto, req) {
        return this.parentService.createParentAndLink(createParentAndLinkDto, req.user.id, req.user.schoolId);
    }
    async linkParentToStudent(linkDto, req) {
        return this.parentService.linkParentToStudent(linkDto, req.user.schoolId);
    }
    async unlinkParentFromStudent(parentId, studentId, req) {
        return this.parentService.unlinkParentFromStudent(parentId, studentId, req.user.schoolId);
    }
};
exports.ParentController = ParentController;
__decorate([
    (0, common_1.Get)('me/profile'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/children'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "getMyChildren", null);
__decorate([
    (0, common_1.Get)('me/teachers'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "getMyRelatedTeachers", null);
__decorate([
    (0, common_1.Get)('me/children/:childId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.PARENT),
    __param(0, (0, common_1.Param)('childId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "getMyChildById", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "getParents", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "getParentById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, parent_dto_1.UpdateParentDto, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "updateParent", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [parent_dto_1.CreateParentDto, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "createParent", null);
__decorate([
    (0, common_1.Post)('create-and-link'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:create', 'parent:link_student'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [parent_dto_1.CreateParentAndLinkDto, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "createParentAndLink", null);
__decorate([
    (0, common_1.Post)('link'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:link_student'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [parent_dto_1.LinkParentToStudentDto, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "linkParentToStudent", null);
__decorate([
    (0, common_1.Delete)('unlink/:parentId/:studentId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('parent:unlink_student'),
    __param(0, (0, common_1.Param)('parentId')),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ParentController.prototype, "unlinkParentFromStudent", null);
exports.ParentController = ParentController = __decorate([
    (0, common_1.Controller)('parents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __metadata("design:paramtypes", [parent_service_1.ParentService])
], ParentController);
//# sourceMappingURL=parent.controller.js.map