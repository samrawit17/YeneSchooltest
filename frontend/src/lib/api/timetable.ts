import api from "./core";

export const adminTimetableAPI = {
  getClasses: () => api.get("/classes"),
  getSubjects: () => api.get("/subjects"),
  getAcademicYears: () => api.get("/academic-years"),
  getClassSubjects: (params: { academicYearId?: string; schoolId?: string }) =>
    api.get("/class-subjects", { params }),
  getGrid: (classId: string, params?: { sectionId?: string }) =>
    api.get(`/timetable-slots/grid/class/${classId}`, { params }),
  clearSectionSlots: (classId: string, sectionId: string) =>
    api.delete(`/timetable-slots/class/${classId}/section/${sectionId}`),
  bulkCreateSlots: (slots: any[]) => api.post("/timetable-slots/bulk", { slots }),
};
