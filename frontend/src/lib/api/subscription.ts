import api from "./core";
import type { AxiosRequestConfig } from "axios";
import type { PlanTier } from "@/types/subscription";

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: PlanTier;
  description: string | null;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedSchoolsCount?: number;
  subscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string | null;
}

export interface SubscriptionSchool {
  id: string;
  name: string;
  email: string;
  plan: SubscriptionPlan | null;
  subscription?: SchoolSubscription | null;
  planAssignedAt: string | null;
  isActive: boolean;
  _count?: { users?: number };
}

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  plan?: SubscriptionPlan;
}

export const subscriptionAPI = {
  getAllPlans: (config?: AxiosRequestConfig) =>
    api.get<SubscriptionPlan[]>("/subscription/plans", {
      timeout: 15000,
      ...config,
    }),
  getPlan: (id: string) => api.get<SubscriptionPlan>(`/subscription/plans/${id}`),
  createPlan: (data: { name: string; tier: PlanTier; description?: string; features: string[] }) =>
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
  getSchools: (planId?: string, config?: AxiosRequestConfig) =>
    api.get<SubscriptionSchool[]>(planId ? `/subscription/schools?planId=${planId}` : "/subscription/schools", {
      timeout: 15000,
      ...config,
    }),
  checkFeature: (schoolId: string, feature: string) =>
    api.get("/subscription/check-feature", { params: { schoolId, feature } }),
};
