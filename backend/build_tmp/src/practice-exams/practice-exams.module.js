"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeExamsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const practice_exams_controller_1 = require("./practice-exams.controller");
const practice_exams_service_1 = require("./practice-exams.service");
const subscription_module_1 = require("../subscription/subscription.module");
let PracticeExamsModule = class PracticeExamsModule {
};
exports.PracticeExamsModule = PracticeExamsModule;
exports.PracticeExamsModule = PracticeExamsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, subscription_module_1.SubscriptionModule],
        controllers: [practice_exams_controller_1.PracticeExamsController],
        providers: [practice_exams_service_1.PracticeExamsService],
        exports: [practice_exams_service_1.PracticeExamsService],
    })
], PracticeExamsModule);
//# sourceMappingURL=practice-exams.module.js.map