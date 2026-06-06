import { createHash } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  SupportedTranslationLanguage,
  TranslateBatchDto,
  TranslateTextDto,
} from './dto/translate-text.dto';

type TranslationProvider = 'azure' | 'google' | 'disabled';

interface TranslationContext {
  userId: string;
  role?: string;
  schoolId: string | null;
}

interface ProviderTranslation {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export interface TranslationResult {
  translatedText: string;
  provider: TranslationProvider;
  sourceLanguage: string;
  targetLanguage: SupportedTranslationLanguage;
  fromCache: boolean;
  translated: boolean;
  reason?: 'disabled' | 'same_language' | 'unsupported_language' | 'protected_text' | 'provider_error';
}

const PROTECTED_TOKEN_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{6,}\d|\b(?:ETB|USD|EUR|GBP|BIRR|BRR)\s?\d[\d,.]*|\b[A-Z]{2,}[-_/]?[A-Z0-9]{2,}\b|\b\d{4,}\b)/gi;

const AZURE_LANGUAGES = new Set(['am', 'ar', 'en', 'so']);
const GOOGLE_LANGUAGES = new Set(SUPPORTED_TRANSLATION_LANGUAGES);

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly prisma: PrismaService) {}

  getClientConfig() {
    const provider = this.getProvider();
    return {
      provider,
      enabled: provider !== 'disabled' && this.hasProviderCredentials(provider),
      supportedLanguages: SUPPORTED_TRANSLATION_LANGUAGES,
    };
  }

  async translateBatch(context: TranslationContext, dto: TranslateBatchDto) {
    const items = dto.items.slice(0, 50);
    const results: Array<TranslationResult & { key?: string }> = [];

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

  async translateText(
    context: TranslationContext,
    dto: TranslateTextDto,
  ): Promise<TranslationResult> {
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
      : await this.findCachedTranslation(
          context.schoolId,
          provider,
          sourceLanguage,
          targetLanguage,
          textHash,
        );

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
      const providerResult =
        provider === 'azure'
          ? await this.translateWithAzure(protectedText.text, dto.sourceLanguage, targetLanguage)
          : await this.translateWithGoogle(protectedText.text, dto.sourceLanguage, targetLanguage);

      const translatedText = this.restoreSegments(
        this.decodeHtmlEntities(providerResult.translatedText),
        protectedText.segments,
      );
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
    } catch (error) {
      this.logger.warn(
        `Translation failed with ${provider}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.staticResult(text, provider, sourceLanguage, targetLanguage, 'provider_error');
    }
  }

  private getProvider(): TranslationProvider {
    const configured = (process.env.TRANSLATION_PROVIDER || 'disabled').toLowerCase();
    if (configured === 'azure' || configured === 'microsoft') return 'azure';
    if (configured === 'google') return 'google';
    return 'disabled';
  }

  private hasProviderCredentials(provider: TranslationProvider) {
    if (provider === 'azure') return Boolean(process.env.AZURE_TRANSLATOR_KEY);
    if (provider === 'google') return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
    return false;
  }

  private providerSupportsLanguage(
    provider: TranslationProvider,
    targetLanguage: SupportedTranslationLanguage,
    sourceLanguage?: SupportedTranslationLanguage,
  ) {
    const supported = provider === 'azure' ? AZURE_LANGUAGES : GOOGLE_LANGUAGES;
    return supported.has(targetLanguage) && (!sourceLanguage || supported.has(sourceLanguage));
  }

  private staticResult(
    text: string,
    provider: TranslationProvider,
    sourceLanguage: string,
    targetLanguage: SupportedTranslationLanguage,
    reason: TranslationResult['reason'],
  ): TranslationResult {
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

  private hashText(text: string) {
    return createHash('sha256').update(text.normalize('NFC')).digest('hex');
  }

  private findCachedTranslation(
    schoolId: string | null,
    provider: TranslationProvider,
    sourceLanguage: string,
    targetLanguage: SupportedTranslationLanguage,
    textHash: string,
  ) {
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

  private async createCachedTranslation(data: {
    schoolId: string | null;
    provider: TranslationProvider;
    sourceLanguage: string;
    targetLanguage: SupportedTranslationLanguage;
    textHash: string;
    translatedText: string;
  }) {
    try {
      await this.prisma.translationCache.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private protectSegments(text: string) {
    const segments: Record<string, string> = {};
    let index = 0;
    const protectedText = text.replace(PROTECTED_TOKEN_REGEX, (match) => {
      const token = `__SMS_KEEP_${index++}__`;
      segments[token] = match;
      return token;
    });

    return { text: protectedText, segments };
  }

  private restoreSegments(text: string, segments: Record<string, string>) {
    return Object.entries(segments).reduce(
      (current, [token, value]) => current.split(token).join(value),
      text,
    );
  }

  private isOnlyProtectedText(text: string) {
    const withoutProtected = text.replace(PROTECTED_TOKEN_REGEX, '').trim();
    return withoutProtected.length === 0;
  }

  private async translateWithAzure(
    text: string,
    sourceLanguage: SupportedTranslationLanguage | undefined,
    targetLanguage: SupportedTranslationLanguage,
  ): Promise<ProviderTranslation> {
    const endpoint =
      process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
    const url = new URL('/translate', endpoint);
    url.searchParams.set('api-version', '3.0');
    if (sourceLanguage) url.searchParams.set('from', sourceLanguage);
    url.searchParams.set('to', targetLanguage);

    const headers: Record<string, string> = {
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
      throw new BadRequestException(`Azure Translator returned ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      detectedLanguage?: { language?: string };
      translations?: Array<{ text?: string; to?: string }>;
    }>;
    const first = payload[0];
    const translatedText = first?.translations?.[0]?.text;
    if (!translatedText) {
      throw new BadRequestException('Azure Translator returned an empty translation');
    }

    return {
      translatedText,
      detectedSourceLanguage: first.detectedLanguage?.language || sourceLanguage,
    };
  }

  private async translateWithGoogle(
    text: string,
    sourceLanguage: SupportedTranslationLanguage | undefined,
    targetLanguage: SupportedTranslationLanguage,
  ): Promise<ProviderTranslation> {
    const endpoint =
      process.env.GOOGLE_TRANSLATE_ENDPOINT ||
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
      throw new BadRequestException(`Google Translation returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: {
        translations?: Array<{
          translatedText?: string;
          detectedSourceLanguage?: string;
        }>;
      };
    };
    const first = payload.data?.translations?.[0];
    if (!first?.translatedText) {
      throw new BadRequestException('Google Translation returned an empty translation');
    }

    return {
      translatedText: first.translatedText,
      detectedSourceLanguage: first.detectedSourceLanguage || sourceLanguage,
    };
  }

  private decodeHtmlEntities(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }
}
