import api from "./core";

export const schoolSettingsAPI = {
  getAll: (schoolId: string, options?: { skipAuthErrorRedirect?: boolean }) =>
    api.get(`/schools/${schoolId}/settings`, {
      ...(options?.skipAuthErrorRedirect
        ? { skipAuthErrorRedirect: true }
        : {}),
    }),
  get: (schoolId: string, key: string) =>
    api.get(`/schools/${schoolId}/settings/${key}`),
  set: (schoolId: string, key: string, value: any) =>
    api.put(`/schools/${schoolId}/settings/${key}`, { value }),
  uploadLoginImage: async (schoolId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/schools/${schoolId}/settings/login-image`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  delete: (schoolId: string, key: string) =>
    api.delete(`/schools/${schoolId}/settings/${key}`),
  batchUpdate: (schoolId: string, settings: Record<string, any>) =>
    api.post(`/schools/${schoolId}/settings/batch`, settings),
};
