"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceDashboardDto = exports.DailyAttendanceDto = exports.StudentAttendanceSummaryDto = exports.AttendanceRecordResponseDto = exports.AttendanceSessionResponseDto = void 0;
class AttendanceSessionResponseDto {
    id;
    schoolId;
    timetableSlotId;
    date;
    status;
    takenById;
    submittedAt;
    createdAt;
    updatedAt;
    className;
    sectionName;
    subjectName;
    teacherName;
    totalStudents;
    presentCount;
    absentCount;
    lateCount;
}
exports.AttendanceSessionResponseDto = AttendanceSessionResponseDto;
class AttendanceRecordResponseDto {
    id;
    schoolId;
    attendanceSessionId;
    studentId;
    status;
    remark;
    overriddenById;
    overriddenAt;
    originalStatus;
    overrideReason;
    createdAt;
    updatedAt;
    studentName;
    studentCode;
    rollNumber;
}
exports.AttendanceRecordResponseDto = AttendanceRecordResponseDto;
class StudentAttendanceSummaryDto {
    studentId;
    studentName;
    studentCode;
    totalDays;
    presentDays;
    absentDays;
    lateDays;
    excusedDays;
    attendancePercentage;
}
exports.StudentAttendanceSummaryDto = StudentAttendanceSummaryDto;
class DailyAttendanceDto {
    date;
    totalStudents;
    presentCount;
    absentCount;
    lateCount;
    attendancePercentage;
    sessions;
}
exports.DailyAttendanceDto = DailyAttendanceDto;
class AttendanceDashboardDto {
    todayAttendance;
    pendingSessions;
    weeklyStats;
    recentAbsences;
}
exports.AttendanceDashboardDto = AttendanceDashboardDto;
//# sourceMappingURL=attendance-response.dto.js.map