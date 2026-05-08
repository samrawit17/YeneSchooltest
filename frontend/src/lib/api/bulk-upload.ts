import api from "./core";

export interface BulkUploadResult {
  status?: string;
  credentials?: Array<{
    name: string;
    email: string;
    username: string;
    role: string;
    temporaryPassword?: string;
  }>;
  data?: any;
  [key: string]: any;
}

export const bulkUploadAPI = {
  uploadUsers: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<BulkUploadResult>("/bulk-upload/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadStudents: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/students", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadStaff: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/staff", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadParents: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/parents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadStudentsAuto: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/students-auto", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getTemplate: (type: "student" | "staff" | "parent" | "students-auto" = "student") =>
    api.get(`/bulk-upload/template?type=${type}`, { responseType: "blob" }),
  validateFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/bulk-upload/validate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  generateReport: (credentials: Array<{
    name: string;
    email: string;
    username: string;
    temporaryPassword: string;
    role: string;
  }>) => api.post("/bulk-upload/report", { credentials }, { responseType: "blob" }),
  getPendingCredentials: (options?: {
    includeSent?: boolean;
    role?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.includeSent) params.append("includeSent", "true");
    if (options?.role) params.append("role", options.role);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    return api.get(`/bulk-upload/credentials?${params.toString()}`);
  },
  markCredentialSent: (id: string, sentVia?: string) =>
    api.post(`/bulk-upload/credentials/${id}/mark-sent`, { sentVia }),
  markCredentialsSentBulk: (credentialIds: string[], sentVia?: string) =>
    api.post("/bulk-upload/credentials/mark-sent-bulk", { credentialIds, sentVia }),
  deleteCredential: (id: string) => api.post(`/bulk-upload/credentials/${id}/delete`),
  exportCredentials: (options?: { includeSent?: boolean; role?: string }) => {
    const params = new URLSearchParams();
    if (options?.includeSent) params.append("includeSent", "true");
    if (options?.role) params.append("role", options.role);
    return api.get(`/bulk-upload/credentials/export?${params.toString()}`, {
      responseType: "blob",
    });
  },
};
