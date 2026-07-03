"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountPolicyModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const discount_policy_controller_1 = require("./discount-policy.controller");
const discount_policy_service_1 = require("./discount-policy.service");
let DiscountPolicyModule = class DiscountPolicyModule {
};
exports.DiscountPolicyModule = DiscountPolicyModule;
exports.DiscountPolicyModule = DiscountPolicyModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [discount_policy_controller_1.DiscountPolicyController],
        providers: [discount_policy_service_1.DiscountPolicyService],
        exports: [discount_policy_service_1.DiscountPolicyService],
    })
], DiscountPolicyModule);
//# sourceMappingURL=discount-policy.module.js.map