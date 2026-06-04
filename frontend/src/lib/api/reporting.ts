import api from "./core";

export type ReportCardStatus = "DRAFT" | "PUBLISHED";

export interface ReportCard {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  term: string;
  status: ReportCardStatus;
  totalMarks: number | null;
  percentage: number | null;
  overallGrade: string | null;
  rank: number | null;
  rankInClass: number | null;
  totalDays: number | null;
  presentDays: number | null;
  absentDays: number | null;
  attendancePercentage: number | null;
  teacherRemarks: string | null;
  principalRemarks: string | null;
  internalRemarks?: string | null;
  gradeDetails: GradeDetail[];
  coCurricular: string | null;
  behavior: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; name: string; avatarUrl?: string };
  class?: { id: string; name: string; section: string; grade: number | null };
  generatedBy?: { id: string; name: string };
}

export interface GradeDetail {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  assessmentBreakdown?: Array<{
    assessmentSubjectId: string;
    assessmentId?: string;
    title: string;
    type: string;
    maxScore: number;
    score: number | null;
    isAbsent?: boolean;
    status: string;
    remarks?: string | null;
    startDate?: string;
    endDate?: string;
  }>;
  caScore: number | null;
  midScore: number | null;
  finalScore: number | null;
  totalScore: number;
  gradeLetter: string;
  gradePoint: number;
  status: string;
}

export interface PromotionCandidate {
  student: { id: string; name: string; avatarUrl?: string; rollNumber?: string | null };
  status: "PROMOTED" | "RETAINED" | "NO_DATA";
  reasons?: string[];
  averageGrade: number;
  attendance: number;
  overallGrade?: string;
  reportCardId?: string;
}

export interface ReportPublishSummaryRow {
  classId: string;
  className: string;
  grade: number | null;
  sectionName: string | null;
  expectedEntries: number;
  generatedEntries: number;
  publishedEntries: number;
  draftEntries: number;
  missingEntries: number;
  incompleteEntries: number;
  assessmentSubjects: number;
  assessmentExpectedScores: number;
  assessmentEnteredScores: number;
  assessmentMissingScores: number;
  rankingEntries: number;
  rankingMissingEntries: number;
  rankingMode: "auto_on_publish";
  certificateReady: boolean;
  certificateIssue: string | null;
  issueReasons: string[];
  status: "published" | "ready" | "has_issues" | "no_students";
}

export interface ParentPresentationReport {
  generatedAt: string;
  school: { id: string; name: string; address?: string | null; phone?: string | null } | null;
  academicYear: { id: string; name: string };
  fromTerm: { id: string; name: string };
  toTerm: { id: string; name: string };
  summary: {
    from: { students: number; average: number | null; attendance: number | null; passRate: number | null };
    to: { students: number; average: number | null; attendance: number | null; passRate: number | null };
    averageChange: number | null;
    attendanceChange: number | null;
  };
  classSummaries: Array<{
    classId: string;
    className: string;
    grade: number | null;
    sectionName: string | null;
    fromAverage: number | null;
    toAverage: number | null;
    change: number | null;
    fromAttendance: number | null;
    toAttendance: number | null;
    attendanceChange: number | null;
    fromStudents: number;
    toStudents: number;
    passRate: number | null;
  }>;
  subjectSummaries: Array<{
    subjectId: string;
    subjectName: string;
    fromAverage: number | null;
    toAverage: number | null;
    change: number | null;
  }>;
  insights: {
    improvedClasses: ParentPresentationReport["classSummaries"];
    decliningClasses: ParentPresentationReport["classSummaries"];
    weakSubjects: ParentPresentationReport["subjectSummaries"];
    improvedSubjects: ParentPresentationReport["subjectSummaries"];
  };
}

export const reportCardsAPI = {
  getAll: (params?: {
    classId?: string;
    academicYear?: string;
    term?: string;
    status?: ReportCardStatus;
    studentId?: string;
  }) => api.get<ReportCard[]>("/report-cards", { params }),
  getById: (id: string) => api.get<ReportCard>(`/report-cards/${id}`),
  getByStudent: (studentId: string) => api.get<ReportCard[]>(`/report-cards/student/${studentId}`),
  getMyPublished: (params?: { academicYear?: string; term?: string }) =>
    api.get<ReportCard[]>("/report-cards/student/published", { params }),
  getPublishedForParent: (
    childId: string,
    params?: { academicYear?: string; term?: string },
  ) =>
    api.get<ReportCard[]>(`/report-cards/parent/${childId}/published`, {
      params,
      skipAuthErrorRedirect: true,
    }),
  getByClass: (classId: string, params?: { academicYear?: string; term?: string }) =>
    api.get<ReportCard[]>(`/report-cards/class/${classId}`, { params }),
  generate: (data: { studentId: string; classId: string; sectionId: string; termId: string; termName: string }) =>
    api.post<ReportCard>("/report-cards/generate", data),
  bulkGenerate: (data: {
    classId: string;
    sectionId: string;
    academicYearId: string;
    termId: string;
    termName: string;
  }) =>
    api.post<{ generated: number; failed: number; errors: string[] }>(
      "/report-cards/bulk-generate",
      data
    ),
  publish: (ids: string[]) => api.put<{ published: number }>("/report-cards/publish", { ids }),
  unpublish: (ids: string[]) =>
    api.put<{ unpublished: number }>("/report-cards/unpublish", { ids }),
  getPublishSummary: (params: { academicYearId: string; termId: string }) =>
    api.get<ReportPublishSummaryRow[]>("/report-cards/publish-summary", { params }),
  getParentPresentationReport: (params: {
    academicYearId: string;
    fromTermId: string;
    toTermId: string;
    classId?: string;
  }) => api.get<ParentPresentationReport>("/report-cards/parent-presentation", { params }),
  downloadParentPresentationPdf: (params: {
    academicYearId: string;
    fromTermId: string;
    toTermId: string;
    classId?: string;
  }) => api.get("/report-cards/parent-presentation/pdf", { params, responseType: "blob" }),
  downloadParentPresentationExcel: (params: {
    academicYearId: string;
    fromTermId: string;
    toTermId: string;
    classId?: string;
  }) => api.get("/report-cards/parent-presentation/excel", { params, responseType: "blob" }),
  publishClassResults: (data: {
    academicYearId: string;
    termId: string;
    classId: string;
    notifyStudents?: boolean;
    notifyParents?: boolean;
  }) => api.post<{ published: number; ranked?: number; notifiedStudents: number; notifiedParents: number }>(
    "/report-cards/publish/class",
    data
  ),
  calculateRanks: (data: { classId: string; academicYear: string; term: string }) =>
    api.post<number>("/report-cards/calculate-ranks", data),
  updateRemarks: (
    id: string,
    data: {
      teacherRemarks?: string;
      principalRemarks?: string;
      internalRemarks?: string;
      coCurricular?: string;
      behavior?: string;
    }
  ) => api.put<ReportCard>(`/report-cards/${id}/remarks`, data),
  delete: (id: string) => api.delete(`/report-cards/${id}`),
  getCertificateTemplate: () =>
    api.get<{
      schoolId: string;
      curriculumType: string;
      currentPeriodName: string;
      activeAcademicYearName: string;
      assessmentColumns: Array<{ code: string; name: string; percentage: number }>;
      title: string;
      themeColor: string;
      principalName: string;
      schoolName: string;
      schoolPhone: string;
      schoolAddress: string;
      schoolLogoUrl: string;
      showRank: boolean;
      showAttendance: boolean;
      showGPA: boolean;
      useCustomBackground: boolean;
      customBackgroundUrl: string;
    }>('/report-cards/certificate-template'),
  saveCertificateTemplate: (template: {
    title: string;
    themeColor: string;
    principalName: string;
    schoolName: string;
    schoolPhone: string;
    schoolAddress: string;
    schoolLogoUrl: string;
    showRank: boolean;
    showAttendance: boolean;
    showGPA: boolean;
    useCustomBackground: boolean;
    customBackgroundUrl: string;
  }) => api.put('/report-cards/certificate-template', { template }),
  uploadCertificateWatermark: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/report-cards/certificate-template/watermark', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getCertificatePayload: (reportCardId: string) =>
    api.get(`/report-cards/${reportCardId}/certificate`),
  downloadCertificatePdf: (reportCardId: string) =>
    api.get(`/report-cards/${reportCardId}/certificate-pdf`, { responseType: 'blob' }),
  downloadCertificateBulkZip: (reportCardIds: string[]) =>
    api.post('/report-cards/certificate-pdf/bulk', { reportCardIds }, { responseType: 'blob' }),
};

export const promotionAPI = {
  getCandidates: (classId: string, params?: { academicYear?: string; minAverageGrade?: number; minAttendance?: number }) =>
    api.get<{
      className: string;
      academicYear: string;
      totalStudents: number;
      candidates: PromotionCandidate[];
    }>(`/promotion/candidates/${classId}`, { params, skipAuthErrorRedirect: true }),
  getGradeCandidates: (grade: number, params?: { academicYear?: string; minAverageGrade?: number; minAttendance?: number }) =>
    api.get<{
      className: string;
      academicYear: string;
      totalStudents: number;
      candidates: PromotionCandidate[];
    }>(`/promotion/grade-candidates/${grade}`, { params, skipAuthErrorRedirect: true }),
  getNextClasses: (classId: string, params?: { toAcademicYear?: string }) =>
    api.get<{
      currentClass: { id: string; name: string; grade: number | null };
      nextClasses: { id: string; name: string; grade: number | null }[];
      isLastGrade: boolean;
      graduationEnabled: boolean;
    }>(`/promotion/next-classes/${classId}`, { params, skipAuthErrorRedirect: true }),
  getNextGrades: (grade: number, params?: { toAcademicYear?: string }) =>
    api.get<{
      currentGrade: number;
      nextGrades: { grade: number; name: string }[];
      isLastGrade: boolean;
      graduationEnabled: boolean;
    }>(`/promotion/next-grades/${grade}`, { params, skipAuthErrorRedirect: true }),
  promoteSingle: (data: {
    studentId: string;
    fromClassId?: string;
    fromGrade?: number;
    toClassId?: string | null;
    toGrade?: number | null;
    fromAcademicYear: string;
    toAcademicYear: string;
  }) => api.post("/promotion/single", data),
  bulkPromote: (data: {
    fromClassId?: string;
    fromGrade?: number;
    toClassId?: string | null;
    toGrade?: number | null;
    fromAcademicYear: string;
    toAcademicYear: string;
    studentIds: string[];
    promoteAll: boolean;
    minAverageGrade?: number;
    minAttendance?: number;
    streams?: Record<string, "NATURAL" | "SOCIAL">;
  }) =>
    api.post<{ promoted: number; retained: number; failed: number; errors: string[] }>(
      "/promotion/bulk",
      data
    ),
  getHistory: (params?: { academicYear?: string; classId?: string }) =>
    api.get("/promotion/history", { params }),
};
