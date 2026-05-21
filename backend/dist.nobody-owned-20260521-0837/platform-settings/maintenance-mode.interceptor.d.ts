import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PlatformSettingsService } from './platform-settings.service';
export declare class MaintenanceModeInterceptor implements NestInterceptor {
    private readonly platformSettingsService;
    private readonly allowedPaths;
    constructor(platformSettingsService: PlatformSettingsService);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>>;
    private shouldSkip;
}
