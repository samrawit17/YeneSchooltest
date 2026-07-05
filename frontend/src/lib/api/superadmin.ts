import api from "./core";

export interface SuperAdminStatsResponse {
  stats?: {
    totalSchools?: number;
    activeSchools?: number;
    inactiveSchools?: number;
    totalUsers?: number;
    newUsersThisMonth?: number;
    totalRevenue?: number;
    monthlyRevenue?: number;
  };
}

export interface SchoolBackupTypeOption {
  value: string;
  label: string;
  description?: string;
}

export const superadminAPI = {
  getDashboard: () => api.get<SuperAdminStatsResponse>("/dashboard/superadmin"),
  getAdmins: () => api.get("/auth/users", { params: { role: "ADMIN" } }),
  getSchools: () => api.get("/schools"),
  downloadBackup: () => api.get("/backups/download", { responseType: "blob", timeout: 300000 }),
  getSchoolBackupTypes: () => api.get<SchoolBackupTypeOption[]>("/backups/school-types"),
  downloadSchoolBackup: (schoolId: string, type: string) =>
    api.get(`/backups/schools/${schoolId}/download`, {
      params: { type },
      responseType: "blob",
      timeout: 300000,
    }),
};
