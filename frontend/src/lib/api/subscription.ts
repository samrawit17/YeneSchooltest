import api from "./core";

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  description?: string;
  features: string[];
  isActive?: boolean;
}

export interface SubscriptionSchool {
  id: string;
  name: string;
  email: string;
  plan: { id: string; name: string; tier: string } | null;
  _count?: { users?: number };
}

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  planId: string;
  status?: string;
}

export const subscriptionAPI = {
  getAllPlans: () => api.get<SubscriptionPlan[]>("/subscription/plans"),
  getPlan: (id: string) => api.get<SubscriptionPlan>(`/subscription/plans/${id}`),
  createPlan: (data: { name: string; tier: string; description?: string; features: string[] }) =>
    api.post<SubscriptionPlan>("/subscription/plans", data),
  updatePlan: (
    id: string,
    data: { name?: string; description?: string; features?: string[]; isActive?: boolean }
  ) => api.put<SubscriptionPlan>(`/subscription/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/subscription/plans/${id}`),
  assignPlan: (schoolId: string, planId: string | null) =>
    api.post("/subscription/assign", { schoolId, planId }),
  getSchoolPlan: (schoolId: string) => api.get<SubscriptionPlan>(`/subscription/school/${schoolId}`),
  getSchoolSubscription: (schoolId: string) =>
    api.get<SchoolSubscription>(`/subscription/school/${schoolId}/subscription`),
  getSchools: (planId?: string) =>
    api.get<SubscriptionSchool[]>(planId ? `/subscription/schools?planId=${planId}` : "/subscription/schools"),
  checkFeature: (schoolId: string, feature: string) =>
    api.get("/subscription/check-feature", { params: { schoolId, feature } }),
};
