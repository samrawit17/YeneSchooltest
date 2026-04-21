import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../notification/notification.module';
import { PlatformSettingsModule } from '../../platform-settings/platform-settings.module';
import { SchoolSettingsModule } from '../../school-settings/school-settings.module';

@Module({
  imports: [
    ScheduleModule,
    PrismaModule,
    NotificationModule,
    PlatformSettingsModule,
    SchoolSettingsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
