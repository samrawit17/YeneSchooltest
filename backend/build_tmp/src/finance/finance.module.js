"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceModule = void 0;
const common_1 = require("@nestjs/common");
const finance_controller_1 = require("./finance.controller");
const finance_service_1 = require("./finance.service");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_module_1 = require("../notification/notification.module");
const subscription_module_1 = require("../subscription/subscription.module");
const discount_policy_module_1 = require("../discount-policy/discount-policy.module");
const fee_event_listener_1 = require("./fee-event.listener");
let FinanceModule = class FinanceModule {
};
exports.FinanceModule = FinanceModule;
exports.FinanceModule = FinanceModule = __decorate([
    (0, common_1.Module)({
        imports: [notification_module_1.NotificationModule, subscription_module_1.SubscriptionModule, discount_policy_module_1.DiscountPolicyModule],
        controllers: [finance_controller_1.FinanceController],
        providers: [finance_service_1.FinanceService, prisma_service_1.PrismaService, fee_event_listener_1.FeeEventListener],
    })
], FinanceModule);
//# sourceMappingURL=finance.module.js.map