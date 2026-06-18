import api from "./core";

export const schoolsAPI = {
  create: (data: {
    name: string;
    email: string;
    address?: string;
    phone?: string;
  }) => api.post("/schools", data),
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get("/schools", { params }),
  getById: (id: string) => api.get(`/schools/${id}`),
  update: (
    id: string,
    data: {
      name?: string;
      email?: string;
      address?: string;
      phone?: string;
      code?: string;
      publicUrlSlug?: string;
      logoUrl?: string;
    },
  ) => api.put(`/schools/${id}`, data),
  uploadLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/schools/${id}/logo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  delete: (id: string) => api.delete(`/schools/${id}`),
};
