import api from './core';

type RequestOptions = {
  skipAuthErrorRedirect?: boolean;
};

const requestOptions = (options?: RequestOptions) =>
  options?.skipAuthErrorRedirect ? { skipAuthErrorRedirect: true } : {};

export const assessmentsAPI = {
  getAcademicYears: () => api.get('/academic-years'),
  list: (params?: {
    academicYearId?: string;
    termId?: string;
    type?: string;
    status?: string;
  }, options?: RequestOptions) =>
    api.get('/assessments', { params, ...requestOptions(options) }),
  getById: (id: string) => api.get(`/assessments/${id}`),
  create: (data: {
    title: string;
    type: string;
    academicYearId: string;
    termId?: string;
    startDate: string;
    endDate: string;
    addToCalendar?: boolean;
    subjects?: Array<{
      subjectId: string;
      classId: string;
      sectionId?: string;
      teacherId?: string;
      maxScore: number;
      passMark?: number;
    }>;
  }) => api.post('/assessments', data),
  update: (id: string, data: {
    title?: string;
    startDate?: string;
    endDate?: string;
    addToCalendar?: boolean;
  }) => api.put(`/assessments/${id}`, data),
  addSubjects: (id: string, data: any) => api.post(`/assessments/${id}/subjects`, data),
  clear: () => api.delete('/assessments/clear', { skipAuthErrorRedirect: true } as any),
  lock: (id: string) => api.post(`/assessments/${id}/lock`),
  getTeacherAssessments: (params?: { academicYearId?: string; termId?: string; type?: string }) =>
    api.get('/assessments/teacher/me', { params }),
  getScoreEntry: (assessmentSubjectId: string) =>
    api.get(`/assessments/subjects/${assessmentSubjectId}/score-entry`),
  saveScores: (assessmentSubjectId: string, data: any) =>
    api.post(`/assessments/subjects/${assessmentSubjectId}/scores`, data),
  getStudentUpcoming: (params?: { academicYearId?: string }) =>
    api.get('/assessments/student/upcoming', { params }),
  getStudentResults: (params?: { academicYearId?: string; termId?: string }) =>
    api.get('/assessments/student/results', { params }),
  getChildUpcoming: (childId: string, params?: { academicYearId?: string }) =>
    api.get(`/assessments/parent/child/${childId}/upcoming`, { params }),
  getChildResults: (childId: string, params?: { academicYearId?: string; termId?: string }) =>
    api.get(`/assessments/parent/child/${childId}/results`, { params }),
  getMissingMarks: (params?: { academicYearId?: string; termId?: string }) =>
    api.get('/assessments/registrar/missing-marks', { params }),
  getWeights: () => api.get('/assessments/config/weights'),
  updateWeights: (weights: Array<{ type: string; percentage: number }>) =>
    api.put('/assessments/config/weights', { weights }),
};

export const examsAPI = {
  getTeacherExams: (params?: { academicYearId?: string; termId?: string }) =>
    api.get('/exams/teacher/me', { params }),
  getAll: (params?: { academicYearId?: string; termId?: string; classId?: string }) =>
    api.get('/exams', { params }),
  publishResults: (data: { academicYear: string; termId: string; classId: string }) =>
    api.post('/exams/publish', data),
};

export const gradingAPI = {
  getTeacherAssignments: (params?: { academicYear?: string }) =>
    api.get('/grading/teacher/assignments', { params, skipAuthErrorRedirect: true }),
  getStudentFinalGrades: (params: { academicYear: string; classId?: string }) =>
    api.get('/grading/student/final-grades', {
      params,
      skipAuthErrorRedirect: true,
    }),
  getChildFinalGrades: (studentId: string, params: { academicYear: string; classId?: string }) =>
    api.get(`/grading/parent/final-grades/${studentId}`, {
      params,
      skipAuthErrorRedirect: true,
    }),
  calculateSubjectFinalGrade: (params: {
    studentId: string;
    subjectId: string;
    academicYear: string;
  }) => api.get('/grading/subject/final-grade', { params }),
  getStudentGrades: (params?: { academicYear?: string; termId?: string }) =>
    api.get('/grading/student/grades', { params }),
  getChildGrades: (studentId: string, params?: { academicYear?: string; termId?: string }) =>
    api.get(`/grading/parent/grades/${studentId}`, {
      params,
      skipAuthErrorRedirect: true,
    }),
  verifyFinancialClearance: (params: {
    studentId: string;
    academicYear: string;
    termId?: string;
    checkOverdueOnly?: boolean;
  }) =>
    api.get('/grading/student/financial-clearance', {
      params,
      skipAuthErrorRedirect: true,
    }),
  getTeacherStudents: (params: {
    academicYear: string;
    termId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  }) => api.get('/grading/teacher/students', { params, skipAuthErrorRedirect: true }),
  enterGrade: (data: any) =>
    api.post('/grading/teacher/grades', data, { skipAuthErrorRedirect: true }),
  bulkEnterGrades: (data: any) =>
    api.post('/grading/teacher/grades/bulk', data, { skipAuthErrorRedirect: true }),
  submitAllGrades: (params: {
    academicYear: string;
    termId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  }) => api.post('/grading/teacher/grades/submit-all', {}, { params, skipAuthErrorRedirect: true }),
  getGradingComponents: () =>
    api.get('/grading/admin/grading-components', { skipAuthErrorRedirect: true }),
  getAssessmentTypes: () =>
    api.get('/grading/admin/assessment-types', { skipAuthErrorRedirect: true }),
  getTeacherAssessmentTypes: () =>
    api.get('/grading/teacher/assessment-types', { skipAuthErrorRedirect: true }),
  getParentGradingComponents: () =>
    api.get('/grading/parent/grading-components', { skipAuthErrorRedirect: true }),
  saveAssessmentTypes: (data: { code: string; name: string; percentage: number }[]) =>
    api.post('/grading/admin/assessment-types', data),
  getGradesForReview: (params: { academicYear: string; termId?: string; classId?: string }) =>
    api.get('/grading/registrar/review', { params }),
  bulkApproveGrades: (gradeIds: string[]) =>
    api.post('/grading/registrar/grades/bulk-approve', { gradeIds }),
  bulkRejectGrades: (gradeIds: string[], comment: string) =>
    api.post('/grading/registrar/grades/bulk-reject', { gradeIds, comment }),
  reviewGrade: (gradeId: string, data: { status: "APPROVED" | "REJECTED"; registrarComment?: string }) =>
    api.put(`/grading/registrar/grades/${gradeId}/review`, data),
  getPublishChecklist: (params: {
    academicYear: string;
    termId?: string;
    classId?: string;
    sectionId?: string;
  }) => api.get('/grading/admin/publish-checklist', { params }),
  calculateRankings: (params: {
    academicYearId: string;
    termId?: string;
    classId?: string;
    sectionId?: string;
  }) =>
    api.post('/grading/admin/calculate-rankings', {
      academicYearId: params.academicYearId,
      termId: params.termId,
      classId: params.classId,
      sectionId: params.sectionId,
    }),
  publishResults: (data: { academicYear: string; termId: string; classId: string }) =>
    api.post('/exams/publish', data),
};
