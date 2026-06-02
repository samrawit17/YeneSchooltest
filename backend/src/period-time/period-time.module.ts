import { Module } from '@nestjs/common';
import { PeriodTimeService } from './period-time.service';
import { PeriodTimeController } from './period-time.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [PeriodTimeController],
  providers: [PeriodTimeService],
})
export class PeriodTimeModule {}
