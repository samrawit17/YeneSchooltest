"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { schoolsAPI, platformSettingsAPI } from "@/lib/api";
import { notificationsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { announcementsAPI, eventsAPI } from "@/lib/api/content";
import { useAcademicYear } from "@/context/AcademicYearContext";
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
  Settings,
  HelpCircle,
  LayoutDashboard,
  ChevronDown,
  Home,
  Shield,
  FileText,
  Mail,
  School,
  Calendar,
  CreditCard,
  Clock,
  Users,
  BookOpen,
  X,
  Menu as HamburgerMenuIcon,
  BellRing,
  Check,
  XCircle,
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
  Presentation,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SchoolInfo {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  userId?: string | null;
  actionUrl?: string;
  createdAt: string;
}

interface NavbarProps {
  sidebarCollapsed?: boolean;
  useBrandNavigation?: boolean;
}

const COMMUNICATION_NOTIFICATION_TYPES = ["COMMUNICATION", "MESSAGE_RECEIVED"];
const GLOBAL_NOTIFICATION_READS_KEY = "global_notification_reads";

const Navbar = ({
  sidebarCollapsed = false,
  useBrandNavigation = false,
}: NavbarProps) => {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formattedYearLabel, currentTerm, periodLabel, displayTermName, formatDate: formatSchoolDate } = useAcademicYear();
  
  // Format period dates for display
  const periodDateRange = useMemo(() => {
    if (!currentTerm?.startDate || !currentTerm?.endDate) return null;
    const start = formatSchoolDate(new Date(currentTerm.startDate));
    const end = formatSchoolDate(new Date(currentTerm.endDate));
    return { start, end };
  }, [currentTerm, formatSchoolDate]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [communicationsOpen, setCommunicationsOpen] = useState(false);

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
      setCurrentTime(`${hours}:${minutes}`);
      setCurrentDate(formatSchoolDate(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [formatSchoolDate]);

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

  // Use React Query for notifications - cached across navigations but user-specific
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: queryKeys.notifications.list(user?.id, user?.schoolId),
    queryFn: async () => {
      const communicationTypes = COMMUNICATION_NOTIFICATION_TYPES.join(",");
      const [bellNotificationsRes, communicationNotificationsRes] = await Promise.all([
        notificationsAPI.getAll({ limit: 10 }),
        notificationsAPI.getAll({ limit: 10, types: communicationTypes }),
      ]);
      return {
        bellNotifications: bellNotificationsRes.data || [],
        communicationNotifications: communicationNotificationsRes.data || [],
      };
    },
    enabled: !!user?.id && !!user?.schoolId,
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

  const unreadCount = bellNotifications.filter((notification: Notification) => !isNotificationRead(notification)).length;
  const unreadCommunicationsCount = communicationNotifications.filter((notification: Notification) => !isNotificationRead(notification)).length;

  // Fetch active announcements count (user-specific)
  const { data: announcementCount } = useQuery({
    queryKey: queryKeys.announcements.activeCount(user?.id, user?.role),
    queryFn: async () => {
      const response = await announcementsAPI.getActiveCount({ role: user?.role });
      return response.data?.count || 0;
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const activeAnnouncements = announcementCount || 0;

  // Fetch platform settings for feature flags - MUST BE FIRST to ensure it's available for other queries
  const { data: platformSettings, isLoading: platformSettingsLoading } = useQuery({
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

  const markAllAsRead = async (types?: string[]) => {
    try {
      const collections = [
        ...(notificationsData?.bellNotifications || []),
        ...(notificationsData?.communicationNotifications || []),
      ] as Notification[];
      const matchingNotifications = collections.filter((notification) =>
        !types?.length || types.includes(notification.type)
      );
      const globalIds = matchingNotifications
        .filter((notification) => notification.userId === null)
        .map((notification) => notification.id);
      const userScopedTypes = matchingNotifications.some(
        (notification) => notification.userId !== null
      );

      if (globalIds.length) {
        rememberSeenGlobalNotifications(globalIds);
      }

      if (userScopedTypes) {
        await notificationsAPI.markAllRead(types?.length ? { types } : undefined);
      }

      // Update cache optimistically - include user ID in query key
      queryClient.setQueryData(queryKeys.notifications.list(user?.id, user?.schoolId), (old: any) => {
        if (!old) return old;
        const shouldMark = (notification: Notification) =>
          !types?.length || types.includes(notification.type);

        return {
          ...old,
          bellNotifications: (old.bellNotifications || []).map((n: Notification) =>
            shouldMark(n) ? { ...n, isRead: true } : n
          ),
          communicationNotifications: (old.communicationNotifications || []).map((n: Notification) =>
            shouldMark(n) ? { ...n, isRead: true } : n
          ),
          bellUnreadCount: types?.length
            ? (types.some((type) => COMMUNICATION_NOTIFICATION_TYPES.includes(type))
                ? old.bellUnreadCount
                : 0)
            : 0,
          communicationUnreadCount: types?.length
            ? (types.some((type) => COMMUNICATION_NOTIFICATION_TYPES.includes(type))
                ? 0
                : old.communicationUnreadCount)
            : 0,
        };
      });
      invalidateNotificationQueries();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    router.push("/sign-in");
  };

  // Navigation items for mobile menu
  const getNavigationItems = () => {
    const baseItems = [

      {
        label: "Profile",
        icon: <User className="w-4 h-4" />,
        href: "/profile",
        roles: ["all"],
      },
      {
        label: "My Children",
        icon: <Users className="w-4 h-4" />,
        href: "/parent/children",
        roles: ["parent"],
      },
      {
        label: "Results",
        icon: <BookOpen className="w-4 h-4" />,
        href: "/parent/results",
        roles: ["parent"],
      },
      {
        label: "Fees",
        icon: <CreditCard className="w-4 h-4" />,
        href: "/parent/fees",
        roles: ["parent"],
      },
      {
        label: "Calendar",
        icon: <Calendar className="w-4 h-4" />,
        href: "/calendar",
        roles: ["all"],
      },
      {
        label: "Help & Support",
        icon: <HelpCircle className="w-4 h-4" />,
        href: "/help",
        roles: ["all"],
      },

    ];

    // Add role-specific items
    const roleSpecificItems = [];
    const userRole = user?.role?.toLowerCase() || "";



    if (userRole.includes("teacher")) {
      roleSpecificItems.push({
        label: "My Classes",
        icon: <Home className="w-4 h-4" />,
        href: "/classes",
        roles: ["teacher"],
      });
    }

    return [...baseItems.filter(item =>
      item.roles.includes("all") || item.roles.some(role => userRole.includes(role))
    ), ...roleSpecificItems];
  };

  const navigationItems = getNavigationItems();

  return (
    <header className={`sticky top-0 z-50 w-full border-b dark:border-[#334155] dark:bg-[#111827] dark:supports-[backdrop-filter]:bg-[#111827]/60 transition-all duration-300 ${
      useBrandNavigation
        ? "border-[rgba(var(--brand-color-rgb),0.53)] bg-[rgba(var(--brand-color-rgb),0.42)] supports-[backdrop-filter]:bg-[rgba(var(--brand-color-rgb),0.42)]"
        : "border-gray-200 bg-[#F1F5F9] supports-[backdrop-filter]:bg-[#F1F5F9]/90"
    }`}>
      <div className="w-full h-14 sm:h-16 md:h-18">
        <div className="flex items-center justify-between h-full gap-1 sm:gap-2 md:gap-4 px-2 sm:px-3 md:px-4 overflow-hidden">
          {/* Left: Mobile Menu Button and Logo */}
          <div className="relative z-20 flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0 min-w-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`lg:hidden rounded-lg dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 transition-all duration-200 shadow-sm h-8 w-8 sm:h-9 sm:w-9 ${
                    useBrandNavigation
                      ? "bg-white/80 text-slate-800 hover:bg-[rgba(var(--brand-color-rgb),0.16)]"
                      : "bg-gray-100 text-slate-800 hover:bg-gray-200"
                  }`}
                  aria-label="Toggle menu"
                >
                  <HamburgerMenuIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className={`w-72 sm:w-80 md:w-96 p-0 dark:bg-[#111827] dark:border-[#374151] max-w-[85vw] ${
                useBrandNavigation
                  ? "bg-[rgba(var(--brand-color-rgb),0.18)] border-r border-[rgba(var(--brand-color-rgb),0.18)]"
                  : "bg-white border-r border-gray-200"
              }`}>
                <SheetHeader className={`p-3 sm:p-4 dark:border-[#374151] sticky top-0 z-20 dark:bg-[#111827]/95 backdrop-blur flex flex-row items-center justify-between ${
                  useBrandNavigation
                    ? "border-b border-[rgba(var(--brand-color-rgb),0.14)] bg-white/70"
                    : "border-b border-gray-200 bg-white/95"
                }`}>
                  <SheetTitle className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <School className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-color,#e35336)] flex-shrink-0" />
                    {schoolLoading ? (
                      <Skeleton className="h-5 sm:h-6 w-24" />
                    ) : (
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">{school?.name || 'SMS Portal'}</span>
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

            <Popover open={mobileCalendarOpen} onOpenChange={setMobileCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`sm:hidden relative h-8 w-8 text-slate-900 hover:text-slate-900 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white ${
                    useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-slate-100"
                  }`}
                  aria-label="Weekly calendar"
                >
                  <Calendar className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(92vw,360px)] p-2 bg-white dark:bg-gray-800" align="start">
                <WeeklyCalendar events={events} onEventClick={() => { setMobileCalendarOpen(false); router.push('/list/calendar'); }} />
              </PopoverContent>
            </Popover>

          </div>

          {/* Center: Real-time Clock Display - Hidden on small mobile, visible on sm+ */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 md:gap-3 py-1 rounded-lg text-sm ml-2 flex-shrink-0">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
                <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className={`flex items-center gap-1 dark:hover:bg-gray-800 p-1 rounded cursor-pointer ${useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-gray-100"}`}>
                      <Calendar className="sm:hidden h-5 w-5 text-slate-500 dark:text-gray-400" />
                      <Calendar className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4 text-slate-500 dark:text-gray-400" />
                      <div className="flex flex-col text-left hidden lg:flex">
                        <span className="text-slate-700 dark:text-gray-300 text-xs font-semibold truncate max-w-[120px] sm:max-w-[150px]">Today: {currentDate || '--'}</span>
                        <span className="text-slate-500 dark:text-gray-400 text-[10px] truncate max-w-[160px] sm:max-w-[200px]">
                          {formattedYearLabel}{displayTermName ? ` | ${displayTermName}` : ""}
                        </span>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] max-w-[92vw] p-2 sm:p-3 bg-white dark:bg-gray-800" align="center">
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

          {/* Right Section: Search and User Menu */}
          <div className="relative z-10 ml-1 flex flex-1 items-center justify-end gap-1.5 sm:ml-0 sm:gap-2 md:gap-4 min-w-0">
            {/* Desktop Search - Fluid width that expands/shrinks with available space */}
            {isLoading ? (
              <div className="hidden sm:flex flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
                <Skeleton className="h-9 sm:h-10 w-full rounded-full" />
              </div>
            ) : user && (
              <div className="hidden sm:flex flex-1 min-w-0 transition-all duration-300 ease-in-out">
                <GlobalSearch />
              </div>
            )}

          {/* Mobile Search */}
          {isLoading ? (
            <div className="sm:hidden flex-1 min-w-0 max-w-none">
              <Skeleton className="h-8 w-full" />
            </div>
          ) : user && (
            <div className="sm:hidden flex-1 min-w-0 max-w-none">
              <GlobalSearch />
            </div>
          )}


          {/* Right: Icons and User Menu */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Enroll Button (for unauthenticated users) */}
            {!user && (
              <Button
                variant="default"
                size="sm"
                className="hidden sm:flex gap-2 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => router.push("/enroll")}
              >
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Enroll Now</span>
              </Button>
            )}

            {/* Notification and Message Icons */}
            {isLoading ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg" />
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg" />
                <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg" />
              </div>
            ) : user && (
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Notifications Dropdown */}
                <DropdownMenu
                  open={notificationsOpen}
                  onOpenChange={(open) => {
                    setNotificationsOpen(open);
                    if (open) {
                      void markAllAsRead();
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative h-8 w-8 text-slate-900 hover:text-slate-900 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white sm:h-9 sm:w-9 ${useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-slate-100"}`}
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 font-bold" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-[var(--brand-color,#e35336)] text-white text-[9px] sm:text-[10px] font-bold min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] rounded-md flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 sm:w-96 dark:bg-slate-900 max-w-[95vw]">
                    <DropdownMenuLabel className="flex items-center justify-between dark:text-white">
                      <a href="/notifications" className="flex items-center justify-between w-full hover:text-[var(--brand-color,#e35336)]">
                        <span className="text-sm sm:text-base">Alerts & Notifications</span>
                      </a>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[250px] sm:h-[300px]">
                      {notificationsLoading ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-color,#e35336)]" />
                        </div>
                      ) : bellNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                          No notifications
                        </div>
                      ) : (
                        bellNotifications.map((notification: any) => (
                          <div
                            key={notification.id}
                            className={`p-2 sm:p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${!isNotificationRead(notification) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => {
                              markAsRead(notification.id);
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
                                  <p className={`text-xs sm:text-sm ${!isNotificationRead(notification) ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
                                    {notification.title}
                                  </p>
                                  {!isNotificationRead(notification) && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                                {notification.message && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                )}

                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full border border-[var(--brand-color,#e35336)]/30 bg-[rgba(var(--brand-color-rgb),0.14)] text-sm font-semibold text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.22)] hover:text-[var(--brand-color,#e35336)] dark:border-[var(--brand-color,#e35336)]/35 dark:bg-[rgba(var(--brand-color-rgb),0.2)]"
                          onClick={() => router.push('/notifications')}
                        >
                          View all notifications
                        </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Communications Dropdown - Only show if feature is enabled */}
                {isCommunicationEnabled && (
                  <DropdownMenu
                    open={communicationsOpen}
                    onOpenChange={(open) => {
                      setCommunicationsOpen(open);
                      if (open) {
                        void markAllAsRead(COMMUNICATION_NOTIFICATION_TYPES);
                      }
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative h-8 w-8 text-slate-900 hover:text-slate-900 dark:text-white dark:hover:bg-slate-800 dark:hover:text-white sm:h-9 sm:w-9 ${useBrandNavigation ? "hover:bg-[rgba(var(--brand-color-rgb),0.12)]" : "hover:bg-slate-100"}`}
                      aria-label="Communications"
                    >
                        <MessageSquare className="h-5 w-5 font-bold sm:h-6 sm:w-6" />
                        {unreadCommunicationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-[var(--brand-color,#e35336)] text-white text-[9px] sm:text-[10px] font-bold min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] rounded-md flex items-center justify-center px-1">
                            {unreadCommunicationsCount > 99 ? '99+' : unreadCommunicationsCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[340px] sm:w-[450px] md:w-[500px] max-h-[400px] sm:max-h-[500px] dark:bg-slate-900 max-w-[95vw]">

                      <DropdownMenuLabel className="flex items-center justify-between dark:text-white">
                        <span className="text-sm sm:text-base">Communication Book</span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-[250px] sm:h-[300px]">
                        {communicationNotifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                            No communication notifications
                          </div>
                        ) : (
                          communicationNotifications.map((notification: any) => (
                            <div
                              key={notification.id}
                              className={`p-2 sm:p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${!isNotificationRead(notification) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
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
                                      {notification.title}
                                    </p>
                                    {!isNotificationRead(notification) && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  {notification.message && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                    {formatTimeAgo(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </ScrollArea>
                      <DropdownMenuSeparator />
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full border border-[var(--brand-color,#e35336)]/30 bg-[rgba(var(--brand-color-rgb),0.14)] text-sm font-semibold text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.22)] hover:text-[var(--brand-color,#e35336)] dark:border-[var(--brand-color,#e35336)]/35 dark:bg-[rgba(var(--brand-color-rgb),0.2)]"
                          onClick={() => router.push('/list/communications')}
                        >
                          View all communications
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
                          {user.role?.toLowerCase().replace("_", " ") || "User"}
                        </p>
                      </div>
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 border-2 border-white shadow flex-shrink-0">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
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
                  className="w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
                  align="end"
                  forceMount
                >
                  <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(var(--brand-color-rgb),0.16),rgba(var(--brand-color-rgb),0.04))] p-4 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border border-white/70 shadow-md dark:border-slate-600">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback className="text-base font-bold">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center rounded-full bg-[rgba(var(--brand-color-rgb),0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
                            {user.role?.toLowerCase().replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => router.push("/dashboard")}
                        className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]">
                          <LayoutDashboard className="h-4 w-4" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">Dashboard</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">Go to your main workspace</span>
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => router.push("/profile")}
                        className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]">
                          <User className="h-4 w-4" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">Profile</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">Manage your account details</span>
                        </span>
                      </DropdownMenuItem>

                      {user.role?.toLowerCase().includes("parent") && (
                        <>
                          <DropdownMenuItem
                            onClick={() => router.push("/parent/children")}
                            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                              <Users className="h-4 w-4" />
                            </span>
                            <span className="flex-1">
                              <span className="block text-sm font-medium">My Children</span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">View student profiles and activity</span>
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push("/parent/fees")}
                            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                              <CreditCard className="h-4 w-4" />
                            </span>
                            <span className="flex-1">
                              <span className="block text-sm font-medium">Fees</span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">Review payments and balances</span>
                            </span>
                          </DropdownMenuItem>
                        </>
                      )}

                      {user.role?.toLowerCase().includes("teacher") && (
                        <DropdownMenuItem
                          onClick={() => router.push("/classes")}
                          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                            <Home className="h-4 w-4" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-medium">My Classes</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Jump into your assigned classes</span>
                          </span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator className="my-2 bg-slate-200 dark:bg-slate-700" />

                    <DropdownMenuItem
                      onClick={() => router.push("/help")}
                      className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <HelpCircle className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">Help</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Get support and guidance</span>
                      </span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:focus:bg-red-950/30"
                      onClick={handleLogout}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">Logout</span>
                        <span className="block text-xs text-red-500/80 dark:text-red-400/80">End your current session</span>
                      </span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  onClick={() => router.push("/enroll")}
                >
                  Enroll Now
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
