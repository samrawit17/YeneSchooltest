import api from "./core";

export const platformSettingsAPI = {
  getAll: () => api.get("/platform/settings"),
  getFlags: () => api.get("/platform/settings/flags"),
  get: (key: string) => api.get(`/platform/settings/${key}`),
  set: (key: string, value: any) =>
    api.put(`/platform/settings/${key}`, { value }),
  delete: (key: string) => api.delete(`/platform/settings/${key}`),
  batchUpdate: (settings: Record<string, any>) =>
    api.post("/platform/settings/batch", settings),
};
