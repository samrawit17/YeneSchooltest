"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const maintenance_mode_interceptor_1 = require("./maintenance-mode.interceptor");
const platform_settings_controller_1 = require("./platform-settings.controller");
const platform_settings_service_1 = require("./platform-settings.service");
let PlatformSettingsModule = class PlatformSettingsModule {
};
exports.PlatformSettingsModule = PlatformSettingsModule;
exports.PlatformSettingsModule = PlatformSettingsModule = __decorate([
    (0, common_1.Module)({
        controllers: [platform_settings_controller_1.PlatformSettingsController],
        providers: [
            platform_settings_service_1.PlatformSettingsService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: maintenance_mode_interceptor_1.MaintenanceModeInterceptor,
            },
        ],
        exports: [platform_settings_service_1.PlatformSettingsService],
    })
], PlatformSettingsModule);
//# sourceMappingURL=platform-settings.module.js.map