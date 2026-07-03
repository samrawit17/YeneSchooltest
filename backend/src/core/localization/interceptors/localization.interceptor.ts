import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Language, LocalizedResponse } from '../interfaces/localization.interface';

@Injectable()
export class LocalizationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const locale: Language = request.locale || 'en';

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return { ...data, locale } as LocalizedResponse;
        }
        return data;
      }),
    );
  }
}
