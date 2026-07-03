import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Language, SUPPORTED_LANGUAGES } from '../interfaces/localization.interface';

export const LOCALE_METADATA_KEY = 'locale';

export const Locale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Language => {
    const request = ctx.switchToHttp().getRequest();
    return request.locale || 'en';
  },
);

export const SetLocale = (locale: Language) => SetMetadata(LOCALE_METADATA_KEY, locale);

export const SupportedLocales = (...locales: Language[]) =>
  SetMetadata('supported_locales', locales.length > 0 ? locales : SUPPORTED_LANGUAGES);
