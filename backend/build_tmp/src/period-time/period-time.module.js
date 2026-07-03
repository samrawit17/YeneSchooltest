"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodTimeModule = void 0;
const common_1 = require("@nestjs/common");
const period_time_service_1 = require("./period-time.service");
const period_time_controller_1 = require("./period-time.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const subscription_module_1 = require("../subscription/subscription.module");
let PeriodTimeModule = class PeriodTimeModule {
};
exports.PeriodTimeModule = PeriodTimeModule;
exports.PeriodTimeModule = PeriodTimeModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, subscription_module_1.SubscriptionModule],
        controllers: [period_time_controller_1.PeriodTimeController],
        providers: [period_time_service_1.PeriodTimeService],
    })
], PeriodTimeModule);
//# sourceMappingURL=period-time.module.js.map