import { useCallback, useState } from "react";
import api from "./core";

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

export const sirenEventAPI = {
  list: (schoolId: string, limit = 100) =>
    api.get("/api/siren/events", {
      params: { schoolId, limit },
      skipAuthErrorRedirect: true,
    }),
};

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
