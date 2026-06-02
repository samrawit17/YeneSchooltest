import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [NotificationModule, SubscriptionModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
