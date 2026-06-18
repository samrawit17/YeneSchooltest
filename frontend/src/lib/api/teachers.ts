import api from "./core";

export const teachersAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    classId?: string;
    sectionId?: string;
    subject?: string;
  }) => api.get("/teachers", { params }),
  getById: (id: string) => api.get(`/teachers/${id}`),
  getAssignments: (id: string) => api.get(`/teachers/${id}/assignments`),
  getMyAssignments: (academicYear?: string) => api.get("/teachers/me/assignments", { params: { academicYear } }),
  update: (
    id: string,
    data: { name?: string; phone?: string; address?: string },
  ) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};
