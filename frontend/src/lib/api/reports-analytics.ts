import api from './core';

export const reportsAPI = {
  academic: {
    performance: (params?: Record<string, any>) =>
      api.get('/reports/academic/performance', { params }),
    examResults: (params?: Record<string, any>) =>
      api.get('/reports/academic/exam-results', { params }),
    assessmentScores: (params?: Record<string, any>) =>
      api.get('/reports/academic/assessment-scores', { params }),
    reportCards: (params?: Record<string, any>) =>
      api.get('/reports/academic/report-cards', { params }),
  },
  attendance: {
    summary: (params?: Record<string, any>) =>
      api.get('/reports/attendance/summary', { params }),
    trends: (params?: Record<string, any>) =>
      api.get('/reports/attendance/trends', { params }),
  },
  student: {
    demographics: (params?: Record<string, any>) =>
      api.get('/reports/student/demographics', { params }),
    enrollmentTrends: (params?: Record<string, any>) =>
      api.get('/reports/student/enrollment-trends', { params }),
    detail: (id: string) =>
      api.get(`/reports/student/${id}`),
  },
  teacher: {
    performance: (params?: Record<string, any>) =>
      api.get('/reports/teacher/performance', { params }),
    leaderboard: (schoolId?: string) =>
      api.get('/reports/teacher/leaderboard', { params: { schoolId } }),
  },
  discipline: {
    incidents: (params?: Record<string, any>) =>
      api.get('/reports/discipline/incidents', { params }),
    trends: (params?: Record<string, any>) =>
      api.get('/reports/discipline/trends', { params }),
  },
  finance: {
    daily: (params?: Record<string, any>) =>
      api.get('/reports/finance/daily', { params }),
    monthly: (params?: Record<string, any>) =>
      api.get('/reports/finance/monthly', { params }),
    outstanding: (params?: Record<string, any>) =>
      api.get('/reports/finance/outstanding', { params }),
    overdue: (params?: Record<string, any>) =>
      api.get('/reports/finance/overdue', { params }),
  },
};

export const analyticsAPI = {
  rankings: {
    students: (params?: Record<string, any>) =>
      api.get('/analytics/rankings/students', { params }),
    classes: (params?: Record<string, any>) =>
      api.get('/analytics/rankings/classes', { params }),
    studentHistory: (id: string) =>
      api.get(`/analytics/rankings/student/${id}/history`),
  },
  advanced: {
    performanceTrends: (params?: Record<string, any>) =>
      api.get('/analytics/performance-trends', { params }),
    attendanceAnalytics: (params?: Record<string, any>) =>
      api.get('/analytics/attendance-analytics', { params }),
    financialAnalytics: (params?: Record<string, any>) =>
      api.get('/analytics/financial-analytics', { params }),
    schoolOverview: (schoolId?: string) =>
      api.get('/analytics/school-overview', { params: { schoolId } }),
  },
};
