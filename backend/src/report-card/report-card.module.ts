import { Module } from '@nestjs/common';
import { ReportCardController } from './report-card.controller';
import { PromotionController } from './promotion.controller';
import { ReportCardService } from './report-card.service';

@Module({
  controllers: [ReportCardController, PromotionController],
  providers: [ReportCardService],
  exports: [ReportCardService],
})
export class ReportCardModule {}
