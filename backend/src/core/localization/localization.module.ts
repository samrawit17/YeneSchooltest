import { Module, Global, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LocaleResolver } from './services/locale-resolver.service';
import { TranslationService } from './services/translation.service';
import { MessageFormatter } from './services/message-formatter.service';
import { DateFormatter } from './services/date-formatter.service';
import { NumberFormatter } from './services/number-formatter.service';
import { PluralizationService } from './services/pluralization.service';
import { TemplateRenderer } from './services/template-renderer.service';
import { FileTranslationLoader } from './loaders/file-loader.service';
import { InMemoryTranslationCache } from './cache/translation-cache.service';
import { FallbackManager } from './fallback/fallback-manager.service';
import { LocalizedExceptionFilter } from './filters/localized-exception.filter';
import { LocalizationInterceptor } from './interceptors/localization.interceptor';
import { LocaleMiddleware } from './middleware/locale.middleware';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    LocaleResolver,
    TranslationService,
    MessageFormatter,
    DateFormatter,
    NumberFormatter,
    PluralizationService,
    TemplateRenderer,
    FileTranslationLoader,
    InMemoryTranslationCache,
    FallbackManager,
    LocalizedExceptionFilter,
    LocalizationInterceptor,
  ],
  exports: [
    LocaleResolver,
    TranslationService,
    MessageFormatter,
    DateFormatter,
    NumberFormatter,
    PluralizationService,
    TemplateRenderer,
    FileTranslationLoader,
    InMemoryTranslationCache,
    FallbackManager,
    LocalizedExceptionFilter,
    LocalizationInterceptor,
  ],
})
export class LocalizationModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LocaleMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
