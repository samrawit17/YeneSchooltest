import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { PrismaService } from './prisma/prisma.service';
import { SchoolModule } from './school/school.module';
import { StudentModule } from './student/student.module';
import { RegistrarModule } from './registrar/registrar.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { SchoolSettingsModule } from './school-settings/school-settings.module';
import { ClassModule } from './class/class.module';
import { SectionModule } from './section/section.module';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { TermModule } from './term/term.module';
import { TimetableSlotModule } from './timetable-slot/timetable-slot.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ClassSubjectModule } from './class-subject/class-subject.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ParentModule } from './parent/parent.module';
import { AttendanceModule } from './calendar/attendance/attendance.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { BulkUploadModule } from './bulk-upload/bulk-upload.module';
import { NotificationModule } from './notification/notification.module';
import { CommunicationModule } from './communication/communication.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { EventModule } from './event/event.module';
import { TeacherModule } from './teacher/teacher.module';
import { LessonModule } from './lesson/lesson.module';
import { LeaveRequestModule } from './leave-request/leave-request.module';
import { HrModule } from './hr/hr.module';
import { FinanceModule } from './finance/finance.module';
import { GradingModule } from './grading/grading.module';
import { CalendarModule } from './calendar/calendar.module';
import { MessagingModule } from './messaging/messaging.module';
import { ExamsModule } from './exams/exams.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { SearchModule } from './search/search.module';
import { SyncModule } from './sync/sync.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ReportCardModule } from './report-card/report-card.module';
import { DisciplineModule } from './discipline/discipline.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    InfrastructureModule,
    AuthModule,
    RbacModule,
    SchoolModule,
    StudentModule,
    RegistrarModule,
    PlatformSettingsModule,
    SchoolSettingsModule,
    ClassModule,
    SectionModule,
    AcademicYearModule,
    TermModule,
    TimetableSlotModule,
    SubjectsModule,
    ClassSubjectModule,
    DashboardModule,
    ParentModule,
    AttendanceModule,
    EnrollmentModule,
    BulkUploadModule,
    NotificationModule,
    CommunicationModule,
    AnnouncementModule,
    EventModule,
    TeacherModule,
    LessonModule,
    LeaveRequestModule,
    HrModule,
    FinanceModule,
    GradingModule,
    AssessmentsModule,
    CalendarModule,
    MessagingModule,
    ExamsModule,
    SearchModule,
    SyncModule,
    SubscriptionModule,
    ReportCardModule,
    DisciplineModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
