import { Module } from '@nestjs/common';
import { PeriodTimeService } from './period-time.service';
import { PeriodTimeController } from './period-time.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PeriodTimeController],
  providers: [PeriodTimeService],
})
export class PeriodTimeModule {}