import api from "./core";

export const calendarAPI = {
  getCurrentEthiopianYear: () => api.get("/calendar/ethiopian-year"),
  getCurrentDate: () => api.get("/calendar/current"),
  convertDate: (date: string) => api.get("/calendar/convert", { params: { date } }),
  convertToGregorian: (year: number, month: number, day: number) =>
    api.get("/calendar/convert-to-gregorian", { params: { year, month, day } }),
  getSchoolCalendarMode: (schoolId: string) => api.get(`/calendar/school/${schoolId}/mode`),
  checkNewYear: (date?: string) => api.get("/calendar/new-year-check", { params: { date } }),
};

export const examSeatingAPI = {
  getSeatingPlans: () => api.get("/exams/seating/plans"),
  getSeatingPlanByType: (examType: string) =>
    api.get(`/exams/seating/type/${encodeURIComponent(examType)}/seating-plan`),
  getSeatingPlanByExam: (examId: string) => api.get(`/exams/seating/${examId}/seating-plan`),
  createSeatingPlan: (
    examType: string,
    data: {
      mode: "SINGLE_GRADE" | "GRADE_RANGE";
      fromGrade: number;
      toGrade?: number;
      examCapacity?: number;
      shuffle: boolean;
      sectionIds?: string[];
      useScoreThresholdFilter?: boolean;
      scoreThreshold?: number;
    }
  ) => api.post(`/exams/seating/type/${encodeURIComponent(examType)}/seating-plan`, data),
  generateSeating: (planId: string) => api.post(`/exams/seating/plan/${planId}/generate`),
  getSeatingOverview: (planId: string) => api.get(`/exams/seating/plan/${planId}`),
  clearGeneratedStudents: (planId: string) => api.delete(`/exams/seating/plan/${planId}/students`),
  deleteSeatingPlan: (planId: string) => api.delete(`/exams/seating/plan/${planId}`),
  downloadPdfReport: (planId: string) =>
    api.get(`/exams/seating/plan/${planId}/print`, { responseType: "blob" }),
  downloadExcelReport: (planId: string) =>
    api.get(`/exams/seating/plan/${planId}/excel`, { responseType: "blob" }),
};

export const nationalExamResultsAPI = {
  listBatches: () => api.get("/national-exam-results/batches"),
  getBatch: (id: string) => api.get(`/national-exam-results/batches/${id}`),
  importResults: (data: any) => api.post("/national-exam-results/import", data),
  publishBatch: (id: string) => api.post(`/national-exam-results/batches/${id}/publish`),
  getMyResults: () => api.get("/national-exam-results/student/me"),
};

export interface SearchResult {
  type:
    | "student"
    | "teacher"
    | "parent"
    | "staff"
    | "exam"
    | "lesson"
    | "announcement"
    | "event"
    | "class"
    | "section"
    | "subject"
    | "grade";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export type SearchableEntity =
  | "students"
  | "teachers"
  | "parents"
  | "staff"
  | "exams"
  | "lessons"
  | "announcements"
  | "events"
  | "classes"
  | "sections"
  | "subjects"
  | "grades";

export const searchAPI = {
  globalSearch: (query: string) => api.get("/search", { params: { q: query } }),
};
