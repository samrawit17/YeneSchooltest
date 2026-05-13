"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

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

interface DashboardResponse {
  stats: DashboardStats;
  alerts: DashboardAlert[];
  quickActions: QuickAction[];
  charts: { [key: string]: ChartData };
  metadata: {
    schoolId?: string;
    generatedAt: string;
  };
}

interface AdminPageProps {
  dashboardRole?: "ADMIN" | "IT_MANAGER";
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

const AdminPage = ({ dashboardRole = "ADMIN" }: AdminPageProps) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { formattedYearLabel, displayTermName, currentTerm, formatDate: formatSchoolDate } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const charts = dashboardData?.charts || {};

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
      const message = err?.response?.data?.message || "Failed to load dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchDashboard();
    }
  }, [authLoading, isAuthenticated, fetchDashboard]);

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
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  // Loading skeleton
  if (loading || authLoading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gray-50 p-3 dark:bg-slate-900 sm:p-4 md:p-6">
        <div className="w-full space-y-5 md:space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Failed to Load Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Button onClick={() => fetchDashboard()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const alerts = dashboardData?.alerts || [];
  const metadata = dashboardData?.metadata;
  const isITManagerDashboard = dashboardRole === "IT_MANAGER";
  const visibleCharts = {
    attendance: charts.attendance,
    userDistribution: charts.userDistribution,
    classDistribution: charts.classDistribution,
    overview: charts.overview,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 transition-colors dark:bg-slate-900">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="w-full space-y-5 md:space-y-6">
          {/* Header */}
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-black sm:text-2xl">
                {isITManagerDashboard ? "IT Manager Dashboard" : "Admin Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                Welcome back{user?.name ? `, ${user.name}` : ""}!{" "}
                {isITManagerDashboard
                  ? "Here's the current state of your school's systems and operations."
                  : "Here's what's happening in your school today."}
              </p>
              {metadata?.generatedAt && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Last updated: {formatSchoolDate(new Date(metadata.generatedAt))}
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
          {alerts.length > 0 && (
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const alertStyle = getAlertStyles(alert.type);
                const AlertIcon = alertStyle.icon;
                return (
                  <div
                    key={index}
                    className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${alertStyle.bg}`}
                  >
                    <AlertIcon className={`w-5 h-5 flex-shrink-0 ${alertStyle.iconColor}`} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{alert.message}</p>
                      <Badge className={`text-xs ${getPriorityBadge(alert.priority)}`}>
                        {alert.priority}
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
                  </div>
                );
              })}
            </div>
          )}

          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Students */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {(stats?.students ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block lg:hidden xl:block">Enrolled students</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg shrink-0">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Teachers */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Teachers</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {(stats?.teachers ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block lg:hidden xl:block">Active teachers</p>
                  </div>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg shrink-0">
                    <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Classes */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Classes</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {(stats?.classes ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {(stats?.sections ?? 0)} sections
                    </p>
                  </div>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg shrink-0">
                    <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Today */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Attendance Today</p>
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
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending Enrollments</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats?.pendingEnrollments ?? 0}
                    </p>
                    <p className="text-xs mt-1">
                      {(stats?.pendingEnrollments ?? 0) > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">Needs attention</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">All clear</span>
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
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming Exams</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats?.upcomingExams ?? 0}
                    </p>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block lg:hidden xl:block">Within next 7 days</p>
                  </div>
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Weekly Attendance Chart */}
            {visibleCharts.attendance && (
              <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" style={{ contain: 'layout style paint' }}>
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
              <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" style={{ contain: 'layout style paint' }}>
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
            <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" style={{ contain: 'layout style paint' }}>
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
          <div className="grid grid-cols-1 gap-6">
            {/* School Overview Pie Chart */}
            {visibleCharts.overview && (
              <Card className="min-w-0 overflow-hidden lg:col-span-2 shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" style={{ contain: 'layout style paint' }}>
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

export default AdminPage;
