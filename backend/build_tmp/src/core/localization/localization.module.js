"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizationModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const locale_resolver_service_1 = require("./services/locale-resolver.service");
const translation_service_1 = require("./services/translation.service");
const message_formatter_service_1 = require("./services/message-formatter.service");
const date_formatter_service_1 = require("./services/date-formatter.service");
const number_formatter_service_1 = require("./services/number-formatter.service");
const pluralization_service_1 = require("./services/pluralization.service");
const template_renderer_service_1 = require("./services/template-renderer.service");
const file_loader_service_1 = require("./loaders/file-loader.service");
const translation_cache_service_1 = require("./cache/translation-cache.service");
const fallback_manager_service_1 = require("./fallback/fallback-manager.service");
const localized_exception_filter_1 = require("./filters/localized-exception.filter");
const localization_interceptor_1 = require("./interceptors/localization.interceptor");
const locale_middleware_1 = require("./middleware/locale.middleware");
let LocalizationModule = class LocalizationModule {
    configure(consumer) {
        consumer
            .apply(locale_middleware_1.LocaleMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
    }
};
exports.LocalizationModule = LocalizationModule;
exports.LocalizationModule = LocalizationModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            locale_resolver_service_1.LocaleResolver,
            translation_service_1.TranslationService,
            message_formatter_service_1.MessageFormatter,
            date_formatter_service_1.DateFormatter,
            number_formatter_service_1.NumberFormatter,
            pluralization_service_1.PluralizationService,
            template_renderer_service_1.TemplateRenderer,
            file_loader_service_1.FileTranslationLoader,
            translation_cache_service_1.InMemoryTranslationCache,
            fallback_manager_service_1.FallbackManager,
            localized_exception_filter_1.LocalizedExceptionFilter,
            localization_interceptor_1.LocalizationInterceptor,
        ],
        exports: [
            locale_resolver_service_1.LocaleResolver,
            translation_service_1.TranslationService,
            message_formatter_service_1.MessageFormatter,
            date_formatter_service_1.DateFormatter,
            number_formatter_service_1.NumberFormatter,
            pluralization_service_1.PluralizationService,
            template_renderer_service_1.TemplateRenderer,
            file_loader_service_1.FileTranslationLoader,
            translation_cache_service_1.InMemoryTranslationCache,
            fallback_manager_service_1.FallbackManager,
            localized_exception_filter_1.LocalizedExceptionFilter,
            localization_interceptor_1.LocalizationInterceptor,
        ],
    })
], LocalizationModule);
//# sourceMappingURL=localization.module.js.map