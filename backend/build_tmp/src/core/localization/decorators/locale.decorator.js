"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportedLocales = exports.SetLocale = exports.Locale = exports.LOCALE_METADATA_KEY = void 0;
const common_1 = require("@nestjs/common");
const localization_interface_1 = require("../interfaces/localization.interface");
exports.LOCALE_METADATA_KEY = 'locale';
exports.Locale = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.locale || 'en';
});
const SetLocale = (locale) => (0, common_1.SetMetadata)(exports.LOCALE_METADATA_KEY, locale);
exports.SetLocale = SetLocale;
const SupportedLocales = (...locales) => (0, common_1.SetMetadata)('supported_locales', locales.length > 0 ? locales : localization_interface_1.SUPPORTED_LANGUAGES);
exports.SupportedLocales = SupportedLocales;
//# sourceMappingURL=locale.decorator.js.map