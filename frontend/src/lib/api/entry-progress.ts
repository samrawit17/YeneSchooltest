import api from "./core";

export type AssessmentType = "QUIZ" | "TEST" | "MID" | "FINAL" | "ATTENDANCE";

export interface EntryProgressRow {
  assessmentSubjectId: string;
  assessmentId: string;
  title: string;
  type: AssessmentType;
  subject: string;
  className: string;
  sectionName: string | null;
  expectedEntries: number;
  enteredEntries: number;
  missingEntries: number;
  isLocked: boolean;
}

export interface EntryProgressQuery {
  academicYearId: string;
  termId?: string;
  page?: string;
  limit?: string;
}

export interface EntryProgressResponse {
  data: EntryProgressRow[];
  total: number;
  totalPages: number;
  page: number;
}

export const entryProgressAPI = {
  list: (params: EntryProgressQuery) =>
    api.get<EntryProgressResponse>("/assessments/registrar/missing-marks", { params }),
};
