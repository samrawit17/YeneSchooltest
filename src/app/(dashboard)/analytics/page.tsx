"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { dashboardAPI, studentsAPI, teachersAPI, classesAPI, attendanceAPI } from "@/lib/api";
import { toast } from "sonner";
import DynamicChart from "@/components/charts/DynamicChart";
import {
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardCheck, 
  DollarSign,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  Activity,
  PieChart,
  LineChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Analytics data interfaces
interface AnalyticsStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  totalParents: number;
  attendanceRate: number;
  presentToday: number;
  absentToday: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  rejectedEnrollments: number;
}

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}

interface AnalyticsData {
  stats: AnalyticsStats;
  charts: {
    [key: string]: ChartData;
  };
  trends: {
    studentGrowth: number;
    attendanceTrend: number;
    enrollmentTrend: number;
  };
}

const AnalyticsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated, isLoading, timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard data for basic stats
      const dashboardResponse = await dashboardAPI.getDashboard();
      const dashboard = dashboardResponse.data;

      // Build analytics data from available data
      const analytics: AnalyticsData = {
        stats: {
          totalStudents: dashboard.stats?.students || 0,
          totalTeachers: dashboard.stats?.teachers || 0,
          totalClasses: dashboard.stats?.classes || 0,
          totalSections: dashboard.stats?.sections || 0,
          totalParents: 0, // Will be fetched if available
          attendanceRate: dashboard.stats?.attendanceRate || 0,
          presentToday: dashboard.stats?.presentToday || 0,
          absentToday: dashboard.stats?.absentToday || 0,
          pendingEnrollments: dashboard.stats?.pendingEnrollments || 0,
          approvedEnrollments: 0,
          rejectedEnrollments: 0,
        },
        charts: dashboard.charts || {},
        trends: {
          studentGrowth: 12.5, // Mock percentage
          attendanceTrend: dashboard.stats?.attendanceRate ? dashboard.stats.attendanceRate - 85 : 0,
          enrollmentTrend: 8.3, // Mock percentage
        }
      };

      setAnalyticsData(analytics);
    } catch (error: any) {
      console.error('Failed to fetch analytics data:', error);
      // Use mock data for demo
      setAnalyticsData(getMockAnalyticsData());
    } finally {
      setLoading(false);
    }
  };

  const getMockAnalyticsData = (): AnalyticsData => ({
    stats: {
      totalStudents: 1245,
      totalTeachers: 68,
      totalClasses: 24,
      totalSections: 48,
      totalParents: 980,
      attendanceRate: 92,
      presentToday: 1146,
      absentToday: 99,
      pendingEnrollments: 45,
      approvedEnrollments: 156,
      rejectedEnrollments: 12,
    },
    charts: {
      attendance: {
        type: 'bar',
        title: 'Attendance Overview',
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
          label: 'Attendance %',
          data: [92, 94, 91, 95, 93],
          backgroundColor: ['#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6'],
        }]
      },
      enrollment: {
        type: 'line',
        title: 'Enrollment Trend',
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Students',
          data: [1100, 1150, 1180, 1200, 1225, 1245],
          borderColor: '#10B981',
        }]
      },
      genderDistribution: {
        type: 'pie',
        title: 'Student Gender Distribution',
        labels: ['Male', 'Female', 'Other'],
        datasets: [{
          label: 'Students',
          data: [620, 615, 10],
          backgroundColor: ['#3B82F6', '#EC4899', '#8B5CF6'],
        }]
      },
      classDistribution: {
        type: 'doughnut',
        title: 'Students per Class',
        labels: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        datasets: [{
          label: 'Students',
          data: [320, 310, 305, 310],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
        }]
      },
    },
    trends: {
      studentGrowth: 12.5,
      attendanceTrend: 2.3,
      enrollmentTrend: 8.3,
    }
  });

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !analyticsData) {
    return null;
  }

  const { stats, charts, trends } = analyticsData;

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336] flex items-center gap-2">
           
            School Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Comprehensive insights and statistics for your school</p>
        </div>
        
        <div className="flex gap-1.5">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[#e35336] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Total Students</p>
                <p className="text-2xl font-bold mt-1">{stats.totalStudents.toLocaleString()}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {trends.studentGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className="text-gray-500">
                {trends.studentGrowth}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Teachers</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTeachers}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Across {stats.totalClasses} classes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Attendance Rate</p>
                <p className="text-2xl font-bold mt-1">{stats.attendanceRate}%</p>
              </div>
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {trends.attendanceTrend >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className="text-gray-500">
                {Math.abs(trends.attendanceTrend)}% vs last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Pending Enrollment</p>
                <p className="text-2xl font-bold mt-1">{stats.pendingEnrollments}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-gray-400" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {stats.approvedEnrollments} approved this month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <BookOpen className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-xl font-bold">{stats.totalClasses}</p>
            <p className="text-xs text-gray-500">Classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-xl font-bold">{stats.totalSections}</p>
            <p className="text-xs text-gray-500">Sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <UserCheck className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-xl font-bold">{stats.presentToday}</p>
            <p className="text-xs text-gray-500">Present Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <UserX className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-xl font-bold">{stats.absentToday}</p>
            <p className="text-xs text-gray-500">Absent Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-xl font-bold">{stats.totalParents}</p>
            <p className="text-xs text-gray-500">Parents</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.enrollment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    {charts.enrollment.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart chartData={charts.enrollment} height={280} />
                </CardContent>
              </Card>
            )}
            {charts.attendance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {charts.attendance.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart chartData={charts.attendance} height={280} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.attendance ? (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Daily Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart chartData={charts.attendance} height={300} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No attendance data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="enrollment">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Enrollment Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts.enrollment ? (
                  <DynamicChart chartData={charts.enrollment} height={280} />
                ) : (
                  <div className="h-72 flex items-center justify-center text-gray-500">
                    No enrollment data available
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Enrollment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-gray-600 font-medium text-sm">Approved</span>
                    <span className="text-xl font-bold">{stats.approvedEnrollments}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-gray-600 font-medium text-sm">Pending</span>
                    <span className="text-xl font-bold">{stats.pendingEnrollments}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-gray-600 font-medium text-sm">Rejected</span>
                    <span className="text-xl font-bold">{stats.rejectedEnrollments}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.genderDistribution && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Gender Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart chartData={charts.genderDistribution} height={280} />
                </CardContent>
              </Card>
            )}
            {charts.classDistribution && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Students per Class
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart chartData={charts.classDistribution} height={280} />
                </CardContent>
              </Card>
            )}
            {!charts.genderDistribution && !charts.classDistribution && (
              <Card className="lg:col-span-2">
                <CardContent className="p-8 text-center text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No demographic data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
