import api from './core';

export const timetableSlotsAPI = {
  create: (data: {
    schoolId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
    academicYearId?: string;
  }) => api.post("/timetable-slots", data),
  getAll: (params?: {
    dayOfWeek?: number;
    classId?: string;
    teacherId?: string;
    academicYearId?: string;
  }) => api.get("/timetable-slots", { params }),
  getByClass: (classId: string) => api.get(`/timetable-slots/class/${classId}`),
  getByTeacher: (teacherId: string, params?: { academicYearId?: string }) =>
    api.get(`/timetable-slots/teacher/${teacherId}`, { params }),
  getById: (id: string) => api.get(`/timetable-slots/${id}`),
  update: (
    id: string,
    data: {
      classId?: string;
      subjectId?: string;
      teacherId?: string;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      room?: string;
      academicYearId?: string;
    },
  ) => api.patch(`/timetable-slots/${id}`, data),
  delete: (id: string) => api.delete(`/timetable-slots/${id}`),
  bulkCreate: (
    slots: {
      classId: string;
      sectionId: string;
      subjectId: string;
      teacherId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      room?: string;
      academicYearId?: string;
    }[],
  ) => api.post("/timetable-slots/bulk", { slots }),
  deleteByClassSection: (
    classId: string,
    sectionId: string,
    params?: { academicYearId?: string },
  ) =>
    api.delete(`/timetable-slots/class/${classId}/section/${sectionId}`, {
      params,
    }),
  getGrid: (classId: string, sectionId?: string, academicYearId?: string) =>
    api.get(`/timetable-slots/grid/class/${classId}`, {
      params: { sectionId, academicYearId },
    }),
};
