import { Module } from '@nestjs/common';
import { SchoolSettingsController } from './school-settings.controller';
import { SchoolSettingsService } from './school-settings.service';
import { CredentialModule } from '../credential/credential.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [CredentialModule, SubscriptionModule],
  controllers: [SchoolSettingsController],
  providers: [SchoolSettingsService],
  exports: [SchoolSettingsService],
})
export class SchoolSettingsModule {}
