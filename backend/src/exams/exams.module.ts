import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { SeatingController } from './seating.controller';
import { SeatingService } from './seating.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [ExamsController, SeatingController],
  providers: [ExamsService, SeatingService],
  exports: [ExamsService, SeatingService],
})
export class ExamsModule {}
