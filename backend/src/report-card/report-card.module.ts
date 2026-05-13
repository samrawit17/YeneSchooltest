import { Module } from '@nestjs/common';
import { ReportCardController } from './report-card.controller';
import { PromotionController } from './promotion.controller';
import { ReportCardService } from './report-card.service';
import { NotificationModule } from '../notification/notification.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [NotificationModule, TemplatesModule],
  controllers: [ReportCardController, PromotionController],
  providers: [ReportCardService],
  exports: [ReportCardService],
})
export class ReportCardModule {}
