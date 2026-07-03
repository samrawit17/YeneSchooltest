import { Injectable, Logger } from '@nestjs/common';
import { Language } from '../interfaces/localization.interface';
import { TranslationCache } from '../interfaces/translation.interface';

@Injectable()
export class InMemoryTranslationCache implements TranslationCache {
  private readonly logger = new Logger(InMemoryTranslationCache.name);
  private readonly store = new Map<string, string>();
  private hits = 0;
  private misses = 0;

  private key(locale: Language, domain: string, key: string): string {
    return `${locale}:${domain}:${key}`;
  }

  async get(locale: Language, domain: string, key: string): Promise<string | null> {
    const k = this.key(locale, domain, key);
    const value = this.store.get(k);
    if (value !== undefined) {
      this.hits++;
      return value;
    }
    this.misses++;
    return null;
  }

  async set(locale: Language, domain: string, key: string, value: string): Promise<void> {
    this.store.set(this.key(locale, domain, key), value);
  }

  async clear(locale?: Language, domain?: string): Promise<void> {
    if (locale && domain) {
      const prefix = `${locale}:${domain}:`;
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) this.store.delete(key);
      }
    } else if (locale) {
      const prefix = `${locale}:`;
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) this.store.delete(key);
      }
    } else {
      this.store.clear();
    }
    this.logger.log(`Translation cache cleared (locale: ${locale || 'all'}, domain: ${domain || 'all'})`);
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
