"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronRight, Home, LayoutDashboard } from "lucide-react";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";

export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Optional href for clickable items */
  href?: string;
  /** Whether this item is the current page (non-clickable) */
  isCurrent?: boolean;
  /** Optional icon for the item */
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items?: BreadcrumbItem[];
  /** Custom className for additional styling */
  className?: string;
  /** Whether to show home icon */
  showHomeIcon?: boolean;
  /** Separator character (default: "/") */
  separator?: React.ReactNode;
}

interface BreadcrumbMessages {
  labels: Record<string, string>;
  fallback: {
    detail: string;
  };
}

const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );

const DEFAULT_BREADCRUMB_MESSAGES: BreadcrumbMessages = {
  labels: {},
  fallback: { detail: "{label} Detail" },
};

// ============================================
// Route Configuration
// ============================================

/**
 * Route metadata configuration for breadcrumb generation
 * Maps route patterns to breadcrumb labels and parent relationships
 */
interface RouteConfig {
  label: string;
  href?: string;
  /** Parent route segment */
  parent?: string;
  /** Whether this is a detail page */
  isDetail?: boolean;
  /** Whether to hide the breadcrumb on this page */
  hideBreadcrumb?: boolean;
  /** Icon for the route */
  icon?: React.ReactNode;
}

/**
 * Comprehensive route configuration for the School Management System
 * Covers all major modules and their sub-routes
 */
const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // Dashboard - will be dynamically determined based on user role
  "dashboard": { label: "Dashboard", hideBreadcrumb: true },

  // Students Module
  "students": { label: "Students", href: "/list/students", parent: "dashboard" },
  "students-detail": { label: "Student Profile", parent: "students" },

  // Teachers Module
  "teachers": { label: "Teachers", href: "/list/teachers", parent: "dashboard" },
  "teachers-detail": { label: "Teacher Profile", parent: "teachers" },

  // Parents Module
  "parents": { label: "Parents", href: "/list/parents", parent: "dashboard" },
  "parents-detail": { label: "Parent Profile", parent: "parents" },

  // Staff Module
  "staff": { label: "Staff", href: "/list/staff", parent: "dashboard" },
  "staff-detail": { label: "Staff Profile", parent: "staff" },

  // Classes Module
  "classes": { label: "Classes", href: "/list/classes", parent: "dashboard" },

  // Sections Module
  "sections": { label: "Sections", href: "/list/sections", parent: "dashboard" },

  // Subjects Module
  "subjects": { label: "Subjects", href: "/list/subjects", parent: "dashboard" },

  // Academic Years Module
  "academic-years": { label: "Academic Years", href: "/list/academic-years", parent: "dashboard" },

  "attendance": { label: "Attendance", href: "/admin/attendance", parent: "dashboard" },
  "attendance-admin": { label: "Attendance", href: "/admin/attendance", parent: "admin" },
  "attendance-teacher": { label: "My Attendance", href: "/teacher/attendance", parent: "teacher" },
  "attendance-student": { label: "My Attendance", href: "/student/attendance", parent: "student" },
  "attendance-parent": { label: "Children Attendance", href: "/parent/children/[id]/attendance", parent: "parent-children" },

  // Lessons Module
  "lessons": { label: "Lessons", href: "/list/lessons", parent: "dashboard" },
  "lessons-teacher": { label: "My Lessons", href: "/teacher/lessons", parent: "teacher" },
  "lessons-detail": { label: "Lesson Detail", parent: "lessons" },

  // Finance Module
  "finance": { label: "Finance", href: "/list/finance", parent: "dashboard" },
  "finance-admin": { label: "Finance", href: "/admin/finance", parent: "admin" },
  "fees": { label: "Fees", parent: "finance" },
  "fees-student": { label: "My Fees", href: "/student/fees", parent: "student" },
  "fees-parent": { label: "Children Fees", href: "/parent/fees", parent: "parent" },
  "payment-detail": { label: "Payment Detail", parent: "finance" },

  // Enrollments Module
  "enrollments": { label: "Enrollments", href: "/admin/enrollment", parent: "dashboard" },

  // Communications Module
  "communications": { label: "Communications", href: "/list/communications", parent: "dashboard" },
  "communications-create": { label: "Create Communication", parent: "communications" },

  // Staff Messaging
  "messages": { label: "Messages", href: "/messages", parent: "dashboard" },

  // Announcements Module
  "announcements": { label: "Announcements", href: "/list/announcements", parent: "dashboard" },
  "announcements-detail": { label: "Announcement Detail", parent: "announcements" },

  // Events Module
  "events": { label: "Calendar", href: "/list/calendar", parent: "dashboard" },

  // Exams Module
  "exams": { label: "Exams", href: "/list/exams", parent: "dashboard" },

  // Results Module
  "results": { label: "Results", href: "/list/results", parent: "dashboard" },
  "results-student": { label: "My Results", href: "/student/results", parent: "student" },
  "results-parent": { label: "Children Results", href: "/parent/results", parent: "parent" },

  // Timetable Module
  "timetable": { label: "Timetable", href: "/list/timetable-slots", parent: "dashboard" },
  "timetable-admin": { label: "Timetable", href: "/admin/timetable", parent: "admin" },
  "timetable-teacher": { label: "My Timetable", href: "/teacher/timetable", parent: "teacher" },
  "timetable-student": { label: "My Timetable", href: "/student/timetable", parent: "student" },
  "timetable-parent": { label: "Child Timetable", href: "/parent/timetable", parent: "parent" },

  // Assignments Module
  "assignments": { label: "Assignments", href: "/teacher/lessons", parent: "dashboard" },
  "assignments-teacher": { label: "My Assignments", href: "/teacher/lessons", parent: "teacher" },

  // Credentials Module
  "credentials": { label: "Credentials", href: "/list/credentials", parent: "dashboard" },

  // Users Module
  "users": { label: "Users", parent: "dashboard" },

  // Schools Module
  "schools": { label: "Schools", parent: "dashboard" },
  "schools-detail": { label: "School Details", parent: "dashboard" },
  "schools-settings": { label: "School Settings", parent: "dashboard" },

  // Settings Module
  "settings": { label: "Settings", href: "/settings", parent: "dashboard" },
  "settings-school": { label: "School Settings", href: "/settings/school", parent: "settings" },

  // Profile Module
  "profile": { label: "My Profile", href: "/profile", parent: "dashboard" },

  // Notifications Module
  "notifications": { label: "Notifications", href: "/notifications", parent: "dashboard" },

  // Help Module
  "help": { label: "Help Center", href: "/help", parent: "dashboard" },

  // Platform Settings (Super Admin)
  "platform-settings": { label: "Platform Settings", href: "/platform-settings", parent: "dashboard" },

  // Admin Module
  "admin": { label: "Administration", href: "/admin", parent: "dashboard" },
  "admin-assignments": { label: "Assignments", href: "/admin/assignments", parent: "admin" },
  "admin-communications": { label: "Communications", href: "/admin/communications", parent: "admin" },
  "admin-id-cards": { label: "ID Cards", href: "/admin/id-cards", parent: "admin" },
  "admin-class-sections": { label: "Class & Sections", href: "/admin/class-sections", parent: "admin" },

  // Teacher Portal
  "teacher": { label: "Teacher Portal", href: "/teacher", parent: "dashboard" },
  "teacher-my-class": { label: "My Class", href: "/teacher/my-class", parent: "teacher" },
  "teacher-my-class-detail": { label: "Class Details", parent: "teacher-my-class" },
  "teacher-exams": { label: "Marks Entry", href: "/teacher/grading", parent: "teacher" },
  "teacher-attendance": { label: "My Attendance", href: "/teacher/attendance", parent: "teacher" },
  "teacher-timetable": { label: "My Timetable", href: "/teacher/timetable", parent: "teacher" },

  // Student Portal
  "student": { label: "Student Portal", href: "/student", parent: "dashboard" },
  "student-lessons": { label: "My Lessons", href: "/student/lessons", parent: "student" },
  "student-fees": { label: "My Fees", href: "/student/fees", parent: "student" },
  "student-attendance": { label: "My Attendance", href: "/student/attendance", parent: "student" },
  "student-timetable": { label: "My Timetable", href: "/student/timetable", parent: "student" },

  // Parent Portal
  "parent": { label: "Parent Portal", href: "/parent", parent: "dashboard" },
  "parent-children": { label: "My Children", href: "/parent/children", parent: "parent" },
  "parent-children-detail": { label: "Child Details", parent: "parent-children" },
  "parent-fees": { label: "Children Fees", href: "/parent/fees", parent: "parent" },
  "parent-lessons": { label: "Children Lessons", href: "/parent/lessons", parent: "parent" },
  "parent-lessons-detail": { label: "Lesson Details", parent: "parent-lessons" },
  "parent-results": { label: "Children Results", href: "/parent/results", parent: "parent" },
  "parent-attendance": { label: "Children Attendance", href: "/parent/attendance", parent: "parent" },
  "parent-timetable": { label: "Child Timetable", href: "/parent/timetable", parent: "parent" },

  // Registrar Portal
  "registrar": { label: "Registrar Portal", href: "/registrar", parent: "dashboard" },

  // Super Admin Portal
  "superadmin": { label: "Super Admin", href: "/superadmin", parent: "dashboard" },
  "superadmin-admins": { label: "School Admins", href: "/superadmin/admins", parent: "superadmin" },
  "superadmin-subscription": { label: "Subscriptions", href: "/superadmin/subscription", parent: "superadmin" },
  "superadmin-subscription-plans": { label: "Plans", href: "/superadmin/subscription/plans", parent: "superadmin-subscription" },
  "superadmin-subscription-schools": { label: "Schools", href: "/superadmin/subscription/schools", parent: "superadmin-subscription" },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Converts a route segment to a human-readable label
 */
function formatSegmentLabel(segment: string): string {
  // Handle special cases and camelCase
  let label = segment
    .replace(/-/g, " ")           // Replace hyphens with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2")  // Handle camelCase
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")  // Handle acronyms
    .trim();

  // Capitalize first letter
  label = label.charAt(0).toUpperCase() + label.slice(1);

  return label;
}

/**
 * Determines if the current route should hide the breadcrumb
 */
function shouldHideBreadcrumb(pathname: string): boolean {
  const hiddenExactRoutes = [
    "/dashboard",
    "/sign-in",
    "/change-password",
    "/enroll",
  ];

  // Routes that should show breadcrumbs even if they're single-segment
  const showBreadcrumbRoutes = ["/settings", "/profile", "/notifications", "/messages", "/platform-settings"];
  const shouldShowBreadcrumb = showBreadcrumbRoutes.some(route => pathname.startsWith(route));

  // Check exact matches
  if (hiddenExactRoutes.includes(pathname)) {
    return true;
  }

  // For /admin path exactly, hide; but allow admin sub-routes
  if (pathname === "/admin") {
    return true;
  }

  // If it's a route that should show breadcrumbs, don't hide
  if (shouldShowBreadcrumb) {
    return false;
  }

  // Hide role dashboard roots, but show their nested pages.
  if (["/teacher", "/student", "/parent", "/registrar", "/superadmin", "/it-manager"].includes(pathname)) {
    return true;
  }

  // Check if it's a simple one-level page (only 2 segments: / + route)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return true;
  }

  return false;
}

/**
 * Non-clickable path segments that don't have standalone pages
 */
const NON_LINK_PATHS = [
  "/list",
  "/enrollments",
  "/list/schools",
  "/list/schools/:id",
  "/admin",
  "/teacher",
  "/student",
  "/parent",
];

const TECHNICAL_SEGMENTS = new Set(["list"]);
const TECHNICAL_LABELS = new Set(["List"]);

/**
 * Gets the appropriate dashboard URL based on the current user role/path
 */
function getDashboardHref(pathname: string): string {
  // Check path prefixes to determine user role
  // Note: We check more specific paths first before general prefixes

  // Teacher-specific paths (when user is a teacher)
  if (pathname.startsWith('/teacher/') || pathname === '/teacher') {
    return '/teacher';
  }

  // Student-specific paths (when user is a student)
  if (pathname.startsWith('/student/') || pathname === '/student') {
    return '/student';
  }

  // Parent-specific paths (when user is a parent)
  if (pathname.startsWith('/parent/') || pathname === '/parent') {
    return '/parent';
  }

  // Registrar-specific paths
  if (pathname.startsWith('/registrar/') || pathname === '/registrar') {
    return '/registrar';
  }

  // Super Admin specific paths
  if (pathname.startsWith('/superadmin/') || pathname === '/superadmin') {
    return '/superadmin';
  }

  if (pathname.startsWith('/it-manager/') || pathname === '/it-manager') {
    return '/it-manager';
  }

  // Admin and list paths (for admin/registrar users viewing admin pages)
  if (pathname.startsWith('/admin/') || pathname === '/admin' ||
    pathname.startsWith('/list/') || pathname.startsWith('/settings') ||
    pathname.startsWith('/enrollments')) {
    return '/admin';
  }

  // Default to /dashboard
  return '/dashboard';
}

/**
 * Gets the dashboard label based on the href
 */
function getDashboardLabel(href: string, labels: Record<string, string>): string {
  switch (href) {
    case '/teacher':
      return labels["Teacher Portal"] ?? 'Teacher Portal';
    case '/student':
      return labels["Student Portal"] ?? 'Student Portal';
    case '/parent':
      return labels["Parent Portal"] ?? 'Parent Portal';
    case '/registrar':
      return labels["Registrar"] ?? 'Registrar';
    case '/superadmin':
      return labels["Super Admin"] ?? 'Super Admin';
    case '/it-manager':
      return labels["IT Manager"] ?? 'IT Manager';
    case '/admin':
      return labels["Dashboard"] ?? 'Dashboard';
    default:
      return labels["Dashboard"] ?? 'Dashboard';
  }
}

/**
 * Gets dashboard icon based on href
 */
function getDashboardIcon(href: string): React.ReactNode {
  const iconClass = "w-4 h-4";

  switch (href) {
    case '/teacher':
      return <LayoutDashboard className={iconClass} />;
    case '/student':
      return <LayoutDashboard className={iconClass} />;
    case '/parent':
      return <LayoutDashboard className={iconClass} />;
    case '/registrar':
      return <LayoutDashboard className={iconClass} />;
    case '/superadmin':
      return <LayoutDashboard className={iconClass} />;
    case '/it-manager':
      return <LayoutDashboard className={iconClass} />;
    case '/admin':
      return <LayoutDashboard className={iconClass} />;
    default:
      return <Home className={iconClass} />;
  }
}

function isLikelyIdSegment(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment) ||
    /^[a-z0-9]{16,}$/i.test(segment) ||
    /^\d+$/.test(segment);
}

function getRouteConfigForPath(segments: string[], index: number): RouteConfig | undefined {
  const segment = segments[index];
  const previous = segments[index - 1];
  const next = segments[index + 1];

  if (isLikelyIdSegment(segment) && previous) {
    return ROUTE_CONFIG[`${previous}-detail`];
  }

  const pathKey = previous ? `${previous}-${segment}` : segment;
  const reversePathKey = next && isLikelyIdSegment(next) ? `${segment}-detail` : undefined;

  return ROUTE_CONFIG[pathKey] ?? (reversePathKey ? ROUTE_CONFIG[reversePathKey] : undefined) ?? ROUTE_CONFIG[segment];
}

function isNonLinkBreadcrumbPath(href: string): boolean {
  if (NON_LINK_PATHS.includes(href)) return true;
  if (/^\/list\/schools\/[^/]+$/.test(href)) return true;
  return false;
}

/**
 * Generates breadcrumbs from the current pathname
 */
function translateLabel(label: string, messages: BreadcrumbMessages): string {
  return messages.labels[label] ?? label;
}

function translateBreadcrumbItems(items: BreadcrumbItem[], messages: BreadcrumbMessages): BreadcrumbItem[] {
  return items
    .filter((item) => !TECHNICAL_LABELS.has(item.label))
    .map((item, index, visibleItems) => ({
      ...item,
      label: translateLabel(item.label, messages),
      isCurrent: item.isCurrent || index === visibleItems.length - 1,
    }));
}

function generateBreadcrumbsFromPath(pathname: string, userRole: string | undefined, messages: BreadcrumbMessages): BreadcrumbItem[] {
  // Check if we should hide the breadcrumb
  if (shouldHideBreadcrumb(pathname)) {
    return [];
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Determine dashboard URL based on path
  const dashboardHref = getDashboardHref(pathname);

  // Start with appropriate dashboard with icon
  breadcrumbs.push({
    label: getDashboardLabel(dashboardHref, messages.labels),
    href: dashboardHref,
    isCurrent: false,
    icon: getDashboardIcon(dashboardHref),
  });

  const visibleItems: BreadcrumbItem[] = [];

  // Process each segment
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    if (TECHNICAL_SEGMENTS.has(segment)) {
      continue;
    }

    // Try to find a matching route config
    let label = formatSegmentLabel(segment);
    let href = currentPath;

    if (isLikelyIdSegment(segment) && i > 0) {
      // This is likely a detail page ID
      const prevSegment = segments[i - 1];
      const detailKey = `${prevSegment}-detail`;

      if (ROUTE_CONFIG[detailKey]) {
        label = ROUTE_CONFIG[detailKey].label;
        href = ROUTE_CONFIG[detailKey].href || currentPath;
      } else {
        // Use the previous segment as label with "Detail" appended
        label = formatMessage(messages.fallback.detail, {
          label: translateLabel(formatSegmentLabel(prevSegment), messages),
        });
      }
    } else if (i > 0) {
      const config = getRouteConfigForPath(segments, i);
      if (config) {
        label = config.label;
        href = config.href || currentPath;
      }
    } else if (ROUTE_CONFIG[segment]) {
      label = ROUTE_CONFIG[segment].label;
      href = ROUTE_CONFIG[segment].href || currentPath;
    }

    visibleItems.push({
      label: translateLabel(label, messages),
      href,
      isCurrent: false,
    });
  }

  visibleItems.forEach((item, index) => {
    const isLast = index === visibleItems.length - 1;
    const href = item.href;
    const label = item.label;
    const isNonLinkPath = href ? isNonLinkBreadcrumbPath(href) : true;
    const isTeachersLink = href === '/list/teachers' || label === 'Teachers';
    const isAdmin = userRole === 'ADMIN' || userRole === 'IT_MANAGER' || userRole === 'SUPER_ADMIN';
    const shouldBeLink = !isLast && href && !isNonLinkPath && !(isTeachersLink && !isAdmin);

    breadcrumbs.push({
      label,
      href: shouldBeLink ? href : undefined,
      isCurrent: isLast,
    });
  });

  return breadcrumbs;
}

// ============================================
// Main Breadcrumb Component
// ============================================

/**
 * Breadcrumb Navigation Component for School Management System
 * 
 * Features:
 * - Positioned below navbar, above page title
 * - ">" as separator (can be customized)
 * - Clickable links with nice hover effects
 * - Current page is bold with accent color
 * - Active link indicator line on hover
 * - Subtle background on hover
 * - Icons for better visual hierarchy
 * - Responsive with truncation for mobile
 * - Hidden on login, dashboard, and simple pages
 */
export function Breadcrumb({
  items,
  className = "",
  showHomeIcon = true,
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />
}: BreadcrumbProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslations<BreadcrumbMessages>("breadcrumb");
  // Get context items if available (may not exist if provider not mounted)
  let contextItems: BreadcrumbItem[] | null = null;
  try {
    const context = useBreadcrumb();
    contextItems = context?.items ?? null;
  } catch {
    // Context not available
    contextItems = null;
  }

  // Generate breadcrumbs: context items take priority, then props, then auto-generate
  const breadcrumbItems = useMemo(() => {
    // Use context items if available (highest priority)
    if (contextItems && contextItems.length > 0) {
      return translateBreadcrumbItems(contextItems, t);
    }
    // Use props items if provided
    if (items && items.length > 0) {
      return translateBreadcrumbItems(items, t);
    }
    // Auto-generate from path
    return generateBreadcrumbsFromPath(pathname, user?.role, t);
  }, [pathname, items, contextItems, user?.role, t]);

  // Don't render if no items or hidden
  if (breadcrumbItems.length === 0) {
    return null;
  }

  // Check if we should show simplified view for mobile
  const showSimplified = breadcrumbItems.length > 3;

  return (
    <nav
      className={`flex items-center text-xs sm:text-sm py-2 sm:py-3 px-4 sm:px-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center flex-wrap gap-0.5 sm:gap-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = item.isCurrent;
          const isFirst = index === 0;
          const showIcon = showHomeIcon && isFirst && item.icon;

          return (
            <li
              key={index}
              className="flex items-center group"
            >
              {/* Separator - only between items */}
              {!isFirst && (
                <span className="mx-0.5 sm:mx-1.5 text-gray-400" aria-hidden="true">
                  {separator}
                </span>
              )}

              {/* Breadcrumb Item - render as span if no href or is current page */}
              {!item.href || item.isCurrent ? (
                // Plain text - either current page or non-clickable item
                <span
                  className={`
                    flex items-center gap-1 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md
                    ${item.isCurrent
                      ? "font-semibold text-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.05)]"
                      : "text-gray-500 font-medium"
                    }
                  `}
                  aria-current={item.isCurrent ? "page" : undefined}
                >
                  {showIcon && item.icon}
                  <span className={showSimplified && index === 1 ? 'hidden md:inline' : ''}>
                    {item.label}
                  </span>
                  {showSimplified && index === 1 && (
                    <span className="md:hidden">...</span>
                  )}
                  {showSimplified && index === 0 && breadcrumbItems.length > 2 && (
                    <span className="hidden sm:inline">{item.label}</span>
                  )}
                </span>
              ) : (
                // Clickable link with nice hover effects
                <Link
                  href={item.href}
                  className={`
                    group relative
                    flex items-center gap-1 
                    px-1 sm:px-2 py-0.5 sm:py-1 rounded-md
                    text-gray-600 dark:text-gray-400
                    hover:text-[var(--brand-color,#e35336)] dark:hover:text-[var(--brand-color,#e35336)]
                    transition-all duration-200
                    hover:bg-[rgba(var(--brand-color-rgb),0.05)]
                    overflow-hidden
                  `}
                >
                  {/* Active indicator line on hover */}
                  <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-[var(--brand-color,#e35336)] group-hover:w-1/2 group-hover:left-0 transition-all duration-300"></span>
                  <span className="absolute bottom-0 right-1/2 w-0 h-0.5 bg-[var(--brand-color,#e35336)] group-hover:w-1/2 group-hover:right-0 transition-all duration-300"></span>

                  {showIcon && item.icon}
                  <span className={showSimplified && index === 1 ? 'hidden md:inline' : ''}>
                    {item.label}
                  </span>
                  {showSimplified && index === 1 && (
                    <span className="md:hidden">...</span>
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================
// Legacy Helper Functions (for backward compatibility)
// ============================================

/**
 * Generate breadcrumbs based on user role and current path
 * @deprecated Use generateBreadcrumbsFromPath instead
 */
export function generateBreadcrumbs(pathname: string, userRole?: string): BreadcrumbItem[] {
  return generateBreadcrumbsFromPath(pathname, userRole, DEFAULT_BREADCRUMB_MESSAGES);
}

// ============================================
// Page Title Component with Integrated Breadcrumb
// ============================================

interface PageTitleWithBreadcrumbProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  showHomeIcon?: boolean;
}

/**
 * Combined Page Title and Breadcrumb component
 * Use this for pages that need both breadcrumb and title
 */
export function PageTitleWithBreadcrumb({
  title,
  description,
  children,
  breadcrumbItems,
  showHomeIcon = true
}: PageTitleWithBreadcrumbProps) {
  return (
    <div className="mb-12">
      <Breadcrumb items={breadcrumbItems} showHomeIcon={showHomeIcon} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 md:px-0 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default Breadcrumb;
