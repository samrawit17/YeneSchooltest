"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SirenModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const siren_service_1 = require("./siren.service");
const siren_controller_1 = require("./siren.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const notification_module_1 = require("../notification/notification.module");
const subscription_module_1 = require("../subscription/subscription.module");
let SirenModule = class SirenModule {
};
exports.SirenModule = SirenModule;
exports.SirenModule = SirenModule = __decorate([
    (0, common_1.Module)({
        imports: [schedule_1.ScheduleModule.forRoot(), prisma_module_1.PrismaModule, notification_module_1.NotificationModule, subscription_module_1.SubscriptionModule],
        controllers: [siren_controller_1.SirenController],
        providers: [siren_service_1.SirenService],
        exports: [siren_service_1.SirenService],
    })
], SirenModule);
//# sourceMappingURL=siren.module.js.map