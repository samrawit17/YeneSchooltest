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
  placementClassName?: string | null;
  placementSection?: string | null;
  placementAcademicYear?: string | null;
  recommendation?: string;
  detail: string;
};

export type StudentConsistencyReport = {
  academicYear: { id: string; name: string } | null;
  academicYearKeysChecked: string[];
  checkedStudents: number;
  warnings: string[];
  summary: {
    total: number;
    bySeverity: Record<DataQualitySeverity, number>;
    byType: Record<string, number>;
  };
  issues: DataQualityIssue[];
};

export const dataQualityAPI = {
  getStudentConsistency: (schoolId?: string) =>
    api.get<StudentConsistencyReport>("/data-quality/student-consistency", {
      params: schoolId ? { schoolId } : undefined,
    }),
};
