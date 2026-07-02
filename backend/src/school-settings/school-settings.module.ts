import { Module } from '@nestjs/common';
import { SchoolSettingsController } from './school-settings.controller';
import { SchoolSettingsService } from './school-settings.service';
import { CredentialModule } from '../credential/credential.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [CredentialModule, SubscriptionModule, StorageModule],
  controllers: [SchoolSettingsController],
  providers: [SchoolSettingsService],
  exports: [SchoolSettingsService],
})
export class SchoolSettingsModule {}
