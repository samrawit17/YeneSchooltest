import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { EventsModule } from '../core/events/events.module';

@Module({
  imports: [PrismaModule, SubscriptionModule, EventsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
