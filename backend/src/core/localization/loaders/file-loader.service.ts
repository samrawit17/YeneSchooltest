import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../interfaces/localization.interface';
import { TranslationDomain, TranslationLoader } from '../interfaces/translation.interface';

@Injectable()
export class FileTranslationLoader implements TranslationLoader {
  private readonly logger = new Logger(FileTranslationLoader.name);
  private readonly translationsDir: string;
  private readonly cache = new Map<string, TranslationDomain>();

  constructor() {
    this.translationsDir = path.join(__dirname, '..', 'translations');
  }

  async load(locale: Language, domain: string): Promise<TranslationDomain | null> {
    const cacheKey = `${locale}:${domain}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const filePath = path.join(this.translationsDir, locale, `${domain}.json`);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Translation file not found: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as TranslationDomain;
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.error(`Failed to load translation file for ${locale}/${domain}: ${(error as Error).message}`);
      return null;
    }
  }

  async loadAll(locale: Language): Promise<TranslationDomain> {
    const localeDir = path.join(this.translationsDir, locale);
    if (!fs.existsSync(localeDir)) return {};

    const result: TranslationDomain = {};
    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const domain = file.replace('.json', '');
      const data = await this.load(locale, domain);
      if (data) result[domain] = data;
    }
    return result;
  }

  async getSupportedLocales(): Promise<Language[]> {
    const locales: Language[] = [];
    for (const locale of SUPPORTED_LANGUAGES) {
      const dir = path.join(this.translationsDir, locale);
      if (fs.existsSync(dir)) locales.push(locale);
    }
    return locales.length > 0 ? locales : [DEFAULT_LANGUAGE];
  }

  clearCache(locale?: string, domain?: string): void {
    if (locale && domain) {
      this.cache.delete(`${locale}:${domain}`);
    } else if (locale) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${locale}:`)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }
}
