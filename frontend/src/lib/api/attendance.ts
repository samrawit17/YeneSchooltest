import api from './core';

export type AttendanceRecordStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type SessionStatus = 'NOT_SUBMITTED' | 'SUBMITTED';

export interface AttendanceRecord {
  id: string;
  attendanceSessionId: string;
  studentId: string;
  status: AttendanceRecordStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSession {
  id: string;
  timetableSlotId: string;
  date: string;
  takenBy: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  timetableSlot?: {
    id: string;
    class: { id: string; name: string; grade: number };
    section: { id: string; name: string };
    subject: { id: string; name: string; code?: string };
    teacher: { id: string; name: string };
  };
  records?: AttendanceRecord[];
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
}

export interface DailyAttendance {
  date: string;
  records: AttendanceRecord[];
  session?: AttendanceSession;
}

export const attendanceAPI = {
  getTodaySlots: (params?: { date?: string }) => api.get('/attendance/today', { params }),
  openSession: (slotId: string, date?: string) => api.post(`/attendance/session/${slotId}`, { date }),
  getSession: (sessionId: string) => api.get(`/attendance/session/${sessionId}`),
  markAttendance: (
    sessionId: string,
    data: { records: Array<{ studentId: string; status: AttendanceRecordStatus; remark?: string }> }
  ) => api.post(`/attendance/session/${sessionId}/records`, data),
  submitSession: (sessionId: string) => api.put(`/attendance/session/${sessionId}/submit`),
  getStudentsForClass: (className: string, section: string, date?: string) =>
    api.get('/attendance/students', { params: { className, section, date } }),
  getStudentsForClassById: (
    classId: string,
    className: string,
    section: string,
    date?: string,
    sectionId?: string
  ) => api.get('/attendance/students', {
    params: { classId, className, sectionId, section, date },
  }),
  getTeacherDashboard: () => api.get('/attendance/dashboard/teacher'),
  getMyAttendance: (params?: { startDate?: string; endDate?: string; month?: string }) =>
    api.get('/attendance/me', { params }),
  getMySummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/attendance/me/summary', { params }),
  getStudentDashboard: () => api.get('/attendance/dashboard/student'),
  getStudentAttendance: (
    studentId: string,
    params?: { startDate?: string; endDate?: string; month?: string; academicYear?: string }
  ) => api.get(`/attendance/student/${studentId}`, { params }),
  getStudentSummary: (studentId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/attendance/student/${studentId}/summary`, { params }),
  getParentDashboard: (studentId: string) => api.get(`/attendance/dashboard/parent/${studentId}`),
  getAllSessions: (params?: {
    startDate?: string;
    endDate?: string;
    classId?: string;
    status?: 'DRAFT' | 'SUBMITTED';
    grade?: string;
    section?: string;
  }) => api.get('/attendance/sessions', { params }),
  overrideRecord: (recordId: string, data: { status: AttendanceRecordStatus; remark: string }) =>
    api.put(`/attendance/record/${recordId}`, data),
  getSummary: (params?: { academicYearId?: string; classId?: string }) =>
    api.get('/attendance/summary', { params }),
  getMissing: (params: { date: string; grade?: string; section?: string }) =>
    api.get('/attendance/missing', { params }),
  notifyMissingAttendance: (params: { date: string }) =>
    api.post('/attendance/missing/notify', {}, { params }),
  checkReminders: () => api.post('/attendance/check-reminders'),
  getAdminDashboard: (params?: { date?: string; grade?: string; section?: string; range?: string }) =>
    api.get('/attendance/dashboard/admin', { params }),
  getAttendanceSummary: (params?: {
    academicYearId?: string;
    termId?: string;
    classId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/attendance/summary', { params }),
  getAttendanceByDate: (params: { startDate: string; endDate?: string; classId?: string }) =>
    api.get('/attendance/by-date', { params }),
  getGradesReport: (params?: { academicYear?: string; termId?: string; classId?: string }) =>
    api.get('/grading/registrar/reports/subject', { params }),
};
