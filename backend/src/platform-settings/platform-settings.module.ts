import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MaintenanceModeInterceptor } from './maintenance-mode.interceptor';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';

@Module({
  controllers: [PlatformSettingsController],
  providers: [
    PlatformSettingsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MaintenanceModeInterceptor,
    },
  ],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
