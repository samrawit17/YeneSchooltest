import api from "./core";

export type DataQualitySeverity = "high" | "medium" | "low";

export type DataQualityIssue = {
  type: string;
  severity: DataQualitySeverity;
  studentProfileId?: string | null;
  studentUserId?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  section?: string | null;
  detail: string;
};

export type StudentConsistencyReport = {
  academicYear: { id: string; name: string } | null;
  checkedStudents: number;
  summary: {
    total: number;
    bySeverity: Record<DataQualitySeverity, number>;
    byType: Record<string, number>;
  };
  issues: DataQualityIssue[];
};

export const dataQualityAPI = {
  getStudentConsistency: () =>
    api.get<StudentConsistencyReport>("/data-quality/student-consistency"),
};
