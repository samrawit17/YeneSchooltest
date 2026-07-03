import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LocaleResolver } from '../services/locale-resolver.service';
import { Language } from '../interfaces/localization.interface';

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LocaleMiddleware.name);

  constructor(private readonly localeResolver: LocaleResolver) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (request as any).user?.id;
      const schoolId = (request as any).user?.schoolId || (request as any).schoolId;

      const locale = await this.localeResolver.resolveFromRequest(request, schoolId, userId);
      (request as any).locale = locale;
    } catch {
      (request as any).locale = 'en' as Language;
    }

    next();
  }
}
