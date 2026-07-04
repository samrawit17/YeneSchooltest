import { Injectable } from '@nestjs/common';
import { AcademicReportService } from './services/academic-report.service';
import { AttendanceReportService } from './services/attendance-report.service';
import { StudentReportService } from './services/student-report.service';
import { TeacherReportService } from './services/teacher-report.service';
import { DisciplineReportService } from './services/discipline-report.service';
import { FinanceReportService } from './services/finance-report.service';

@Injectable()
export class ReportsService {
  constructor(
    readonly academic: AcademicReportService,
    readonly attendance: AttendanceReportService,
    readonly student: StudentReportService,
    readonly teacher: TeacherReportService,
    readonly discipline: DisciplineReportService,
    readonly finance: FinanceReportService,
  ) {}
}
