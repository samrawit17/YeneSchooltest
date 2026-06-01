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
var PermissionsGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("../decorators/permissions.decorator");
const role_enum_1 = require("../types/role.enum");
const prisma_service_1 = require("../../prisma/prisma.service");
let PermissionsGuard = PermissionsGuard_1 = class PermissionsGuard {
    reflector;
    prismaService;
    logger = new common_1.Logger(PermissionsGuard_1.name);
    constructor(reflector, prismaService) {
        this.reflector = reflector;
        this.prismaService = prismaService;
    }
    async canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const path = request.url || request.path;
        if (!user) {
            return !requiredPermissions;
        }
        if (path &&
            (path.includes('/auth/users/me') || path.includes('/users/me'))) {
            return true;
        }
        if (!user.role) {
            this.logger.warn(`User ${user.id} has no role assigned`);
            return false;
        }
        const body = request.body;
        const params = request.params;
        const query = request.query;
        const resourceSchoolId = body?.schoolId || params?.schoolId || query?.schoolId;
        if (user.schoolId && resourceSchoolId && resourceSchoolId !== user.schoolId) {
            this.logger.warn(`User ${user.id} (School: ${user.schoolId}) attempted to access resource in School: ${resourceSchoolId}`);
            return false;
        }
        if (user.role === role_enum_1.Role.SUPER_ADMIN) {
            if (user.schoolId) {
                this.logger.error(`SUPER_ADMIN ${user.id} has a schoolId assigned, which is invalid for platform-level role.`);
                return false;
            }
        }
        if (!requiredPermissions) {
            return true;
        }
        const userPermissions = user.permissions || [];
        const hasPermission = requiredPermissions.every((permission) => userPermissions.includes(permission));
        return hasPermission;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = PermissionsGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map