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
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const translate_text_dto_1 = require("./dto/translate-text.dto");
const PROTECTED_TOKEN_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{6,}\d|\b(?:ETB|USD|EUR|GBP|BIRR|BRR)\s?\d[\d,.]*|\b[A-Z]{2,}[-_/]?[A-Z0-9]{2,}\b|\b\d{4,}\b)/gi;
const AZURE_LANGUAGES = new Set(['am', 'ar', 'en', 'so']);
const GOOGLE_LANGUAGES = new Set(translate_text_dto_1.SUPPORTED_TRANSLATION_LANGUAGES);
let TranslationService = TranslationService_1 = class TranslationService {
    prisma;
    logger = new common_1.Logger(TranslationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    getClientConfig() {
        const provider = this.getProvider();
        return {
            provider,
            enabled: provider !== 'disabled' && this.hasProviderCredentials(provider),
            supportedLanguages: translate_text_dto_1.SUPPORTED_TRANSLATION_LANGUAGES,
        };
    }
    async translateBatch(context, dto) {
        const items = dto.items.slice(0, 50);
        const results = [];
        for (const item of items) {
            const result = await this.translateText(context, {
                text: item.text,
                sourceLanguage: dto.sourceLanguage,
                targetLanguage: dto.targetLanguage,
                forceRefresh: dto.forceRefresh,
            });
            results.push({ key: item.key, ...result });
        }
        return { results };
    }
    async translateText(context, dto) {
        const text = dto.text.trim();
        const provider = this.getProvider();
        const sourceLanguage = dto.sourceLanguage || 'auto';
        const targetLanguage = dto.targetLanguage;
        if (!text) {
            return this.staticResult('', provider, sourceLanguage, targetLanguage, 'protected_text');
        }
        if (sourceLanguage === targetLanguage) {
            return this.staticResult(text, provider, sourceLanguage, targetLanguage, 'same_language');
        }
        if (provider === 'disabled' || !this.hasProviderCredentials(provider)) {
            return this.staticResult(text, provider, sourceLanguage, targetLanguage, 'disabled');
        }
        if (!this.providerSupportsLanguage(provider, targetLanguage, dto.sourceLanguage)) {
            return this.staticResult(text, provider, sourceLanguage, targetLanguage, 'unsupported_language');
        }
        if (this.isOnlyProtectedText(text)) {
            return this.staticResult(text, provider, sourceLanguage, targetLanguage, 'protected_text');
        }
        const textHash = this.hashText(text);
        const cached = dto.forceRefresh
            ? null
            : await this.findCachedTranslation(context.schoolId, provider, sourceLanguage, targetLanguage, textHash);
        if (cached) {
            return {
                translatedText: cached.reviewedText || cached.translatedText,
                provider,
                sourceLanguage,
                targetLanguage,
                fromCache: true,
                translated: true,
            };
        }
        const protectedText = this.protectSegments(text);
        try {
            const providerResult = provider === 'azure'
                ? await this.translateWithAzure(protectedText.text, dto.sourceLanguage, targetLanguage)
                : await this.translateWithGoogle(protectedText.text, dto.sourceLanguage, targetLanguage);
            const translatedText = this.restoreSegments(this.decodeHtmlEntities(providerResult.translatedText), protectedText.segments);
            const detectedSourceLanguage = providerResult.detectedSourceLanguage || sourceLanguage;
            await this.createCachedTranslation({
                schoolId: context.schoolId,
                provider,
                sourceLanguage: detectedSourceLanguage,
                targetLanguage,
                textHash,
                translatedText,
            });
            return {
                translatedText,
                provider,
                sourceLanguage: detectedSourceLanguage,
                targetLanguage,
                fromCache: false,
                translated: true,
            };
        }
        catch (error) {
            this.logger.warn(`Translation failed with ${provider}: ${error instanceof Error ? error.message : String(error)}`);
            return this.staticResult(text, provider, sourceLanguage, targetLanguage, 'provider_error');
        }
    }
    getProvider() {
        const configured = (process.env.TRANSLATION_PROVIDER || 'disabled').toLowerCase();
        if (configured === 'azure' || configured === 'microsoft')
            return 'azure';
        if (configured === 'google')
            return 'google';
        return 'disabled';
    }
    hasProviderCredentials(provider) {
        if (provider === 'azure')
            return Boolean(process.env.AZURE_TRANSLATOR_KEY);
        if (provider === 'google')
            return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
        return false;
    }
    providerSupportsLanguage(provider, targetLanguage, sourceLanguage) {
        const supported = provider === 'azure' ? AZURE_LANGUAGES : GOOGLE_LANGUAGES;
        return supported.has(targetLanguage) && (!sourceLanguage || supported.has(sourceLanguage));
    }
    staticResult(text, provider, sourceLanguage, targetLanguage, reason) {
        return {
            translatedText: text,
            provider,
            sourceLanguage,
            targetLanguage,
            fromCache: false,
            translated: false,
            reason,
        };
    }
    hashText(text) {
        return (0, crypto_1.createHash)('sha256').update(text.normalize('NFC')).digest('hex');
    }
    findCachedTranslation(schoolId, provider, sourceLanguage, targetLanguage, textHash) {
        return this.prisma.translationCache.findFirst({
            where: {
                schoolId,
                provider,
                sourceLanguage,
                targetLanguage,
                textHash,
            },
        });
    }
    async createCachedTranslation(data) {
        try {
            await this.prisma.translationCache.create({ data });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                return;
            }
            throw error;
        }
    }
    protectSegments(text) {
        const segments = {};
        let index = 0;
        const protectedText = text.replace(PROTECTED_TOKEN_REGEX, (match) => {
            const token = `__SMS_KEEP_${index++}__`;
            segments[token] = match;
            return token;
        });
        return { text: protectedText, segments };
    }
    restoreSegments(text, segments) {
        return Object.entries(segments).reduce((current, [token, value]) => current.split(token).join(value), text);
    }
    isOnlyProtectedText(text) {
        const withoutProtected = text.replace(PROTECTED_TOKEN_REGEX, '').trim();
        return withoutProtected.length === 0;
    }
    async translateWithAzure(text, sourceLanguage, targetLanguage) {
        const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
        const url = new URL('/translate', endpoint);
        url.searchParams.set('api-version', '3.0');
        if (sourceLanguage)
            url.searchParams.set('from', sourceLanguage);
        url.searchParams.set('to', targetLanguage);
        const headers = {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY || '',
        };
        if (process.env.AZURE_TRANSLATOR_REGION) {
            headers['Ocp-Apim-Subscription-Region'] = process.env.AZURE_TRANSLATOR_REGION;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ Text: text }]),
        });
        if (!response.ok) {
            throw new localization_1.LocalizedException('translation.azure_translator_returned_518154ca', undefined, undefined, 'Azure Translator returned ${response.status}');
        }
        const payload = (await response.json());
        const first = payload[0];
        const translatedText = first?.translations?.[0]?.text;
        if (!translatedText) {
            throw new localization_1.LocalizedException('translation.azure_translator_returned_an_empty_translation_b9b5ba0c', undefined, undefined, 'Azure Translator returned an empty translation');
        }
        return {
            translatedText,
            detectedSourceLanguage: first.detectedLanguage?.language || sourceLanguage,
        };
    }
    async translateWithGoogle(text, sourceLanguage, targetLanguage) {
        const endpoint = process.env.GOOGLE_TRANSLATE_ENDPOINT ||
            'https://translation.googleapis.com/language/translate/v2';
        const url = new URL(endpoint);
        url.searchParams.set('key', process.env.GOOGLE_TRANSLATE_API_KEY || '');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                target: targetLanguage,
                source: sourceLanguage,
                format: 'text',
            }),
        });
        if (!response.ok) {
            throw new localization_1.LocalizedException('translation.google_translation_returned_da5ab1d3', undefined, undefined, 'Google Translation returned ${response.status}');
        }
        const payload = (await response.json());
        const first = payload.data?.translations?.[0];
        if (!first?.translatedText) {
            throw new localization_1.LocalizedException('translation.google_translation_returned_an_empty_translation_9315c943', undefined, undefined, 'Google Translation returned an empty translation');
        }
        return {
            translatedText: first.translatedText,
            detectedSourceLanguage: first.detectedSourceLanguage || sourceLanguage,
        };
    }
    decodeHtmlEntities(value) {
        return value
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'");
    }
};
exports.TranslationService = TranslationService;
exports.TranslationService = TranslationService = TranslationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TranslationService);
//# sourceMappingURL=translation.service.js.map