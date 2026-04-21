"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { dashboardAPI, academicYearsAPI, gradingAPI } from "@/lib/api";
import { toast } from "sonner";
import { 
  Calendar, 
  BookOpen, 
  ClipboardCheck, 
  FileText,
  Clock,
  TrendingUp,
  Award,
  User,
  Bell,
  CalendarDays,
  BarChart3,
  Target,
  Trophy,
  AlertCircle,
  ChevronRight,
  TrendingDown,
  Eye,
  Download,
  MessageSquare,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock4,
  Activity,
  PieChart,
  LineChart,
  Users,
  Home,
  Book,
  Calculator,
  TestTube,
  Loader2
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Chart components - you can use recharts or other chart libraries
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

interface DashboardStats {
  attendance: string;
  presentDays: number;
  totalDays: number;
  upcomingExams: number;
  resultsPublished: number;
  recentGrades: Array<{
    subject: string;
    grade: string;
    percentage: number;
  }>;
  averageGrade: string;
  totalSubjects: number;
  passedSubjects: number;
  attendanceTrend: number;
  classPosition: string;
}

interface DashboardAlert {
  id: string;
  message: string;
  type: 'error' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  url: string;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'default' | 'secondary' | 'outline';
}

// Grade-related interfaces
interface SubjectGrade {
  id: string;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  section: { id: string; name: string };
  term: { id: string; name: string };
  caScore: number | null;
  midScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  gradeLetter: string | null;
  gradePoint: number | null;
  remark: string | null;
}

interface DashboardData {
  stats: DashboardStats;
  alerts: DashboardAlert[];
  quickActions: QuickAction[];
  charts: {
    attendanceTrend: any[];
    subjectPerformance: any[];
    gradeDistribution: any[];
  };
  upcomingEvents: any[];
  announcements: any[];
  metadata: {
    schoolId?: string;
    academicYear?: string;
    term?: string;
    generatedAt: string;
  };
}

const StudentPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Grade-related state
  const [grades, setGrades] = useState<SubjectGrade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getDashboard();
      setDashboardData(response.data);
      
      // Fetch grades
      await fetchGrades();
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    setGradesLoading(true);
    try {
      // Get active academic year
      let academicYearId = '';
      try {
        const activeYearRes = await academicYearsAPI.getActive();
        const activeYear = activeYearRes.data?.data || activeYearRes.data;
        if (activeYear?.id) {
          academicYearId = activeYear.id;
          setSelectedYear(activeYear.id);
        }
      } catch (yearError) {
        console.warn('Could not fetch active academic year:', yearError);
      }
      
      // Fetch grades
      const params: { academicYear?: string } = {};
      if (academicYearId) params.academicYear = academicYearId;
      
      const gradesRes = await gradingAPI.getStudentGrades(params);
      const gradesData = Array.isArray(gradesRes.data) ? gradesRes.data : (gradesRes.data?.data || []);
      setGrades(gradesData as SubjectGrade[]);
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setGradesLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.disabled) {
      toast.error(action.disabledReason || 'This action is not available');
      return;
    }
    router.push(action.url);
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'success': return 'default';
      default: return 'default';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade.charAt(0)) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'F': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Grade calculation helpers
  const calculateAverage = (grades: SubjectGrade[]) => {
    const totalScores = grades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
    if (totalScores.length === 0) return 0;
    return Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100;
  };

  const calculateGPA = (grades: SubjectGrade[]) => {
    const avg = calculateAverage(grades);
    if (avg >= 90) return 4.0;
    if (avg >= 80) return 3.5;
    if (avg >= 70) return 3.0;
    if (avg >= 60) return 2.5;
    return 0.0;
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return 'text-green-600';
    if (gpa >= 3.0) return 'text-blue-600';
    if (gpa >= 2.5) return 'text-yellow-600';
    if (gpa >= 2.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeStatus = (avg: number): { text: string; color: string } => {
    if (avg >= 90) return { text: 'Excellent', color: 'text-green-600' };
    if (avg >= 80) return { text: 'Very Good', color: 'text-blue-600' };
    if (avg >= 70) return { text: 'Good', color: 'text-yellow-600' };
    if (avg >= 60) return { text: 'Pass', color: 'text-orange-600' };
    return { text: 'Needs Improvement', color: 'text-red-600' };
  };

  // Loading State
  if (loading || authLoading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-40 w-full rounded-xl mb-4" />
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Skeleton */}
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-32" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !dashboardData) {
    return null;
  }

  const { stats, alerts, quickActions, charts, upcomingEvents = [], announcements = [] } = dashboardData || {};
  const attendancePercent = parseInt(stats?.attendance) || 0;
  
  // Calculate grade stats from fetched grades
  const hasGrades = grades.length > 0;
  const gpa = calculateGPA(grades);
  const averageScore = calculateAverage(grades);
  const gradeStatus = getGradeStatus(averageScore);
  const highestScore = hasGrades ? Math.max(...grades.filter(g => g.totalScore !== null).map(g => g.totalScore!)) : 0;
  const passedSubjects = hasGrades ? grades.filter(g => (g.totalScore || 0) >= 60).length : 0;
  
  // Compute grade data for charts from fetched grades
  const displaySubjectPerformance = hasGrades
    ? grades.map(g => ({
        subject: g.subject.name,
        score: g.totalScore || 0,
        average: averageScore
      }))
    : [];

  const displayGradeDistribution = hasGrades
    ? (() => {
        const distribution = grades.reduce((acc, g) => {
          const letter = g.gradeLetter || 'N/A';
          acc[letter] = (acc[letter] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const colors: Record<string, string> = {
          'A': '#10b981',
          'B': '#3b82f6',
          'C': '#eab308',
          'D': '#f97316',
          'F': '#ef4444',
          'N/A': '#94a3b8'
        };
        
        return Object.entries(distribution).map(([grade, count]) => ({
          grade,
          count,
          color: colors[grade] || '#94a3b8'
        }));
      })()
    : [];

  const displayRecentGrades = hasGrades
    ? grades.slice(0, 5).map(g => ({
        subject: g.subject.name,
        grade: g.gradeLetter || 'N/A',
        percentage: g.totalScore || 0
      }))
    : [];

  const chartToSeries = (chart: any, labelKey: string, valueKey: string) => {
    if (!chart?.labels || !Array.isArray(chart.labels) || !chart?.datasets?.[0]?.data) return [];
    return chart.labels.map((label: string, idx: number) => ({
      [labelKey]: label,
      [valueKey]: chart.datasets[0].data[idx] ?? 0,
    }));
  };

  const attendanceTrendSeries = (() => {
    // Backend returns chart dto shape; frontend expects array with {week, attendance, target}
    if (Array.isArray((charts as any)?.attendanceTrend)) return (charts as any).attendanceTrend;
    const series = chartToSeries((charts as any)?.attendanceTrend, "week", "attendance");
    return series.map((row: any) => ({ ...row, target: 75 }));
  })();

  const subjectPerformanceSeries = (() => {
    if (Array.isArray((charts as any)?.subjectPerformance)) return (charts as any).subjectPerformance;
    const series = chartToSeries((charts as any)?.subjectPerformance, "subject", "score");
    const avg = typeof (stats as any)?.averageScore === "number" ? (stats as any).averageScore : null;
    return series.map((row: any) => ({ ...row, average: avg ?? 0 }));
  })();

  const gradeDistributionData = (() => {
    if (Array.isArray((charts as any)?.gradeDistribution)) return (charts as any).gradeDistribution;
    const chart = (charts as any)?.gradeDistribution;
    if (!chart?.labels || !chart?.datasets?.[0]?.data) return [];
    const colors = chart.datasets[0].backgroundColor || [];
    return chart.labels.map((label: string, idx: number) => ({
      grade: String(label).split(" ")[0],
      count: chart.datasets[0].data[idx] ?? 0,
      color: colors[idx] || "#94a3b8",
    }));
  })();

  const normalizedQuickActions = Array.isArray(quickActions)
    ? quickActions.map((action: any) => ({
        id: action.id || action.url || action.label,
        label: action.label,
        icon: action.icon || "file",
        description: action.description || "",
        url: action.url,
        disabled: action.disabled,
        disabledReason: action.disabledReason,
        variant: action.variant,
      }))
    : [];

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-[#e35336] tracking-tight">
                    Welcome back, {user?.name || 'Student'}! 👋
                  </h1>
                  <p className="text-gray-600">
                    Track your academic progress and stay updated with school activities
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                    <CalendarDays className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <Badge variant="secondary" className="gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {stats.classPosition} in Class
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Navigation */}
        {/* Overview Tab - All content displayed by default */}
        <div className="space-y-6">
          {/* Stats Grid */}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Attendance Card */}
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{stats.attendance}</span>
                      <span className="text-sm text-gray-500">
                        ({stats.presentDays}/{stats.totalDays} days)
                      </span>
                    </div>
                    <Progress 
                      value={attendancePercent} 
                      className={`h-2 mt-2 ${
                        attendancePercent >= 90 ? "bg-green-500" :
                        attendancePercent >= 75 ? "bg-blue-500" :
                        "bg-red-500"
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Exams Card */}
            <Card className="border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                    <ClipboardCheck className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Upcoming Exams</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.upcomingExams}</p>
                    <p className="text-xs text-gray-500 mt-1">Next: Tomorrow</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Published Card */}
            <Card className="border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Results Published</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.resultsPublished}</p>
                    <p className="text-xs text-gray-500 mt-1">Out of {stats.totalSubjects} subjects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Grade Card */}
            <Card className="border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">GPA</p>
                    {gradesLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : hasGrades ? (
                      <>
                        <p className={`text-2xl font-bold ${getGPAColor(gpa)}`}>{gpa.toFixed(1)}</p>
                        <p className={`text-xs mt-1 ${gradeStatus.color}`}>
                          {gradeStatus.text} ({averageScore}%)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900">{stats.averageGrade || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.passedSubjects}/{stats.totalSubjects} subjects passed
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Attendance Trend
                </CardTitle>
                <CardDescription>Last 6 weeks attendance pattern</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={attendanceTrendSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Subject Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Subject Performance
                </CardTitle>
                <CardDescription>Current term performance by subject</CardDescription>
              </CardHeader>
              <CardContent>
                {gradesLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : displaySubjectPerformance && displaySubjectPerformance.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displaySubjectPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="subject" />
                        <YAxis domain={[0, 100]} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="Score" />
                        <Bar dataKey="average" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.6} name="Average" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 opacity-50 mr-2" />
                    <p>No subject performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Grades & Upcoming Events */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grade Distribution */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-600" />
                  Grade Distribution
                </CardTitle>
                <CardDescription>Breakdown of grades</CardDescription>
              </CardHeader>
              <CardContent>
                {gradesLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : displayGradeDistribution && displayGradeDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={displayGradeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ grade, percent }: any) => `${grade}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {displayGradeDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <PieChart className="w-12 h-12 opacity-50 mr-2" />
                    <p>No grade distribution data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Grades */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Recent Grades
                </CardTitle>
                <CardDescription>Latest subject grades and scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gradesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : displayRecentGrades && displayRecentGrades.length > 0 ? (
                    displayRecentGrades.slice(0, 5).map((grade: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            grade.percentage >= 90 ? 'bg-green-100' :
                            grade.percentage >= 70 ? 'bg-blue-100' :
                            grade.percentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            {grade.percentage >= 90 ? (
                              <Trophy className="w-5 h-5 text-green-600" />
                            ) : grade.percentage >= 70 ? (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            ) : grade.percentage >= 50 ? (
                              <Clock4 className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{grade.subject}</p>
                            <p className="text-sm text-gray-500">Updated: This week</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{grade.percentage}%</p>
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  grade.percentage >= 90 ? 'bg-green-500' :
                                  grade.percentage >= 70 ? 'bg-blue-500' :
                                  grade.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${grade.percentage}%` }}
                              />
                            </div>
                          </div>
                          <Badge className={`px-3 py-1 ${getGradeColor(grade.grade)}`}>
                            {grade.grade}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No recent grades available</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 hover:bg-purple-50 hover:text-purple-600"
                  onClick={() => router.push('/student/grades')}
                >
                  View All Grades
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                Upcoming Events
              </CardTitle>
              <CardDescription>
                Important dates and school activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.slice(0, 3).map((event, index) => (
                    <Card key={index} className="border-blue-100 hover:border-blue-300 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-blue-700">
                              {new Date(event.date).getDate()}
                            </span>
                            <span className="text-xs text-blue-600">
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {event.type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(event.date).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming events scheduled</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => router.push('/calendar')}
              >
                <Calendar className="w-4 h-4" />
                View Full Calendar
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
