"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronRight, Home, LayoutDashboard } from "lucide-react";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";

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
  "lessons-create": { label: "Create Lesson", parent: "lessons-teacher" },

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
  "users": { label: "Users", href: "/list/users", parent: "dashboard" },

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
  "teacher-exams": { label: "Grade Entry", href: "/teacher/grading", parent: "teacher" },
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

  const hiddenPrefixRoutes = [
    "/teacher",
    "/student",
    "/parent",
    "/registrar",
    "/superadmin",
  ];

  // Admin routes - show breadcrumbs for these sub-routes
  const adminSubRoutes = ["/admin/timetable", "/admin/communications", "/admin/attendance", "/admin/id-cards", "/admin/assignments", "/admin/class-sections"];
  const isAdminSubRoute = adminSubRoutes.some(route => pathname.startsWith(route)) || pathname === "/admin/timetable";

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

  // If it's an admin sub-route, don't hide
  if (isAdminSubRoute) {
    return false;
  }

  // If it's a route that should show breadcrumbs, don't hide
  if (shouldShowBreadcrumb) {
    return false;
  }

  // Check prefix matches (for role-based dashboards), but exclude admin sub-routes
  if (hiddenPrefixRoutes.some(route => pathname.startsWith(route))) {
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
 * Gets the parent route key for a given route
 */
function getParentRouteKey(routeKey: string): string | undefined {
  const config = ROUTE_CONFIG[routeKey];
  return config?.parent;
}

/**
 * Non-clickable path segments that don't have standalone pages
 */
const NON_LINK_PATHS = [
  "/list",
  "/settings",
  "/enrollments",
  "/list/schools",
  "/list/schools/:id",
  "/admin",
  "/teacher",
  "/student",
  "/parent",
  "/list/parents",
];

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
function getDashboardLabel(href: string): string {
  switch (href) {
    case '/teacher':
      return 'Teacher Portal';
    case '/student':
      return 'Student Portal';
    case '/parent':
      return 'Parent Portal';
    case '/registrar':
      return 'Registrar';
    case '/superadmin':
      return 'Super Admin';
    case '/it-manager':
      return 'IT Manager';
    case '/admin':
      return 'Dashboard';
    default:
      return 'Dashboard';
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

/**
 * Generates breadcrumbs from the current pathname
 */
function generateBreadcrumbsFromPath(pathname: string, userRole?: string): BreadcrumbItem[] {
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
    label: getDashboardLabel(dashboardHref),
    href: dashboardHref,
    isCurrent: false,
    icon: getDashboardIcon(dashboardHref),
  });

  // Process each segment
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    const isLast = i === segments.length - 1;

    // Try to find a matching route config
    let routeKey = segment;
    let label = formatSegmentLabel(segment);
    let href = currentPath;

    // Check for detail pages (segments that are IDs - typically UUIDs or numeric or base64 encoded)
    const isIdSegment = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment) || /^[0-9a-z]{20,}$/i.test(segment) || /^\d+$/.test(segment);

    if (isIdSegment && i > 0) {
      // This is likely a detail page ID
      const prevSegment = segments[i - 1];
      const detailKey = `${prevSegment}-detail`;

      if (ROUTE_CONFIG[detailKey]) {
        routeKey = detailKey;
        label = ROUTE_CONFIG[detailKey].label;
        href = ROUTE_CONFIG[detailKey].href || currentPath;
      } else {
        // Use the previous segment as label with "Detail" appended
        label = formatSegmentLabel(prevSegment) + " Detail";
      }
    } else if (ROUTE_CONFIG[routeKey]) {
      // Use the route config if available
      label = ROUTE_CONFIG[routeKey].label;
      href = ROUTE_CONFIG[routeKey].href || currentPath;
    } else if (i > 0) {
      // Check if this is a sub-route (e.g., admin/timetable -> timetable-admin)
      const parentSegment = segments[i - 1];
      const combinedKey = `${parentSegment}-${routeKey}`;
      if (ROUTE_CONFIG[combinedKey]) {
        routeKey = combinedKey;
        label = ROUTE_CONFIG[combinedKey].label;
        href = ROUTE_CONFIG[combinedKey].href || currentPath;
      }
    } else {
      // Try to find parent-based configuration
      const parentKey = getParentRouteKey(routeKey);
      if (parentKey && ROUTE_CONFIG[parentKey]) {
        label = ROUTE_CONFIG[parentKey].label;
        href = ROUTE_CONFIG[parentKey].href || currentPath;
      }
    }

    // Determine if this should be a clickable link
    // Non-link paths like /list, /settings don't have standalone pages
    const isNonLinkPath = NON_LINK_PATHS.includes(href) ||
      href.startsWith('/list/schools/') || // School detail pages
      NON_LINK_PATHS.some(path => href.startsWith(path));
    
    // Special handling for Teachers link - only clickable for admin users
    const isTeachersLink = href === '/list/teachers' || label === 'Teachers';
    const isAdmin = (userRole === 'ADMIN' || userRole === 'IT_MANAGER') || userRole === 'IT_MANAGER' || userRole === 'SUPER_ADMIN';
    const shouldBeLink = !isLast && href && !isNonLinkPath && !(isTeachersLink && !isAdmin);

    breadcrumbs.push({
      label,
      href: shouldBeLink ? href : undefined,
      isCurrent: isLast,
    });
  }

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
      return contextItems;
    }
    // Use props items if provided
    if (items && items.length > 0) {
      return items;
    }
    // Auto-generate from path
    return generateBreadcrumbsFromPath(pathname, user?.role);
  }, [pathname, items, contextItems, user?.role]);

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
  return generateBreadcrumbsFromPath(pathname);
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
