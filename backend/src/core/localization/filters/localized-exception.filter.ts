import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LocalizedException } from '../exceptions/localized-exception';
import { TranslationService } from '../services/translation.service';
import { LocaleResolver } from '../services/locale-resolver.service';
import { Language, DEFAULT_LANGUAGE } from '../interfaces/localization.interface';

@Catch()
export class LocalizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LocalizedExceptionFilter.name);

  constructor(
    private readonly translationService: TranslationService,
    private readonly localeResolver: LocaleResolver,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const locale: Language = (request as any).locale || DEFAULT_LANGUAGE;

    if (exception instanceof LocalizedException) {
      const message = await this.translationService.translate(
        exception.localizationKey,
        locale,
        exception.localizationParams,
      );

      response.status(exception.getStatus()).json({
        success: false,
        key: exception.localizationKey,
        message,
        params: exception.localizationParams,
        locale,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message as string;

      const validationMessages = Array.isArray(message) ? message : [message];
      const translatedMessages = await Promise.all(
        validationMessages.map(async (msg) => {
          if (typeof msg === 'string' && msg.includes('.')) {
            const translated = await this.translationService.translate(msg, locale).catch(() => null);
            return translated || msg;
          }
          return msg;
        }),
      );

      response.status(status).json({
        success: false,
        message: translatedMessages.length === 1 ? translatedMessages[0] : translatedMessages,
        locale,
      });
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));

    response.status(500).json({
      success: false,
      message: 'Internal server error',
      locale,
    });
  }
}
