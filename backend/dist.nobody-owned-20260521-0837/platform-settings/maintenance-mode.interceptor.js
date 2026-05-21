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
exports.MaintenanceModeInterceptor = void 0;
const common_1 = require("@nestjs/common");
const role_enum_1 = require("../auth/types/role.enum");
const platform_settings_service_1 = require("./platform-settings.service");
let MaintenanceModeInterceptor = class MaintenanceModeInterceptor {
    platformSettingsService;
    allowedPaths = [
        '/auth/login',
        '/auth/logout',
        '/auth/me',
        '/platform/settings',
        '/platform/settings/flags',
    ];
    constructor(platformSettingsService) {
        this.platformSettingsService = platformSettingsService;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        if (this.shouldSkip(request)) {
            return next.handle();
        }
        const maintenanceMode = await this.platformSettingsService.isMaintenanceModeEnabled();
        if (maintenanceMode &&
            request.user?.role &&
            request.user.role !== role_enum_1.Role.SUPER_ADMIN) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                message: 'The platform is currently under maintenance. Please try again later.',
                error: 'Service Unavailable',
                code: 'MAINTENANCE_MODE',
            }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        return next.handle();
    }
    shouldSkip(request) {
        const path = request.path || request.originalUrl || request.url || '';
        if (request.user?.role === role_enum_1.Role.SUPER_ADMIN) {
            return true;
        }
        return this.allowedPaths.some((allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`));
    }
};
exports.MaintenanceModeInterceptor = MaintenanceModeInterceptor;
exports.MaintenanceModeInterceptor = MaintenanceModeInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [platform_settings_service_1.PlatformSettingsService])
], MaintenanceModeInterceptor);
//# sourceMappingURL=maintenance-mode.interceptor.js.map