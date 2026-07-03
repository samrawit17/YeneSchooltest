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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("../decorators/roles.decorator");
const role_enum_1 = require("../types/role.enum");
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const normalizedUserRole = String(user?.role || '').trim().toUpperCase();
        const normalizedRequiredRoles = requiredRoles.map((role) => String(role || '').trim().toUpperCase());
        const allowSuperAdminMixedRole = this.reflector.getAllAndOverride(roles_decorator_1.ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY, [context.getHandler(), context.getClass()]);
        if (!allowSuperAdminMixedRole &&
            normalizedUserRole === role_enum_1.Role.SUPER_ADMIN &&
            normalizedRequiredRoles.some((role) => role !== role_enum_1.Role.SUPER_ADMIN)) {
            throw new common_1.ForbiddenException(`Access denied. Your role (SUPER_ADMIN) is not explicitly allowed for this resource. Required roles: ${normalizedRequiredRoles.join(', ')}`);
        }
        const isAllowed = user &&
            normalizedRequiredRoles.some((role) => role === normalizedUserRole);
        if (!isAllowed) {
            throw new common_1.ForbiddenException(`Access denied. Your role (${normalizedUserRole}) does not have permission. Required roles: ${normalizedRequiredRoles.join(', ')}`);
        }
        return isAllowed;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map