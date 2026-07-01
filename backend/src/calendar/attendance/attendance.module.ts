import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceEventListener } from './attendance-event.listener';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../notification/notification.module';
import { PlatformSettingsModule } from '../../platform-settings/platform-settings.module';
import { SchoolSettingsModule } from '../../school-settings/school-settings.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    PlatformSettingsModule,
    SchoolSettingsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceEventListener],
  exports: [AttendanceService],
})
export class AttendanceModule {}
