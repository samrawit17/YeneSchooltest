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
var TranslationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
const common_1 = require("@nestjs/common");
const localization_interface_1 = require("../interfaces/localization.interface");
const file_loader_service_1 = require("../loaders/file-loader.service");
const translation_cache_service_1 = require("../cache/translation-cache.service");
const fallback_manager_service_1 = require("../fallback/fallback-manager.service");
const message_formatter_service_1 = require("./message-formatter.service");
let TranslationService = TranslationService_1 = class TranslationService {
    loader;
    cache;
    fallback;
    formatter;
    logger = new common_1.Logger(TranslationService_1.name);
    constructor(loader, cache, fallback, formatter) {
        this.loader = loader;
        this.cache = cache;
        this.fallback = fallback;
        this.formatter = formatter;
    }
    async translate(key, locale = localization_interface_1.DEFAULT_LANGUAGE, params) {
        const { domain, keyPath } = this.parseKey(key);
        const result = await this.lookupWithFallback(locale, domain, keyPath, params);
        if (result !== null)
            return result;
        this.logger.warn(`Missing translation key: ${key} for locale: ${locale}`);
        return params ? this.formatter.format(key, params) : key;
    }
    async translateMessage(key, locale = localization_interface_1.DEFAULT_LANGUAGE, params) {
        const message = await this.translate(key, locale, params);
        return { key, message, locale, params };
    }
    async translateBatch(items, locale = localization_interface_1.DEFAULT_LANGUAGE) {
        return Promise.all(items.map((item) => this.translateMessage(item.key, locale, item.params)));
    }
    async lookupWithFallback(locale, domain, keyPath, params) {
        const chain = this.fallback.getFallbackChain(locale);
        for (const fallbackLocale of chain) {
            const value = await this.lookupSingle(fallbackLocale, domain, keyPath);
            if (value !== null) {
                return params ? this.formatter.format(value, params) : value;
            }
        }
        if (!chain.includes(localization_interface_1.DEFAULT_LANGUAGE)) {
            const value = await this.lookupSingle(localization_interface_1.DEFAULT_LANGUAGE, domain, keyPath);
            if (value !== null) {
                return params ? this.formatter.format(value, params) : value;
            }
        }
        const globalKey = keyPath.join('.');
        for (const fallbackLocale of localization_interface_1.SUPPORTED_LANGUAGES) {
            if (chain.includes(fallbackLocale) || fallbackLocale === localization_interface_1.DEFAULT_LANGUAGE)
                continue;
            const value = await this.lookupSingle(fallbackLocale, domain, keyPath);
            if (value !== null) {
                return params ? this.formatter.format(value, params) : value;
            }
        }
        return null;
    }
    async lookupSingle(locale, domain, keyPath) {
        const cacheKey = keyPath.join('.');
        const cached = await this.cache.get(locale, domain, cacheKey);
        if (cached !== null)
            return cached;
        const translationData = await this.loader.load(locale, domain);
        if (!translationData)
            return null;
        const value = this.resolveKeyPath(translationData, keyPath);
        if (typeof value === 'string') {
            await this.cache.set(locale, domain, cacheKey, value);
            return value;
        }
        return null;
    }
    resolveKeyPath(data, keyPath) {
        let current = data;
        for (const segment of keyPath) {
            if (typeof current === 'string')
                return null;
            if (!current || typeof current !== 'object' || !(segment in current))
                return null;
            current = current[segment];
        }
        return typeof current === 'string' ? current : null;
    }
    parseKey(key) {
        const parts = key.split('.');
        const domain = parts[0];
        const keyPath = parts.slice(1);
        return { domain, keyPath };
    }
    async refreshCache(locale, domain) {
        await this.cache.clear(locale, domain);
        if (locale && domain) {
            this.loader.clearCache(locale, domain);
        }
        else if (locale) {
            this.loader.clearCache(locale);
        }
        else {
            this.loader.clearCache();
        }
        this.logger.log(`Translation cache refreshed for locale: ${locale || 'all'}, domain: ${domain || 'all'}`);
    }
};
exports.TranslationService = TranslationService;
exports.TranslationService = TranslationService = TranslationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [file_loader_service_1.FileTranslationLoader,
        translation_cache_service_1.InMemoryTranslationCache,
        fallback_manager_service_1.FallbackManager,
        message_formatter_service_1.MessageFormatter])
], TranslationService);
//# sourceMappingURL=translation.service.js.map