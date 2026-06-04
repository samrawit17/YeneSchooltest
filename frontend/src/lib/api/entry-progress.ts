import api from "./core";

export interface EntryProgressRow {
  teacherId: string;
  teacherName: string | null;
  subjectId: string;
  classId: string;
  sectionId: string | null;
  subject: string;
  className: string;
  sectionName: string | null;
  totalStudents: number;
  enteredGrades: number;
  missingGrades: number;
  percentage: number;
}

export interface EntryProgressQuery {
  academicYearId: string;
  termId?: string;
}

export const entryProgressAPI = {
  list: async (params: EntryProgressQuery) => {
    const response = await api.get<
      Array<{
        teacherId: string;
        teacherName?: string | null;
        subjectId: string;
        classId: string;
        sectionId?: string | null;
        subject: string;
        class: string;
        section: string | null;
        totalStudents: number;
        enteredGrades: number;
        percentage: number;
      }>
    >("/grading/admin/entry-progress", {
      params: {
        academicYear: params.academicYearId,
        term: params.termId,
      },
    });

    const rows: EntryProgressRow[] = Array.isArray(response.data)
      ? response.data.map((row) => {
          const totalStudents = Number(row.totalStudents) || 0;
          const enteredGrades = Number(row.enteredGrades) || 0;
          const missingGrades = Math.max(0, totalStudents - enteredGrades);
          const percentage =
            totalStudents > 0
              ? Math.min(100, Math.max(0, Math.round((enteredGrades / totalStudents) * 100)))
              : 100;

          return {
            teacherId: row.teacherId,
            teacherName: row.teacherName ?? null,
            subjectId: row.subjectId,
            classId: row.classId,
            sectionId: row.sectionId ?? null,
            subject: row.subject,
            className: row.class,
            sectionName: row.section ?? null,
            totalStudents,
            enteredGrades,
            missingGrades,
            percentage,
          };
        })
      : [];

    return { data: rows };
  },
  sendReminder: (params: EntryProgressQuery) =>
    api.post<{
      remindersSent: number;
      teachers: string[];
      skippedUnassigned?: number;
    }>("/grading/admin/send-reminder", {
      academicYear: params.academicYearId,
      term: params.termId,
    }),
};
