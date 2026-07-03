import { Language } from '../interfaces/localization.interface';
export declare const LOCALE_METADATA_KEY = "locale";
export declare const Locale: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const SetLocale: (locale: Language) => import("@nestjs/common").CustomDecorator<string>;
export declare const SupportedLocales: (...locales: Language[]) => import("@nestjs/common").CustomDecorator<string>;
