import api from "./core";

export type PracticeExamStatus = "DRAFT" | "READY" | "ACTIVE" | "ARCHIVED";
export type PracticeExamOption = "A" | "B" | "C" | "D";
export type PracticeExamQuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

export interface PracticeExam {
  id: string;
  title: string;
  description?: string | null;
  grade: number;
  stream?: string | null;
  academicYearId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  accessCode?: string;
  subject?: { id: string; name: string; code?: string | null } | null;
  createdById?: string | null;
  durationMinutes: number;
  passMark: number;
  status: PracticeExamStatus;
  shuffleQuestions: boolean;
  _count?: { questions: number; attempts: number };
  attempts?: PracticeExamAttempt[];
}

export interface PracticeExamQuestion {
  id: string;
  subject: string;
  questionType?: PracticeExamQuestionType;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctOption?: PracticeExamOption;
  correctText?: string | null;
  caseSensitive?: boolean;
  selectedOption?: PracticeExamOption | null;
  textAnswer?: string | null;
  isFlagged?: boolean;
  isCorrect?: boolean | null;
}

export interface PracticeExamAttempt {
  id: string;
  examId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  updatedAt?: string;
  score?: number | null;
  percentage?: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  exam: PracticeExam;
  questions?: PracticeExamQuestion[];
}

export interface PracticeExamSubmission {
  id: string;
  examId: string;
  status: "SUBMITTED" | "EXPIRED";
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  score?: number | null;
  percentage?: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  exam: PracticeExam & {
    class?: { id: string; name: string; grade?: number | null } | null;
    section?: { id: string; name: string; stream?: string | null } | null;
  };
  student: {
    id: string;
    name?: string | null;
    username?: string | null;
    studentProfile?: {
      studentCode?: string | null;
      className?: string | null;
      section?: string | null;
      stream?: string | null;
      rollNumber?: string | null;
    } | null;
  };
}

export const practiceExamsAPI = {
  listAdmin: (params?: { grade?: string; status?: string; academicYearId?: string }) => api.get<PracticeExam[]>("/practice-exams", { params }),
  create: (data: Partial<PracticeExam>) => api.post<PracticeExam>("/practice-exams", data),
  get: (id: string) => api.get<PracticeExam & { questions: PracticeExamQuestion[] }>(`/practice-exams/${id}`),
  update: (id: string, data: Partial<PracticeExam>) => api.patch<PracticeExam>(`/practice-exams/${id}`, data),
  delete: (id: string) => api.delete(`/practice-exams/${id}`),
  addQuestion: (examId: string, data: Partial<PracticeExamQuestion>) =>
    api.post<PracticeExamQuestion>(`/practice-exams/${examId}/questions`, data),
  updateQuestion: (examId: string, questionId: string, data: Partial<PracticeExamQuestion>) =>
    api.patch<PracticeExamQuestion>(`/practice-exams/${examId}/questions/${questionId}`, data),
  deleteQuestion: (examId: string, questionId: string) =>
    api.delete(`/practice-exams/${examId}/questions/${questionId}`),
  importQuestions: (examId: string, csv: string) =>
    api.post<{ createdCount: number; failedCount: number; failed: { row: number; error: string }[] }>(
      `/practice-exams/${examId}/questions/import`,
      { csv },
    ),
  results: (examId: string) => api.get(`/practice-exams/${examId}/results`),
  teacherSubmissions: (params?: { examId?: string }) =>
    api.get<PracticeExamSubmission[]>("/practice-exams/teacher/submissions", { params }),
  available: () => api.get<PracticeExam[]>("/practice-exams/student/available/list"),
  start: (examId: string, accessCode: string) =>
    api.post<PracticeExamAttempt>(
      `/practice-exams/student/${examId}/start`,
      { accessCode },
      { skipAuthErrorRedirect: true },
    ),
  attempt: (attemptId: string) => api.get<PracticeExamAttempt>(`/practice-exams/student/attempts/${attemptId}`),
  autosave: (attemptId: string, answers: { questionId: string; selectedOption?: PracticeExamOption | null; textAnswer?: string | null; isFlagged?: boolean }[]) =>
    api.post(`/practice-exams/student/attempts/${attemptId}/autosave`, { answers }),
  submit: (attemptId: string, answers: { questionId: string; selectedOption?: PracticeExamOption | null; textAnswer?: string | null; isFlagged?: boolean }[]) =>
    api.post<PracticeExamAttempt>(`/practice-exams/student/attempts/${attemptId}/submit`, { answers }),
};
