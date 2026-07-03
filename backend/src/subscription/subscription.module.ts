import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGuard, MinimumTierGuard } from './guards/subscription.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionGuard, MinimumTierGuard],
  exports: [SubscriptionService, SubscriptionGuard, MinimumTierGuard],
})
export class SubscriptionModule {}
