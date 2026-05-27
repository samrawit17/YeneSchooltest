import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { SeatingController } from './seating.controller';
import { SeatingService } from './seating.service';
import { NationalExamResultsController } from './national-exam-results.controller';
import { NationalExamResultsService } from './national-exam-results.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [ExamsController, SeatingController, NationalExamResultsController],
  providers: [ExamsService, SeatingService, NationalExamResultsService],
  exports: [ExamsService, SeatingService, NationalExamResultsService],
})
export class ExamsModule {}
