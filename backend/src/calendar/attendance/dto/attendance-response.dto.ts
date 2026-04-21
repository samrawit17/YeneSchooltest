export class AttendanceSessionResponseDto {
  id: string;
  schoolId: string;
  timetableSlotId: string;
  date: Date;
  status: string;
  takenById: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Additional fields
  className?: string;
  sectionName?: string;
  subjectName?: string;
  teacherName?: string;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
}

export class AttendanceRecordResponseDto {
  id: string;
  schoolId: string;
  attendanceSessionId: string;
  studentId: string;
  status: string;
  remark?: string;
  overriddenById?: string;
  overriddenAt?: Date;
  originalStatus?: string;
  overrideReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Additional fields
  studentName?: string;
  studentCode?: string;
  rollNumber?: string;
}

export class StudentAttendanceSummaryDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendancePercentage: number;
}

export class DailyAttendanceDto {
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
  sessions: AttendanceSessionResponseDto[];
}

export class AttendanceDashboardDto {
  todayAttendance: DailyAttendanceDto;
  pendingSessions: AttendanceSessionResponseDto[];
  weeklyStats: {
    date: string;
    percentage: number;
  }[];
  recentAbsences: AttendanceRecordResponseDto[];
}
