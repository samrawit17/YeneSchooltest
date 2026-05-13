import api from "./core";

export type TemplateType = "ID_CARD" | "CERTIFICATE";

export type TemplateRecord = {
  id: string;
  schoolId: string;
  type: TemplateType;
  name: string;
  backgroundUrl: string;
  fieldMapJson?: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const templatesAPI = {
  list: (type?: TemplateType) =>
    api.get<TemplateRecord[]>("/templates", { params: type ? { type } : undefined }),
  upload: async (data: { name: string; type: TemplateType; file: File }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("type", data.type);
    formData.append("file", data.file);
    const response = await api.post<TemplateRecord>("/templates/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  activate: (id: string) => api.patch<TemplateRecord>(`/templates/${id}/activate`),
  saveFields: (template_id: string, fields: Array<Record<string, any>>) =>
    api.post("/templates/fields", { template_id, fields }),
};
