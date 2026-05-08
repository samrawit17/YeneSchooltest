import api from "./core";

export const parentDashboardAPI = {
  getDashboard: () => api.get("/dashboard/parent"),
  getGeneralDashboard: () => api.get("/dashboard"),
  getChildren: () => api.get("/parents/me/children"),
  getStudentEnrollment: (studentUserId: string) => api.get(`/enrollments/student/${studentUserId}`),
  getStudentClass: (classId: string) => api.get(`/classes/${classId}`),
  getSchoolSettings: (schoolId: string) => api.get(`/schools/${schoolId}/settings`),
};
