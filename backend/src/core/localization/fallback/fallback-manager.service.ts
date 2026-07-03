import { Injectable, Logger } from '@nestjs/common';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, TranslationParams } from '../interfaces/localization.interface';
import { FallbackStrategy } from '../interfaces/translation.interface';

@Injectable()
export class FallbackManager implements FallbackStrategy {
  private readonly logger = new Logger(FallbackManager.name);

  private readonly fallbackChain: Record<string, Language[]> = {};

  constructor() {
    for (const locale of SUPPORTED_LANGUAGES) {
      const chain: Language[] = [DEFAULT_LANGUAGE];
      this.fallbackChain[locale] = [locale, ...chain.filter((l) => l !== locale)];
    }
  }

  async resolve(
    locale: Language,
    _domain: string,
    key: string,
    _params?: TranslationParams,
  ): Promise<string> {
    const chain = this.fallbackChain[locale] || [locale, DEFAULT_LANGUAGE];
    this.logger.debug(`Fallback chain for ${locale}: [${chain.join(', ')}]`);
    return key;
  }

  getAvailableLocales(locale: Language): Language[] {
    return this.fallbackChain[locale] || [locale, DEFAULT_LANGUAGE];
  }

  getFallbackChain(locale: Language): Language[] {
    return this.getAvailableLocales(locale);
  }
}
