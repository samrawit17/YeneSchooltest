"use client";

import { useAuth } from "@/context/AuthContext";
import { schoolSettingsAPI } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const parseEnabledSetting = (value: unknown, defaultEnabled: boolean) => {
  if (value === undefined || value === null) return defaultEnabled;
  if (typeof value === "string") return value.toLowerCase() !== "false";
  return value !== false;
};

export const useSchoolFeatureSetting = (
  settingKey: string,
  defaultEnabled = true,
) => {
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const query = useQuery({
    queryKey: ["school-feature-setting", schoolId, settingKey],
    queryFn: async () => {
      const response = await schoolSettingsAPI.get(schoolId!, settingKey);
      return response.data?.value;
    },
    enabled: !!schoolId,
    staleTime: 30000,
  });

  return {
    ...query,
    enabled: parseEnabledSetting(query.data, defaultEnabled),
    schoolId,
  };
};

