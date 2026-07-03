import { Injectable, Logger } from '@nestjs/common';
import { Language, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, TranslationParams, TranslatedMessage } from '../interfaces/localization.interface';
import { TranslationDomain } from '../interfaces/translation.interface';
import { FileTranslationLoader } from '../loaders/file-loader.service';
import { InMemoryTranslationCache } from '../cache/translation-cache.service';
import { FallbackManager } from '../fallback/fallback-manager.service';
import { MessageFormatter } from './message-formatter.service';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    private readonly loader: FileTranslationLoader,
    private readonly cache: InMemoryTranslationCache,
    private readonly fallback: FallbackManager,
    private readonly formatter: MessageFormatter,
  ) {}

  async translate(
    key: string,
    locale: Language = DEFAULT_LANGUAGE,
    params?: TranslationParams,
  ): Promise<string> {
    const { domain, keyPath } = this.parseKey(key);
    const result = await this.lookupWithFallback(locale, domain, keyPath, params);

    if (result !== null) return result;

    this.logger.warn(`Missing translation key: ${key} for locale: ${locale}`);
    return params ? this.formatter.format(key, params) : key;
  }

  async translateMessage(
    key: string,
    locale: Language = DEFAULT_LANGUAGE,
    params?: TranslationParams,
  ): Promise<TranslatedMessage> {
    const message = await this.translate(key, locale, params);
    return { key, message, locale, params };
  }

  async translateBatch(
    items: Array<{ key: string; params?: TranslationParams }>,
    locale: Language = DEFAULT_LANGUAGE,
  ): Promise<TranslatedMessage[]> {
    return Promise.all(
      items.map((item) => this.translateMessage(item.key, locale, item.params)),
    );
  }

  private async lookupWithFallback(
    locale: Language,
    domain: string,
    keyPath: string[],
    params?: TranslationParams,
  ): Promise<string | null> {
    const chain = this.fallback.getFallbackChain(locale);

    for (const fallbackLocale of chain) {
      const value = await this.lookupSingle(fallbackLocale, domain, keyPath);
      if (value !== null) {
        return params ? this.formatter.format(value, params) : value;
      }
    }

    if (!chain.includes(DEFAULT_LANGUAGE)) {
      const value = await this.lookupSingle(DEFAULT_LANGUAGE, domain, keyPath);
      if (value !== null) {
        return params ? this.formatter.format(value, params) : value;
      }
    }

    const globalKey = keyPath.join('.');
    for (const fallbackLocale of SUPPORTED_LANGUAGES) {
      if (chain.includes(fallbackLocale) || fallbackLocale === DEFAULT_LANGUAGE) continue;
      const value = await this.lookupSingle(fallbackLocale, domain, keyPath);
      if (value !== null) {
        return params ? this.formatter.format(value, params) : value;
      }
    }

    return null;
  }

  private async lookupSingle(
    locale: Language,
    domain: string,
    keyPath: string[],
  ): Promise<string | null> {
    const cacheKey = keyPath.join('.');
    const cached = await this.cache.get(locale, domain, cacheKey);
    if (cached !== null) return cached;

    const translationData = await this.loader.load(locale, domain);
    if (!translationData) return null;

    const value = this.resolveKeyPath(translationData, keyPath);
    if (typeof value === 'string') {
      await this.cache.set(locale, domain, cacheKey, value);
      return value;
    }

    return null;
  }

  private resolveKeyPath(data: TranslationDomain, keyPath: string[]): string | TranslationDomain | null {
    let current: TranslationDomain | string = data;

    for (const segment of keyPath) {
      if (typeof current === 'string') return null;
      if (!current || typeof current !== 'object' || !(segment in current)) return null;
      current = current[segment] as TranslationDomain | string;
    }

    return typeof current === 'string' ? current : null;
  }

  private parseKey(key: string): { domain: string; keyPath: string[] } {
    const parts = key.split('.');
    const domain = parts[0];
    const keyPath = parts.slice(1);
    return { domain, keyPath };
  }

  async refreshCache(locale?: Language, domain?: string): Promise<void> {
    await this.cache.clear(locale, domain);
    if (locale && domain) {
      this.loader.clearCache(locale, domain);
    } else if (locale) {
      this.loader.clearCache(locale);
    } else {
      this.loader.clearCache();
    }
    this.logger.log(`Translation cache refreshed for locale: ${locale || 'all'}, domain: ${domain || 'all'}`);
  }
}
