import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [PlatformSettingsModule],
  providers: [StorageService, LocalStorageProvider],
  exports: [StorageService],
})
export class StorageModule {}