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
  status: "published" | "ready" | "has_issues" | "no_students";
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
  getByClass: (classId: string, params?: { academicYear?: string; term?: string }) =>
    api.get<ReportCard[]>(`/report-cards/class/${classId}`, { params }),
  generate: (data: { studentId: string; classId: string; sectionId: string; termId: string; termName: string }) =>
    api.post<ReportCard>("/report-cards/generate", data),
  bulkGenerate: (data: { classId: string; sectionId: string; termId: string; termName: string }) =>
    api.post<{ generated: number; failed: number; errors: string[] }>(
      "/report-cards/bulk-generate",
      data
    ),
  publish: (ids: string[]) => api.put<{ published: number }>("/report-cards/publish", { ids }),
  unpublish: (ids: string[]) =>
    api.put<{ unpublished: number }>("/report-cards/unpublish", { ids }),
  getPublishSummary: (params: { academicYearId: string; termId: string }) =>
    api.get<ReportPublishSummaryRow[]>("/report-cards/publish-summary", { params }),
  publishClassResults: (data: {
    academicYearId: string;
    termId: string;
    classId: string;
    notifyStudents?: boolean;
    notifyParents?: boolean;
  }) => api.post<{ published: number; notifiedStudents: number; notifiedParents: number }>(
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
      coCurricular?: string;
      behavior?: string;
    }
  ) => api.put<ReportCard>(`/report-cards/${id}/remarks`, data),
  delete: (id: string) => api.delete(`/report-cards/${id}`),
};

export const promotionAPI = {
  getCandidates: (classId: string, params?: { academicYear?: string }) =>
    api.get<{
      className: string;
      academicYear: string;
      totalStudents: number;
      candidates: PromotionCandidate[];
    }>(`/promotion/candidates/${classId}`, { params }),
  getNextClasses: (classId: string, params?: { toAcademicYear?: string }) =>
    api.get<{
      currentClass: { id: string; name: string; grade: number | null };
      nextClasses: { id: string; name: string; grade: number | null }[];
      isLastGrade: boolean;
      graduationEnabled: boolean;
    }>(`/promotion/next-classes/${classId}`, { params }),
  promoteSingle: (data: {
    studentId: string;
    fromClassId: string;
    toClassId?: string | null;
    fromAcademicYear: string;
    toAcademicYear: string;
  }) => api.post("/promotion/single", data),
  bulkPromote: (data: {
    fromClassId: string;
    toClassId?: string | null;
    fromAcademicYear: string;
    toAcademicYear: string;
    studentIds: string[];
    promoteAll: boolean;
    minAverageGrade?: number;
    minAttendance?: number;
  }) =>
    api.post<{ promoted: number; retained: number; failed: number; errors: string[] }>(
      "/promotion/bulk",
      data
    ),
  getHistory: (params?: { academicYear?: string; classId?: string }) =>
    api.get("/promotion/history", { params }),
};
