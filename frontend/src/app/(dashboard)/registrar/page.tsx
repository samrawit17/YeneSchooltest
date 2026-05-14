"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { dashboardAPI } from "@/lib/api/admin";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserX,
  FileText,
  TrendingUp,
  AlertCircle,
  Bell,
  Clock,
  CheckCircle,
  XCircle,

  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Search,
  Eye,
  Edit2,
  Printer,
  Share2,
  Mail,
  Settings,
  ChevronRight,
  CreditCard,
  GraduationCap,
  BookOpen,
  Home,
  Shield
} from "lucide-react";
import {
  LineChart as RechartsLine,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface DashboardStats {
  [key: string]: any;
}

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
  stats: DashboardStats;
  alerts: DashboardAlert[];
  quickActions: QuickAction[];
  charts: {
    [key: string]: DashboardChart;
  };
  metadata: {
    schoolId?: string;
    academicYear?: string;
    term?: string;
    generatedAt: Date;
    curriculum?: {
      curriculumType: string;
      academicYear: string;
      periods: Array<{
        id: string;
        name: string;
        order: number;
        percentageWeight: number;
        isLocked: boolean;
      }>;
    };
  };
}

export default function RegistrarDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { displayTermName } = useAcademicYear();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getRegistrarDashboard();
      
      // Enhance with mock chart data for demonstration
      const enhancedData = {
        ...response.data,
        charts: {
          enrollmentTrend: {
            type: "line" as const,
            title: "Enrollment Trends",
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              {
                label: "New Enrollments",
                data: [65, 78, 90, 110, 85, 95],
                borderColor: "#3b82f6",
                backgroundColor: "#3b82f620"
              },
              {
                label: "Pending Applications",
                data: [20, 25, 30, 35, 28, 32],
                borderColor: "#f59e0b",
                backgroundColor: "#f59e0b20"
              }
            ]
          },
          enrollmentStatus: {
            type: "pie" as const,
            title: "Enrollment Status Distribution",
            labels: ["Approved", "Pending", "Rejected", "Waitlisted"],
            datasets: [
              {
                label: "Applications",
                data: [45, 30, 15, 10],
                backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
              }
            ]
          },
          classDistribution: {
            type: "bar" as const,
            title: "Class Capacity Overview",
            labels: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"],
            datasets: [
              {
                label: "Current Students",
                data: [28, 32, 30, 35, 29],
                backgroundColor: "#3b82f6"
              },
              {
                label: "Capacity",
                data: [30, 35, 35, 40, 35],
                backgroundColor: "#d1d5db"
              }
            ]
          },
          feeCollection: {
            type: "line" as const,
            title: "Fee Collection Progress",
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              {
                label: "Collected",
                data: [85, 92, 78, 95, 88, 100],
                borderColor: "#10b981",
                backgroundColor: "#10b98120"
              },
              {
                label: "Target",
                data: [100, 100, 100, 100, 100, 100],
                borderColor: "#d1d5db",
                borderDash: [5, 5]
              }
            ]
          }
        }
      };
      
      setDashboardData(enhancedData);
    } catch (error: any) {
      console.error('Failed to fetch registrar dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.disabled) {
      toast.error(action.disabledReason || 'This action is not available');
      return;
    }
    router.push(action.url);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default: return <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'success': return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      default: return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  // Chart rendering functions
  const renderChart = (chartKey: string, chart: DashboardChart) => {
    const chartData = chart.labels.map((label, index) => {
      const dataPoint: Record<string, any> = { name: label };
      chart.datasets.forEach((dataset) => {
        dataPoint[dataset.label] = dataset.data[index];
      });
      return dataPoint;
    });

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Custom tooltip component with dark mode support
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    switch (chart.type) {
      case "line":
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:fill-gray-400"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:fill-gray-400"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {chart.datasets.map((dataset, index) => (
                  <Area
                    key={index}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={dataset.borderColor || COLORS[index % COLORS.length]}
                    fill={dataset.backgroundColor?.[0] || `${COLORS[index % COLORS.length]}20`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case "bar":
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:fill-gray-400"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  className="dark:fill-gray-400"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {chart.datasets.map((dataset, index) => (
                  <Bar
                    key={index}
                    dataKey={dataset.label}
                    fill={index === 0 ? COLORS[0] : '#9ca3af'}
                    fillOpacity={0.9}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "pie":
      case "doughnut":
        const pieData = chart.labels.map((label, index) => ({
          name: label,
          value: chart.datasets[0]?.data[index] || 0,
        }));
        
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={chart.type === 'doughnut' ? 60 : 0}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chart.datasets[0]?.backgroundColor?.[index] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--brand-color, #e35336)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading registrar dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-[var(--brand-color, #e35336)]">
              Welcome to the Registrar Dashboard, {user?.name || 'User'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Failed to load dashboard data. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Registrar-specific quick actions
  const registrarQuickActions = [
    {
      label: "Enrollment",
      url: "/admin/enrollment",
      icon: "UserCheck"
    },
    {
      label: "View Applications",
      url: "/admin/enrollment",
      icon: "FileText"
    },
    {
      label: "Manage Students",
      url: "/list/students",
      icon: "Users"
    },
    {
      label: "Fee Management",
      url: "/list/finance",
      icon: "CreditCard"
    },
    {
      label: "Class Allocation",
      url: "/admin/class-sections",
      icon: "GraduationCap"
    },
    {
      label: "Reports",
      url: "/registrar/grading",
      icon: "BarChart3"
    },
    {
      label: "Settings",
      url: "/settings",
      icon: "Settings"
    },
    {
      label: "School Calendar",
      url: "/list/calendar",
      icon: "Calendar"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-4 lg:mx-8 py-6 overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--brand-color, #e35336)]">Registrar Dashboard</h1>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, <span className="font-semibold text-gray-900 dark:text-white">{user?.name || 'Registrar'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {displayTermName && (
              <span className="text-base font-bold text-black dark:text-white sm:text-xl">
                {displayTermName}
              </span>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.stats.totalStudents?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">+12%</span>
                <span className="text-gray-500 dark:text-gray-400">from last year</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Applications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.stats.pendingApplications?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                <span className="text-yellow-600 dark:text-yellow-400">Requires attention</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fee Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.stats.feeCollectionRate || '85%'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">On track</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Class Occupancy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData.stats.classOccupancy || '92%'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {Object.keys(dashboardData.charts).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {Object.entries(dashboardData.charts).map(([key, chart]) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {chart.type === 'line' && <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    {chart.type === 'bar' && <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    {chart.type === 'pie' && <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    <h3 className="font-semibold text-gray-900 dark:text-white">{chart.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                      {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)}
                    </span>
                  </div>
                </div>
                {renderChart(key, chart)}
              </div>
            ))}
          </div>
        )}


      </div>
    </div>
  );
}
