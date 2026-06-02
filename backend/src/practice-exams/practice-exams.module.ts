import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PracticeExamsController } from './practice-exams.controller';
import { PracticeExamsService } from './practice-exams.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [PracticeExamsController],
  providers: [PracticeExamsService],
  exports: [PracticeExamsService],
})
export class PracticeExamsModule {}
