import api from "./core";

export interface SirenHardwareConfig {
  id: string;
  schoolId: string;
  webhookUrl: string;
  isEnabled: boolean;
  timeout: number;
}

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
