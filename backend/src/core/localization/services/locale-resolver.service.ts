import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../interfaces/localization.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LocaleResolver {
  private readonly logger = new Logger(LocaleResolver.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveFromRequest(request: Request, schoolId?: string, userId?: string): Promise<Language> {
    const headerLocale = this.fromHeader(request);
    if (headerLocale && !schoolId && !userId) return headerLocale;

    const userLocale = userId ? await this.fromUser(userId) : null;

    const schoolLocale = schoolId ? await this.fromSchool(schoolId) : null;

    const priority: Array<{ value: Language | null; source: string }> = [
      { value: userLocale, source: 'user' },
      { value: headerLocale, source: 'header' },
      { value: schoolLocale, source: 'school' },
    ];

    for (const candidate of priority) {
      if (candidate.value && SUPPORTED_LANGUAGES.includes(candidate.value)) {
        this.logger.debug(`Resolved locale ${candidate.value} from ${candidate.source}`);
        return candidate.value;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  async resolve(schoolId?: string, userId?: string): Promise<Language> {
    if (userId) {
      const userLocale = await this.fromUser(userId);
      if (userLocale) return userLocale;
    }
    if (schoolId) {
      const schoolLocale = await this.fromSchool(schoolId);
      if (schoolLocale) return schoolLocale;
    }
    return DEFAULT_LANGUAGE;
  }

  private fromHeader(request: Request): Language | null {
    const explicit = request?.headers?.['x-locale'] as string | undefined;
    if (explicit && SUPPORTED_LANGUAGES.includes(explicit as Language)) {
      return explicit as Language;
    }

    const acceptLanguage = request?.headers?.['accept-language'];
    if (acceptLanguage) {
      const primary = String(acceptLanguage).split(',')[0]?.split('-')[0]?.trim().toLowerCase();
      if (primary && SUPPORTED_LANGUAGES.includes(primary as Language)) {
        return primary as Language;
      }
    }

    return null;
  }

  private async fromUser(userId: string): Promise<Language | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { language: true },
      });
      if (user?.language && SUPPORTED_LANGUAGES.includes(user.language as Language)) {
        return user.language as Language;
      }
    } catch {
      this.logger.warn(`Failed to fetch language for user ${userId}`);
    }
    return null;
  }

  async fromSchool(schoolId: string): Promise<Language | null> {
    try {
      const settings = await this.prisma.schoolSettings.findUnique({
        where: { schoolId },
        select: { defaultLanguage: true },
      });
      if (settings?.defaultLanguage && SUPPORTED_LANGUAGES.includes(settings.defaultLanguage as Language)) {
        return settings.defaultLanguage as Language;
      }

      const setting = await this.prisma.schoolSetting.findFirst({
        where: { schoolId, key: 'default_language' },
      });
      if (setting?.value && SUPPORTED_LANGUAGES.includes(setting.value as Language)) {
        return setting.value as Language;
      }
    } catch {
      this.logger.warn(`Failed to fetch language for school ${schoolId}`);
    }
    return null;
  }

  validateLocale(locale: string): locale is Language {
    return SUPPORTED_LANGUAGES.includes(locale as Language);
  }

  normalizeLocale(locale: string): Language {
    const normalized = locale.toLowerCase().trim();
    if (SUPPORTED_LANGUAGES.includes(normalized as Language)) {
      return normalized as Language;
    }
    if (normalized.startsWith('en')) return 'en';
    if (normalized.startsWith('am')) return 'am';
    if (normalized.startsWith('om')) return 'om';
    if (normalized.startsWith('so')) return 'so';
    if (normalized.startsWith('ar')) return 'ar';
    return DEFAULT_LANGUAGE;
  }
}
