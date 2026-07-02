import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { InAppNotificationProvider } from './providers/in-app.provider';
import { PushNotificationProvider } from './providers/push.provider';
import { EmailNotificationProvider } from './providers/email.provider';
import { SMSNotificationProvider } from './providers/sms.provider';
import { NotificationChannelRouter } from './providers/channel-router.service';
import { ProviderConfigService } from './providers/provider-config.service';

@Module({
  imports: [PrismaModule, PlatformSettingsModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    InAppNotificationProvider,
    PushNotificationProvider,
    EmailNotificationProvider,
    SMSNotificationProvider,
    NotificationChannelRouter,
    ProviderConfigService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
