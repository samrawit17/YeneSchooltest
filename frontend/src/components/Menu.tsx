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
import { useState, useMemo, useCallback, useRef } from "react";
import { queryKeys } from "@/lib/query-keys";
import { useTranslations } from "@/hooks/useTranslations";
import { isPrimaryMiddleGradeSystem } from "@/lib/grade-system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCircle,
  BookOpen,
  School,
  BookText,
  ClipboardCheck,
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  FileSpreadsheet,
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
  schoolSettingFlag?: string;
  subscriptionFeature?: string;
  subscriptionTier?: 'CORE' | 'STANDARD' | 'ULTIMATE';
  hideForPrimaryMiddle?: boolean;
  children?: MenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface NavigationMessages {
  sections?: Record<string, string>;
  labels?: Record<string, string>;
  descriptions?: Record<string, string>;
}

const menuItems: MenuSection[] = [
  {
    title: "MENU",
    items: [
      {
        icon: <LayoutDashboard className="w-5 h-5" />,
        label: "Dashboard",
        href: "dashboard",
        visible: ["admin", "it_manager", "teacher", "student", "parent", "registrar", "finance", "super_admin"],
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        label: "Teacher Leaderboard",
        href: "/admin/teacher-leaderboard",
        visible: ["admin"],
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "My Classes",
        href: "/teacher/my-class",
        visible: ["teacher"],
        subscriptionFeature: "ATTENDANCE_TRACKING",
      },
      {
        icon: <CalendarCheck className="w-5 h-5" />,
        label: "Attendance",
        href: "/teacher/attendance",
        visible: ["teacher"],
      },
      {
        icon: <BookText className="w-5 h-5" />,
        label: "Lesson Plan",
        href: "/teacher/lessons",
        visible: ["teacher"],
        featureFlag: "FEATURE_FLAG_LESSONS",
        subscriptionFeature: "LESSON_MANAGEMENT",
      },
      {
        icon: <Calendar className="w-5 h-5" />,
        label: "Timetable",
        href: "/teacher/timetable",
        visible: ["teacher"],
        subscriptionFeature: "TIMETABLE_MANAGEMENT",
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        label: "Marks Entry",
        href: "/teacher/grading",
        visible: ["teacher"],
        subscriptionFeature: "GRADE_MANAGEMENT",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "Online Exams",
        href: "/teacher/online-exams",
        visible: ["teacher"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "EXAM_MANAGEMENT",
        children: [
          {
            icon: <ClipboardList className="w-4 h-4" />,
            label: "Manage Exams",
            href: "/teacher/online-exams/manage",
            visible: ["teacher"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <ClipboardCheck className="w-4 h-4" />,
            label: "Submitted Exams",
            href: "/teacher/online-exams/submissions",
            visible: ["teacher"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <BookOpen className="w-4 h-4" />,
            label: "Create Exams",
            href: "/teacher/online-exams#create-exams",
            visible: ["teacher"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
        ],
      },

      {
        icon: <BookText className="w-5 h-5" />,
        label: "Lesson Plan",
        href: "/student/lessons",
        visible: ["student"],
        featureFlag: "FEATURE_FLAG_LESSONS",
        subscriptionFeature: "LESSON_MANAGEMENT",
      },
      {
        icon: <Calendar className="w-5 h-5" />,
        label: "My Timetable",
        href: "/student/timetable",
        visible: ["student"],
        subscriptionFeature: "TIMETABLE_MANAGEMENT",
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        label: "My Grades",
        href: "/student/grades",
        visible: ["student"],
        subscriptionFeature: "GRADE_MANAGEMENT",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "My Exams",
        href: "/student/practice-exams",
        visible: ["student"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "EXAM_MANAGEMENT",
      },

      {
        icon: <ClipboardList className="w-5 h-5" />,
        label: "Exams",
        href: "/admin/assessments",
        visible: ["admin", "it_manager"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "EXAM_MANAGEMENT",
        children: [
          {
            icon: <ClipboardList className="w-4 h-4" />,
            label: "Assessment",
            href: "/admin/assessments",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
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
            icon: <TrendingUp className="w-4 h-4" />,
            label: "Student Rankings",
            href: "/admin/exams/rankings",
            visible: ["admin", "registrar", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "STUDENT_RANKINGS",
            hideForPrimaryMiddle: true,
          },
          {
            icon: <FileText className="w-4 h-4" />,
            label: "Report Cards",
            href: "/admin/report-cards",
            visible: ["admin", "registrar", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "REPORT_CARDS",
            hideForPrimaryMiddle: true,
          },
          {
            icon: <FileText className="w-4 h-4" />,
            label: "Certificate Template",
            href: "/admin/report-cards/certificate-template",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "CERTIFICATE_TEMPLATES",
            hideForPrimaryMiddle: true,
          },
        ],
      },
      {
        icon: <FileText className="w-5 h-5" />,
        label: "Performance Brief",
        href: "/admin/reports/parent-presentation",
        visible: ["admin", "registrar", "it_manager"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "REPORT_CARDS",
      },
      {
        icon: <Shield className="w-5 h-5" />,
        label: "Student Data Health",
        href: "/admin/reports/data-consistency",
        visible: ["admin", "registrar", "it_manager"],
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "Online Examination",
        href: "/admin/practice-exams",
        visible: ["admin", "it_manager"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "EXAM_MANAGEMENT",
        children: [
          {
            icon: <ClipboardList className="w-4 h-4" />,
            label: "Manage Exams",
            href: "/admin/practice-exams/manage",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
          {
            icon: <BookOpen className="w-4 h-4" />,
            label: "Create Exams",
            href: "/admin/practice-exams#create-exams",
            visible: ["admin", "it_manager"],
            featureFlag: "FEATURE_FLAG_EXAMS",
            subscriptionFeature: "EXAM_MANAGEMENT",
          },
        ],
      },
      {
        icon: <Bell className="w-5 h-5" />,
        label: "School Siren",
        href: "/admin/siren-management",
        visible: ["admin", "it_manager"],
        subscriptionFeature: "SIREN_ALERT",
      },
      {
        icon: <Clock className="w-5 h-5" />,
        label: "Period Times",
        href: "/admin/period-times",
        visible: ["admin", "it_manager"],
        subscriptionFeature: "ACADEMIC_STRUCTURE",
      },
      {
        icon: <Users className="w-5 h-5" />,
        label: "Students",
        href: "/list/students",
        visible: ["admin", "it_manager", "registrar"],
        subscriptionFeature: "USER_MANAGEMENT",
        children: [
          {
            icon: <Users className="w-4 h-4" />,
            label: "All Students",
            href: "/list/students",
            visible: ["admin", "it_manager", "registrar"],
            subscriptionFeature: "USER_MANAGEMENT",
          },
          {
            icon: <UserPlus className="w-4 h-4" />,
            label: "Student Admission",
            href: "/admin/enrollment",
            visible: ["admin", "registrar", "it_manager"],
            subscriptionFeature: "ENROLLMENT_MANAGEMENT",
          },
          {
            icon: <GraduationCap className="w-4 h-4" />,
            label: "Student Promotion",
            href: "/admin/promotion",
            visible: ["admin", "registrar", "it_manager"],
            subscriptionFeature: "STUDENT_PROMOTION",
          },
          {
            icon: <CreditCard className="w-4 h-4" />,
            label: "ID Cards",
            href: "/admin/id-cards",
            visible: ["admin", "registrar", "it_manager"],
            subscriptionFeature: "STUDENT_ID_CARDS",
          },
        ],
      },
      {
        icon: <MessageSquare className="w-5 h-5" />,
        label: "Communication Book",
        href: "/list/communications",
        visible: ["teacher", "admin", "it_manager", "parent"],
        featureFlag: "FEATURE_FLAG_COMMUNICATION_BOOK",
        subscriptionFeature: "COMMUNICATION_BOOK",
      },
      {
        icon: <MessageSquare className="w-5 h-5" />,
        label: "Messages",
        href: "/messages",
        visible: ["teacher", "admin", "it_manager"],
        subscriptionFeature: "MESSAGING",
      },
      {
        icon: <UserCircle className="w-5 h-5" />,
        label: "People",
        href: "/list/staff",
        visible: ["admin", "it_manager", "registrar"],
        subscriptionFeature: "USER_MANAGEMENT",
        children: [
          {
            icon: <Users className="w-4 h-4" />,
            label: "Staff",
            href: "/list/staff",
            visible: ["admin", "it_manager", "registrar"],
            subscriptionFeature: "USER_MANAGEMENT",
          },
          {
            icon: <Users className="w-4 h-4" />,
            label: "Parents",
            href: "/list/parents",
            visible: ["admin", "it_manager", "registrar"],
            subscriptionFeature: "USER_MANAGEMENT",
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
        subscriptionFeature: "ACADEMIC_STRUCTURE",
        children: [
          {
            icon: <Users className="w-4 h-4" />,
            label: "Class & Sections",
            href: "/admin/class-sections",
            visible: ["admin", "it_manager", "registrar"],
            subscriptionFeature: "ACADEMIC_STRUCTURE",
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
            subscriptionFeature: "ACADEMIC_STRUCTURE",
          },
          {
            icon: <Calendar className="w-4 h-4" />,
            label: "Academic Years",
            href: "/admin/academic-years",
            visible: ["admin", "it_manager", "registrar"],
            subscriptionFeature: "ACADEMIC_STRUCTURE",
          },
        ],
      },
      {
        icon: <GraduationCap className="w-5 h-5" />,
        label: "My Children",
        href: "/parent/children",
        visible: ["parent"],
        subscriptionFeature: "PARENT_PORTAL",
      },
      {
        icon: <CalendarCheck className="w-5 h-5" />,
        label: "Child Attendance",
        href: "/parent/attendance",
        visible: ["parent"],
        subscriptionFeature: "PARENT_PORTAL",
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        label: "Children Grades",
        href: "/parent/grades",
        visible: ["parent"],
        schoolSettingFlag: "PARENT_VIEW_GRADES",
        subscriptionFeature: "REPORT_CARDS",
      },
      {
        icon: <DollarSign className="w-5 h-5" />,
        label: "Children Fees",
        href: "/parent/fees",
        visible: ["parent"],
        subscriptionFeature: "PARENT_PORTAL",
      },
      {
        icon: <BookText className="w-5 h-5" />,
        label: "Lesson Plan",
        href: "/parent/lessons",
        visible: ["parent"],
        featureFlag: "FEATURE_FLAG_LESSONS",
        subscriptionFeature: "LESSON_MANAGEMENT",
      },
      {
        icon: <Calendar className="w-5 h-5" />,
        label: "Timetable",
        href: "/parent/timetable",
        visible: ["parent"],
        subscriptionFeature: "PARENT_PORTAL",
      },
      {
        icon: <CalendarDays className="w-5 h-5" />,
        label: "Calendar",
        href: "/list/calendar",
        visible: ["admin", "it_manager", "teacher", "student", "parent", "registrar", "finance"],
        subscriptionFeature: "SCHOOL_CALENDAR",
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "Finance Management",
        href: "/list/finance",
        visible: ["finance"],
      },
      {
        icon: <FileText className="w-5 h-5" />,
        label: "Finance Reports",
        href: "/finance/reports",
        visible: ["finance"],
      },
      {
        icon: <Megaphone className="w-5 h-5" />,
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "it_manager", "teacher", "student", "parent", "registrar", "finance"],
        schoolSettingFlag: "ANNOUNCEMENTS_ENABLED",
        subscriptionFeature: "ANNOUNCEMENTS",
      },
      {
        icon: <Key className="w-5 h-5" />,
        label: "Credentials",
        href: "/admin/credentials",
        visible: ["admin", "registrar", "it_manager"],
        subscriptionFeature: "CREDENTIAL_MANAGEMENT",
      },
      {
        icon: <FileText className="w-5 h-5" />,
        label: "School Leaving",
        href: "/registrar/school-leaving",
        visible: ["registrar"],
        subscriptionFeature: "USER_MANAGEMENT",
      },
      {
        icon: <Award className="w-5 h-5" />,
        label: "National Exams",
        href: "/registrar/national-exams",
        visible: ["registrar"],
        subscriptionFeature: "EXAM_MANAGEMENT",
      },
      {
        icon: <Users className="w-5 h-5" />,
        label: "Exam Seating",
        href: "/admin/exams/seating",
        visible: ["registrar"],
        featureFlag: "FEATURE_FLAG_EXAMS",
        subscriptionFeature: "EXAM_SEATING",
        hideForPrimaryMiddle: true,
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
        icon: <FileSpreadsheet className="w-5 h-5" />,
        label: "Backups",
        href: "/superadmin/backups",
        visible: ["super_admin"],
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "Platform Settings",
        href: "/platform-settings",
        visible: ["super_admin"],
      },
      {
        icon: <ShieldCheck className="w-5 h-5" />,
        label: "Users Management",
        href: "/admin/bulk-upload",
        visible: ["admin", "it_manager", "registrar"],
        subscriptionFeature: "BULK_OPERATIONS",
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "School Settings",
        href: "/settings/school",
        visible: ["admin", "it_manager"],
        subscriptionFeature: "SCHOOL_PROFILE",
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

// Static constants — hoisted outside component to avoid recreation
const TIER_LEVELS: Record<string, number> = {
  CORE: 1,
  STANDARD: 2,
  ULTIMATE: 3,
};

const FEATURE_TIER_MAP: Record<string, string> = {
  SCHOOL_PROFILE: 'CORE',
  USER_MANAGEMENT: 'CORE',
  ACADEMIC_STRUCTURE: 'CORE',
  ATTENDANCE_TRACKING: 'CORE',
  ANNOUNCEMENTS: 'CORE',
  SCHOOL_CALENDAR: 'CORE',
  BASIC_REPORTS: 'CORE',
  NOTIFICATIONS: 'CORE',
  GRADE_MANAGEMENT: 'STANDARD',
  TIMETABLE_MANAGEMENT: 'STANDARD',
  LESSON_MANAGEMENT: 'STANDARD',
  EXAM_MANAGEMENT: 'STANDARD',
  FINANCE_MANAGEMENT: 'STANDARD',
  PARENT_PORTAL: 'STANDARD',
  MESSAGING: 'STANDARD',
  COMMUNICATION_BOOK: 'STANDARD',
  DOCUMENT_MANAGEMENT: 'STANDARD',
  ENROLLMENT_MANAGEMENT: 'STANDARD',
  CREDENTIAL_MANAGEMENT: 'STANDARD',
  DISCIPLINE_MANAGEMENT: 'STANDARD',
  REPORT_CARDS: 'STANDARD',
  EXAM_SEATING: 'ULTIMATE',
  STUDENT_PROMOTION: 'ULTIMATE',
  STUDENT_RANKINGS: 'ULTIMATE',
  STUDENT_ID_CARDS: 'ULTIMATE',
  CERTIFICATE_TEMPLATES: 'ULTIMATE',
  TEMPLATE_MANAGER: 'ULTIMATE',
  ADVANCED_ANALYTICS: 'ULTIMATE',
  CUSTOM_BRANDING: 'ULTIMATE',
  BULK_OPERATIONS: 'ULTIMATE',
  PRIORITY_SUPPORT: 'ULTIMATE',
  ADVANCED_REPORTING: 'ULTIMATE',
  DATA_EXPORT: 'ULTIMATE',
  SIREN_ALERT: 'ULTIMATE',
};

const getFeaturesByTierFromConfig = (tier: string): string[] => {
  const tierOrder = ['CORE', 'STANDARD', 'ULTIMATE'];
  const tierIndex = tierOrder.indexOf(tier);
  return Object.entries(FEATURE_TIER_MAP)
    .filter(([_, featureTier]) => tierOrder.indexOf(featureTier) <= tierIndex)
    .map(([key]) => key);
};

const textRevealClass = (collapsed: boolean, expandedWidth = "max-w-[220px]") =>
  `overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out ${
    collapsed ? "max-w-0 opacity-0 pointer-events-none" : `${expandedWidth} opacity-100`
  }`;

const Menu = ({
  collapsed = false,
  onItemClick,
  useBrandNavigation = false,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
  useBrandNavigation?: boolean;
}) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { t: navigationText, language } = useTranslations<NavigationMessages>("navigation");
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const getNavigationLabel = useCallback((label: string) => navigationText.labels?.[label] ?? label, [navigationText.labels]);
  const textDirection = language === "ar" ? "rtl" : "ltr";

  // Stabilized toggle — prevents child re-renders from inline function recreation
  const toggleSubmenu = useCallback((label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  // Stabilized click handler
  const handleItemClick = useCallback(() => {
    onItemClick?.();
  }, [onItemClick]);

  // Stabilized prefetch handler
  const handlePrefetch = useCallback((href: string) => {
    if (href && href !== "dashboard") {
      router.prefetch(href);
    }
  }, [router]);

  // Check if submenu should be open based on active child
  const isSubmenuActive = useCallback((children?: MenuItem[]) => {
    if (!children || children.length === 0) return false;
    return children.some((child) => pathname === child.href.split("#")[0]);
  }, [pathname]);

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
    staleTime: 5 * 60 * 1000, // 5 minutes — curriculum type rarely changes
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
    displayTermName,
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

  // Determine if any critical data is loading
  const isLoading = isSchoolLoading || isSettingsLoading || isAcademicYearLoading || isPlatformSettingsLoading || isPlanLoading;

  // Helper function to check if a feature is enabled
  const isFeatureEnabled = useCallback((featureFlag: string | undefined): boolean => {
    if (!featureFlag) return true;
    const flagValue = platformSettings?.[featureFlag];
    if (flagValue === undefined || flagValue === null) return true;
    if (typeof flagValue === 'string') {
      return flagValue.toLowerCase() !== 'false';
    }
    return flagValue !== false;
  }, [platformSettings]);

  const isSchoolSettingEnabled = useCallback((settingKey: string | undefined): boolean => {
    if (!settingKey) return true;
    const settingValue = settingsData?.data?.[settingKey];
    if (settingValue === undefined || settingValue === null) return true;
    if (typeof settingValue === 'string') {
      return settingValue.toLowerCase() !== 'false';
    }
    return settingValue !== false;
  }, [settingsData]);

  const isPrimaryMiddleSchool = isPrimaryMiddleGradeSystem(settingsData?.data?.grade_system);
  const isGradeSystemVisible = useCallback((item: MenuItem) =>
    !(isPrimaryMiddleSchool && item.hideForPrimaryMiddle), [isPrimaryMiddleSchool]);

  const hasSubscriptionAccess = useCallback((
    subscriptionFeature?: string,
    subscriptionTier?: 'CORE' | 'STANDARD' | 'ULTIMATE'
  ): boolean => {
    if (userRoleKey === 'super_admin') return true;
    if (!subscriptionFeature && !subscriptionTier) return true;
    if (!schoolPlan) return false;

    const schoolTierLevel = TIER_LEVELS[schoolPlan.tier] || 0;

    if (subscriptionTier) {
      const requiredLevel = TIER_LEVELS[subscriptionTier] || 0;
      if (schoolTierLevel < requiredLevel) return false;
    }

    if (subscriptionFeature) {
      const hasFeature = schoolPlan.features?.includes(subscriptionFeature);
      if (!hasFeature) return false;
    }

    return true;
  }, [userRoleKey, schoolPlan]);

  // Render skeleton loading state
  if (isLoading) {
    return (
      <div className="mt-6">
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
    <div className="mt-6 overflow-x-hidden" dir={textDirection}>
      {menuItems.map((section) => (
        <div className="mb-6 flex flex-col gap-2" key={section.title}>
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

            // Check school setting access
            const isSchoolSettingVisible = isSchoolSettingEnabled(item.schoolSettingFlag);

            // Item is visible if role, feature flag, school setting, and subscription checks pass
            const isVisible =
              isRoleVisible &&
              isFeatureVisible &&
              isSchoolSettingVisible &&
              hasSubscription &&
              isGradeSystemVisible(item);

            // Get the actual href - use role-based dashboard path if this is the dashboard item
            const actualHref = item.href === "dashboard"
              ? getDashboardPath(user?.role)
              : item.href;

            const isSchoolSettingsRoute =
              actualHref === "/settings/school" &&
              !!pathname?.match(/^\/list\/schools\/[^/]+\/settings$/);

            const hasChildren = item.children && item.children.length > 0;
            const isParentWithChildren = !!hasChildren;

            // More specific active state matching
            // Only match exact path for root routes, or paths with trailing slash
            const isExactMatch = pathname === actualHref || isSchoolSettingsRoute;
            const isChildMatch = pathname?.startsWith(actualHref + "/");
            const hasActiveMoreSpecificSibling = menuItems.some((section) =>
              section.items.some((candidate) => {
                const candidateHref =
                  candidate.href === "dashboard"
                    ? getDashboardPath(user?.role)
                    : candidate.href;

                return (
                  candidateHref !== actualHref &&
                  candidateHref.startsWith(actualHref + "/") &&
                  pathname === candidateHref
                );
              }),
            );

            // Special case: /parent should not match /parent/children, /parent/fees, etc.
            // Also /admin/assessments should not match /admin/exams/reports, /admin/exams/seating
            const isRootRoute = actualHref === "/parent" || 
              actualHref === "/admin" || 
              actualHref === "/teacher" || 
              actualHref === "/student" || 
              actualHref === "/registrar" || 
              actualHref === "/superadmin" ||
              actualHref === "/admin/assessments";
            const isActive =
              !isParentWithChildren &&
              (isExactMatch ||
                (isChildMatch && !isRootRoute && !hasActiveMoreSpecificSibling));

            // Don't highlight parent if child has same href (to avoid highlighting parent when child is clicked)
            const hasSameHrefChild = item.children?.some(child => child.href === actualHref);
            const parentWithSameChild = isActive && hasSameHrefChild;

            // Check if this is a terms/quarters menu item (dynamic label based on curriculum type)
            const isTermsItem = item.label === "Semester";
            const isPerformanceBriefItem = item.label === "Performance Brief";
            const currentPeriodSummaryLabel = displayTermName
              ? `${displayTermName} Summary`
              : `${periodLabel} Summary`;
            const displayLabel = isTermsItem
              ? periodLabel
              : isPerformanceBriefItem
                ? currentPeriodSummaryLabel
                : getNavigationLabel(item.label);

            // Check if this is a communication menu item
            const isCommunicationItem = item.label === "Communication";
            const showCommBadge = isCommunicationItem && openCommunicationsCount > 0;
            // Check if this is an events menu item
            const isEventItem = item.label === "Events";
            const showEventBadge = isEventItem && eventsCount > 0;

            const showBadge = showCommBadge || showEventBadge;
            const submenuActive = isSubmenuActive(item.children);
            const isOpen = openSubmenus[item.label] || submenuActive;

            // Check if any related child sublink is visible
            const visibleChildren = hasChildren
              ? item.children?.filter(child => {
                  const childRoleVisible = child.visible.includes(userRoleKey) ||
                    child.visible.includes(userRoleKeyHyphenated);
                  const childFeatureVisible = isFeatureEnabled(child.featureFlag);
                  const childSchoolSettingVisible = isSchoolSettingEnabled(child.schoolSettingFlag);
                  const childSubscription = hasSubscriptionAccess(
                    child.subscriptionFeature,
                    child.subscriptionTier
                  );
                  return childRoleVisible &&
                    childFeatureVisible &&
                    childSchoolSettingVisible &&
                    childSubscription &&
                    isGradeSystemVisible(child);
                }) || []
              : [];

            const hasVisibleChildren = visibleChildren.length > 0;

            if (isVisible) {
              if (collapsed) {
                const collapsedItemClasses = `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isActive && !parentWithSameChild
                    ? useBrandNavigation
                      ? "bg-[rgba(var(--brand-color-rgb),0.38)] text-slate-900 shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.36)] dark:text-white"
                      : "bg-slate-200 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : useBrandNavigation
                      ? "text-slate-800 hover:bg-white/55 dark:text-gray-200 dark:hover:bg-[rgba(var(--brand-color-rgb),0.2)]"
                      : "text-slate-800 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-slate-800"
                }`;

                return (
                  <div key={`${item.label}-${item.href}`} className="flex justify-center">
                    {hasVisibleChildren ? (
                      <button
                        type="button"
                        className={collapsedItemClasses}
                        title={displayLabel}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSubmenu(item.label);
                        }}
                        aria-expanded={isOpen}
                        aria-label={`${displayLabel} submenu`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center">
                          {item.icon}
                        </span>
                      </button>
                    ) : (
                      <Link
                        href={actualHref}
                        prefetch
                        onMouseEnter={() => handlePrefetch(actualHref)}
                        onClick={handleItemClick}
                        className={collapsedItemClasses}
                        title={displayLabel}
                      >
                        <span className="flex h-5 w-5 items-center justify-center">
                          {item.icon}
                        </span>
                      </Link>
                    )}
                  </div>
                );
              }

              return (
                <div key={`${item.label}-${item.href}`}>
                  <div
                    className={`relative flex items-center justify-start gap-3 rounded-lg transition-colors ${isActive && !parentWithSameChild
                      ? useBrandNavigation
                        ? "bg-[rgba(var(--brand-color-rgb),0.38)] text-slate-900 font-medium shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.36)] dark:text-white"
                        : "bg-slate-200 text-slate-900 font-medium shadow-sm dark:bg-slate-800 dark:text-white"
                      : useBrandNavigation
                        ? "text-slate-800 dark:text-gray-200 hover:bg-white/55 dark:hover:bg-[rgba(var(--brand-color-rgb),0.2)]"
                        : "text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      } min-h-12 w-full px-3.5 py-3`}
                  >
                    {hasVisibleChildren ? (
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSubmenu(item.label);
                        }}
                        aria-expanded={isOpen}
                        aria-label={`${displayLabel} submenu`}
                      >
                        <div className="relative text-current">
                          {item.icon}
                        </div>
                        <span className={`text-sm ${isOpen ? "font-medium" : ""}`} dir={textDirection}>
                          {displayLabel}
                        </span>
                      </button>
                    ) : (
                      <Link
                        href={actualHref}
                        prefetch
                        onMouseEnter={() => handlePrefetch(actualHref)}
                        onClick={handleItemClick}
                        className="flex flex-1 items-center gap-3"
                      >
                        <div className="relative text-slate-900 dark:text-white">
                          {item.icon}
                        </div>
                        <span className={`text-sm ${isActive && !parentWithSameChild ? "font-medium" : ""}`} dir={textDirection}>
                          {displayLabel}
                        </span>
                      </Link>
                    )}
                    <div className={`${language === "ar" ? "mr-auto" : "ml-auto"} flex h-5 w-6 shrink-0 items-center justify-center`}>
                      {showBadge ? (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {showCommBadge ? (openCommunicationsCount > 99 ? '99+' : openCommunicationsCount) :
                            (eventsCount > 99 ? '9+' : eventsCount)}
                        </span>
                      ) : hasVisibleChildren ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSubmenu(item.label);
                          }}
                          className="flex h-6 w-6 items-center justify-center"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-white" />
                          ) : language === "ar" ? (
                            <ChevronLeft className="w-4 h-4 text-white" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ) : isActive && !hasChildren && !parentWithSameChild ? (
                        <div className={`h-1.5 w-1.5 rounded-full ${useBrandNavigation ? "bg-[var(--brand-color,#e35336)]" : "bg-slate-500 dark:bg-slate-300"}`} />
                      ) : null}
                    </div>
                  </div>

                  {/* Related children */}
                  {hasVisibleChildren && !collapsed && isOpen && (
                    <div className={`${language === "ar" ? "mr-4 pr-2 border-r" : "ml-4 pl-2 border-l"} dark:border-gray-700 space-y-1 ${useBrandNavigation ? "border-white/55" : "border-gray-200"}`}>
                      {visibleChildren.map((child) => {
                        const childHref = child.href;
                        const childPath = childHref.split("#")[0];
                        const isChildActive = pathname === childPath;
                        const childDisplayLabel = child.label === "Performance Brief"
                          ? currentPeriodSummaryLabel
                          : getNavigationLabel(child.label);
                        return (
                          <Link
                            key={`${child.label}-${childHref}`}
                            href={childHref}
                            prefetch
                            onMouseEnter={() => handlePrefetch(childHref)}
                            onClick={handleItemClick}
                            className={`flex min-h-10 items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
                              isChildActive
                                ? useBrandNavigation
                                  ? "bg-[rgba(var(--brand-color-rgb),0.34)] text-slate-900 font-medium shadow-sm dark:bg-[rgba(var(--brand-color-rgb),0.34)] dark:text-white"
                                  : "bg-slate-200 text-slate-900 font-medium shadow-sm dark:bg-slate-800 dark:text-white"
                                : useBrandNavigation
                                  ? "text-slate-600 dark:text-gray-300 hover:bg-white/55 dark:hover:bg-[rgba(var(--brand-color-rgb),0.2)]"
                                  : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-900 dark:text-white">
                              {child.icon}
                            </div>
                            <span className="flex-1 text-sm whitespace-normal" dir={textDirection}>{childDisplayLabel}</span>
                            <div className={`${language === "ar" ? "mr-auto" : "ml-auto"} flex h-5 w-4 shrink-0 items-center justify-center`}>
                              {isChildActive && (
                                <div className={`h-1 w-1 rounded-full ${useBrandNavigation ? "bg-[var(--brand-color,#e35336)]" : "bg-slate-500 dark:bg-slate-300"}`} />
                              )}
                            </div>
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
    </div>
  );
};

export default Menu;
