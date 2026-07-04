import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { StudentRankingService } from './services/student-ranking.service';
import { AdvancedAnalyticsService } from './services/advanced-analytics.service';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    StudentRankingService,
    AdvancedAnalyticsService,
  ],
})
export class AnalyticsModule {}
