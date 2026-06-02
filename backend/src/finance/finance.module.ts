import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [NotificationModule, SubscriptionModule],
  controllers: [FinanceController],
  providers: [FinanceService, PrismaService],
})
export class FinanceModule {}
