import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { DiscountPolicyModule } from '../discount-policy/discount-policy.module';
import { FeeEventListener } from './fee-event.listener';

@Module({
  imports: [NotificationModule, SubscriptionModule, DiscountPolicyModule],
  controllers: [FinanceController],
  providers: [FinanceService, PrismaService, FeeEventListener],
})
export class FinanceModule {}
