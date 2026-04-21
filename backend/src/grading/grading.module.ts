import { Module } from '@nestjs/common';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AcademicYearModule } from '../academic-year/academic-year.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, AcademicYearModule, NotificationModule],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
