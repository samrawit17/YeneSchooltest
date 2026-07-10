import { Injectable } from '@nestjs/common';
import { Language } from '../interfaces/localization.interface';

interface LocaleDateFormat {
  short: Intl.DateTimeFormatOptions;
  medium: Intl.DateTimeFormatOptions;
  long: Intl.DateTimeFormatOptions;
  time: Intl.DateTimeFormatOptions;
  datetime: Intl.DateTimeFormatOptions;
}

const DATE_FORMATS: Record<string, LocaleDateFormat> = {
  en: {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
  am: {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
  om: {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
  so: {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
  ar: {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
  ti: {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
};

type CalendarSystem = 'gregorian' | 'ethiopian';

@Injectable()
export class DateFormatter {
  private readonly localeMap: Record<string, string> = {
    en: 'en-US',
    am: 'am-ET',
    om: 'om-ET',
    so: 'so-SO',
    ar: 'ar-SA',
    ti: 'ti-ET',
  };

  format(
    date: Date | string | number,
    formatType: keyof LocaleDateFormat = 'medium',
    locale: Language = 'en',
    calendar: CalendarSystem = 'gregorian',
  ): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const localeStr = this.localeMap[locale] || 'en-US';
    const options: Intl.DateTimeFormatOptions = {
      ...DATE_FORMATS[locale]?.[formatType] || DATE_FORMATS.en[formatType],
      calendar,
    };

    try {
      return new Intl.DateTimeFormat(localeStr, options).format(d);
    } catch {
      return d.toLocaleDateString('en-US', DATE_FORMATS.en[formatType]);
    }
  }

  formatRelative(date: Date, locale: Language = 'en'): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const relativeLabels: Record<string, { justNow: string; mAgo: string; hAgo: string; dAgo: string }> = {
      en: { justNow: 'just now', mAgo: 'm ago', hAgo: 'h ago', dAgo: 'd ago' },
      am: { justNow: 'አሁን', mAgo: 'ደቂቃ በፊት', hAgo: 'ሰአት በፊት', dAgo: 'ቀን በፊት' },
      om: { justNow: 'amma', mAgo: 'daqiiqa dura', hAgo: 'sa\'aatii dura', dAgo: 'guyyaa dura' },
      so: { justNow: 'hadda', mAgo: 'daqiiqo kahor', hAgo: 'saacad kahor', dAgo: 'maalin kahor' },
      ar: { justNow: 'الآن', mAgo: 'دقيقة مضت', hAgo: 'ساعة مضت', dAgo: 'يوم مضت' },
    };

    const labels = relativeLabels[locale] || relativeLabels.en;

    if (diffSec < 60) return labels.justNow;
    if (diffMin < 60) return `${diffMin} ${labels.mAgo}`;
    if (diffHour < 24) return `${diffHour} ${labels.hAgo}`;
    if (diffDay < 7) return `${diffDay} ${labels.dAgo}`;
    return this.format(date, 'short', locale);
  }
}
