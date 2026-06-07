"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { dashboardAPI } from "@/lib/api/admin";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  CalendarCheck,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileCheck,
  GraduationCap,
  Info,
  LineChart,
  Printer,
  School,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DashboardAlert {
  message: string;
  type: "warning" | "error" | "info" | "success";
  priority: "high" | "medium" | "low";
  actionUrl?: string;
  actionLabel?: string;
}

interface DashboardChart {
  type: "line" | "bar" | "pie" | "doughnut";
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
  stats: Record<string, any>;
  alerts: DashboardAlert[];
  quickActions: Array<{
    label: string;
    url: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  charts: Record<string, DashboardChart>;
  metadata: {
    academicYear?: string;
    term?: string;
    generatedAt: string;
  };
}

const statCards = [
  { key: "totalStudents", label: "Total Students", icon: Users, color: "blue" },
  { key: "pendingApplications", label: "Pending Applications", icon: ClipboardList, color: "amber" },
  { key: "classOccupancy", label: "Class Occupancy", icon: GraduationCap, color: "violet" },
  { key: "dropoutRiskStudents", label: "Dropout Risk", icon: AlertCircle, color: "red" },
  { key: "nationalExamCandidates", label: "National Exam Candidates", icon: Award, color: "emerald" },
  { key: "studentsWithoutDocuments", label: "Missing Documents", icon: FileCheck, color: "slate" },
  { key: "sectionsWithoutHomeroom", label: "No Homeroom Teacher", icon: School, color: "indigo" },
  { key: "missingAttendanceSessions", label: "Missing Attendance Sessions", icon: CalendarCheck, color: "rose" },
];

const colorClasses: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export default function RegistrarDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { displayTermName } = useAcademicYear();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);
  const dismissedAlertsStorageKey = user?.id ? `registrar_dashboard_dismissed_alerts:${user.id}` : null;

  const getAlertKey = useCallback((alert: DashboardAlert) => {
    return [
      alert.type,
      alert.priority,
      alert.message,
      alert.actionUrl ?? "",
      alert.actionLabel ?? "",
    ].join("|");
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getRegistrarDashboard();
        setDashboardData(response.data);
      } catch (error) {
        console.error("Failed to fetch registrar dashboard data:", error);
        toast.error("Failed to load registrar dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, isLoading]);

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

  const primaryActions = useMemo(
    () => [
      { label: "Register Student", href: "/admin/enrollment", icon: UserCheck },
      { label: "Manage Students", href: "/list/students", icon: Users },
      { label: "Class & Sections", href: "/admin/class-sections", icon: GraduationCap },
      { label: "Promotion Decisions", href: "/admin/promotion", icon: ShieldCheck },
      { label: "School Leaving", href: "/registrar/school-leaving", icon: Printer },
      { label: "National Exams", href: "/registrar/national-exams", icon: Award },
      { label: "Credentials", href: "/admin/credentials", icon: FileCheck },
    ],
    [],
  );

  const renderChart = (chart: DashboardChart) => {
    const chartData = chart.labels.map((label, index) => {
      const dataPoint: Record<string, any> = { name: label };
      chart.datasets.forEach((dataset) => {
        dataPoint[dataset.label] = dataset.data[index] || 0;
      });
      return dataPoint;
    });
    const colors = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

    if (chart.type === "pie" || chart.type === "doughnut") {
      const pieData = chart.labels.map((label, index) => ({
        name: label,
        value: chart.datasets[0]?.data[index] || 0,
      }));
      const palette = Array.isArray(chart.datasets[0]?.backgroundColor)
        ? chart.datasets[0].backgroundColor
        : colors;

      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={chart.type === "doughnut" ? 56 : 0} outerRadius={86}>
              {pieData.map((_, index) => (
                <Cell key={index} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    const Chart = chart.type === "bar" ? BarChart : AreaChart;
    return (
      <ResponsiveContainer width="100%" height={260}>
        <Chart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {chart.datasets.map((dataset, index) =>
            chart.type === "bar" ? (
              <Bar key={dataset.label} dataKey={dataset.label} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
            ) : (
              <Area
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.borderColor || colors[index % colors.length]}
                fill={typeof dataset.backgroundColor === "string" ? dataset.backgroundColor : `${colors[index % colors.length]}22`}
                strokeWidth={2}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    );
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-color,#e35336)] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

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

  const stats = dashboardData?.stats || {};
  const charts = dashboardData?.charts || {};
  const dismissedAlertSet = new Set(dismissedAlertKeys);
  const alerts = (dashboardData?.alerts || [])
    .map((alert) => ({ alert, key: getAlertKey(alert) }))
    .filter(({ key }) => !dismissedAlertSet.has(key));

  return (
    <div className="min-h-screen bg-gray-50 py-6 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Registrar Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Student records, enrollment, academic documents, and authority reporting for {user?.name || "registrar"}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {dashboardData?.metadata?.academicYear && (
              <span className="rounded-md bg-white px-3 py-2 font-medium text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                {dashboardData.metadata.academicYear}
              </span>
            )}
            {displayTermName && (
              <span className="rounded-md bg-white px-3 py-2 font-medium text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                {displayTermName}
              </span>
            )}
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.map(({ alert, key }) => {
              const alertStyle = getAlertStyles(alert.type);
              const AlertIcon = alertStyle.icon;
              return (
                <div
                  key={key}
                  className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${alertStyle.bg}`}
                >
                  <AlertIcon className={`h-5 w-5 shrink-0 ${alertStyle.iconColor}`} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{alert.message}</p>
                    <Badge className={`text-xs ${getPriorityBadge(alert.priority)}`}>
                      {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
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
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dismissAlert(alert)}
                    className="h-8 w-8 shrink-0 self-end text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:self-auto"
                    title="Dismiss notification"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const value = stats[card.key] ?? 0;
            return (
              <div key={card.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
                      {typeof value === "number" ? value.toLocaleString() : value}
                    </p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${colorClasses[card.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="flex min-h-20 flex-col items-start justify-between rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[var(--brand-color,#e35336)] dark:border-gray-700 dark:bg-gray-800"
              >
                <Icon className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
                <span className="text-sm font-semibold text-gray-950 dark:text-white">{action.label}</span>
              </button>
            );
          })}
        </div>





        {Object.keys(charts).length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(charts).slice(0, 4).map(([key, chart]) => (
              <div key={key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-2">
                  {chart.type === "line" ? <LineChart className="h-5 w-5 text-blue-600" /> : <BarChart3 className="h-5 w-5 text-blue-600" />}
                  <h2 className="font-semibold text-gray-950 dark:text-white">{chart.title}</h2>
                </div>
                {renderChart(chart)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
