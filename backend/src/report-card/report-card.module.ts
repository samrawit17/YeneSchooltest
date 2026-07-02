import { Module } from '@nestjs/common';
import { ReportCardController } from './report-card.controller';
import { PromotionController } from './promotion.controller';
import { ReportCardService } from './report-card.service';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [NotificationModule, SubscriptionModule, StorageModule],
  controllers: [ReportCardController, PromotionController],
  providers: [ReportCardService],
  exports: [ReportCardService],
})
export class ReportCardModule {}
