"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { authAPI, notificationsAPI, schoolsAPI, userAPI, timetableSlotsAPI, schoolSettingsAPI } from "@/lib/api";
import type { NotificationPreferences } from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query-keys";
import { resolveAssetUrl } from "@/lib/asset-url";
import { writeCachedSchoolLoginContext } from "@/lib/school-resolver";
import { formatDateByCalendarType, normalizeCalendarType } from "@/lib/calendar-utils";
import { useProfileData } from "@/hooks/useProfileData";
import { useAuth } from "@/context/AuthContext";
import { useThemeStore } from "@/lib/themeStore";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  Edit2,
  Save,
  X,
  Lock,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  BookOpen,
  GraduationCap,
  UserCircle,
  Key,
  Eye,
  EyeOff,
  Trash2,
  LogOut,
  Activity,
  Bell,
  Globe,
  Heart,
  CreditCard,
  Download
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLanguage, useLanguageStore } from "@/lib/languageStore";
import enMessages from "@/messages/en.json";
import amMessages from "@/messages/am.json";
import arMessages from "@/messages/ar.json";
import omMessages from "@/messages/om.json";
import soMessages from "@/messages/so.json";

// Form validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

// Password change validation schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

type ProfileFormValues = z.infer<typeof profileSchema>;

const dateLocales: Record<AppLanguage, string> = {
  am: "am-ET",
  ar: "ar",
  en: "en-US",
  om: "om-ET",
  so: "so-SO",
};

const profileMessagesByLanguage = {
  am: amMessages.Profile,
  ar: arMessages.Profile,
  en: enMessages.Profile,
  om: omMessages.Profile,
  so: soMessages.Profile,
} as const;

type NotificationPreferenceKey =
  | "commBook"
  | "timetable"
  | "attendance"
  | "announcements"
  | "assignments"
  | "exams"
  | "fees"
  | "events";

type AppUserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "IT_MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "REGISTRAR"
  | "FINANCE";

const NOTIFICATION_ROLE_MAP: Record<NotificationPreferenceKey, AppUserRole[]> = {
  commBook: ["TEACHER", "PARENT"],
  timetable: ["IT_MANAGER", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"],
  attendance: ["IT_MANAGER", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"],
  announcements: ["SUPER_ADMIN", "IT_MANAGER", "TEACHER", "STUDENT", "PARENT", "REGISTRAR", "FINANCE"],
  assignments: ["TEACHER", "STUDENT", "PARENT"],
  exams: ["TEACHER", "STUDENT", "PARENT", "REGISTRAR"],
  fees: ["PARENT", "STUDENT", "FINANCE"],
  events: ["SUPER_ADMIN", "IT_MANAGER", "TEACHER", "STUDENT", "PARENT", "REGISTRAR", "FINANCE"],
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  commBookEnabled: false,
  timetableEnabled: false,
  attendanceEnabled: false,
  announcementsEnabled: false,
  assignmentsEnabled: false,
  examsEnabled: false,
  feesEnabled: false,
  eventsEnabled: false,
};

type NotificationSettingsKey = keyof typeof DEFAULT_NOTIFICATION_SETTINGS;

const extractGradeNumber = (value?: string | number | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const formatStream = (stream?: string | null) => {
  const normalized = String(stream || "").trim().toUpperCase();
  if (normalized === "NATURAL") return "Natural";
  if (normalized === "SOCIAL") return "Social";
  return stream || "";
};

const getNotificationSettings = (settings?: Partial<NotificationPreferences> | null) => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
  ...(settings || {}),
});

const areNotificationSettingsEqual = (
  current: typeof DEFAULT_NOTIFICATION_SETTINGS,
  saved: typeof DEFAULT_NOTIFICATION_SETTINGS,
) =>
  (Object.keys(DEFAULT_NOTIFICATION_SETTINGS) as NotificationSettingsKey[]).every(
    (key) => Boolean(current[key]) === Boolean(saved[key]),
  );

const ProfilePage = () => {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { theme: themeState, setTheme, resolvedTheme } = useThemeStore();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(
    DEFAULT_NOTIFICATION_SETTINGS,
  );

  const queryClient = useQueryClient();
  const { profileData, isLoadingProfile, assignedSubjects, t, formatDate, formatDateTime } = useProfileData();
  const isLoading = isLoadingProfile;
  const studentGrade = extractGradeNumber(
    profileData?.studentProfile?.gradeLevel ||
      profileData?.studentProfile?.className ||
      profileData?.enrollment?.gradeLevel ||
      profileData?.enrollment?.className,
  );
  const shouldShowStudentStream =
    [11, 12].includes(studentGrade || 0) && !!profileData?.studentProfile?.stream;
  const memberSinceAt =
    profileData?.createdAt ||
    profileData?.studentProfile?.createdAt ||
    profileData?.enrollment?.createdAt ||
    user?.createdAt;
  const memberSinceDisplay = (() => {
    if (!memberSinceAt) return "-";
    const parsed = new Date(memberSinceAt);
    if (Number.isNaN(parsed.getTime())) return "-";
    try {
      return formatDateByCalendarType(parsed, normalizeCalendarType(user?.calendarType));
    } catch {
      return "-";
    }
  })();
  const lastUpdatedAt =
    profileData?.updatedAt ||
    profileData?.studentProfile?.updatedAt ||
    profileData?.enrollment?.updatedAt ||
    user?.updatedAt ||
    memberSinceAt;
  const currentAvatarUrl = user?.avatarUrl || profileData?.avatarUrl || null;
  const currentAvatarSrc = resolveAssetUrl(currentAvatarUrl) || currentAvatarUrl || undefined;
  const { data: notificationPreferences, isLoading: isLoadingNotificationPreferences } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const response = await notificationsAPI.getPreferences();
      return response.data;
    },
    enabled: !!user?.id,
  });
  const normalizedRole = (user?.role || "").toUpperCase() as AppUserRole;
  const { data: school } = useQuery({
    queryKey: queryKeys.school.detail(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return null;
      const response = await schoolsAPI.getById(user.schoolId);
      return response.data;
    },
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: schoolLoginSettings } = useQuery({
    queryKey: queryKeys.school.settings(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return {};
      const response = await schoolSettingsAPI.getAll(user.schoolId);
      return response.data || {};
    },
    enabled: !!user?.schoolId && normalizedRole !== "SUPER_ADMIN",
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    const redirectTo =
      normalizedRole !== "SUPER_ADMIN" && school?.publicUrlSlug
        ? `/schools/${encodeURIComponent(school.publicUrlSlug)}/login`
        : normalizedRole !== "SUPER_ADMIN" && user?.schoolId
          ? `/sign-in?schoolId=${encodeURIComponent(user.schoolId)}`
          : "/sign-in";

    if (normalizedRole !== "SUPER_ADMIN" && school && user?.schoolId) {
      writeCachedSchoolLoginContext({
        id: user.schoolId,
        name: school.name || "",
        code: school.code || null,
        publicUrlSlug: school.publicUrlSlug || null,
        logoUrl: school.logoUrl || null,
        accentColor: typeof schoolLoginSettings?.theme_color === "string" ? schoolLoginSettings.theme_color : null,
        loginImageUrl:
          typeof schoolLoginSettings?.login_image_url === "string"
            ? schoolLoginSettings.login_image_url
            : null,
      });
    }
    sessionStorage.setItem("postLogoutRedirect", redirectTo);
    await logout();
    window.location.href = redirectTo + (redirectTo.includes('?') ? '&' : '?') + 't=' + Date.now();
  };

  const persistThemePreference = (nextTheme: "LIGHT" | "DARK" | "SYSTEM", clientTheme: "light" | "dark" | "system") => {
    setTheme(clientTheme, user?.id);
    if (user) {
      updateUser({ ...user, theme: nextTheme });
    }
    userAPI.updateTheme(nextTheme).catch(console.error);
  };

  const visibleNotificationTypes = useMemo(() => {
    const items: Array<{
      key: NotificationPreferenceKey;
      id: string;
      settingsKey: NotificationSettingsKey;
      label: string;
      description: string;
    }> = [
      {
        key: "commBook",
        id: "comm-book-notifications",
        settingsKey: "commBookEnabled",
        label: t.notifications.commBook,
        description: t.notifications.commBookDesc,
      },
      {
        key: "timetable",
        id: "timetable-notifications",
        settingsKey: "timetableEnabled",
        label: t.notifications.timetable,
        description: t.notifications.timetableDesc,
      },
      {
        key: "attendance",
        id: "attendance-notifications",
        settingsKey: "attendanceEnabled",
        label: t.notifications.attendance,
        description: t.notifications.attendanceDesc,
      },
      {
        key: "announcements",
        id: "announcement-notifications",
        settingsKey: "announcementsEnabled",
        label: t.notifications.announcements,
        description: t.notifications.announcementsDesc,
      },
      {
        key: "assignments",
        id: "assignment-notifications",
        settingsKey: "assignmentsEnabled",
        label: t.notifications.assignments,
        description: t.notifications.assignmentsDesc,
      },
      {
        key: "exams",
        id: "exam-notifications",
        settingsKey: "examsEnabled",
        label: t.notifications.exams,
        description: t.notifications.examsDesc,
      },
      {
        key: "fees",
        id: "fee-notifications",
        settingsKey: "feesEnabled",
        label: t.notifications.fees,
        description: t.notifications.feesDesc,
      },
      {
        key: "events",
        id: "event-notifications",
        settingsKey: "eventsEnabled",
        label: t.notifications.events,
        description: t.notifications.eventsDesc,
      },
    ];

    return items.filter((item) =>
      NOTIFICATION_ROLE_MAP[item.key].includes(normalizedRole),
    );
  }, [normalizedRole, t.notifications]);

  useEffect(() => {
    if (notificationPreferences) {
      setNotificationSettings(getNotificationSettings(notificationPreferences));
    }
  }, [notificationPreferences]);

  const savedNotificationSettings = useMemo(
    () => getNotificationSettings(notificationPreferences),
    [notificationPreferences],
  );
  const hasNotificationChanges = !areNotificationSettingsEqual(
    notificationSettings,
    savedNotificationSettings,
  );

  const updateNotificationPreferencesMutation = useMutation({
    mutationFn: async (settings: NotificationPreferences) => {
      await notificationsAPI.updatePreferences(settings);
    },
    onSuccess: (_data, savedSettings) => {
      toast.success(t.notifications.save);
      queryClient.setQueryData(
        ["notification-preferences", user?.id],
        savedSettings,
      );
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update notification preferences",
      );
    },
  });

  const setNotificationSetting = async (
    key: NotificationSettingsKey,
    checked: boolean,
  ) => {
    if (key === "pushEnabled" && checked && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "denied") {
        toast.error("Browser notifications are blocked. Enable them in your browser settings first.");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Browser notification permission was not granted.");
          return;
        }
      }
    }

    setNotificationSettings((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const profileFormDefaults = useMemo(
    () => ({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    }),
    [user?.email, user?.name, user?.phone],
  );

  // Initialize form with react-hook-form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileFormDefaults,
  });
  const hasProfileChanges = form.formState.isDirty;

  useEffect(() => {
    if (!isEditing) {
      form.reset(profileFormDefaults);
    }
  }, [form, isEditing, profileFormDefaults]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      await userAPI.updateProfile(data);
    },
    onSuccess: () => {
      toast.success(t.info.saveSuccess);
      if (user) {
        updateUser({ ...user, ...form.getValues() });
      }
      form.reset(form.getValues());
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.user });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    await updateMutation.mutateAsync(data);
  };

  // Password change form
  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const hasPasswordChanges = passwordForm.formState.isDirty;

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormValues) => {
      await userAPI.changePassword(data.currentPassword, data.newPassword, data.confirmPassword);
    },
    onSuccess: () => {
      toast.success(t.security.saveSuccess);
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  // Handle password change form submission
  const onPasswordSubmit = async (data: PasswordChangeFormValues) => {
    await changePasswordMutation.mutateAsync(data);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="w-full">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 flex-1" />
            ))}
          </div>

          {/* Profile Card Skeleton */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-black">
                {t.title}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
    
              <Button 
                variant="outline" 
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                {t.logout}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 min-w-0 max-w-full">
          <div className="-mx-4 max-w-[100vw] overflow-x-auto overflow-y-hidden px-4 pb-2 md:mx-0 md:max-w-full md:px-0">
            <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0 md:grid md:w-full md:grid-cols-4">
              <TabsTrigger value="profile" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                <User className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                <span>{t.tabs.profile}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                <Shield className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                <span>{t.tabs.security}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                <Bell className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                <span>{t.tabs.notifications}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                <Globe className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                <span>{t.tabs.preferences}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="profile" className="space-y-6 mt-6">
          {/* Main Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">{t.info.title}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {t.info.description}
                  </CardDescription>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => {
                    if (isEditing) {
                      form.reset(profileFormDefaults);
                    }
                    setIsEditing(!isEditing);
                  }}
                  className="gap-1.5 md:gap-2 text-xs md:text-sm w-full sm:w-auto"
                >
                  {isEditing ? (
                    <>
                      <X className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{t.info.cancel}</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{t.info.edit}</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white dark:border-[#2A2A2A] shadow-lg">
                      {currentAvatarSrc ? (
                        <AvatarImage key={currentAvatarSrc} src={currentAvatarSrc} alt={user?.name || "Profile"} />
                      ) : (
                        <AvatarFallback className="text-2xl">
                          {user?.name?.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {isEditing && (
                      <Dialog open={showAvatarDialog} onOpenChange={(open) => {
                        if (!open) {
                          setSelectedAvatarFile(null);
                          setAvatarPreview(null);
                        }
                        setShowAvatarDialog(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            className="absolute bottom-0 right-0 rounded-full"
                            aria-label="Update profile picture"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t.avatar.title}</DialogTitle>
                            <DialogDescription>
                              {t.avatar.description}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex flex-col items-center gap-4">
                              <Avatar className="w-32 h-32">
                                {avatarPreview ? (
                                  <AvatarImage src={avatarPreview} alt="Preview" />
                                ) : currentAvatarSrc ? (
                                  <AvatarImage key={currentAvatarSrc} src={currentAvatarSrc} alt={user?.name || "Profile"} />
                                ) : (
                                  <AvatarFallback className="text-2xl">
                                    {user?.name?.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <Input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setSelectedAvatarFile(file);
                                    setAvatarPreview(URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setSelectedAvatarFile(null);
                              setAvatarPreview(null);
                              setShowAvatarDialog(false);
                            }}>
                              {t.info.cancel}
                            </Button>
                            <Button
                              disabled={!selectedAvatarFile || isUploadingAvatar}
                              onClick={async () => {
                                if (!selectedAvatarFile || !user?.id) return;
                                setIsUploadingAvatar(true);
                                try {
                                  const response = await authAPI.uploadAvatar(user.id, selectedAvatarFile);
                                  const newAvatarUrl = response.data?.avatarUrl;
                                  if (newAvatarUrl && user) {
                                    updateUser({
                                      avatarUrl: newAvatarUrl,
                                      updatedAt: response.data?.updatedAt || user.updatedAt,
                                    });
                                    queryClient.setQueryData(queryKeys.profile.user, (currentProfile: any) => ({
                                      ...(currentProfile || profileData || {}),
                                      avatarUrl: newAvatarUrl,
                                      updatedAt: response.data?.updatedAt || currentProfile?.updatedAt || profileData?.updatedAt,
                                    }));
                                    queryClient.invalidateQueries({ queryKey: queryKeys.profile.user });
                                  } else {
                                    throw new Error("Avatar upload did not return a saved image URL");
                                  }
                                  toast.success("Profile picture updated");
                                  setShowAvatarDialog(false);
                                  setSelectedAvatarFile(null);
                                  setAvatarPreview(null);
                                } catch (e: any) {
                                  toast.error(e.response?.data?.message || e.message || "Failed to upload avatar");
                                } finally {
                                  setIsUploadingAvatar(false);
                                }
                              }}
                            >
                              {isUploadingAvatar ? "Uploading..." : t.info.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  {/* Role and Status */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground">{user?.name}</h3>
                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center">
                      <Badge variant="secondary" className="gap-1.5">
                        <Shield className="w-3 h-3" />
                        {user?.role ? (t.roles[user.role.toLowerCase().replace("_", "") as keyof typeof t.roles] ?? user.role) : t.roles.user}
                      </Badge>
                      {user?.role === 'TEACHER' && assignedSubjects.length > 0 && (
                        <Badge 
                          variant="outline" 
                          className="border-[var(--brand-color,#e35336)] text-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.05)] gap-1.5 animate-in zoom-in-95 duration-300"
                        >
                          {assignedSubjects.join(' & ')} {t.roles.teacher}
                        </Badge>
                      )}
                      {profileData?.studentProfile && (
                        <Badge
                          variant={
                            profileData.studentProfile.enrollmentStatus === 'APPROVED' 
                              ? 'default'
                              : profileData.studentProfile.enrollmentStatus === 'PENDING'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="gap-1.5"
                        >
                          {profileData.studentProfile.enrollmentStatus === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                          {profileData.studentProfile.enrollmentStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                          {profileData.studentProfile.enrollmentStatus === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
                          {profileData.studentProfile.enrollmentStatus}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Leave Requests Link for Employees */}
                    {['TEACHER', 'FINANCE', 'REGISTRAR', 'ADMIN'].includes(user?.role || '') && (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => router.push('/messages')}
                      >
                        <CalendarCheck className="w-4 h-4" />
                        Messages
                      </Button>
                    )}
                  </div>
                </div>

                {/* Profile Form/Details */}
                <div className="flex-1">
                  {isEditing ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {t.info.fullName}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder={t.info.fullName} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {t.info.email}
                                </FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder={t.info.email} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {t.info.phone}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder={t.info.phone} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              form.reset(profileFormDefaults);
                              setIsEditing(false);
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            {t.info.cancel}
                          </Button>
                          <Button type="submit" disabled={updateMutation.isPending || !hasProfileChanges}>
                            {updateMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                {t.info.saving}
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                {t.info.save}
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-6">
                      {/* Student Profile Info */}
                      {profileData?.studentProfile && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                          {(profileData.studentProfile.className || profileData.enrollment?.className) && (
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.class}</p>
                                    <p className="text-sm font-bold text-gray-900">{profileData.studentProfile.className || profileData.enrollment?.className}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {profileData.studentProfile.gradeLevel && (
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.gradeLevel}</p>
                                    <p className="text-sm font-bold text-gray-900">{profileData.studentProfile.gradeLevel}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          {profileData.studentProfile.section && (
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.section}</p>
                                    <p className="text-sm font-bold text-gray-900">{profileData.studentProfile.section}</p>
                                   
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {shouldShowStudentStream && (
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Stream</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                      {formatStream(profileData.studentProfile.stream)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          {profileData.studentProfile.address && (
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.address}</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{profileData.studentProfile.address}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                      
                      {/* Personal Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.info.fullName}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.name || "-"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.info.email}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.email || "-"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.info.phone}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.phone || "-"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.info.role}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {user?.role ? (t.roles[user.role.toLowerCase().replace("_", "") as keyof typeof t.roles] ?? user.role) : "-"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {user?.schoolId && (
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.info.schoolCode || "School Code"}</p>
                                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{school?.code || user.schoolId}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">{t.info.memberSince}</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {memberSinceDisplay}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
             
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t.activity.title}
              </CardTitle>
              <CardDescription>
                {t.activity.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1A1A1A]/60 rounded-lg border border-gray-200 dark:border-[#2A2A2A]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-[#2A2A2A] rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.activity.lastUpdated}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '-'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{t.activity.updated}</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1A1A1A]/60 rounded-lg border border-gray-200 dark:border-[#2A2A2A]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-[#2A2A2A] rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.activity.emailVerified}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t.activity.emailVerifiedDesc}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300 dark:bg-[#2A2A2A] dark:text-gray-200 dark:border-gray-600">
                    {t.activity.verified}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200 dark:from-[#1A1A1A] dark:to-[#2A2A2A]/50 dark:border-[#2A2A2A]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.activity.lastLogin}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDateTime(new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{t.activity.active}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Lock className="w-5 h-5" />
                {t.security.title}
              </CardTitle>
              <CardDescription className="text-sm">
                {t.security.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.security.currentPassword}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder={t.security.currentPlaceholder}
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-1"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.security.newPassword}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder={t.security.newPlaceholder}
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-1"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.security.confirmPassword}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder={t.security.confirmPlaceholder}
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-1"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {t.security.passwordHelp}
                  </div>
                  <div className="border-t pt-4">
                    <Button type="submit" className="gap-2 w-full md:w-auto" disabled={changePasswordMutation.isPending || !hasPasswordChanges}>
                      {changePasswordMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t.security.updating}
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          {t.security.updateButton}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
         


        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t.notifications.title}</CardTitle>
              <CardDescription className="text-sm">
                {t.notifications.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              {/* Notification Channels */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-sm md:text-base font-medium">{t.notifications.channels}</h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="push-notifications" className="text-sm md:text-base">{t.notifications.push}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{t.notifications.pushDesc}</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notificationSettings.pushEnabled}
                    onCheckedChange={(checked) => setNotificationSetting("pushEnabled", checked)}
                    disabled={isLoadingNotificationPreferences || updateNotificationPreferencesMutation.isPending}
                    className="mt-2 sm:mt-0"
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              {visibleNotificationTypes.length > 0 && (
                <div className="space-y-3 md:space-y-4">
                  <h4 className="text-sm md:text-base font-medium">Browser Push Categories</h4>
                  <div className="space-y-3 md:space-y-4">
                    {visibleNotificationTypes.map((item, index) => (
                      <div key={item.key}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="space-y-1">
                            <Label htmlFor={item.id} className="text-sm md:text-base cursor-pointer">{item.label}</Label>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                          </div>
                          <Switch
                            id={item.id}
                            checked={notificationSettings[item.settingsKey]}
                            onCheckedChange={(checked) => setNotificationSetting(item.settingsKey, checked)}
                            disabled={isLoadingNotificationPreferences || updateNotificationPreferencesMutation.isPending}
                            className="mt-2 sm:mt-0"
                          />
                        </div>
                        {index < visibleNotificationTypes.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row">
              <Button
                className="gap-2 w-full sm:w-auto"
                onClick={() => updateNotificationPreferencesMutation.mutate(notificationSettings)}
                disabled={isLoadingNotificationPreferences || updateNotificationPreferencesMutation.isPending || !hasNotificationChanges}
              >
                <Bell className="w-4 h-4" />
                {t.notifications.save}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t.preferences.appearance}</CardTitle>
              <CardDescription className="text-sm">
                {t.preferences.appearanceDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm md:text-base">{t.preferences.theme}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{t.preferences.themeDesc}</p>
                  </div>
<div className="flex gap-2 mt-2 sm:mt-0">
                     <Button 
                       variant={themeState === "light" ? "default" : "outline"} 
                       size="sm"
                       className="flex-1 sm:flex-none text-xs md:text-sm"
 onClick={() => {
                          persistThemePreference("LIGHT", "light");
                        }}
                     >{t.preferences.light}</Button>
                     <Button 
                       variant={themeState === "dark" ? "default" : "outline"} 
                       size="sm"
                       className="flex-1 sm:flex-none text-xs md:text-sm"
 onClick={() => {
                          persistThemePreference("DARK", "dark");
                        }}
                     >{t.preferences.dark}</Button>
                     <Button 
                       variant={themeState === "system" ? "default" : "outline"} 
                       size="sm"
                       className="flex-1 sm:flex-none text-xs md:text-sm"
 onClick={() => {
                          persistThemePreference("SYSTEM", "system");
                        }}
                     >{t.preferences.system}</Button>
                   </div>
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm md:text-base">{t.preferences.language}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{t.preferences.languageDesc}</p>
                  </div>
                  <Select value={language} onValueChange={(value) => { setLanguage(value as AppLanguage); userAPI.updateLanguage(value).catch(console.error); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t.preferences.language} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="om">Afan Oromo</SelectItem>
                      <SelectItem value="so">Somali</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>


        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;
