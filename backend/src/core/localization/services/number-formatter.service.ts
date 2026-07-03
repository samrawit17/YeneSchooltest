import { Injectable } from '@nestjs/common';
import { Language } from '../interfaces/localization.interface';

@Injectable()
export class NumberFormatter {
  private readonly localeMap: Record<string, string> = {
    en: 'en-US',
    am: 'am-ET',
    om: 'om-ET',
    ti: 'ti-ET',
  };

  format(value: number, locale: Language = 'en'): string {
    const localeStr = this.localeMap[locale] || 'en-US';
    try {
      return new Intl.NumberFormat(localeStr).format(value);
    } catch {
      return value.toLocaleString('en-US');
    }
  }

  formatCurrency(
    value: number,
    currency: string = 'ETB',
    locale: Language = 'en',
  ): string {
    const localeStr = this.localeMap[locale] || 'en-US';
    try {
      return new Intl.NumberFormat(localeStr, {
        style: 'currency',
        currency,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  formatPercent(value: number, locale: Language = 'en'): string {
    const localeStr = this.localeMap[locale] || 'en-US';
    try {
      return new Intl.NumberFormat(localeStr, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(value / 100);
    } catch {
      return `${value.toFixed(1)}%`;
    }
  }

  formatOrdinal(value: number, locale: Language = 'en'): string {
    if (locale === 'en') {
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = value % 100;
      const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
      return `${value}${suffix}`;
    }
    return String(value);
  }
}
