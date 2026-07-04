import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @IsString()
  schoolId: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv';
}

export class PerformanceReportQuery extends ReportQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  gradeLevelId?: string;
}

export class AttendanceReportQuery extends ReportQueryDto {
  @IsOptional()
  @IsString()
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @IsOptional()
  @IsString()
  groupBy?: 'daily' | 'weekly' | 'monthly' | 'termly';
}

export class FinanceReportQuery extends ReportQueryDto {
  @IsOptional()
  @IsString()
  includeOutstanding?: string;

  @IsOptional()
  @IsString()
  calendarType?: 'ETHIOPIAN' | 'GREGORIAN';
}

export interface ReportSummary {
  total: number;
  count: number;
  period?: { from: string; to: string };
}

export interface AcademicPerformanceRow {
  studentId: string;
  studentName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  subjectCode: string | null;
  score: number | null;
  maxScore: number;
  percentage: number;
  gradeLetter: string | null;
  gradePoint: number | null;
  status: string;
  teacherName: string;
}

export interface AttendanceSummaryRow {
  studentId: string;
  studentName: string;
  className: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number;
}

export interface StudentDemographicsRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  gender: string | null;
  className: string;
  sectionName: string;
  enrollmentStatus: string;
  academicYear: string;
  parentName: string | null;
  parentPhone: string | null;
}

export interface TeacherPerformanceRow {
  teacherId: string;
  teacherName: string;
  employeeId: string;
  department: string | null;
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  averageScore: number;
  gradingRate: number;
}

export interface DisciplineSummaryRow {
  incidentId: string;
  studentId: string;
  studentName: string;
  className: string;
  incidentDate: Date;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  actionTaken: string | null;
  reportedByName: string;
}

export interface PaginatedReportResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: ReportSummary;
}
