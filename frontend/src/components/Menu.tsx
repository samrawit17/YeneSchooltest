"use client";

import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { schoolSettingsAPI, platformSettingsAPI, schoolsAPI } from "@/lib/api";
import { communicationsAPI } from "@/lib/api/communications";
import { announcementsAPI, eventsAPI } from "@/lib/api/content";
import { subscriptionAPI } from "@/lib/api/subscription";
import { useState, useMemo } from "react";
import { queryKeys } from "@/lib/query-keys";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCircle,
  BookOpen,
  School,
  BookText,
  ClipboardList,
  FileText,
  Trophy,
  Award,
  CalendarCheck,
  CalendarDays,
  Calendar,
  MessageSquare,
  Mail,
  Megaphone,
  CreditCard,
  UserPlus,
  Bell,
  AlertTriangle,
  DollarSign,
  UsersRound,
  Star,
  Clock,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
  MenuIcon,
  X,
  TrendingUp,
  Building2,
  UserCog,
  Crown,
  Bookmark,
  Key,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

// Helper function to get dashboard path based on role
const getDashboardPath = (role: string | undefined): string => {
  if (!role) return "/dashboard";

  const roleMap: Record<string, string> = {
    "admin": "/admin", "it_manager": "/it-manager",
    "super_admin": "/superadmin",
    "teacher": "/teacher",
    "student": "/student",
    "parent": "/parent",
    "registrar": "/registrar",
    "finance": "/finance",
  };

  return roleMap[role.toLowerCase()] || "/dashboard";
};

// Menu item type with optional feature flag
interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  visible: string[];
  featureFlag?: string;
  subscriptionFeature?: string;
  subscriptionTier?: 'CORE' | 'STANDARD' | 'ULTIMATE';
  children?: MenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuItems: MenuSection[] = [
  {
    title: "MENU",
    items: [
      {
        icon: <LayoutDashboard className="w-5 h-5" />,
        label: "Dashboard",
        href: "dashboard", // Special marker for role-based dashboard
        visible: ["admin", "it_manager", "teacher", "student", "parent", "registrar", "finance", "super_admin"],
        children: [
          {
            icon: <BookOpen className="w-4 h-4" />,
            label: "My Classes",
            href: "/teacher/my-class",
            visible: ["teacher"],
          },
          {
            icon: <CalendarCheck className="w-4 h-4" />,
            label: "Attendance",
            href: "/teacher/attendance",
            visible: ["teacher"],
          },
          {
            icon: <ClipboardList className="w-4 h-4" />,
            label: "Exams",
            href: "/teacher/exams",
            visible: ["teacher"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <BookText className="w-4 h-4" />,
            label: "Lessons",
            href: "/teacher/lessons",
            visible: ["teacher"],
            featureFlag: "FEATURE_FLAG_LESSONS",
            subscriptionFeature: "TIMETABLE_MANAGEMENT",
          },
          {
            icon: <Calendar className="w-4 h-4" />,
            label: "Timetable",
            href: "/teacher/timetable",
            visible: ["teacher"],
          },
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "Grade Entry",
            href: "/teacher/grading",
            visible: ["teacher"],
          },
          {
            icon: <BookText className="w-4 h-4" />,
            label: "Lessons",
            href: "/student/lessons",
            visible: ["student"],
            featureFlag: "FEATURE_FLAG_LESSONS",
          },
          {
            icon: <DollarSign className="w-4 h-4" />,
            label: "My Fees",
            href: "/student/fees",
            visible: ["student"],
          },
          {
            icon: <Calendar className="w-4 h-4" />,
            label: "My Timetable",
            href: "/student/timetable",
            visible: ["student"],
          },
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "My Grades",
            href: "/student/grades",
            visible: ["student"],
          },
        ],
      },

      {
        icon: <ClipboardList className="w-5 h-5" />,
        label: "Exams",
        href: "/admin/exams",
        visible: ["admin", "it_manager"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "EXAM_MANAGEMENT",
        children: [
          {
            icon: <ClipboardList className="w-4 h-4" />,
            label: "Assessment",
            href: "/admin/exams",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "Exam Reports",
            href: "/admin/exams/reports",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <Users className="w-4 h-4" />,
            label: "Exam Seating",
            href: "/admin/exams/seating",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_SEATING",
          },
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "Entry Progress",
            href: "/admin/exams/entry-progress",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "Publish Results",
            href: "/admin/exams/publish",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "Grade Review",
            href: "/registrar/grading",
            visible: ["registrar", "admin", "it_manager"],
          },
        ],
      },

      {
        icon: <FileText className="w-5 h-5" />,
        label: "Report Cards",
        href: "/admin/report-cards",
        visible: ["admin", "registrar", "it_manager"],
        featureFlag: "FEATURE_FLAG_GRADING",
        subscriptionFeature: "GRADE_BOOK",
      },
      {
        icon: <Bell className="w-5 h-5" />,
        label: "School Siren",
        href: "/admin/siren-management",
        visible: ["admin", "it_manager"],
        subscriptionTier: "ULTIMATE",
      },
      {
        icon: <Users className="w-5 h-5" />,
        label: "Students",
        href: "/list/students",
        visible: ["admin", "it_manager", "registrar"],
        children: [
          {
            icon: <Users className="w-4 h-4" />,
            label: "All Students",
            href: "/list/students",
            visible: ["admin", "it_manager", "registrar"],
          },
          {
            icon: <GraduationCap className="w-4 h-4" />,
            label: "Student Promotion",
            href: "/admin/promotion",
            visible: ["admin", "registrar", "it_manager"],
          },
          {
            icon: <TrendingUp className="w-4 h-4" />,
            label: "Student Rankings",
            href: "/admin/exams/rankings",
            visible: ["admin", "registrar", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <CreditCard className="w-4 h-4" />,
            label: "ID Cards",
            href: "/admin/id-cards",
            visible: ["admin", "registrar", "it_manager"],
          },
        ],
      },
      {
        icon: <MessageSquare className="w-5 h-5" />,
        label: "Communication Book",
        href: "/list/communications",
        visible: ["teacher", "admin", "it_manager", "registrar", "parent"],
        featureFlag: "FEATURE_FLAG_COMMUNICATION_BOOK",
      },
      {
        icon: <UserCircle className="w-5 h-5" />,
        label: "People",
        href: "/list/staff",
        visible: ["admin", "it_manager", "registrar"],
        children: [
          {
            icon: <Users className="w-4 h-4" />,
            label: "Staff",
            href: "/list/staff",
            visible: ["admin", "it_manager", "registrar"],
          },
          {
            icon: <Users className="w-4 h-4" />,
            label: "Teachers",
            href: "/list/teachers",
            visible: ["admin", "registrar", "it_manager"],
          },
          {
            icon: <Users className="w-4 h-4" />,
            label: "Parents",
            href: "/list/parents",
            visible: ["admin", "registrar", "it_manager"],
          },
        ],
      },
      {
        icon: <CalendarCheck className="w-5 h-5" />,
        label: "Attendance",
        href: "/admin/attendance",
        visible: ["admin", "it_manager"],
        subscriptionFeature: "ATTENDANCE_TRACKING",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "Academics",
        href: "/admin/academics",
        visible: ["admin", "it_manager", "registrar"],
        children: [
          {
            icon: <BookOpen className="w-4 h-4" />,
            label: "Overview",
            href: "/admin/academics",
            visible: ["admin", "it_manager", "registrar"],
          },
          {
            icon: <Users className="w-4 h-4" />,
            label: "Class & Sections",
            href: "/admin/class-sections",
            visible: ["admin", "it_manager", "registrar"],
          },
          {
            icon: <Calendar className="w-4 h-4" />,
            label: "Timetable",
            href: "/admin/timetable",
            visible: ["admin", "it_manager"],
            subscriptionFeature: "TIMETABLE_MANAGEMENT",
          },
          {
            icon: <Bookmark className="w-4 h-4" />,
            label: "Assign Teachers",
            href: "/admin/assignments",
            visible: ["admin", "it_manager"],
          },
          {
            icon: <Calendar className="w-4 h-4" />,
            label: "Academic Years",
            href: "/admin/academic-years",
            visible: ["admin", "it_manager", "registrar"],
          },
        ],
      },
      {
        icon: <GraduationCap className="w-5 h-5" />,
        label: "My Children",
        href: "/parent/children",
        visible: ["parent"],
      },
      {
        icon: <CalendarCheck className="w-5 h-5" />,
        label: "Child Attendance",
        href: "/parent/attendance",
        visible: ["parent"],
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        label: "Children Grades",
        href: "/parent/grades",
        visible: ["parent"],
      },
      {
        icon: <DollarSign className="w-5 h-5" />,
        label: "Children Fees",
        href: "/parent/fees",
        visible: ["parent"],
      },
      {
        icon: <BookText className="w-5 h-5" />,
        label: "Lessons",
        href: "/parent/lessons",
        visible: ["parent"],
        featureFlag: "FEATURE_FLAG_LESSONS",
      },
      {
        icon: <Calendar className="w-5 h-5" />,
        label: "Timetable",
        href: "/parent/timetable",
        visible: ["parent"],
      },
      {
        icon: <CalendarDays className="w-5 h-5" />,
        label: "Calendar",
        href: "/list/calendar",
        visible: ["admin", "it_manager", "teacher", "student", "parent", "registrar", "finance"],
      },
      {
        icon: <Megaphone className="w-5 h-5" />,
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "it_manager", "teacher", "student", "parent", "registrar", "finance"],
      },
      {
        icon: <UserPlus className="w-5 h-5" />,
        label: "Enrollments",
        href: "/admin/enrollment",
        visible: ["admin", "registrar", "it_manager"],
      },
      {
        icon: <Key className="w-5 h-5" />,
        label: "Credentials",
        href: "/admin/credentials",
        visible: ["admin", "registrar", "it_manager"],
      },
      {
        icon: <Building2 className="w-5 h-5" />,
        label: "Schools",
        href: "/list/schools",
        visible: ["super_admin"],
      },
      {
        icon: <UserCog className="w-5 h-5" />,
        label: "School Admins",
        href: "/superadmin/admins",
        visible: ["super_admin"],
      },
      {
        icon: <Crown className="w-5 h-5" />,
        label: "Subscriptions",
        href: "/superadmin/subscription",
        visible: ["super_admin"],
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "Platform Settings",
        href: "/platform-settings",
        visible: ["super_admin"],
      },
      {
        icon: <Shield className="w-5 h-5" />,
        label: "Roles & Permissions",
        href: "/list/roles",
        visible: ["super_admin"],
      },
      {
        icon: <ShieldCheck className="w-5 h-5" />,
        label: "Bulk User Creation",
        href: "/admin/bulk-upload",
        visible: ["admin", "registrar", "it_manager"],
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "School Settings",
        href: "/settings/school",
        visible: ["admin", "it_manager"],
      },
      {
        icon: <HelpCircle className="w-5 h-5" />,
        label: "Help Center",
        href: "/help",
        visible: ["super_admin", "admin", "it_manager", "teacher", "student", "parent", "registrar", "finance"],
      },
    ],
  },

];

const Menu = ({
  collapsed = false,
  onItemClick,
  useBrandNavigation = true,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
  useBrandNavigation?: boolean;
}) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Toggle submenu
  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Check if submenu should be open based on active child
  const isSubmenuActive = (children?: MenuItem[]) => {
    if (!children || children.length === 0) return false;
    return children.some((child) => pathname === child.href);
  };

  // Memoize role key to prevent recalculation
  // Normalize to handle both "super_admin" and "super-admin"
  const userRoleKey = useMemo(() => {
    if (!user?.role) return "";
    return user.role.toLowerCase();
  }, [user?.role]);

  // Also keep a hyphenated version for matching
  const userRoleKeyHyphenated = useMemo(() => {
    if (!user?.role) return "";
    return user.role.toLowerCase().replace("_", "-");
  }, [user?.role]);

  // Get schoolId from user
  const schoolId = user?.schoolId;

  // Fetch school data
  const { data: school, isLoading: isSchoolLoading } = useQuery({
    queryKey: queryKeys.school.menu(schoolId),
    queryFn: async () => {
      if (!schoolId) return null;
      const response = await schoolsAPI.getById(schoolId);
      return response.data;
    },
    enabled: !!schoolId && userRoleKey !== 'super_admin',
  });

  // Fetch curriculum type from school settings
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: queryKeys.school.curriculum(schoolId),
    queryFn: async () => {
      if (!schoolId) return { data: {} };
      try {
        const response = await schoolSettingsAPI.getAll(schoolId);
        return response;
      } catch (error) {
        return { data: {} };
      }
    },
    enabled: !!schoolId && userRoleKey !== 'super_admin',
    staleTime: 0, // Always fetch fresh data
  });


  // Fetch open communications count - use getAll with status=OPEN instead
  const shouldFetchCommStats = useMemo(() =>
    // Super admin doesn't have school-specific data - don't fetch
    userRoleKey === 'super_admin' ? false :
    ["teacher", "admin", "registrar", "parent", "super-admin"].includes(userRoleKey),
    [userRoleKey]
  );

  const { data: commStats, isLoading: isCommStatsLoading } = useQuery({
    queryKey: queryKeys.menu.communicationStats(user?.id, schoolId, userRoleKey),
    queryFn: async () => {
      try {
        // Use user-specific count endpoint instead of getAll
        const response = await communicationsAPI.getMyCount('OPEN');
        return response;
      } catch (error) {
        return { data: { count: 0 } };
      }
    },
    enabled: shouldFetchCommStats, // Only fetch for relevant roles
    refetchInterval: 60000, // Refetch every minute
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Get open communications count for badge (user-specific)
  const openCommunicationsCount = commStats?.data?.count ?? 0;

  // Fetch active announcements count
  const { data: announcementStats, isLoading: isAnnouncementStatsLoading } = useQuery({
    queryKey: queryKeys.announcements.menuCount(user?.id, schoolId, userRoleKey),
    queryFn: async () => {
      try {
        const response = await announcementsAPI.getActiveCount({ role: userRoleKey });
        return response;
      } catch (error) {
        return { data: { count: 0 } };
      }
    },
    enabled: shouldFetchCommStats,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  // Fetch active events count
  const { data: eventStats, isLoading: isEventStatsLoading } = useQuery({
    queryKey: queryKeys.events.menuCount(user?.id, schoolId, userRoleKey),
    queryFn: async () => {
      try {
        const response = await eventsAPI.getActiveCount({ role: userRoleKey });
        return response;
      } catch (error) {
        return { data: { count: 0 } };
      }
    },
    enabled: shouldFetchCommStats,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const announcementsCount = announcementStats?.data?.count ?? 0;
  const eventsCount = eventStats?.data?.count ?? 0;

  // Use centralized AcademicYearContext
  const { 
    currentAcademicYear, 
    curriculumType, 
    periodLabel,
    formattedYearLabel,
    isLoading: isAcademicYearLoading 
  } = useAcademicYear();

  // Use activeAcademicYear from context
  const activeAcademicYear = currentAcademicYear;

  // Fetch platform settings for feature flags
  const { data: platformSettings, isLoading: isPlatformSettingsLoading } = useQuery({
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
    refetchOnMount: true, // Always fetch on mount
  });

  // Fetch school plan for subscription-based feature gating
  const { data: schoolPlan, isLoading: isPlanLoading } = useQuery({
    queryKey: queryKeys.school.planMenu(schoolId),
    queryFn: async () => {
      if (!schoolId) return null;
      try {
        const response = await subscriptionAPI.getSchoolPlan(schoolId);
        const plan = response.data;
        if (!plan) return null;
        const tierFeatures = getFeaturesByTierFromConfig(plan.tier);
        const existingFeatures = Array.isArray(plan.features) ? plan.features : [];
        const combinedFeatures = [...existingFeatures, ...tierFeatures];
        const uniqueFeatures = Array.from(new Set(combinedFeatures));
        return {
          ...plan,
          features: uniqueFeatures
        };
      } catch (error) {
        return null;
      }
    },
    enabled: !!schoolId && userRoleKey !== 'super_admin',
    staleTime: 60000,
  });

  const getFeaturesByTierFromConfig = (tier: string): string[] => {
    const tierOrder = ['CORE', 'STANDARD', 'ULTIMATE'];
    const tierIndex = tierOrder.indexOf(tier);
    const FEATURE_TIER_MAP: Record<string, string> = {
      USER_MANAGEMENT: 'CORE',
      BASIC_REPORTS: 'CORE',
      NOTIFICATIONS: 'CORE',
      SCHOOL_PROFILE: 'CORE',
      ATTENDANCE_TRACKING: 'STANDARD',
      GRADE_MANAGEMENT: 'STANDARD',
      TIMETABLE_MANAGEMENT: 'STANDARD',
      EXAM_MANAGEMENT: 'STANDARD',
      FINANCE_MANAGEMENT: 'STANDARD',
      PARENT_PORTAL: 'STANDARD',
      MESSAGING: 'STANDARD',
      ANNOUNCEMENTS: 'STANDARD',
      DOCUMENT_MANAGEMENT: 'STANDARD',
      TRANSPORT_MANAGEMENT: 'STANDARD',
      ADVANCED_ANALYTICS: 'ULTIMATE',
      CUSTOM_BRANDING: 'ULTIMATE',
      API_ACCESS: 'ULTIMATE',
      BULK_OPERATIONS: 'ULTIMATE',
      PRIORITY_SUPPORT: 'ULTIMATE',
      CUSTOM_INTEGRATIONS: 'ULTIMATE',
      ADVANCED_REPORTING: 'ULTIMATE',
      DATA_EXPORT: 'ULTIMATE',
    };
    return Object.entries(FEATURE_TIER_MAP)
      .filter(([_, featureTier]) => tierOrder.indexOf(featureTier) <= tierIndex)
      .map(([key]) => key);
  };

  // Determine if any critical data is loading
  const isLoading = isSchoolLoading || isSettingsLoading || isAcademicYearLoading || isPlatformSettingsLoading || isPlanLoading;

  // Helper function to check if a feature is enabled
  const isFeatureEnabled = (featureFlag: string | undefined): boolean => {
    if (!featureFlag) return true; // No feature flag means always visible
    // Check if the feature flag is explicitly set to false
    const flagValue = platformSettings?.[featureFlag];
    // If flag is not set (undefined), default to enabled
    if (flagValue === undefined || flagValue === null) return true;
    // Handle string "false"/"true" and boolean false
    if (typeof flagValue === 'string') {
      return flagValue.toLowerCase() !== 'false';
    }
    // For boolean values, return true unless explicitly false
    return flagValue !== false;
  };

  const TIER_LEVELS: Record<string, number> = {
    CORE: 1,
    STANDARD: 2,
    ULTIMATE: 3,
  };

  // Helper function to check subscription-based access
  const hasSubscriptionAccess = (
    subscriptionFeature?: string,
    subscriptionTier?: 'CORE' | 'STANDARD' | 'ULTIMATE'
  ): boolean => {
    // Super admins bypass subscription checks
    if (userRoleKey === 'super_admin') return true;
    
    // If no subscription requirements, allow access
    if (!subscriptionFeature && !subscriptionTier) return true;
    
    // If no plan, deny access
    if (!schoolPlan) return false;

    const schoolTierLevel = TIER_LEVELS[schoolPlan.tier] || 0;

    // Check tier requirement
    if (subscriptionTier) {
      const requiredLevel = TIER_LEVELS[subscriptionTier] || 0;
      if (schoolTierLevel < requiredLevel) return false;
    }

    // Check feature requirement
    if (subscriptionFeature) {
      const hasFeature = schoolPlan.features?.includes(subscriptionFeature);
      if (!hasFeature) return false;
    }

    return true;
  };

  // Render skeleton loading state
  if (isLoading) {
    return (
      <div className="mt-6 font-sans">
        <div className="flex flex-col gap-2 mb-6">
          <Skeleton className="h-4 w-12 ml-4" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className={`flex items-center gap-3 py-3 px-4 ${collapsed ? 'justify-center' : ''}`}
            >
              <Skeleton className="w-5 h-5 rounded" />
              {!collapsed && <Skeleton className="h-4 w-24" />}
            </div>
          ))}
        </div>
        <div className="mt-8">
          <div className={`flex items-center gap-3 py-3 px-4 ${collapsed ? 'justify-center' : ''}`}>
            <Skeleton className="w-5 h-5 rounded" />
            {!collapsed && <Skeleton className="h-4 w-16" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 font-sans">
      {menuItems.map((section) => (
        <div className="flex flex-col gap-2 mb-6" key={section.title}>
          <span className={`text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2 ${collapsed ? 'hidden' : ''}`}>
            {section.title}
          </span>
          {section.items.map((item) => {
            // Check role-based visibility - check both underscore and hyphen formats
            const isRoleVisible = item.visible.includes(userRoleKey) ||
              item.visible.includes(userRoleKeyHyphenated) ||
              item.visible.some(v => v === user?.role?.toLowerCase());

            // Check feature flag visibility (only for non-super-admin users)
            const isFeatureVisible = isFeatureEnabled(item.featureFlag);

            // Check subscription-based access
            const hasSubscription = hasSubscriptionAccess(
              item.subscriptionFeature,
              item.subscriptionTier
            );

            // Item is visible if role, feature flag, and subscription checks pass
            const isVisible = isRoleVisible && isFeatureVisible && hasSubscription;

            // Get the actual href - use role-based dashboard path if this is the dashboard item
            const actualHref = item.href === "dashboard"
              ? getDashboardPath(user?.role)
              : item.href;

            const isSchoolSettingsRoute =
              actualHref === "/settings/school" &&
              !!pathname?.match(/^\/list\/schools\/[^/]+\/settings$/);

            // More specific active state matching
            // Only match exact path for root routes, or paths with trailing slash
            const isExactMatch = pathname === actualHref || isSchoolSettingsRoute;
            const isChildMatch = pathname?.startsWith(actualHref + "/");

            // Special case: /parent should not match /parent/children, /parent/fees, etc.
            // Also /admin/exams should not match /admin/exams/reports, /admin/exams/seating
            const isRootRoute = actualHref === "/parent" || 
              actualHref === "/admin" || 
              actualHref === "/teacher" || 
              actualHref === "/student" || 
              actualHref === "/registrar" || 
              actualHref === "/superadmin" ||
              actualHref === "/admin/exams";
            const isActive = isExactMatch || (isChildMatch && !isRootRoute);

            // Don't highlight parent if child has same href (to avoid highlighting parent when child is clicked)
            const hasSameHrefChild = item.children?.some(child => child.href === actualHref);
            const parentWithSameChild = isActive && hasSameHrefChild;

            // Check if this is a terms/quarters menu item (dynamic label based on curriculum type)
            const isTermsItem = item.label === "Semester";
            const displayLabel = isTermsItem ? periodLabel : item.label;

            // Check if this is a communication menu item
            const isCommunicationItem = item.label === "Communication";
            const showCommBadge = isCommunicationItem && openCommunicationsCount > 0;
            // Check if this is an events menu item
            const isEventItem = item.label === "Events";
            const showEventBadge = isEventItem && eventsCount > 0;

            const showBadge = showCommBadge || showEventBadge;
            const hasChildren = item.children && item.children.length > 0;
            const submenuActive = isSubmenuActive(item.children);
            const isOpen = openSubmenus[item.label] || submenuActive;

            // Check if any related child sublink is visible
            const visibleChildren = hasChildren
              ? item.children?.filter(child => {
                  const childRoleVisible = child.visible.includes(userRoleKey) ||
                    child.visible.includes(userRoleKeyHyphenated);
                  const childFeatureVisible = isFeatureEnabled(child.featureFlag);
                  const childSubscription = hasSubscriptionAccess(
                    child.subscriptionFeature,
                    child.subscriptionTier
                  );
                  return childRoleVisible && childFeatureVisible && childSubscription;
                }) || []
              : [];

            const hasVisibleChildren = visibleChildren.length > 0;

            if (isVisible) {
              return (
                <div key={`${item.label}-${item.href}`}>
                  <div
                    className={`flex items-center justify-start gap-3 py-3 px-4 rounded-lg transition-colors relative ${isActive && !parentWithSameChild
                      ? useBrandNavigation
                        ? "bg-[rgba(var(--brand-color-rgb),0.38)] text-slate-900 font-medium shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.36)] dark:text-white"
                        : "bg-[rgba(var(--brand-color-rgb),0.38)] text-slate-900 font-medium shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.36)] dark:text-white"
                      : useBrandNavigation
                        ? "text-slate-800 dark:text-gray-200 hover:bg-white/55 dark:hover:bg-[rgba(var(--brand-color-rgb),0.2)]"
                        : "text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {hasSameHrefChild ? (
                      <div
                        className={`flex items-center flex-1 gap-3 cursor-default ${collapsed ? 'justify-center' : ''}`}
                      >
                        <div className="relative text-slate-900 dark:text-white">
                          {item.icon}
                        </div>
                        <span className={`text-sm ${collapsed ? 'hidden' : ''} ${isActive || submenuActive ? "font-medium" : ""}`}>
                          {displayLabel}
                        </span>
                      </div>
                    ) : (
                      <Link
                        href={actualHref}
                        prefetch
                        onClick={() => onItemClick?.()}
                        className={`flex items-center flex-1 gap-3 ${collapsed ? 'justify-center' : ''}`}
                      >
                        <div className="relative text-slate-900 dark:text-white">
                          {item.icon}
                        </div>
                        <span className={`text-sm ${collapsed ? 'hidden' : ''} ${isActive && !parentWithSameChild ? "font-medium" : ""}`}>
                          {displayLabel}
                        </span>
                      </Link>
                    )}
                    {showBadge && !collapsed && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {showCommBadge ? (openCommunicationsCount > 99 ? '99+' : openCommunicationsCount) :
                          (eventsCount > 99 ? '9+' : eventsCount)}
                      </span>
                    )}
                    {hasVisibleChildren && !collapsed && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSubmenu(item.label);
                        }}
                        className="ml-auto p-1"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                        )}
                      </button>
                    )}
                    {isActive && !collapsed && !showBadge && !hasChildren && !parentWithSameChild && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand-color,#e35336)]" />
                    )}
                  </div>

                  {/* Related children */}
                  {hasVisibleChildren && !collapsed && isOpen && (
                    <div className={`ml-4 pl-2 border-l dark:border-gray-700 space-y-1 ${useBrandNavigation ? "border-white/55" : "border-gray-200"}`}>
                      {visibleChildren.map((child) => {
                        const childHref = child.href;
                        const isChildActive = pathname === childHref;
                        return (
                          <Link
                            key={`${child.label}-${childHref}`}
                            href={childHref}
                            prefetch
                            onClick={() => onItemClick?.()}
                            className={`flex items-center gap-3 py-2 px-4 rounded-lg transition-colors ${
                              isChildActive
                                ? useBrandNavigation
                                  ? "bg-[rgba(var(--brand-color-rgb),0.34)] text-slate-900 font-medium shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.34)] dark:text-white"
                                  : "bg-[rgba(var(--brand-color-rgb),0.34)] text-slate-900 font-medium shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.34)] dark:text-white"
                                : useBrandNavigation
                                  ? "text-slate-600 dark:text-gray-300 hover:bg-white/55 dark:hover:bg-[rgba(var(--brand-color-rgb),0.2)]"
                                  : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className="text-slate-900 dark:text-white">
                              {child.icon}
                            </div>
                            <span className="text-sm">{child.label}</span>
                            {isChildActive && (
                              <div className="ml-auto w-1 h-1 rounded-full bg-[var(--brand-color,#e35336)]" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}

      {/* Logout Button */}
      <div className="mt-8">
        <button
          onClick={() => {
            onItemClick?.();
            logout();
          }}
          className={`flex items-center justify-start gap-3 text-slate-700 dark:text-white py-3 px-4 rounded-lg transition-colors w-full ${collapsed ? 'justify-center' : ''} ${useBrandNavigation ? 'hover:bg-white/55 dark:hover:bg-[#1E293B]' : 'hover:bg-slate-100 dark:hover:bg-[#1E293B]'}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 text-slate-500 dark:text-gray-300" />
          <span className={`text-sm font-medium ${collapsed ? 'hidden' : ''}`}>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Menu;
