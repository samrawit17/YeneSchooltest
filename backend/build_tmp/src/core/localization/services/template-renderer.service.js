"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRenderer = void 0;
const common_1 = require("@nestjs/common");
const translation_service_1 = require("./translation.service");
const message_formatter_service_1 = require("./message-formatter.service");
let TemplateRenderer = class TemplateRenderer {
    translationService;
    formatter;
    constructor(translationService, formatter) {
        this.translationService = translationService;
        this.formatter = formatter;
    }
    async renderEmail(template, locale, params) {
        const [subject, body] = await Promise.all([
            this.translationService.translate(template.subjectKey, locale, params),
            this.translationService.translate(template.bodyKey, locale, params),
        ]);
        return { subject, body, locale };
    }
    async renderSMS(template, locale, params) {
        const body = await this.translationService.translate(template.bodyKey, locale, params);
        return { body, locale };
    }
    async renderRaw(templateKey, locale, params) {
        return this.translationService.translate(templateKey, locale, params);
    }
    extractVariables(template) {
        return this.formatter.extractParams(template);
    }
};
exports.TemplateRenderer = TemplateRenderer;
exports.TemplateRenderer = TemplateRenderer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [translation_service_1.TranslationService,
        message_formatter_service_1.MessageFormatter])
], TemplateRenderer);
//# sourceMappingURL=template-renderer.service.js.map