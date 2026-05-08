import api from "./core";

/**
 * Timetable-specific APIs only.
 * Classes, subjects, academic years, and class-subjects
 * are now accessed via their dedicated modules.
 */
export const adminTimetableAPI = {
  getGrid: (classId: string, params?: { sectionId?: string }) =>
    api.get(`/timetable-slots/grid/class/${classId}`, { params }),

  clearSectionSlots: (classId: string, sectionId: string) =>
    api.delete(`/timetable-slots/class/${classId}/section/${sectionId}`),

  bulkCreateSlots: (slots: any[]) => api.post("/timetable-slots/bulk", { slots }),
};
