import api from "./core";

export const parentsAPI = {
  getChildren: () => api.get("/parents/me/children"),
  getRelatedTeachers: () => api.get("/parents/me/teachers"),
  getChildById: (childId: string) => api.get(`/parents/me/children/${childId}`),
  createAndLink: (data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
  }) => api.post("/parents/create-and-link", data),
  create: (data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
  }) => api.post("/parents/create-and-link", data),
  createSimple: (data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    schoolId?: string;
  }) => api.post("/parents", data),
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/parents", { params }),
  getById: (id: string) => api.get(`/parents/${id}`),
  update: (
    id: string,
    data: { name?: string; phone?: string; address?: string; occupation?: string }
  ) => api.put(`/parents/${id}`, data),
  delete: (id: string) => api.delete(`/parents/${id}`),
  linkToStudent: (data: {
    parentProfileId: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
  }) => api.post("/parents/link", data),
  unlinkFromStudent: (parentId: string, studentId: string) =>
    api.delete(`/parents/unlink/${parentId}/${studentId}`),
};

export const disciplineAPI = {
  createIncident: (data: {
    schoolId: string;
    studentId: string;
    reportedBy: string;
    incidentDate: string | Date;
    title: string;
    description: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    actionTaken?: string;
  }) => api.post("/discipline", data),
  getIncidents: (params: {
    schoolId: string;
    studentId?: string;
    severity?: string;
    status?: string;
  }) => api.get("/discipline", { params }),
  getStudentIncidents: (studentId: string) => api.get(`/discipline/student/${studentId}`),
  getIncident: (id: string) => api.get(`/discipline/${id}`),
  updateIncident: (
    id: string,
    data: {
      title?: string;
      description?: string;
      severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      status?: "OPEN" | "INVESTIGATING" | "RESOLVED" | "ESCALATED";
      actionTaken?: string;
      outcome?: string;
    }
  ) => api.put(`/discipline/${id}`, data),
  deleteIncident: (id: string) => api.delete(`/discipline/${id}`),
};
