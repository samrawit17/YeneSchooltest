import api from "./core";

export const classesAPI = {
  create: (data: {
    academicYearId: string;
    grade: number;
    section: string;
    name?: string;
  }) => api.post("/classes", data),
  getAll: (params?: { academicYearId?: string }) =>
    api.get("/classes", { params }),
  getById: (id: string) => api.get(`/classes/${id}`),
  update: (
    id: string,
    data: {
      academicYearId?: string;
      grade?: number;
      section?: string;
      name?: string;
      homeroomTeacherId?: string | null;
    },
  ) => api.put(`/classes/${id}`, data),
  setHomeroomTeacher: (id: string, homeroomTeacherId: string | null) =>
    api.put(`/classes/${id}/homeroom-teacher`, { homeroomTeacherId }),
  delete: (id: string) => api.delete(`/classes/${id}`),
  getGrades: () => api.get("/classes/grades/list"),
  getStudents: (
    id: string,
    params?: {
      sectionId?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
  ) => api.get(`/classes/${id}/students`, { params }),
  getSections: () => api.get("/sections"),
  getStats: (id: string, params?: { sectionId?: string }) =>
    api.get(`/classes/${id}/stats`, { params }),
  search: (params: { q: string; academicYearId?: string }) =>
    api.get("/classes/search", { params }),
};

export const sectionsAPI = {
  create: (data: {
    classId: string;
    name: string;
    capacity: number;
    roomNumber?: string;
  }) => api.post("/sections", data),
  getAll: (params?: {
    classId?: string;
    search?: string;
    academicYearId?: string;
  }) => api.get("/sections", { params }),
  getById: (id: string) => api.get(`/sections/${id}`),
  update: (
    id: string,
    data: { name?: string; capacity?: number; roomNumber?: string },
  ) => api.put(`/sections/${id}`, data),
  delete: (id: string) => api.delete(`/sections/${id}`),
  autoCreate: (data: { classId: string; capacity?: number }) =>
    api.post("/sections/auto-create", data),
  setHomeroomTeacher: (sectionId: string, teacherId: string | null) =>
    api.put(`/sections/${sectionId}/homeroom-teacher`, {
      homeroomTeacherId: teacherId,
    }),
  syncCapacity: (params?: { academicYearId?: string }) =>
    api.put("/sections/sync-capacity", null, { params }),
  search: (params: { search: string; academicYearId?: string }) =>
    api.get("/sections", { params }),
};
