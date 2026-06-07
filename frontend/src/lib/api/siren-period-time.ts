import api from "./core";
import { useCallback, useState } from "react";

export interface PeriodTime {
  id: string;
  schoolId: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  timetableSlotCount?: number;
  canDelete?: boolean;
}

export const periodTimeAPI = {
  list: (schoolId: string) =>
    api.get("/api/period-time", {
      params: { schoolId },
      skipAuthErrorRedirect: true,
    }),
  create: (data: Omit<PeriodTime, "id">) => {
    const { schoolId, ...body } = data;
    return api.post("/api/period-time", body, {
      params: { schoolId: data.schoolId },
      skipAuthErrorRedirect: true,
    });
  },
  update: (id: string, data: Partial<PeriodTime> & { schoolId?: string }) => {
    const { schoolId: _schoolId, ...body } = data;
    return api.put(`/api/period-time/${id}`, body, { skipAuthErrorRedirect: true });
  },
  delete: (id: string) =>
    api.delete(`/api/period-time/${id}`, { skipAuthErrorRedirect: true }),
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
      const { schoolId, ...body } = data;
      const res = await api.post("/api/period-time", body, { params: { schoolId } });
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePeriod = useCallback(async (id: string, data: Partial<PeriodTime>) => {
    setLoading(true);
    try {
      const { schoolId: _schoolId, ...body } = data;
      const res = await api.put(`/api/period-time/${id}`, body);
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
