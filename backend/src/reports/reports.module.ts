import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EventsModule } from '../core/events/events.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AcademicReportService } from './services/academic-report.service';
import { AttendanceReportService } from './services/attendance-report.service';
import { StudentReportService } from './services/student-report.service';
import { TeacherReportService } from './services/teacher-report.service';
import { DisciplineReportService } from './services/discipline-report.service';
import { FinanceReportService } from './services/finance-report.service';

@Module({
  imports: [PrismaModule, SubscriptionModule, EventsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    AcademicReportService,
    AttendanceReportService,
    StudentReportService,
    TeacherReportService,
    DisciplineReportService,
    FinanceReportService,
  ],
})
export class ReportsModule {}
