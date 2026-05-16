import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { userAPI, timetableSlotsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguageStore } from "@/lib/languageStore";
import enMessages from "@/messages/en.json";
import amMessages from "@/messages/am.json";
import arMessages from "@/messages/ar.json";
import omMessages from "@/messages/om.json";
import soMessages from "@/messages/so.json";
import { queryKeys } from "@/lib/query-keys";

const profileMessagesByLanguage = {
  am: amMessages.Profile,
  ar: arMessages.Profile,
  en: enMessages.Profile,
  om: omMessages.Profile,
  so: soMessages.Profile,
} as const;

const dateLocales: Record<string, string> = {
  am: "am-ET",
  ar: "ar",
  en: "en-US",
  om: "om-ET",
  so: "so-SO",
};

interface ProfileData {
  profileData: any;
  isLoadingProfile: boolean;
  teacherSlots: any[];
  assignedSubjects: string[];
  t: any;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string) => string;
}

export function useProfileData(): ProfileData {
  const { user } = useAuth();
  const language = useLanguageStore((state) => state.language);

  const t = useMemo(() => profileMessagesByLanguage[language], [language]);

  const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
    new Date(value).toLocaleDateString(dateLocales[language], options);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(dateLocales[language]);

  // Fetch user profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: queryKeys.profile.user,
    queryFn: async () => {
      const response = await userAPI.getProfile();
      return response.data;
    },
  });

  // Fetch teacher subjects if user is a teacher
  const { data: teacherSlots } = useQuery({
    queryKey: queryKeys.profile.teacherAssignments(user?.id),
    queryFn: async () => {
      if (!user?.id || user.role !== 'TEACHER') return [];
      const response = await timetableSlotsAPI.getByTeacher(user.id);
      return response.data || [];
    },
    enabled: !!user?.id && user.role === 'TEACHER',
  });

  const assignedSubjects = teacherSlots
    ? Array.from(new Set(teacherSlots.map((slot: any) => slot.subject?.name))).filter(
        (name): name is string => typeof name === "string" && name.length > 0,
      )
    : [];

  return {
    profileData,
    isLoadingProfile,
    teacherSlots: teacherSlots || [],
    assignedSubjects,
    t,
    formatDate,
    formatDateTime,
  };
}
