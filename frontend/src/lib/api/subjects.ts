import api from "./core";

export const subjectsAPI = {
  create: (data: {
    schoolId: string;
    name: string;
    code?: string;
    isActive?: boolean;
    description?: string;
    academicYearId?: string;
  }) => api.post("/subjects", data),
  getAll: (params?: { schoolId?: string }) => api.get("/subjects", { params }),
  getById: (id: string) => api.get(`/subjects/${id}`),
  update: (
    id: string,
    data: {
      name?: string;
      code?: string;
      isActive?: boolean;
      description?: string;
    },
  ) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};
