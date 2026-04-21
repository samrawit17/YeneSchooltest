import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { TeacherDashboardService } from './services/teacher.dashboard.service';
import { StudentDashboardService } from './services/student.dashboard.service';
import { ParentDashboardService } from './services/parent.dashboard.service';
import { AdminDashboardService } from './services/admin.dashboard.service';
import { RegistrarDashboardService } from './services/registrar.dashboard.service';
import { SuperadminDashboardService } from './services/superadmin.dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    TeacherDashboardService,
    StudentDashboardService,
    ParentDashboardService,
    AdminDashboardService,
    RegistrarDashboardService,
    SuperadminDashboardService,
  ],
  exports: [
    TeacherDashboardService,
    StudentDashboardService,
    ParentDashboardService,
    AdminDashboardService,
    RegistrarDashboardService,
    SuperadminDashboardService,
  ],
})
export class DashboardModule {}
