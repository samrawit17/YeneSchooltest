import { useCallback, useState } from "react";
import api from "./core";

export interface PeriodTime {
  id: string;
  schoolId: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export interface SirenSchedule {
  id: string;
  schoolId: string;
  name: string;
  type: string;
  ringTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

export interface SirenEvent {
  id: string;
  schoolId: string;
  type: string;
  triggerType: string;
  periodNumber?: number;
  scheduleId?: string;
  firedAt: string;
  webhookSent: boolean;
  pushSent: boolean;
}

export interface SirenHardwareConfig {
  id: string;
  schoolId: string;
  webhookUrl: string;
  isEnabled: boolean;
  timeout: number;
}

export const periodTimeAPI = {
  list: (schoolId: string) =>
    api.get("/api/period-time", {
      params: { schoolId },
      skipAuthErrorRedirect: true,
    }),
  create: (data: Omit<PeriodTime, "id">) =>
    api.post("/api/period-time", data, {
      params: { schoolId: data.schoolId },
      skipAuthErrorRedirect: true,
    }),
  update: (id: string, data: Partial<PeriodTime> & { schoolId?: string }) =>
    api.put(`/api/period-time/${id}`, data, { skipAuthErrorRedirect: true }),
  delete: (id: string) =>
    api.delete(`/api/period-time/${id}`, { skipAuthErrorRedirect: true }),
};

export const sirenScheduleAPI = {
  list: (schoolId: string) =>
    api.get("/api/siren/schedules", {
      params: { schoolId },
      skipAuthErrorRedirect: true,
    }),
  create: (data: Omit<SirenSchedule, "id"> & { schoolId?: string }) =>
    api.post("/api/siren/schedules", data, { skipAuthErrorRedirect: true }),
  update: (id: string, data: Partial<SirenSchedule> & { schoolId?: string }) =>
    api.put(`/api/siren/schedules/${id}`, data, { skipAuthErrorRedirect: true }),
  delete: (id: string) =>
    api.delete(`/api/siren/schedules/${id}`, { skipAuthErrorRedirect: true }),
};

export const sirenEventAPI = {
  list: (schoolId: string, limit = 100) =>
    api.get("/api/siren/events", {
      params: { schoolId, limit },
      skipAuthErrorRedirect: true,
    }),
};

export const sirenHardwareAPI = {
  get: (schoolId: string) =>
    api.get("/api/siren/hardware", {
      params: { schoolId },
      skipAuthErrorRedirect: true,
    }),
  create: (data: Omit<SirenHardwareConfig, "id"> & { schoolId?: string }) =>
    api.post("/api/siren/hardware", data, { skipAuthErrorRedirect: true }),
  update: (id: string, data: Partial<SirenHardwareConfig> & { schoolId?: string }) =>
    api.put(`/api/siren/hardware/${id}`, data, { skipAuthErrorRedirect: true }),
  test: (data: { webhookUrl: string; timeout: number }) =>
    api.post("/api/siren/hardware/test", data, { skipAuthErrorRedirect: true }),
};

export const sirenControlAPI = {
  trigger: (data: { schoolId: string; type: string }) =>
    api.post("/api/siren/trigger", data, { skipAuthErrorRedirect: true }),
};

/**
 * Hook for PeriodTime API operations
 */
export function usePeriodTimeApi() {
  const [loading, setLoading] = useState(false);

  const fetchPeriods = useCallback(
    async (schoolId: string): Promise<PeriodTime[]> => {
      setLoading(true);
      try {
        const res = await api.get(`/api/period-time`, { params: { schoolId } });
        return res.data;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createPeriod = useCallback(async (data: Omit<PeriodTime, "id">) => {
    setLoading(true);
    try {
      const res = await api.post("/api/period-time", data, { params: { schoolId: data.schoolId } });
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePeriod = useCallback(async (id: string, data: Partial<PeriodTime>) => {
    setLoading(true);
    try {
      const res = await api.put(`/api/period-time/${id}`, data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePeriod = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/api/period-time/${id}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    fetchPeriods,
    createPeriod,
    updatePeriod,
    deletePeriod,
  };
}

/**
 * Hook for SirenSchedule API operations
 */
export function useSirenScheduleApi() {
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(
    async (schoolId: string): Promise<SirenSchedule[]> => {
      setLoading(true);
      try {
        const res = await api.get(`/api/siren/schedules`, { params: { schoolId } });
        return res.data;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createSchedule = useCallback(async (data: Omit<SirenSchedule, "id">) => {
    setLoading(true);
    try {
      const res = await api.post("/api/siren/schedules", data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSchedule = useCallback(
    async (id: string, data: Partial<SirenSchedule>) => {
      setLoading(true);
      try {
        const res = await api.put(`/api/siren/schedules/${id}`, data);
        return res.data;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteSchedule = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/api/siren/schedules/${id}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

/**
 * Hook for SirenEvent API operations
 */
export function useSirenEventApi() {
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(
    async (
      schoolId: string,
      limit = 100
    ): Promise<SirenEvent[]> => {
      setLoading(true);
      try {
        const res = await api.get(`/api/siren/events`, { params: { schoolId, limit } });
        return res.data;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    fetchEvents,
  };
}

/**
 * Hook for SirenHardwareConfig API operations
 */
export function useSirenHardwareApi() {
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(
    async (schoolId: string): Promise<SirenHardwareConfig | null> => {
      setLoading(true);
      try {
        const res = await api.get(`/api/siren/hardware`, { params: { schoolId } });
        return res.data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const saveConfig = useCallback(async (data: Omit<SirenHardwareConfig, "id">) => {
    setLoading(true);
    try {
      const res = await api.post("/api/siren/hardware", data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (id: string, data: Partial<SirenHardwareConfig>) => {
    setLoading(true);
    try {
      const res = await api.put(`/api/siren/hardware/${id}`, data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const testWebhook = useCallback(
    async (webhookUrl: string, timeout: number): Promise<boolean> => {
      setLoading(true);
      try {
        await api.post("/api/siren/hardware/test", { webhookUrl, timeout });
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    fetchConfig,
    saveConfig,
    updateConfig,
    testWebhook,
  };
}
