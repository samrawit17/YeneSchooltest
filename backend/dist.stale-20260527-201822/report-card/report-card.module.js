"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportCardModule = void 0;
const common_1 = require("@nestjs/common");
const report_card_controller_1 = require("./report-card.controller");
const promotion_controller_1 = require("./promotion.controller");
const report_card_service_1 = require("./report-card.service");
const notification_module_1 = require("../notification/notification.module");
let ReportCardModule = class ReportCardModule {
};
exports.ReportCardModule = ReportCardModule;
exports.ReportCardModule = ReportCardModule = __decorate([
    (0, common_1.Module)({
        imports: [notification_module_1.NotificationModule],
        controllers: [report_card_controller_1.ReportCardController, promotion_controller_1.PromotionController],
        providers: [report_card_service_1.ReportCardService],
        exports: [report_card_service_1.ReportCardService],
    })
], ReportCardModule);
//# sourceMappingURL=report-card.module.js.map