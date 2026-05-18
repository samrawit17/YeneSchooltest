import { Module } from '@nestjs/common';
import { ReportCardController } from './report-card.controller';
import { PromotionController } from './promotion.controller';
import { ReportCardService } from './report-card.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ReportCardController, PromotionController],
  providers: [ReportCardService],
  exports: [ReportCardService],
})
export class ReportCardModule {}
