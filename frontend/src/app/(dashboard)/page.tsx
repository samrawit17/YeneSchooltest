"use client";

import { useEffect, useState } from "react";
import { useAuth, hasPermission } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { dashboardAPI } from "@/lib/api/admin";
import Image from "next/image";
import Link from "next/link";

// Types matching the universal dashboard response
interface DashboardAlert {
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
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

interface DashboardChart {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}

interface DashboardResponse {
  stats: Record<string, any>;
  alerts: DashboardAlert[];
  quickActions: QuickAction[];
  charts: Record<string, DashboardChart>;
  metadata: {
    schoolId?: string;
    academicYear?: string;
    term?: string;
    generatedAt: string;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect users to their role-specific dashboards
    const roleRoutes: Record<string, string> = {
      ADMIN: '/admin',
      SUPER_ADMIN: '/superadmin',
      TEACHER: '/teacher',
      STUDENT: '/student',
      PARENT: '/parent',
      REGISTRAR: '/registrar',
      FINANCE: '/finance',
      IT_MANAGER: '/it-manager',
    };

    if (user?.role && roleRoutes[user.role]) {
      router.replace(roleRoutes[user.role]);
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getDashboard();
        setDashboardData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch dashboard:", err);
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboard();
    }
  }, [user, router]);

  // Helper to render alerts
  const renderAlert = (alert: DashboardAlert, index: number) => {
    const alertColors = {
      warning: "bg-amber-50 border-amber-200 text-amber-800",
      error: "bg-red-50 border-red-200 text-red-800",
      info: "bg-blue-50 border-blue-200 text-blue-800",
      success: "bg-green-50 border-green-200 text-green-800",
    };

    const priorityIcons = {
      high: "🔴",
      medium: "🟡",
      low: "🟢",
    };

    return (
      <div
        key={index}
        className={`p-4 rounded-lg border ${alertColors[alert.type]} mb-2`}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">{priorityIcons[alert.priority]}</span>
          <div className="flex-1">
            <p className="text-sm font-medium">{alert.message}</p>
            {alert.actionUrl && (
              <Link
                href={alert.actionUrl}
                className="text-xs font-semibold mt-2 inline-block hover:underline"
              >
                {alert.actionLabel || "Take Action →"}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper to render quick actions
  const renderQuickAction = (action: QuickAction, index: number) => {
    if (action.permission && !hasPermission(user, action.permission)) {
      return null;
    }

    return (
      <Link
        href={action.disabled ? "#" : action.url}
        key={index}
        className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
          action.disabled
            ? "bg-gray-100 cursor-not-allowed opacity-50"
            : "bg-gray-50 hover:bg-blue-50"
        }`}
      >
        <Image
          src={action.icon || "/create.png"}
          alt={action.label}
          width={24}
          height={24}
          className={action.disabled ? "grayscale" : ""}
        />
        <span className="text-sm text-gray-700 text-center">{action.label}</span>
        {action.disabled && action.disabledReason && (
          <span className="text-xs text-gray-500">{action.disabledReason}</span>
        )}
      </Link>
    );
  };

  // Helper to render stats cards
  const renderStats = () => {
    if (!dashboardData?.stats) return null;

    const statsArray = Object.entries(dashboardData.stats).map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));

    return statsArray.map((stat, index) => (
      <div
        key={index}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
        </h1>
        <p className="text-blue-100">
          Here's your dashboard for today.{" "}
          {dashboardData?.metadata?.academicYear && (
            <span className="text-blue-200">
              Academic Year: {dashboardData.metadata.academicYear}
            </span>
          )}
        </p>
        {dashboardData?.metadata?.generatedAt && (
          <p className="text-xs text-blue-300 mt-2">
            Last updated: {new Date(dashboardData.metadata.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderStats()}
      </div>

      {/* Quick Actions */}
      {dashboardData?.quickActions && dashboardData.quickActions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {dashboardData.quickActions.map((action, index) =>
              renderQuickAction(action, index)
            )}
          </div>
        </div>
      )}

      {/* Charts Section (if available) */}
      {dashboardData?.charts && Object.keys(dashboardData.charts).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(dashboardData.charts).map(([key, chart]) => (
            <div
              key={key}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {chart.title}
              </h2>
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  Chart: {chart.type} with {chart.labels.length} data points
                </p>
                {/* Chart implementation would go here using chart.js or recharts */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Default fallback UI when no dashboard data */}
      {!dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Placeholder for role-based content */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Activity Overview
            </h2>
            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Dashboard data will appear here</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Quick Stats
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Role</span>
                <span className="font-bold text-blue-600">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Status</span>
                <span className="font-bold text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Role: {user?.role} | School: {user?.schoolId || "N/A"}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
