"use client";

import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { schoolsAPI, platformSettingsAPI, schoolSettingsAPI, messagingAPI } from "@/lib/api";
import type { MessagingConversationListItem } from "@/lib/api";
import { notificationsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { resolveAssetUrl } from "@/lib/asset-url";
import { writeCachedSchoolLoginContext } from "@/lib/school-resolver";
import { eventsAPI } from "@/lib/api/content";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
import { useTranslations } from "@/hooks/useTranslations";
import { localizeNotificationText } from "@/lib/notification-display";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GlobalSearch } from "@/components/GlobalSearch";
import Menu from "@/components/Menu";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import {
  Bell,
  LogOut,
  UserPlus,
  User,
  HelpCircle,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Home,
  FileText,
  School,
  Calendar,
  CreditCard,
  Clock,
  Users,
  X,
  Menu as HamburgerMenuIcon,
  Info,
  AlertTriangle,
  Megaphone,
  Loader2,
  MessageSquare,
  ClipboardCheck,
  GraduationCap,
  CalendarClock,
  DollarSign,
  ShieldAlert,
  UserCog,
  Lock,
  FileCheck,
  FileX,
  ClipboardList,
  BookMarked,
} from "lucide-react";

// Shadcn/ui Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  userId?: string | null;
  actionUrl?: string;
  metadata?: unknown;
  createdAt: string;
}

interface NavbarNotification extends Notification {
  groupedIds?: string[];
  groupCount?: number;
}

interface NavbarProps {
  sidebarCollapsed?: boolean;
  useBrandNavigation?: boolean;
}

interface NavigationMessages {
  labels?: Record<string, string>;
  descriptions?: Record<string, string>;
}

const COMMUNICATION_NOTIFICATION_TYPES = ["COMMUNICATION", "MESSAGE_RECEIVED"];
const STAFF_MESSAGE_ROLES = new Set(["ADMIN", "REGISTRAR", "TEACHER", "FINANCE", "IT_MANAGER"]);
const GLOBAL_NOTIFICATION_READS_KEY = "global_notification_reads";
const BROWSER_NOTIFICATION_SHOWN_KEY = "browser_notification_shown";

const parseNotificationMetadata = (metadata: unknown): Record<string, unknown> => {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata as Record<string, unknown>;
  if (typeof metadata !== "string") return {};

  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const metadataText = (metadata: Record<string, unknown>, key: string) => {
  const value = metadata[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const getNavbarGroupKey = (notification: Notification) => {
  const metadata = parseNotificationMetadata(notification.metadata);
  const type = String(notification.type || "").toUpperCase();
  const title = String(notification.title || "");
  const userKey = notification.userId ?? "global";

  if (type === "ASSESSMENT_CREATED") {
    const assessmentId = metadataText(metadata, "assessmentId");
    const assessmentTitle = metadataText(metadata, "assessmentTitle");
    const assessmentType = metadataText(metadata, "assessmentType");
    const subjectName = metadataText(metadata, "subjectName");
    if (assessmentId && subjectName) {
      return `assessment:${userKey}:${assessmentId}:${assessmentType}:${assessmentTitle}:${subjectName}`;
    }
  }

  if (type === "ATTENDANCE_SESSION_OPENED" && title === "Attendance Cutoff Reached") {
    const cutoffTime = metadataText(metadata, "cutoffTime");
    const day = Number.isNaN(Date.parse(notification.createdAt))
      ? ""
      : new Date(notification.createdAt).toISOString().slice(0, 10);
    if (cutoffTime) {
      return `attendance-cutoff:${userKey}:${day}:${cutoffTime}`;
    }
  }

  return `single:${notification.id}`;
};

const groupNavbarNotifications = (notifications: Notification[]): NavbarNotification[] => {
  const groups = new Map<string, Notification[]>();

  for (const notification of notifications) {
    const key = getNavbarGroupKey(notification);
    groups.set(key, [...(groups.get(key) || []), notification]);
  }

  return Array.from(groups.values())
    .map((items): NavbarNotification => {
      if (items.length === 1) return items[0];

      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const latest = sorted[0];
      const type = String(latest.type || "").toUpperCase();
      const metadataItems = sorted.map((item) => parseNotificationMetadata(item.metadata));
      const groupedIds = sorted.map((item) => item.id);

      if (type === "ASSESSMENT_CREATED") {
        const latestMetadata = metadataItems[0];
        const assessmentType = metadataText(latestMetadata, "assessmentType");
        const assessmentTitle = metadataText(latestMetadata, "assessmentTitle");
        const subjectName = metadataText(latestMetadata, "subjectName");
        const classes = Array.from(
          new Set(metadataItems.map((metadata) => metadataText(metadata, "className")).filter(Boolean)),
        );

        return {
          ...latest,
          id: groupedIds.join(":"),
          title: "Assessment Started",
          message: `${assessmentType} "${assessmentTitle}" is now active for ${classes.join(", ")} - ${subjectName}. Please enter scores.`,
          metadata: undefined,
          isRead: sorted.every((item) => item.isRead),
          createdAt: latest.createdAt,
          groupedIds,
          groupCount: items.length,
        };
      }

      if (type === "ATTENDANCE_SESSION_OPENED" && latest.title === "Attendance Cutoff Reached") {
        const latestMetadata = metadataItems[0];
        const cutoffTime = metadataText(latestMetadata, "cutoffTime");
        const classes = Array.from(
          new Set(
            metadataItems
              .map((metadata) => {
                const className = metadataText(metadata, "className");
                const section = metadataText(metadata, "section");
                return className ? `${className}${section ? ` (Section ${section})` : ""}` : "";
              })
              .filter(Boolean),
          ),
        );

        return {
          ...latest,
          id: groupedIds.join(":"),
          title: "Attendance Cutoff Reached",
          message: `The attendance cutoff time (${cutoffTime}) has passed. Please submit attendance for ${classes.join(", ")} immediately.`,
          metadata: undefined,
          isRead: sorted.every((item) => item.isRead),
          createdAt: latest.createdAt,
          groupedIds,
          groupCount: items.length,
        };
      }

      return {
        ...latest,
        id: groupedIds.join(":"),
        message: latest.message,
        isRead: sorted.every((item) => item.isRead),
        groupedIds,
        groupCount: items.length,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const getDashboardPath = (role: string | undefined): string => {
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: "/superadmin",
    ADMIN: "/admin",
    IT_MANAGER: "/it-manager",
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
    REGISTRAR: "/registrar",
    FINANCE: "/finance",
  };

  return role ? roleMap[role.toUpperCase()] || "/dashboard" : "/dashboard";
};

const Navbar = ({
  sidebarCollapsed = false,
  useBrandNavigation = false,
}: NavbarProps) => {
  const { user, logout, isLoading } = useAuth();
  const { hasFeature } = useSubscription();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t: navigationText, language } = useTranslations<NavigationMessages>("navigation");
  const { t: layoutText } = useTranslations<any>("layout");
  const { formattedYearLabel, displayTermName, formatDate: formatSchoolDate, schoolCalendarType } = useAcademicYear();
  const navLabel = (label: string) => navigationText.labels?.[label] ?? label;
  const roleLabel = (role?: string | null) => {
    if (!role) return navLabel("User");
    const normalizedRole = role.toUpperCase();
    return navigationText.labels?.[normalizedRole] ?? role.toLowerCase().replace("_", " ");
  };
  const portalLabel = (schoolName?: string | null) =>
    schoolName ? layoutText.portal.replace("{school}", schoolName) : layoutText.defaultPortal;
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [communicationsOpen, setCommunicationsOpen] = useState(false);
  const normalizedRole = user?.role?.toUpperCase() || "";
  const isSuperAdmin = normalizedRole === "SUPER_ADMIN";
  const isParent = normalizedRole === "PARENT";
  const isTeacher = normalizedRole === "TEACHER";
  const canUseStaffMessages = STAFF_MESSAGE_ROLES.has(normalizedRole) && hasFeature("MESSAGING");

  // Fetch events for calendar popover
  const { data: eventsData } = useQuery({
    queryKey: queryKeys.events.navbar,
    queryFn: () => eventsAPI.getAll(),
    enabled: !!user,
  });

  const events = eventsData?.data || [];

  // Real-time clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(formatTimeByCalendarType(`${hours}:${minutes}`, schoolCalendarType));
      setCurrentDate(formatSchoolDate(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [formatSchoolDate, schoolCalendarType]);

  // Use React Query for school data - cached across navigations
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: queryKeys.school.detail(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return null;
      const response = await schoolsAPI.getById(user.schoolId);
      return response.data;
    },
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  const schoolLogoSrc = resolveAssetUrl(school?.logoUrl);
  const { data: schoolLoginSettings } = useQuery({
    queryKey: queryKeys.school.settings(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return {};
      const response = await schoolSettingsAPI.getAll(user.schoolId);
      return response.data || {};
    },
    enabled: !!user?.schoolId && (user?.role || "").toUpperCase() !== "SUPER_ADMIN",
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query for notifications - cached across navigations but user-specific
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: queryKeys.notifications.list(user?.id, user?.schoolId),
    queryFn: async () => {
      const communicationTypes = COMMUNICATION_NOTIFICATION_TYPES.join(",");
      const [bellNotificationsRes, communicationNotificationsRes] = await Promise.all([
        notificationsAPI.getAll({ limit: 30 }),
        notificationsAPI.getAll({ limit: 10, types: communicationTypes }),
      ]);
      return {
        bellNotifications: bellNotificationsRes.data || [],
        communicationNotifications: communicationNotificationsRes.data || [],
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const bellNotifications = (notificationsData?.bellNotifications || []).filter((n: Notification) => {
    if (COMMUNICATION_NOTIFICATION_TYPES.includes(n.type)) return false;
    // Filter out notifications older than 1 week
    const createdAt = new Date(n.createdAt);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return createdAt > oneWeekAgo;
  });
  const communicationNotifications = (notificationsData?.communicationNotifications || []).filter(
    (n: Notification) => {
      const createdAt = new Date(n.createdAt);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return createdAt > oneWeekAgo;
    }
  );
  const communicationBookNotifications = communicationNotifications.filter((notification: Notification) => {
    const actionUrl = notification.actionUrl || "";
    return !actionUrl.startsWith("/messages");
  });

  const { data: messagingConversations = [] } = useQuery({
    queryKey: queryKeys.messages.conversations(user?.id, user?.schoolId),
    queryFn: async () => (await messagingAPI.listConversations()).data,
    enabled: !!user?.id && !!user?.schoolId && canUseStaffMessages,
    staleTime: 5 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 10 * 1000,
    retry: false,
  });

  const staffMessageUnreadCount = messagingConversations.reduce(
    (total: number, conversation: MessagingConversationListItem) => total + (conversation.unreadCount || 0),
    0,
  );
  const recentStaffMessageConversations = messagingConversations
    .filter((conversation: MessagingConversationListItem) => conversation.lastMessage || conversation.unreadCount > 0)
    .slice(0, 5);
  const groupedBellNotifications = useMemo(
    () => groupNavbarNotifications(bellNotifications),
    [bellNotifications],
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !user?.id ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const storageKey = `${BROWSER_NOTIFICATION_SHOWN_KEY}:${user.id}`;
    let shownIds: string[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      shownIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      shownIds = [];
    }

    const shown = new Set(shownIds);
    let changed = false;

    for (const notification of bellNotifications) {
      if (
        notification.type !== "ATTENDANCE_ABSENT" ||
        notification.isRead ||
        shown.has(notification.id)
      ) {
        continue;
      }

      const browserNotification = new Notification(
        notification.title || "Attendance Alert",
        {
          body: notification.message,
          icon: "/avatar.svg",
          badge: "/avatar.svg",
          tag: notification.id,
          requireInteraction: true,
          data: {
            url: notification.actionUrl || "/parent/attendance",
          },
        }
      );
      browserNotification.onclick = () => {
        window.focus();
        router.push(notification.actionUrl || "/parent/attendance");
        browserNotification.close();
      };

      shown.add(notification.id);
      changed = true;
    }

    if (changed) {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(shown).slice(-100)));
    }
  }, [bellNotifications, router, user?.id]);

  const getSeenGlobalNotificationIds = (): string[] => {
    if (typeof window === "undefined" || !user?.id) return [];

    try {
      const raw = localStorage.getItem(`${GLOBAL_NOTIFICATION_READS_KEY}:${user.id}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const rememberSeenGlobalNotifications = (notificationIds: string[]) => {
    if (typeof window === "undefined" || !user?.id || notificationIds.length === 0) return;

    const current = new Set(getSeenGlobalNotificationIds());
    notificationIds.forEach((id) => current.add(id));
    localStorage.setItem(
      `${GLOBAL_NOTIFICATION_READS_KEY}:${user.id}`,
      JSON.stringify(Array.from(current))
    );
  };

  const isNotificationRead = (notification: Notification) => {
    if (notification.userId === null) {
      return getSeenGlobalNotificationIds().includes(notification.id);
    }

    return notification.isRead;
  };

  const isGroupedNotificationRead = (notification: NavbarNotification) => {
    if (!notification.groupedIds?.length) {
      return isNotificationRead(notification);
    }

    return notification.groupedIds.every((id) => {
      const source = bellNotifications.find((item: Notification) => item.id === id);
      return source ? isNotificationRead(source) : true;
    });
  };

  const unreadCount = groupedBellNotifications.filter((notification: NavbarNotification) => !isGroupedNotificationRead(notification)).length;
  const unreadCommunicationsCount =
    staffMessageUnreadCount +
    communicationBookNotifications.filter((notification: Notification) => !isNotificationRead(notification)).length;

  // Fetch platform settings for feature flags - MUST BE FIRST to ensure it's available for other queries
  const { data: platformSettings } = useQuery({
    queryKey: queryKeys.menu.platformSettings,
    queryFn: async () => {
      try {
        const response = await platformSettingsAPI.getFlags();
        return response.data || {};
      } catch (error) {
        console.error('Failed to fetch platform settings:', error);
        return {};
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
  });

  // Helper function to check if a feature is enabled
  const isFeatureEnabled = (featureFlag: string): boolean => {
    const flagValue = platformSettings?.[featureFlag];
    if (flagValue === undefined || flagValue === null) return true;
    if (typeof flagValue === 'string') {
      return flagValue.toLowerCase() !== 'false';
    }
    return flagValue !== false;
  };

  // Check if communication feature is enabled
  const isCommunicationEnabled = isFeatureEnabled('FEATURE_FLAG_COMMUNICATION_BOOK');

  const markAsRead = async (id: string) => {
    try {
      const targetNotification =
        [...bellNotifications, ...communicationNotifications].find(
          (notification) => notification.id === id
        ) || null;

      if (targetNotification?.userId === null) {
        rememberSeenGlobalNotifications([id]);
      } else {
        await notificationsAPI.markRead(id);
      }
      // Update cache optimistically - include user ID in query key
      queryClient.setQueryData(queryKeys.notifications.list(user?.id, user?.schoolId), (old: any) => {
        if (!old) return old;
        const markCollection = (items: Notification[] = []) =>
          items.map((notification) =>
            notification.id === id ? { ...notification, isRead: true } : notification
          );
        const wasBellUnread = (old.bellNotifications || []).some(
          (notification: Notification) => notification.id === id && !notification.isRead
        );
        const wasCommunicationUnread = (old.communicationNotifications || []).some(
          (notification: Notification) => notification.id === id && !notification.isRead
        );

        return {
          ...old,
          bellNotifications: markCollection(old.bellNotifications),
          communicationNotifications: markCollection(old.communicationNotifications),
          bellUnreadCount: wasBellUnread
            ? Math.max(0, (old.bellUnreadCount || 0) - 1)
            : old.bellUnreadCount || 0,
          communicationUnreadCount: wasCommunicationUnread
            ? Math.max(0, (old.communicationUnreadCount || 0) - 1)
            : old.communicationUnreadCount || 0,
        };
      });
      invalidateNotificationQueries();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markNavbarNotificationAsRead = async (notification: NavbarNotification) => {
    if (!notification.groupedIds?.length) {
      await markAsRead(notification.id);
      return;
    }

    await Promise.all(notification.groupedIds.map((id) => markAsRead(id)));
  };

  const markBellNotificationsAsSeen = async () => {
    const unreadNotifications = bellNotifications.filter(
      (notification: Notification) => !isNotificationRead(notification),
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    const globalNotificationIds = unreadNotifications
      .filter((notification: Notification) => notification.userId === null)
      .map((notification: Notification) => notification.id);
    const userNotificationIds = unreadNotifications
      .filter((notification: Notification) => notification.userId !== null)
      .map((notification: Notification) => notification.id);

    if (globalNotificationIds.length > 0) {
      rememberSeenGlobalNotifications(globalNotificationIds);
    }

    queryClient.setQueryData(queryKeys.notifications.list(user?.id, user?.schoolId), (old: any) => {
      if (!old) return old;
      const readIds = new Set(unreadNotifications.map((notification: Notification) => notification.id));

      return {
        ...old,
        bellNotifications: (old.bellNotifications || []).map((notification: Notification) =>
          readIds.has(notification.id) ? { ...notification, isRead: true } : notification,
        ),
        bellUnreadCount: 0,
      };
    });

    const results = await Promise.allSettled(
      userNotificationIds.map((id: string) => notificationsAPI.markRead(id)),
    );

    if (results.some((result) => result.status === "rejected")) {
      invalidateNotificationQueries();
    }
  };

  const invalidateNotificationQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.categories });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.allPage(user?.id, user?.schoolId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("attendance") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("enrollment") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("academic") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("schedule") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("communication") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("event") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("finance") });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.category("system") });
  };

  const getNotificationIcon = (type: string | undefined) => {
    switch (type?.toUpperCase()) {
      // Attendance notifications
      case 'ATTENDANCE_MARKED':
      case 'ATTENDANCE_ABSENT':
      case 'ATTENDANCE_LATE':
      case 'ATTENDANCE_SESSION_SUBMITTED':
        return <ClipboardCheck className="w-4 h-4 text-blue-500" />;

      // Attendance reminder - special case for missed attendance
      case 'ATTENDANCE_SESSION_OPENED':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;

      // Enrollment notifications
      case 'ENROLLMENT_SUBMITTED':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'ENROLLMENT_APPROVED':
        return <FileCheck className="w-4 h-4 text-green-500" />;
      case 'ENROLLMENT_REJECTED':
        return <FileX className="w-4 h-4 text-red-500" />;
      case 'ENROLLMENT_PENDING':
        return <Clock className="w-4 h-4 text-amber-500" />;

      // Academic notifications
      case 'ASSIGNMENT_CREATED':
        return <BookMarked className="w-4 h-4 text-purple-500" />;
      case 'ASSIGNMENT_DUE':
        return <CalendarClock className="w-4 h-4 text-orange-500" />;
      case 'ASSIGNMENT_GRADED':
      case 'RESULT_PUBLISHED':
      case 'GRADE_UPDATED':
        return <GraduationCap className="w-4 h-4 text-green-600" />;

      // Schedule notifications
      case 'SCHEDULE_CHANGED':
      case 'CLASS_CANCELLED':
      case 'TIMETABLE_UPDATED':
        return <Calendar className="w-4 h-4 text-indigo-500" />;

      // Communication notifications
      case 'MESSAGE_RECEIVED':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-blue-500" />;
      case 'COMMUNICATION':
        return <ClipboardList className="w-4 h-4 text-teal-500" />;

      // Event notifications
      case 'EVENT':
      case 'EVENT_UPDATED':
      case 'EVENT_DELETED':
        return <CalendarClock className="w-4 h-4 text-pink-500" />;

      // Finance notifications
      case 'FEE_DUE':
        return <DollarSign className="w-4 h-4 text-red-500" />;
      case 'FEE_PAID':
      case 'PAYMENT_RECEIVED':
      case 'PAYROLL_PAYMENT_DUE':
      case 'PAYROLL_RUN_REQUIRED':
        return <CreditCard className="w-4 h-4 text-green-600" />;

      // System notifications
      case 'SYSTEM_ALERT':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'ACCOUNT_CREATED':
        return <UserCog className="w-4 h-4 text-blue-500" />;
      case 'PASSWORD_RESET':
        return <Lock className="w-4 h-4 text-amber-500" />;

      // General
      case 'ALERT':
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    // Navigation is handled by DashboardLayout's useEffect which watches
    // isAuthenticated. It reads postLogoutRedirect from sessionStorage above
    // and does a single clean hard redirect. No second window.location.href here.
  };
  const dashboardPath = getDashboardPath(user?.role);

  const getStaffMessageConversationTitle = (conversation: MessagingConversationListItem) => {
    if (conversation.subject) return conversation.subject;
    const others = conversation.participants.filter((participant) => participant.id !== user?.id);
    if (others.length === 1) return others[0].name;
    if (others.length > 1) return `${others[0].name} +${others.length - 1}`;
    return navLabel("Messages");
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-x-clip border-b border-gray-200 bg-[#F1F5F9] transition-all duration-300 supports-[backdrop-filter]:bg-[#F1F5F9]/90 dark:border-[#2A2A2A] dark:bg-[#161616] dark:supports-[backdrop-filter]:bg-[#161616]/60">
      <div className="h-14 w-full max-w-full sm:h-16 md:h-18">
        <div className="flex h-full max-w-full items-center overflow-hidden px-2 sm:px-3 md:px-4">
          {/* Left: Mobile Menu Button and Logo */}
          <div className="relative z-20 flex items-center flex-shrink-0 min-w-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`lg:hidden rounded-lg dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#222222] transition-all duration-200 shadow-sm h-8 w-8 sm:h-9 sm:w-9 ${
                    useBrandNavigation
                      ? "bg-white/80 text-slate-800 hover:bg-[rgba(var(--brand-color-rgb),0.16)]"
                      : "bg-gray-100 text-slate-800 hover:bg-gray-200"
                  }`}
                  aria-label="Toggle menu"
                >
                  <HamburgerMenuIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className={`w-72 sm:w-80 md:w-96 p-0 dark:bg-[#161616] dark:border-[#2A2A2A] max-w-[85vw] ${
                useBrandNavigation
                  ? "bg-[rgba(var(--brand-color-rgb),0.18)] border-r border-[rgba(var(--brand-color-rgb),0.18)]"
                  : "bg-white border-r border-gray-200"
              }`}>
                <SheetHeader className={`p-3 sm:p-4 dark:border-[#2A2A2A] sticky top-0 z-20 dark:bg-[#161616]/95 backdrop-blur flex flex-row items-center justify-between ${
                  useBrandNavigation
                    ? "border-b border-[rgba(var(--brand-color-rgb),0.14)] bg-white/70"
                    : "border-b border-gray-200 bg-white/95"
                }`}>
                  <SheetTitle className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex min-w-0 items-center gap-2 pr-8">
                    {schoolLogoSrc ? (
                      <img
                        src={schoolLogoSrc}
                        alt={school?.name || "School Logo"}
                        className="h-8 w-8 shrink-0 rounded-md bg-white object-contain p-1 shadow-sm ring-1 ring-black/5 dark:bg-white"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--brand-color,#e35336)] text-sm font-bold text-white shadow-sm">
                        {school?.name?.charAt(0) || <School className="h-4 w-4" />}
                      </span>
                    )}
                    {schoolLoading ? (
                      <Skeleton className="h-5 sm:h-6 w-24" />
                    ) : (
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">{portalLabel(school?.name)}</span>
                    )}
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 sm:right-4 top-3 sm:top-4 h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] flex-1">
                  <div className="p-3 sm:p-4">
                    <Menu
                      collapsed={false}
                      onItemClick={() => setMobileMenuOpen(false)}
                      useBrandNavigation={useBrandNavigation}
                    />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {(user?.role !== 'SUPER_ADMIN') && (
              <Popover open={mobileCalendarOpen} onOpenChange={setMobileCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`sm:hidden relative h-8 w-8 text-slate-900 hover:text-slate-900 dark:text-white dark:hover:bg-[#222222] dark:hover:text-white ${
                      useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-slate-100"
                    }`}
                    aria-label="Weekly calendar"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(92vw,360px)] p-2 bg-white dark:bg-[#1A1A1A] ml-4" align="start">
                  <WeeklyCalendar events={events} onEventClick={() => { setMobileCalendarOpen(false); router.push('/list/calendar'); }} />
                </PopoverContent>
              </Popover>
            )}
            {(user?.role === 'SUPER_ADMIN') && (
              <div className="sm:hidden relative h-8 w-8 text-slate-400" title="Calendar disabled for Super Admin">
                <Calendar className="h-5 w-5" />
              </div>
            )}

          </div>

          {(user?.role !== 'SUPER_ADMIN') && (
            <div className="hidden sm:flex items-center gap-1 sm:gap-2 md:gap-3 py-1 rounded-lg text-sm flex-shrink-0">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
                  <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button className={`flex items-center gap-1 dark:hover:bg-[#222222] p-1 rounded cursor-pointer ${useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-gray-100"}`}>
                        <Calendar className="sm:hidden h-5 w-5 text-slate-500 dark:text-gray-400" />
                        <Calendar className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4 text-slate-500 dark:text-gray-400" />
                        <div className="flex flex-col text-left hidden lg:flex">
                          <span className="text-slate-700 dark:text-gray-300 text-xs font-semibold truncate max-w-[120px] sm:max-w-[150px]">{navLabel("Today")}: {currentDate || '--'}</span>
                          <span className="text-slate-500 dark:text-gray-400 text-[10px] truncate max-w-[160px] sm:max-w-[200px]">
                            {formattedYearLabel}{displayTermName ? ` | ${displayTermName}` : ""}
                          </span>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] max-w-[92vw] p-2 sm:p-3 bg-white dark:bg-[#1A1A1A] ml-4" align="center">
                      <WeeklyCalendar events={events} onEventClick={() => { setCalendarOpen(false); router.push('/list/calendar'); }} />
                    </PopoverContent>
                  </Popover>
                  <div className="hidden md:flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 dark:text-gray-400" />
                    <span className="font-bold text-slate-800 dark:text-gray-100 text-xs sm:text-sm">{currentTime || '--:--'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {(user?.role === 'SUPER_ADMIN') && (
            <div className="hidden sm:flex items-center gap-1 sm:gap-2 md:gap-3 py-1 rounded-lg text-sm flex-shrink-0">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
                  <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1 dark:hover:bg-[#222222] p-1 rounded cursor-pointer">
                    <Calendar className="sm:hidden h-5 w-5 text-slate-400" />
                    <Calendar className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                    <div className="flex flex-col text-left hidden lg:flex">
                      <span className="text-slate-400 text-xs font-semibold truncate max-w-[120px] sm:max-w-[150px]">Today: {currentDate || '--'}</span>
                      <span className="text-slate-400 text-[10px] truncate max-w-[160px] sm:max-w-[200px]">
                        {formattedYearLabel}{displayTermName ? ` | ${displayTermName}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                    <span className="font-bold text-slate-400 text-xs sm:text-sm">{currentTime || '--:--'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Section: Search and User Menu */}
          <div className="relative z-10 ml-2 flex min-w-0 flex-1 items-center justify-end gap-1 sm:ml-3 sm:gap-1.5 md:ml-4 md:gap-2 lg:gap-3">
            {/* Desktop Search - Fluid width that expands/shrinks with available space */}
            {isLoading ? (
              <div className="hidden sm:flex flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
                <Skeleton className="h-9 sm:h-10 w-full rounded-full" />
              </div>
            ) : user && (
              <div className="hidden min-w-0 flex-1 overflow-hidden sm:flex transition-all duration-300 ease-in-out">
                <GlobalSearch />
              </div>
            )}

          {/* Mobile Search */}
          {isLoading ? (
            <div className="min-w-0 max-w-none flex-1 overflow-hidden sm:hidden">
              <Skeleton className="h-8 w-full" />
            </div>
          ) : user && (
            <div className="min-w-0 max-w-none flex-1 overflow-hidden sm:hidden">
              <GlobalSearch />
            </div>
          )}


          {/* Right: Icons and User Menu */}
          <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-1 md:gap-2">
            {/* Enroll Button (for unauthenticated users) */}
            {!user && (
              <Button
                variant="default"
                size="sm"
                className="hidden sm:flex gap-2 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => router.push("/enroll")}
              >
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{navLabel("Enroll Now")}</span>
              </Button>
            )}

            {/* Notification and Message Icons */}
            {isLoading ? (
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg" />
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg" />
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg" />
              </div>
            ) : user && (
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
                {/* Notifications Dropdown */}
                <DropdownMenu
                  open={notificationsOpen}
                  onOpenChange={(open) => {
                    setNotificationsOpen(open);
                    if (open) {
                      void markBellNotificationsAsSeen();
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative h-8 w-8 text-gray-900 hover:text-gray-900 dark:text-white dark:hover:bg-[#222222] dark:hover:text-white sm:h-9 sm:w-9 focus-visible:outline-none focus-visible:ring-0 ${useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-gray-100"}`}
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 font-bold" />
                      {unreadCount > 0 && (
                        <span className="absolute right-0 top-0 flex h-[16px] min-w-[16px] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-md bg-[var(--brand-color,#e35336)] px-1 text-[9px] font-bold text-white sm:h-[18px] sm:min-w-[18px] sm:text-[10px]">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 sm:w-96 dark:bg-[#1A1A1A] max-w-[95vw]">
                    <DropdownMenuLabel className="flex items-center justify-between dark:text-white">
                      <a href="/notifications" className="flex items-center justify-between w-full hover:text-[var(--brand-color,#e35336)]">
                        <span className="text-sm sm:text-base">{navLabel("Alerts & Notifications")}</span>
                      </a>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[250px] sm:h-[300px]">
                      {notificationsLoading ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-color,#e35336)]" />
                        </div>
                      ) : groupedBellNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-[#888888] text-sm">
                          {navLabel("No notifications")}
                        </div>
                      ) : (
                        groupedBellNotifications.map((notification: NavbarNotification) => {
                          const localized = localizeNotificationText(notification, language);
                          const isRead = isGroupedNotificationRead(notification);
                          return (
                          <div
                            key={notification.id}
                            className={`p-2 sm:p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors ${!isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => {
                              void markNavbarNotificationAsRead(notification);
                              if (notification.actionUrl) {
                                router.push(notification.actionUrl);
                              }
                            }}
                          >
                            <div className="flex gap-2 sm:gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs sm:text-sm ${!isRead ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
                                    {localized.title}
                                  </p>
                                  {!isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                                {localized.message && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                    {localized.message}
                                  </p>
                                )}

                                <p className="text-xs text-gray-400 dark:text-[#888888] mt-1">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </ScrollArea>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full border border-[var(--brand-color,#e35336)]/30 bg-[rgba(var(--brand-color-rgb),0.14)] text-sm font-semibold text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.22)] hover:text-[var(--brand-color,#e35336)] dark:border-[var(--brand-color,#e35336)]/35 dark:bg-[rgba(var(--brand-color-rgb),0.2)]"
                          onClick={() => router.push('/notifications')}
                        >
                          {navLabel("View all notifications")}
                        </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Communications Dropdown - Only show if feature is enabled */}
                {isCommunicationEnabled && !isSuperAdmin && (
                  <DropdownMenu
                    open={communicationsOpen}
                    onOpenChange={(open) => {
                      setCommunicationsOpen(open);
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative h-8 w-8 text-slate-900 hover:text-slate-900 dark:text-white dark:hover:bg-[#222222] dark:hover:text-white sm:h-9 sm:w-9 ${useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-slate-100"}`}
                      aria-label="Communications"
                    >
                        <MessageSquare className="h-5 w-5 font-bold sm:h-6 sm:w-6" />
                        {unreadCommunicationsCount > 0 && (
                          <span className="absolute right-0 top-0 flex h-[16px] min-w-[16px] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-md bg-[var(--brand-color,#e35336)] px-1 text-[9px] font-bold text-white sm:h-[18px] sm:min-w-[18px] sm:text-[10px]">
                            {unreadCommunicationsCount > 99 ? '99+' : unreadCommunicationsCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[340px] sm:w-[450px] md:w-[500px] max-h-[400px] sm:max-h-[500px] dark:bg-[#1A1A1A] max-w-[95vw]">

                      <DropdownMenuLabel className="flex items-center justify-between dark:text-white">
                        <span className="text-sm sm:text-base">{navLabel("Communication Book")}</span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-[250px] sm:h-[300px]">
                        {communicationBookNotifications.length === 0 && recentStaffMessageConversations.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-[#888888] text-sm">
                            {navLabel("No communication notifications")}
                          </div>
                        ) : (
                          <>
                          {recentStaffMessageConversations.map((conversation: MessagingConversationListItem) => (
                            <div
                              key={`message-${conversation.conversationId}`}
                              className={`p-2 sm:p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors ${conversation.unreadCount > 0 ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                              onClick={() => router.push(`/messages?conversationId=${conversation.conversationId}`)}
                            >
                              <div className="flex gap-2 sm:gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-[#1E3A8A]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs sm:text-sm ${conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
                                      {getStaffMessageConversationTitle(conversation)}
                                    </p>
                                    {conversation.unreadCount > 0 && (
                                      <span className="rounded-md bg-[var(--brand-color,#e35336)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                                      </span>
                                    )}
                                  </div>
                                  {conversation.lastMessage?.content && (
                                    <p className="text-xs text-gray-500 dark:text-[#888888] mt-0.5 line-clamp-2">
                                      {conversation.lastMessage.content}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 dark:text-[#888888] mt-1">
                                    {formatTimeAgo(conversation.updatedAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {communicationBookNotifications.map((notification: any) => {
                            const localized = localizeNotificationText(notification, language);
                            return (
                            <div
                              key={notification.id}
                              className={`p-2 sm:p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors ${!isNotificationRead(notification) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                              onClick={() => {
                                markAsRead(notification.id);
                                router.push(notification.actionUrl || '/list/communications');
                              }}
                            >
                              <div className="flex gap-2 sm:gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-[#1E3A8A]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs sm:text-sm ${!isNotificationRead(notification) ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
                                      {localized.title}
                                    </p>
                                    {!isNotificationRead(notification) && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  {localized.message && (
                                    <p className="text-xs text-gray-500 dark:text-[#888888] mt-0.5 line-clamp-2">
                                      {localized.message}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 dark:text-[#888888] mt-1">
                                    {formatTimeAgo(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                          </>
                        )}
                      </ScrollArea>
                      <DropdownMenuSeparator />
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full border border-[var(--brand-color,#e35336)]/30 bg-[rgba(var(--brand-color-rgb),0.14)] text-sm font-semibold text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.22)] hover:text-[var(--brand-color,#e35336)] dark:border-[var(--brand-color,#e35336)]/35 dark:bg-[rgba(var(--brand-color-rgb),0.2)]"
                          onClick={() => router.push('/list/communications')}
                        >
                          {navLabel("View all communications")}
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* User Menu */}
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                <div className="hidden md:block space-y-1">
                  <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                  <Skeleton className="h-2 sm:h-3 w-14 sm:w-16" />
                </div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-auto p-1 sm:p-2 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent hover:text-inherit active:bg-transparent group"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                      <div className="hidden md:block text-right min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[60px] sm:max-w-[80px] lg:max-w-[100px]">
                          {user.name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 capitalize truncate max-w-[60px] sm:max-w-[100px] lg:max-w-[120px]">
                          {roleLabel(user.role)}
                        </p>
                      </div>
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 border-2 border-white shadow flex-shrink-0">
                        {user.avatarUrl ? (
                          <AvatarImage src={resolveAssetUrl(user.avatarUrl) || user.avatarUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback className="font-semibold text-xs sm:text-sm">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <ChevronDown className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-lg dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
                  align="end"
                  forceMount
                >
                  <div className="border-b border-gray-100 px-4 py-4 dark:border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 shrink-0 border-2 border-gray-200 dark:border-[#2A2A2A]">
                        {user.avatarUrl ? (
                          <AvatarImage src={resolveAssetUrl(user.avatarUrl) || user.avatarUrl} alt={user.name} className="object-cover" />
                        ) : (
                          <AvatarFallback className="text-sm font-semibold">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{roleLabel(user.role)}</p>
                      </div>
                    </div>
                  </div>

                  <nav className="p-1.5 space-y-0.5" role="navigation">
                    <DropdownMenuItem
                      asChild
                      className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white dark:focus:bg-[#222222]"
                    >
                      <Link href={dashboardPath}>
                        <LayoutDashboard className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                        <span>{navLabel("Dashboard")}</span>
                        <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      asChild
                      className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white dark:focus:bg-[#222222]"
                    >
                      <Link href="/profile">
                        <User className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                        <span>{navLabel("Profile")}</span>
                        <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                      </Link>
                    </DropdownMenuItem>

                    {isParent && (
                      <>
                        <DropdownMenuItem
                          asChild
                          className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white dark:focus:bg-[#222222]"
                        >
                          <Link href="/parent/children">
                            <Users className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                            <span>{navLabel("My Children")}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white dark:focus:bg-[#222222]"
                        >
                          <Link href="/parent/fees">
                            <CreditCard className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                            <span>{navLabel("Fees")}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {isTeacher && (
                      <DropdownMenuItem
                        asChild
                        className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white dark:focus:bg-[#222222]"
                      >
                        <Link href="/classes">
                          <Home className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                          <span>{navLabel("My Classes")}</span>
                          <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      asChild
                      className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222222] dark:hover:text-white dark:focus:bg-[#222222]"
                    >
                      <Link href="/help">
                        <HelpCircle className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white" />
                        <span>{navLabel("Help")}</span>
                        <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-gray-400" />
                      </Link>
                    </DropdownMenuItem>
                  </nav>

                  <div className="border-t border-gray-100 dark:border-[#2A2A2A] p-1.5">
                    <DropdownMenuItem
                      className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:focus:bg-red-950/30"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 text-red-400" />
                      <span>{navLabel("Logout")}</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3" asChild>
                  <Link href="/sign-in">{navLabel("Sign In")}</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  onClick={() => router.push("/enroll")}
                >
                  {navLabel("Enroll Now")}
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

    </header>

  );
};

export default Navbar;
