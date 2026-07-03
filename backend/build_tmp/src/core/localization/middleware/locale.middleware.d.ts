import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LocaleResolver } from '../services/locale-resolver.service';
export declare class LocaleMiddleware implements NestMiddleware {
    private readonly localeResolver;
    private readonly logger;
    constructor(localeResolver: LocaleResolver);
    use(request: Request, _response: Response, next: NextFunction): Promise<void>;
}
