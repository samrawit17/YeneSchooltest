"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsModule = void 0;
const common_1 = require("@nestjs/common");
const exams_controller_1 = require("./exams.controller");
const exams_service_1 = require("./exams.service");
const seating_controller_1 = require("./seating.controller");
const seating_service_1 = require("./seating.service");
const national_exam_results_controller_1 = require("./national-exam-results.controller");
const national_exam_results_service_1 = require("./national-exam-results.service");
const prisma_module_1 = require("../prisma/prisma.module");
const subscription_module_1 = require("../subscription/subscription.module");
let ExamsModule = class ExamsModule {
};
exports.ExamsModule = ExamsModule;
exports.ExamsModule = ExamsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, subscription_module_1.SubscriptionModule],
        controllers: [exams_controller_1.ExamsController, seating_controller_1.SeatingController, national_exam_results_controller_1.NationalExamResultsController],
        providers: [exams_service_1.ExamsService, seating_service_1.SeatingService, national_exam_results_service_1.NationalExamResultsService],
        exports: [exams_service_1.ExamsService, seating_service_1.SeatingService, national_exam_results_service_1.NationalExamResultsService],
    })
], ExamsModule);
//# sourceMappingURL=exams.module.js.map