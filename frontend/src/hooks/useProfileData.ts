import { useQuery } from "@tanstack/react-query";
import { userAPI, timetableSlotsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/query-keys";
import { useTranslations } from "@/hooks/useTranslations";

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
  const { t, locale } = useTranslations("profile");

  const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
    new Date(value).toLocaleDateString(locale, options);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale);

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
