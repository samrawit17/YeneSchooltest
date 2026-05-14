import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Role } from '../auth/types/role.enum';
import { PlatformSettingsService } from './platform-settings.service';

type AuthenticatedRequest = Request & {
  user?: {
    role?: Role | string;
  };
};

@Injectable()
export class MaintenanceModeInterceptor implements NestInterceptor {
  private readonly allowedPaths = [
    '/auth/login',
    '/auth/logout',
    '/auth/me',
    '/platform/settings',
    '/platform/settings/flags',
  ];

  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (this.shouldSkip(request)) {
      return next.handle();
    }

    const maintenanceMode =
      await this.platformSettingsService.isMaintenanceModeEnabled();

    if (
      maintenanceMode &&
      request.user?.role &&
      request.user.role !== Role.SUPER_ADMIN
    ) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'The platform is currently under maintenance. Please try again later.',
          error: 'Service Unavailable',
          code: 'MAINTENANCE_MODE',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return next.handle();
  }

  private shouldSkip(request: AuthenticatedRequest): boolean {
    const path = request.path || request.originalUrl || request.url || '';

    if (request.user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    return this.allowedPaths.some(
      (allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`),
    );
  }
}
