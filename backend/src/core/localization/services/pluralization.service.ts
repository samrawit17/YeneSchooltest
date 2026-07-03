import { Injectable } from '@nestjs/common';
import { Language } from '../interfaces/localization.interface';

type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

@Injectable()
export class PluralizationService {
  private readonly pluralRules: Record<string, (n: number) => PluralCategory> = {
    en: (n: number): PluralCategory => {
      if (n === 1) return 'one';
      return 'other';
    },
    am: (n: number): PluralCategory => {
      if (n === 0 || n === 1) return 'one';
      return 'other';
    },
    om: (n: number): PluralCategory => {
      if (n === 1) return 'one';
      return 'other';
    },
    ti: (n: number): PluralCategory => {
      if (n === 0 || n === 1) return 'one';
      return 'other';
    },
  };

  pluralize(locale: Language, count: number, forms: Record<string, string>): string {
    const rule = this.pluralRules[locale] || this.pluralRules.en;
    const category = rule(count);
    return forms[category] || forms.other || String(count);
  }

  resolveKey(
    locale: Language,
    count: number,
    baseKey: string,
    translator: (key: string) => string,
  ): string {
    const rule = this.pluralRules[locale] || this.pluralRules.en;
    const category = rule(count);
    const pluralKey = `${baseKey}.${category}`;
    const translation = translator(pluralKey);
    if (translation !== pluralKey) return translation;
    return translator(`${baseKey}.other`);
  }
}
