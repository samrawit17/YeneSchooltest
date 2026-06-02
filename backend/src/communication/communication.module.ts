import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, NotificationModule, SubscriptionModule],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
