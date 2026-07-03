import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { TranslationService } from '../services/translation.service';
import { LocaleResolver } from '../services/locale-resolver.service';
export declare class LocalizedExceptionFilter implements ExceptionFilter {
    private readonly translationService;
    private readonly localeResolver;
    private readonly logger;
    constructor(translationService: TranslationService, localeResolver: LocaleResolver);
    catch(exception: unknown, host: ArgumentsHost): Promise<void>;
}
