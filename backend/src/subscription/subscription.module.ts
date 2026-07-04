import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGuard, MinimumTierGuard } from './guards/subscription.guard';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';

@Module({
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionGuard,
    MinimumTierGuard,
    SubscriptionSchedulerService,
  ],
  exports: [SubscriptionService, SubscriptionGuard, MinimumTierGuard],
})
export class SubscriptionModule {}
