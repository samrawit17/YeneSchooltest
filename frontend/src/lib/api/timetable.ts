import api from "./core";

/**
 * Timetable-specific APIs only.
 * Classes, subjects, academic years, and class-subjects
 * are now accessed via their dedicated modules.
 */
export const adminTimetableAPI = {
  getClasses: (params?: { academicYearId?: string }) => api.get('/classes', { params }),

  getSubjects: () => api.get('/subjects'),

  getAcademicYears: () => api.get('/academic-years'),

  getClassSubjects: (params?: { classId?: string; sectionId?: string; academicYearId?: string }) =>
    params?.classId
      ? api.get(`/class-subjects/by-class/${params.classId}`, {
          params: { sectionId: params.sectionId },
        })
      : api.get('/class-subjects', { params }),

  getGrid: (classId: string, params?: { sectionId?: string; academicYearId?: string }) =>
    api.get(`/timetable-slots/grid/class/${classId}`, { params }),

  getAllSlots: (params?: {
    dayOfWeek?: number;
    classId?: string;
    teacherId?: string;
    academicYearId?: string;
  }) => api.get('/timetable-slots', { params }),

  clearSectionSlots: (classId: string, sectionId: string, params?: { academicYearId?: string }) =>
    api.delete(`/timetable-slots/class/${classId}/section/${sectionId}`, { params }),

  bulkCreateSlots: (slots: any[]) => api.post("/timetable-slots/bulk", { slots }),

};
