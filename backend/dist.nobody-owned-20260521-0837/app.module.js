"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const rbac_module_1 = require("./rbac/rbac.module");
const prisma_module_1 = require("./prisma/prisma.module");
const school_module_1 = require("./school/school.module");
const student_module_1 = require("./student/student.module");
const registrar_module_1 = require("./registrar/registrar.module");
const platform_settings_module_1 = require("./platform-settings/platform-settings.module");
const school_settings_module_1 = require("./school-settings/school-settings.module");
const class_module_1 = require("./class/class.module");
const section_module_1 = require("./section/section.module");
const academic_year_module_1 = require("./academic-year/academic-year.module");
const timetable_slot_module_1 = require("./timetable-slot/timetable-slot.module");
const subjects_module_1 = require("./subjects/subjects.module");
const class_subject_module_1 = require("./class-subject/class-subject.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const parent_module_1 = require("./parent/parent.module");
const attendance_module_1 = require("./calendar/attendance/attendance.module");
const enrollment_module_1 = require("./enrollment/enrollment.module");
const bulk_upload_module_1 = require("./bulk-upload/bulk-upload.module");
const notification_module_1 = require("./notification/notification.module");
const communication_module_1 = require("./communication/communication.module");
const announcement_module_1 = require("./announcement/announcement.module");
const event_module_1 = require("./event/event.module");
const teacher_module_1 = require("./teacher/teacher.module");
const lesson_module_1 = require("./lesson/lesson.module");
const finance_module_1 = require("./finance/finance.module");
const grading_module_1 = require("./grading/grading.module");
const calendar_module_1 = require("./calendar/calendar.module");
const messaging_module_1 = require("./messaging/messaging.module");
const exams_module_1 = require("./exams/exams.module");
const assessments_module_1 = require("./assessments/assessments.module");
const search_module_1 = require("./search/search.module");
const sync_module_1 = require("./sync/sync.module");
const infrastructure_module_1 = require("./infrastructure/infrastructure.module");
const subscription_module_1 = require("./subscription/subscription.module");
const report_card_module_1 = require("./report-card/report-card.module");
const discipline_module_1 = require("./discipline/discipline.module");
const siren_module_1 = require("./siren/siren.module");
const period_time_module_1 = require("./period-time/period-time.module");
const templates_module_1 = require("./templates/templates.module");
const data_quality_module_1 = require("./data-quality/data-quality.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            infrastructure_module_1.InfrastructureModule,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            rbac_module_1.RbacModule,
            school_module_1.SchoolModule,
            student_module_1.StudentModule,
            registrar_module_1.RegistrarModule,
            platform_settings_module_1.PlatformSettingsModule,
            school_settings_module_1.SchoolSettingsModule,
            class_module_1.ClassModule,
            section_module_1.SectionModule,
            academic_year_module_1.AcademicYearModule,
            timetable_slot_module_1.TimetableSlotModule,
            subjects_module_1.SubjectsModule,
            class_subject_module_1.ClassSubjectModule,
            dashboard_module_1.DashboardModule,
            parent_module_1.ParentModule,
            attendance_module_1.AttendanceModule,
            enrollment_module_1.EnrollmentModule,
            bulk_upload_module_1.BulkUploadModule,
            notification_module_1.NotificationModule,
            communication_module_1.CommunicationModule,
            announcement_module_1.AnnouncementModule,
            event_module_1.EventModule,
            teacher_module_1.TeacherModule,
            lesson_module_1.LessonModule,
            finance_module_1.FinanceModule,
            grading_module_1.GradingModule,
            assessments_module_1.AssessmentsModule,
            calendar_module_1.CalendarModule,
            messaging_module_1.MessagingModule,
            exams_module_1.ExamsModule,
            search_module_1.SearchModule,
            sync_module_1.SyncModule,
            subscription_module_1.SubscriptionModule,
            report_card_module_1.ReportCardModule,
            discipline_module_1.DisciplineModule,
            siren_module_1.SirenModule,
            period_time_module_1.PeriodTimeModule,
            templates_module_1.TemplatesModule,
            data_quality_module_1.DataQualityModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map