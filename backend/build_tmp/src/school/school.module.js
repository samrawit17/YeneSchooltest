"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const school_controller_1 = require("./school.controller");
const school_service_1 = require("./school.service");
const auth_module_1 = require("../auth/auth.module");
const prisma_module_1 = require("../prisma/prisma.module");
const platform_settings_module_1 = require("../platform-settings/platform-settings.module");
const subscription_module_1 = require("../subscription/subscription.module");
const storage_module_1 = require("../storage/storage.module");
let SchoolModule = class SchoolModule {
};
exports.SchoolModule = SchoolModule;
exports.SchoolModule = SchoolModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            prisma_module_1.PrismaModule,
            platform_settings_module_1.PlatformSettingsModule,
            subscription_module_1.SubscriptionModule,
            storage_module_1.StorageModule,
            platform_express_1.MulterModule.register({
                limits: {
                    fileSize: 2 * 1024 * 1024,
                },
            }),
        ],
        controllers: [school_controller_1.SchoolController],
        providers: [school_service_1.SchoolService],
        exports: [school_service_1.SchoolService],
    })
], SchoolModule);
//# sourceMappingURL=school.module.js.map