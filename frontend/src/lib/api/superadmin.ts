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

export const superadminAPI = {
  getDashboard: () => api.get<SuperAdminStatsResponse>("/dashboard/superadmin"),
  getAdmins: () => api.get("/auth/users", { params: { role: "ADMIN" } }),
  getSchools: () => api.get("/schools"),
};
