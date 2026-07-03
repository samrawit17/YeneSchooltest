"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingModule = void 0;
const common_1 = require("@nestjs/common");
const grading_controller_1 = require("./grading.controller");
const grading_service_1 = require("./grading.service");
const prisma_module_1 = require("../prisma/prisma.module");
const academic_year_module_1 = require("../academic-year/academic-year.module");
const notification_module_1 = require("../notification/notification.module");
const subscription_module_1 = require("../subscription/subscription.module");
let GradingModule = class GradingModule {
};
exports.GradingModule = GradingModule;
exports.GradingModule = GradingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, academic_year_module_1.AcademicYearModule, notification_module_1.NotificationModule, subscription_module_1.SubscriptionModule],
        controllers: [grading_controller_1.GradingController],
        providers: [grading_service_1.GradingService],
        exports: [grading_service_1.GradingService],
    })
], GradingModule);
//# sourceMappingURL=grading.module.js.map