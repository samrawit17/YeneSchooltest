import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PracticeExamsController } from './practice-exams.controller';
import { PracticeExamsService } from './practice-exams.service';

@Module({
  imports: [PrismaModule],
  controllers: [PracticeExamsController],
  providers: [PracticeExamsService],
  exports: [PracticeExamsService],
})
export class PracticeExamsModule {}
