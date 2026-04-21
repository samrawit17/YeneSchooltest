import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [SchoolSettingsModule, AttendanceModule],
  providers: [CalendarService],
  controllers: [CalendarController],
  exports: [CalendarService, AttendanceModule],
})
export class CalendarModule {}
