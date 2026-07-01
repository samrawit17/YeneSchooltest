import api from "./core";

export interface AutomationRule {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  eventTrigger: string;
  conditions: any;
  actions: any[];
  isActive: boolean;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecutionLog {
  id: string;
  schoolId: string;
  ruleId: string;
  ruleName?: string;
  eventType: string;
  eventPayload: any;
  status: "success" | "failed";
  executedActions: any[];
  errorMessage?: string;
  executionTimeMs?: number;
  triggeredAt: string;
}

export interface EventTypeInfo {
  value: string;
  label: string;
  description: string;
}

export interface ActionTypeInfo {
  value: string;
  label: string;
  description: string;
  fields: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const automationAPI = {
  listRules: (params?: { page?: number; limit?: number; eventTrigger?: string }) =>
    api.get<PaginatedResponse<AutomationRule>>("/automation/rules", { params }),

  getRule: (id: string) =>
    api.get<AutomationRule>(`/automation/rules/${id}`),

  createRule: (data: {
    name: string;
    description?: string;
    eventTrigger: string;
    conditions?: any;
    actions: any[];
    isActive?: boolean;
  }) => api.post<AutomationRule>("/automation/rules", data),

  updateRule: (id: string, data: Partial<{
    name: string;
    description: string;
    eventTrigger: string;
    conditions: any;
    actions: any[];
    isActive: boolean;
  }>) => api.patch<AutomationRule>(`/automation/rules/${id}`, data),

  deleteRule: (id: string) =>
    api.delete(`/automation/rules/${id}`),

  toggleRule: (id: string, isActive: boolean) =>
    api.patch<AutomationRule>(`/automation/rules/${id}/toggle`, { isActive }),

  getLogs: (params?: { ruleId?: string; status?: string; eventType?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<AutomationExecutionLog>>("/automation/logs", { params }),

  getLog: (id: string) =>
    api.get<AutomationExecutionLog>(`/automation/logs/${id}`),

  getEventTypes: () =>
    api.get<EventTypeInfo[]>("/automation/event-types"),

  getActionTypes: () =>
    api.get<ActionTypeInfo[]>("/automation/action-types"),
};
