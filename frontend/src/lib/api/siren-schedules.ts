import api from "./core";

export interface SirenSchedule {
  id: string;
  schoolId: string;
  name: string;
  type: string;
  ringTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

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
