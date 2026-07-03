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
var LocalizedExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizedExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const localized_exception_1 = require("../exceptions/localized-exception");
const translation_service_1 = require("../services/translation.service");
const locale_resolver_service_1 = require("../services/locale-resolver.service");
const localization_interface_1 = require("../interfaces/localization.interface");
let LocalizedExceptionFilter = LocalizedExceptionFilter_1 = class LocalizedExceptionFilter {
    translationService;
    localeResolver;
    logger = new common_1.Logger(LocalizedExceptionFilter_1.name);
    constructor(translationService, localeResolver) {
        this.translationService = translationService;
        this.localeResolver = localeResolver;
    }
    async catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const locale = request.locale || localization_interface_1.DEFAULT_LANGUAGE;
        if (exception instanceof localized_exception_1.LocalizedException) {
            const message = await this.translationService.translate(exception.localizationKey, locale, exception.localizationParams);
            response.status(exception.getStatus()).json({
                success: false,
                key: exception.localizationKey,
                message,
                params: exception.localizationParams,
                locale,
            });
            return;
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            let message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : exceptionResponse.message;
            const validationMessages = Array.isArray(message) ? message : [message];
            const translatedMessages = await Promise.all(validationMessages.map(async (msg) => {
                if (typeof msg === 'string' && msg.includes('.')) {
                    const translated = await this.translationService.translate(msg, locale).catch(() => null);
                    return translated || msg;
                }
                return msg;
            }));
            response.status(status).json({
                success: false,
                message: translatedMessages.length === 1 ? translatedMessages[0] : translatedMessages,
                locale,
            });
            return;
        }
        this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
        response.status(500).json({
            success: false,
            message: 'Internal server error',
            locale,
        });
    }
};
exports.LocalizedExceptionFilter = LocalizedExceptionFilter;
exports.LocalizedExceptionFilter = LocalizedExceptionFilter = LocalizedExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [translation_service_1.TranslationService,
        locale_resolver_service_1.LocaleResolver])
], LocalizedExceptionFilter);
//# sourceMappingURL=localized-exception.filter.js.map