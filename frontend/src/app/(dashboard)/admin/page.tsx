"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { dashboardAPI } from "@/lib/api/admin";
import { toast } from "sonner";
import DynamicChart from "@/components/charts/DynamicChart";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  DollarSign,
  Calendar,
  FileText,
  Settings,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  Layers,
  UserCheck,
  UserX,
  LayoutGrid,
  RefreshCw,
  UserCog,
  ClipboardPlus,
  FileBarChart,
  X,
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/hooks/useTranslations";

interface DashboardStats {
  students: number;
  teachers: number;
  classes: number;
  sections: number;
  attendanceRate: number;
  presentToday: number;
  absentToday: number;
  pendingEnrollments: number;
  feesCollected: number;
  expectedFees: number;
  feesCollectedPercentage: number;
  upcomingExams: number;
  totalRevenue: number;
}

interface DashboardAlert {
  message: string;
  type: "warning" | "error" | "info" | "success";
  priority: "high" | "medium" | "low";
  actionUrl?: string;
  actionLabel?: string;
}

interface QuickAction {
  label: string;
  icon?: string;
  url: string;
  permission?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface ChartData {
  type: "bar" | "line" | "pie" | "doughnut";
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}

interface TeacherLeaderboardEntry {
  rank: number;
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  overallScore: number;
  gradingScore: number;
  attendanceScore: number;
  lessonPlanScore: number;
  gradingSubmitted: number;
  gradingOnTime: number;
  attendanceSubmitted: number;
  lessonPlans: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  alerts: DashboardAlert[];
  quickActions: QuickAction[];
  charts: { [key: string]: ChartData };
  metadata: {
    schoolId?: string;
    generatedAt: string;
    teacherLeaderboard?: TeacherLeaderboardEntry[];
  };
}

interface AdminDashboardMessages {
  title: {
    admin: string;
    itManager: string;
  };
  intro: {
    welcomeBack: string;
    admin: string;
    itManager: string;
    lastUpdated: string;
  };
  error: {
    title: string;
    loadFailed: string;
    tryAgain: string;
  };
  kpis: {
    totalStudents: string;
    enrolledStudents: string;
    totalTeachers: string;
    activeTeachers: string;
    classes: string;
    sections: string;
    attendanceToday: string;
    pendingEnrollments: string;
    needsAttention: string;
    allClear: string;
    upcomingExams: string;
    withinNextSevenDays: string;
  };
  priority: {
    high: string;
    medium: string;
    low: string;
  };
  charts: Record<string, string>;
}

// Map icon string names from backend to lucide icons
const iconMap: Record<string, React.ElementType> = {
  student: UserPlus,
  teacher: GraduationCap,
  class: BookOpen,
  settings: Settings,
  enrollment: FileText,
  attendance: ClipboardCheck,
  report: FileBarChart,
  finance: DollarSign,
};

// Map icon names to color schemes
const iconColorMap: Record<string, { bg: string; icon: string }> = {
  student: { bg: "bg-blue-100 dark:bg-blue-900/50", icon: "text-blue-600 dark:text-blue-400" },
  teacher: { bg: "bg-emerald-100 dark:bg-emerald-900/50", icon: "text-emerald-600 dark:text-emerald-400" },
  class: { bg: "bg-indigo-100 dark:bg-indigo-900/50", icon: "text-indigo-600 dark:text-indigo-400" },
  settings: { bg: "bg-gray-100 dark:bg-gray-900/50", icon: "text-gray-600 dark:text-gray-400" },
  enrollment: { bg: "bg-amber-100 dark:bg-amber-900/50", icon: "text-amber-600 dark:text-amber-400" },
  attendance: { bg: "bg-purple-100 dark:bg-purple-900/50", icon: "text-purple-600 dark:text-purple-400" },
  report: { bg: "bg-cyan-100 dark:bg-cyan-900/50", icon: "text-cyan-600 dark:text-cyan-400" },
  finance: { bg: "bg-rose-100 dark:bg-rose-900/50", icon: "text-rose-600 dark:text-rose-400" },
};

const AdminDashboardView = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const dashboardRole = pathname?.includes("/it-manager") ? "IT_MANAGER" : "ADMIN";
  const { formattedYearLabel, displayTermName, currentTerm, formatDate: formatSchoolDate } = useAcademicYear();
  const { t } = useTranslations<AdminDashboardMessages>("adminDashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);
  const dismissedAlertsStorageKey = user?.id
    ? `admin_dashboard_dismissed_alerts:${dashboardRole}:${user.id}`
    : null;
  const charts = dashboardData?.charts || {};

  const getAlertKey = useCallback((alert: DashboardAlert) => {
    return [
      alert.type,
      alert.priority,
      alert.message,
      alert.actionUrl ?? "",
      alert.actionLabel ?? "",
    ].join("|");
  }, []);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response =
        dashboardRole === "IT_MANAGER"
          ? await dashboardAPI.getItManagerDashboard()
          : await dashboardAPI.getAdminDashboard();
      setDashboardData(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t.error.loadFailed;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboardRole, t.error.loadFailed]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchDashboard();
    }
  }, [authLoading, isAuthenticated, fetchDashboard]);

  useEffect(() => {
    if (typeof window === "undefined" || !dismissedAlertsStorageKey) {
      setDismissedAlertKeys([]);
      return;
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(dismissedAlertsStorageKey) || "[]");
      setDismissedAlertKeys(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      setDismissedAlertKeys([]);
    }
  }, [dismissedAlertsStorageKey]);

  const dismissAlert = useCallback(
    (alert: DashboardAlert) => {
      const alertKey = getAlertKey(alert);
      setDismissedAlertKeys((current) => {
        if (current.includes(alertKey)) return current;

        const next = [...current, alertKey].slice(-100);
        if (typeof window !== "undefined" && dismissedAlertsStorageKey) {
          window.localStorage.setItem(dismissedAlertsStorageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [dismissedAlertsStorageKey, getAlertKey],
  );

  useEffect(() => {
    setShowCharts(false);

    if (!dashboardData?.charts) return;

    const schedule =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (window as Window & {
            requestIdleCallback: (
              callback: IdleRequestCallback,
              options?: IdleRequestOptions,
            ) => number;
          }).requestIdleCallback(
            () => setShowCharts(true),
            { timeout: 300 },
          )
        : setTimeout(() => setShowCharts(true), 120);

    return () => {
      if (typeof schedule === "number") {
        if (
          typeof window !== "undefined" &&
          "cancelIdleCallback" in window &&
          typeof (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback === "function"
        ) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(schedule);
        } else {
          window.clearTimeout(schedule);
        }
      }
    };
  }, [dashboardData]);

  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  const translateChartText = useCallback(
    (value: string) => t.charts[value] ?? t.charts[value?.toUpperCase?.()] ?? value,
    [t.charts],
  );

  const translateChart = useCallback(
    (chart?: ChartData): ChartData | undefined => {
      if (!chart) return chart;

      return {
        ...chart,
        title: translateChartText(chart.title),
        labels: chart.labels.map((label) => translateChartText(label)),
        datasets: chart.datasets.map((dataset) => ({
          ...dataset,
          label: translateChartText(dataset.label),
        })),
      };
    },
    [translateChartText],
  );

  const getAlertStyles = (type: string) => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
          icon: AlertTriangle,
          iconColor: "text-amber-600 dark:text-amber-400",
        };
      case "error":
        return {
          bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          icon: AlertCircle,
          iconColor: "text-red-600 dark:text-red-400",
        };
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          icon: CheckCircle2,
          iconColor: "text-green-600 dark:text-green-400",
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
          icon: Info,
          iconColor: "text-blue-600 dark:text-blue-400",
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-400";
    }
  };

  // Loading skeleton
  if (loading || authLoading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gray-50 p-3 dark:bg-[#111111] sm:p-4 md:p-6">
        <div className="w-full space-y-5 md:space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111111] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.error.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Button onClick={() => fetchDashboard()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.error.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const alerts = dashboardData?.alerts || [];
  const dismissedAlertSet = new Set(dismissedAlertKeys);
  const visibleAlerts = alerts.filter((alert) => !dismissedAlertSet.has(getAlertKey(alert)));
  const metadata = dashboardData?.metadata;
  const isITManagerDashboard = dashboardRole === "IT_MANAGER";
  const toBarChart = (data: ChartData | null | undefined): ChartData | null | undefined =>
    data && data.type !== "bar" && data.type !== "line" ? { ...data, type: "bar" } : data;

  const visibleCharts = {
    attendance: translateChart(charts.attendance),
    userDistribution: toBarChart(translateChart(charts.userDistribution)),
    classDistribution: toBarChart(translateChart(charts.classDistribution)),
    overview: toBarChart(translateChart(charts.overview)),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 transition-colors dark:bg-[#111111]">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="w-full space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-black sm:text-2xl">
                {isITManagerDashboard ? t.title.itManager : t.title.admin}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                {t.intro.welcomeBack}{user?.name ? `, ${user.name}` : ""}!{" "}
                {isITManagerDashboard
                  ? t.intro.itManager
                  : t.intro.admin}
              </p>
              {metadata?.generatedAt && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t.intro.lastUpdated}: {formatSchoolDate(new Date(metadata.generatedAt))}
                </p>
              )}
            </div>
            {displayTermName && (
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-base font-bold text-black sm:text-xl">{displayTermName}</p>
              </div>
            )}

          </div>

          {/* Alerts Section */}
          {visibleAlerts.length > 0 && (
            <div className="space-y-3">
              {visibleAlerts.map((alert) => {
                const alertStyle = getAlertStyles(alert.type);
                const AlertIcon = alertStyle.icon;
                return (
                  <div
                    key={getAlertKey(alert)}
                    className={`relative flex flex-col gap-3 rounded-lg border p-3 pr-12 sm:flex-row sm:items-center ${alertStyle.bg}`}
                  >
                    <AlertIcon className={`w-5 h-5 flex-shrink-0 ${alertStyle.iconColor}`} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{alert.message}</p>
                      <Badge className={`text-xs ${getPriorityBadge(alert.priority)}`}>
                        {t.priority[alert.priority] ?? alert.priority}
                      </Badge>
                    </div>
                    {alert.actionUrl && alert.actionLabel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(alert.actionUrl!)}
                        className="flex w-full items-center justify-center gap-1 text-xs sm:w-auto"
                      >
                        {alert.actionLabel}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissAlert(alert)}
                      aria-label="Close dashboard reminder"
                      className="absolute right-2 top-2 h-8 w-8 shrink-0 rounded-full text-gray-500 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1A1A1A]/70 dark:hover:text-white sm:top-1/2 sm:-translate-y-1/2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Students */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.kpis.totalStudents}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {(stats?.students ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block lg:hidden xl:block">{t.kpis.enrolledStudents}</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg shrink-0">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Teachers */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.kpis.totalTeachers}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {(stats?.teachers ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block lg:hidden xl:block">{t.kpis.activeTeachers}</p>
                  </div>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg shrink-0">
                    <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Classes */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.kpis.classes}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {(stats?.classes ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {(stats?.sections ?? 0)} {t.kpis.sections}
                    </p>
                  </div>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg shrink-0">
                    <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Today */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.kpis.attendanceToday}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats?.attendanceRate ?? 0}%
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <UserCheck className="w-3 h-3" /> {stats?.presentToday ?? 0}
                      </span>
                      <span className="text-xs text-red-500 dark:text-red-400 flex items-center gap-0.5">
                        <UserX className="w-3 h-3" /> {stats?.absentToday ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg shrink-0">
                    <ClipboardCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Enrollments */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.kpis.pendingEnrollments}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats?.pendingEnrollments ?? 0}
                    </p>
                    <p className="text-xs mt-1">
                      {(stats?.pendingEnrollments ?? 0) > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">{t.kpis.needsAttention}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">{t.kpis.allClear}</span>
                      )}
                    </p>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg shrink-0">
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Exams */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.kpis.upcomingExams}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats?.upcomingExams ?? 0}
                    </p>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block lg:hidden xl:block">{t.kpis.withinNextSevenDays}</p>
                  </div>
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {/* Weekly Attendance Chart */}
            {visibleCharts.attendance && (
              <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
                <CardContent className="p-3 sm:p-4">
                  {showCharts ? (
                    <DynamicChart chartData={visibleCharts.attendance} height={240} />
                  ) : (
                    <Skeleton className="h-[240px] w-full" />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Users by Role Distribution */}
            {visibleCharts.userDistribution && (
              <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
                <CardContent className="p-3 sm:p-4">
                  {showCharts ? (
                    <DynamicChart chartData={visibleCharts.userDistribution} height={240} />
                  ) : (
                    <Skeleton className="h-[240px] w-full" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sections per Class - Full Width */}
          {visibleCharts.classDistribution && (
            <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
              <CardContent className="p-3 sm:p-4">
                {showCharts ? (
                  <DynamicChart chartData={visibleCharts.classDistribution} height={240} />
                ) : (
                  <Skeleton className="h-[240px] w-full" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Bottom Section - School Overview */}
          <div className="grid grid-cols-1 gap-3">
            {/* School Overview Pie Chart */}
            {visibleCharts.overview && (
              <Card className="min-w-0 overflow-hidden lg:col-span-2 shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
                <CardContent className="p-3 sm:p-4">
                  {showCharts ? (
                    <DynamicChart chartData={visibleCharts.overview} height={260} />
                  ) : (
                    <Skeleton className="h-[260px] w-full" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminPage() {
  return <AdminDashboardView />;
}
