
"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { schoolsAPI, announcementsAPI, communicationsAPI, platformSettingsAPI } from "@/lib/api";
import api, { eventsAPI } from "@/lib/api";
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
  actionUrl?: string;
  createdAt: string;
}

interface NavbarProps {
  sidebarCollapsed?: boolean;
}

const Navbar = ({ sidebarCollapsed = false }: NavbarProps) => {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formattedYearLabel, currentTerm, periodLabel, displayTermName, formatDate: formatSchoolDate } = useAcademicYear();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch events for calendar popover
  const { data: eventsData } = useQuery({
    queryKey: ['events-navbar'],
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
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
      setCurrentDate(formatSchoolDate(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [formatSchoolDate]);

  // Use React Query for school data - cached across navigations
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ["school", user?.schoolId],
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
    queryKey: ["notifications", user?.id, user?.schoolId],
    queryFn: async () => {
      const [notificationsRes, countRes, categoriesRes] = await Promise.all([
        api.get('/notifications', { params: { limit: 10 } }),
        api.get('/notifications/unread-count'),
        api.get('/notifications/categories'),
      ]);
      return {
        notifications: notificationsRes.data || [],
        unreadCount: countRes.data?.count || 0,
        categories: categoriesRes.data?.categories || null,
      };
    },
    enabled: !!user?.id && !!user?.schoolId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const notifications = notificationsData?.notifications || [];
  // Filter out communication-book notifications from the main notification dropdown
  // Communication-book items are shown in the MessageSquare (Communications) dropdown.
  const filteredNotifications = notifications.filter((n: Notification) => n.type !== 'COMMUNICATION');
  const unreadCount = filteredNotifications.filter((n: Notification) => !n.isRead).length;

  // Use React Query for communications - get user's unread count (user-specific cache)
  const { data: unreadCommCount } = useQuery({
    queryKey: ["communications-unread-count", user?.id, user?.schoolId],
    queryFn: async () => {
      // Use user-specific count endpoint
      const response = await communicationsAPI.getMyCount('OPEN');
      return response.data?.count || 0;
    },
    enabled: !!user?.id && !!user?.schoolId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const unreadCommunicationsCount = unreadCommCount || 0;

  // Use React Query for communications - get recent communications for the dropdown (user-specific)
  const { data: communicationsData } = useQuery({
    queryKey: ["communications-navbar", user?.id, user?.schoolId],
    queryFn: async () => {
      // Use getAll which already has role-based filtering
      const response = await communicationsAPI.getAll({ limit: 5, status: 'OPEN' });
      return response.data?.data || [];
    },
    enabled: !!user?.id && !!user?.schoolId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const communications = communicationsData || [];

  // Fetch active announcements count (user-specific)
  const { data: announcementCount } = useQuery({
    queryKey: ["announcement-count", user?.id, user?.role],
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
    queryKey: ['platform-settings-flags'],
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
      await api.post(`/notifications/${id}/read`);
      // Update cache optimistically - include user ID in query key
      queryClient.setQueryData(["notifications", user?.id, user?.schoolId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: Notification) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      });
      // Force full page notifications list invalidation
      queryClient.invalidateQueries({ queryKey: ["notification-categories"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "all"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "academic"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "communication"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "event"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "finance"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "system"] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      // Update cache optimistically - include user ID in query key
      queryClient.setQueryData(["notifications", user?.id, user?.schoolId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: Notification) => ({ ...n, isRead: true })),
          unreadCount: 0,
        };
      });
      // Force full page notifications list invalidation
      queryClient.invalidateQueries({ queryKey: ["notification-categories"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "all"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "academic"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "communication"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "event"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "finance"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "system"] });
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
    <header className="sticky top-0 z-50 w-full border-b bg-[#F1F5F9] dark:bg-[#111827] backdrop-blur supports-[backdrop-filter]:bg-[#F1F5F9]/60 dark:supports-[backdrop-filter]:bg-[#111827]/60 transition-all duration-300">
      <div className="w-full h-18">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-4 px-2 sm:px-4 overflow-hidden">
          {/* Left: Mobile Menu Button and Logo */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-[#e35336] hover:text-white transition-all duration-200 shadow-sm"
                  aria-label="Toggle menu"
                >
                  <HamburgerMenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 sm:w-96 p-0 bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-gray-700 max-w-[90vw]">
                <SheetHeader className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 bg-white/95 dark:bg-[#111827]/95 backdrop-blur flex flex-row items-center justify-between">
                  <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <School className="h-6 w-6 text-[#e35336] flex-shrink-0" />
                    {schoolLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <span className="truncate max-w-[120px] sm:max-w-none">{school?.name || 'SMS Portal'}</span>
                    )}
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 h-8 w-8"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] flex-1">
                  <div className="p-4">
                    <Menu collapsed={false} onItemClick={() => setMobileMenuOpen(false)} />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>


          </div>

          {/* Right Section: Clock and User Menu */}
          {/* Central: Real-time Clock Display */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-3 py-1 rounded-lg text-sm ml-2">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div className="flex flex-col text-left hidden lg:flex">
                        <span className="text-gray-600 dark:text-gray-300 text-xs font-semibold truncate max-w-[150px]">Today: {currentDate || '--'}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[10px] truncate max-w-[200px]">
                          {formattedYearLabel}{periodLabel ? ` | ${periodLabel}` : ""}
                        </span>
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 sm:p-3 bg-white dark:bg-gray-800" align="center">
                    <WeeklyCalendar events={events} onEventClick={() => { setCalendarOpen(false); router.push('/list/events'); }} />
                  </PopoverContent>
                </Popover>
                <div className="hidden md:flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm">{currentTime || '--:--:--'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Search and User Menu */}
          <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
            {/* Desktop Search */}
            {isLoading ? (
              <div className="hidden sm:flex flex-1 max-w-5xl min-w-0">
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ) : user && (
              <div className="hidden sm:flex flex-1 max-w-5xl min-w-0">
                <GlobalSearch />
              </div>
            )}

          {/* Mobile Search - visible xs only */}
          {isLoading ? (
            <div className="sm:hidden flex-1 min-w-0">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : user && (
            <div className="sm:hidden flex-1 min-w-0">
              <GlobalSearch />
            </div>
          )}


          {/* Right: Icons and User Menu */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
            {/* Enroll Button (for unauthenticated users) */}
            {!user && (
              <Button
                variant="default"
                size="sm"
                className="hidden sm:flex gap-2"
                asChild
              >
                <Link href="/enroll">
                  <UserPlus className="h-4 w-4" />
                  <span>Enroll Now</span>
                </Link>
              </Button>
            )}

            {/* Notification and Message Icons */}
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            ) : user && (
              <div className="flex items-center gap-2">


                {/* Notifications Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label="Notifications"
                    >
                      <Bell className="h-8 w-8 font-bold " />
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-md flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-96 dark:bg-slate-900">

                    <DropdownMenuLabel className="flex items-center justify-between dark:text-white">
                      <a href="/notifications" className="flex items-center justify-between w-full hover:text-[#e35336]">
                        <span>Alerts & Notifications</span>
                      </a>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-xs text-[#e35336] hover:text-blue-700"
                          onClick={markAllAsRead}
                        >
                          Mark all as read
                        </Button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[300px]">
                      {notificationsLoading ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-[#e35336]" />
                        </div>
                      ) : filteredNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                          No notifications
                        </div>
                      ) : (
                        filteredNotifications.map((notification: any) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => {
                              markAsRead(notification.id);
                              if (notification.actionUrl) {
                                router.push(notification.actionUrl);
                              }
                            }}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
                                    {notification.title}
                                  </p>
                                  {!notification.isRead && (
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
                        className="w-full text-sm text-white bg-[#e35336] hover:bg-[#c94429] dark:bg-slate-700 dark:hover:bg-slate-600"
                        onClick={() => router.push('/list/communications')}
                      >
                        View all notifications
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Communications Dropdown - Only show if feature is enabled */}
                {isCommunicationEnabled && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        aria-label="Communications"
                      >
                        <MessageSquare className="h-6 w-6 font-bold text-dark dark:text-white" />
                        {unreadCommunicationsCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-md flex items-center justify-center px-1">
                            {unreadCommunicationsCount > 99 ? '99+' : unreadCommunicationsCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[500px] max-h-[500px] dark:bg-slate-900">

                      <DropdownMenuLabel className="flex items-center justify-between dark:text-white">
                        <span>Communications ({unreadCommunicationsCount} open)</span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-[300px]">
                        {communications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                            No open communications
                          </div>
                        ) : (
                          communications.map((comm: any) => (
                            <div
                              key={comm.id}
                              className="p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                              onClick={() => router.push(`/list/communications?conversationId=${comm.id}`)}
                            >
                              <div className="flex gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  <MessageSquare className="h-5 w-5 text-[#1E3A8A]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                      {comm.subject}
                                    </p>
                                  </div>
                                  {comm.message && (
<p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                      {comm.message}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-400 dark:text-slate-500">
                                      {comm.createdBy?.name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500">
                                      {comm.createdAt ? formatTimeAgo(comm.createdAt) : ''}
                                    </p>
                                  </div>
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
                          className="w-full text-sm text-white bg-[#e35336] hover:bg-[#c94429] dark:bg-slate-700 dark:hover:bg-slate-600"
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
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="hidden md:block space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-auto p-2 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent hover:text-inherit active:bg-transparent group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="hidden md:block text-right min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[80px] sm:max-w-[100px]">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize truncate max-w-[100px] sm:max-w-[120px]">
                          {user.role?.toLowerCase().replace("_", " ") || "User"}
                        </p>
                      </div>
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-white shadow flex-shrink-0">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[320px] dark:bg-slate-900" align="end" forceMount>

                  {/* Compact User Info */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-600 shadow">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-[#e35336] to-[#c94429] text-white font-bold text-lg">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#e35336]/10 text-[#e35336] dark:bg-[#e35336]/20">
                          {user.role?.toLowerCase().replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="dark:bg-slate-700" />

                  {/* Quick Links */}
<DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/dashboard")} className="dark:text-slate-200 dark:focus:bg-slate-800">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-[#e35336]" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/profile")} className="dark:text-slate-200 dark:focus:bg-slate-800">
                      <User className="mr-2 h-4 w-4 text-[#e35336]" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    {user.role?.toLowerCase().includes("parent") && (
                      <>
                        <DropdownMenuItem onClick={() => router.push("/parent/children")} className="dark:text-slate-200 dark:focus:bg-slate-800">
                          <Users className="mr-2 h-4 w-4 text-blue-500" />
                          <span>My Children</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/parent/fees")} className="dark:text-slate-200 dark:focus:bg-slate-800">
                          <CreditCard className="mr-2 h-4 w-4 text-amber-500" />
                          <span>Fees</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.role?.toLowerCase().includes("teacher") && (
                      <DropdownMenuItem onClick={() => router.push("/classes")} className="dark:text-slate-200 dark:focus:bg-slate-800">
                        <Home className="mr-2 h-4 w-4 text-purple-500" />
                        <span>My Classes</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="dark:bg-slate-700" />

                  <DropdownMenuItem onClick={() => router.push("/help")} className="dark:text-slate-200 dark:focus:bg-slate-800">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="dark:bg-slate-700" />

                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:bg-slate-800"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/sign-up">Sign Up</Link>
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