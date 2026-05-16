"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { academicYearsAPI, gradingAPI } from "@/lib/api";
import { dashboardAPI } from "@/lib/api/admin";
import { reportCardsAPI, type ReportCard } from "@/lib/api/reporting";
import { toast } from "sonner";
import {
  Calendar,
  BookOpen,
  ClipboardCheck,
  FileText,
  Clock,
  TrendingUp,
  Award,
  Bell,
  CalendarDays,
  BarChart3,
  Trophy,
  ChevronRight,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock4,
  GraduationCap,
  Loader2,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

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
  stats: {
    attendance: string;
    presentDays: number;
    totalDays: number;
    upcomingExams: number;
    resultsPublished: number;
    averageGrade: string;
    totalSubjects: number;
    passedSubjects: number;
    attendanceTrend: number;
    classPosition: string;
  };
  alerts: any[];
  quickActions: any[];
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
  if (gpa >= 3.5) return "text-emerald-600 dark:text-emerald-400";
  if (gpa >= 3.0) return "text-blue-600 dark:text-blue-400";
  if (gpa >= 2.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const getGradeStatus = (avg: number): { text: string; color: string } => {
  if (avg >= 90) return { text: "Excellent", color: "text-emerald-600 dark:text-emerald-400" };
  if (avg >= 80) return { text: "Very Good", color: "text-blue-600 dark:text-blue-400" };
  if (avg >= 70) return { text: "Good", color: "text-amber-600 dark:text-amber-400" };
  if (avg >= 60) return { text: "Pass", color: "text-orange-600 dark:text-orange-400" };
  return { text: "Needs Improvement", color: "text-red-600 dark:text-red-400" };
};

const StudentDashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-16 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-16 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className={`text-sm font-semibold`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}{entry.name === "Attendance" ? "%" : "%"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StudentPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<SubjectGrade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [topRankCard, setTopRankCard] = useState<ReportCard | null>(null);
  const [showRankCongrats, setShowRankCongrats] = useState(false);

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
      await fetchGrades();
      await fetchTopRank();
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTopRank = async () => {
    try {
      const response = await reportCardsAPI.getMyPublished();
      const cards = Array.isArray(response.data) ? response.data : [];
      const latestTopCard = cards.find(
        (card) =>
          typeof card.rankInClass === "number" &&
          card.rankInClass >= 1 &&
          card.rankInClass <= 3,
      );
      if (!latestTopCard || typeof window === "undefined") return;
      const storageKey = `student-rank-congrats:${latestTopCard.id}:${latestTopCard.rankInClass}`;
      if (window.localStorage.getItem(storageKey)) return;
      setTopRankCard(latestTopCard);
      setShowRankCongrats(true);
    } catch (error) {
      console.error("Error fetching student ranking:", error);
    }
  };

  const closeRankCongrats = () => {
    if (topRankCard && typeof window !== "undefined") {
      window.localStorage.setItem(
        `student-rank-congrats:${topRankCard.id}:${topRankCard.rankInClass}`,
        "dismissed",
      );
    }
    setShowRankCongrats(false);
  };

  const fetchGrades = async () => {
    setGradesLoading(true);
    try {
      let academicYearId = "";
      try {
        const activeYearRes = await academicYearsAPI.getActive();
        const activeYear = activeYearRes.data?.data || activeYearRes.data;
        if (activeYear?.id) academicYearId = activeYear.id;
      } catch { /* ignore */ }
      const params: { academicYear?: string } = {};
      if (academicYearId) params.academicYear = academicYearId;
      const gradesRes = await gradingAPI.getStudentGrades(params);
      const gradesData = Array.isArray(gradesRes.data) ? gradesRes.data : (gradesRes.data?.data || []);
      setGrades(gradesData as SubjectGrade[]);
    } catch (error) {
      console.error("Error fetching grades:", error);
    } finally {
      setGradesLoading(false);
    }
  };

  if (loading || authLoading) {
    return <StudentDashboardSkeleton />;
  }

  if (!isAuthenticated || !dashboardData) {
    return null;
  }

  const { stats, alerts, quickActions, charts, upcomingEvents = [], announcements = [] } = dashboardData || {};
  const attendancePercent = parseInt(stats?.attendance) || 0;

  const hasGrades = grades.length > 0;
  const gpa = calculateGPA(grades);
  const averageScore = calculateAverage(grades);
  const gradeStatus = getGradeStatus(averageScore);
  const passedSubjects = hasGrades ? grades.filter(g => (g.totalScore || 0) >= 60).length : 0;

  const displaySubjectPerformance = hasGrades
    ? grades.map(g => ({
        subject: g.subject.name,
        score: g.totalScore || 0,
        average: averageScore,
      }))
    : [];

  const displayRecentGrades = hasGrades
    ? grades.slice(0, 5).map(g => ({
        subject: g.subject.name,
        grade: g.gradeLetter || "N/A",
        percentage: g.totalScore || 0,
      }))
    : [];

  const attendanceTrendSeries = (() => {
    if (Array.isArray(charts?.attendanceTrend)) return charts.attendanceTrend;
    return [];
  })();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Dialog open={showRankCongrats} onOpenChange={(open) => {
        if (!open) closeRankCongrats();
        else setShowRankCongrats(true);
      }}>
        <DialogContent className="max-w-md border-[rgba(var(--brand-color-rgb),0.22)] bg-white text-center dark:border-[rgba(var(--brand-color-rgb),0.3)] dark:bg-slate-900" customCloseButton={false}>
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
              <Trophy className="h-9 w-9" />
            </div>
            <DialogTitle className="text-2xl text-slate-900 dark:text-white">
              Congratulations, {user?.name || "Student"}!
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-300">
              You ranked #{topRankCard?.rankInClass} in {topRankCard?.term || "the latest published result"}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.06)] p-4 dark:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-[rgba(var(--brand-color-rgb),0.12)]">
            <p className="text-sm text-slate-600 dark:text-slate-300">Overall result</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {topRankCard?.percentage ?? "-"}%
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--brand-color,#e35336)]">
              {topRankCard?.overallGrade || "Published result"}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={closeRankCongrats} className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90">
              Continue
            </Button>
            <Button variant="outline" onClick={() => router.push("/student/grades")}>
              View Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Student Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Welcome back, {user?.name || "Student"} &middot; Track your academic progress
            </p>
          </div>
          {grades.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              {grades[0].class.name} - {grades[0].section.name}
            </Badge>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-base bg-[var(--brand-color,#e35336)] text-white">
                {user?.name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {user?.name || "Student"}
              </h3>
              <p className="text-sm text-slate-500">
                {user?.email}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="w-4 h-4" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{stats.attendance}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">+2.5%</span>
                  <span className="text-xs text-slate-400">this term</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <Progress
              value={attendancePercent}
              className="h-1.5 mt-3 bg-slate-100 dark:bg-slate-700"
            />
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">GPA</p>
                {gradesLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400 mt-1.5" />
                ) : hasGrades ? (
                  <>
                    <p className={`text-2xl font-bold mt-1.5 ${getGPAColor(gpa)}`}>{gpa.toFixed(1)}</p>
                    <span className={`text-xs ${gradeStatus.color}`}>{gradeStatus.text}</span>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-400 mt-1.5">N/A</p>
                    <span className="text-xs text-slate-400">No grades</span>
                  </>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Score</p>
                {gradesLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400 mt-1.5" />
                ) : hasGrades ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{averageScore}%</p>
                ) : (
                  <p className="text-2xl font-bold text-slate-400 mt-1.5">N/A</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {passedSubjects}/{grades.length || stats.totalSubjects} subjects passed
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Exams</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{stats.upcomingExams}</p>
                <p className="text-xs text-slate-400 mt-1">Upcoming</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <ClipboardCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Attendance Trend</h3>
            <p className="text-xs text-slate-500 mb-4">This term</p>
            {attendanceTrendSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={attendanceTrendSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} className="dark:stroke-slate-700" />
                  <XAxis dataKey="week" axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} dy={8} />
                  <YAxis axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} tickMargin={8} domain={[0, 100]} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="attendance" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#3B82F6" }} name="Attendance" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                No attendance data available
              </div>
            )}
          </div>

          {/* Subject Performance */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Subject Performance</h3>
            <p className="text-xs text-slate-500 mb-4">Current term</p>
            {gradesLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : displaySubjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={displaySubjectPerformance} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} className="dark:stroke-slate-700" />
                  <XAxis dataKey="subject" axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} dy={8} />
                  <YAxis axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} tickMargin={8} domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="Score" />
                  <Bar dataKey="average" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.6} name="Average" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                No subject performance data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Grades + Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Grades */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Recent Grades</h3>
                <p className="text-xs text-slate-500">Latest subject scores</p>
              </div>
              {hasGrades && (
                <Badge variant="outline" className="text-xs">{grades.length} Subjects</Badge>
              )}
            </div>
            {gradesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : displayRecentGrades.length > 0 ? (
              <div className="space-y-2">
                {displayRecentGrades.map((grade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        grade.percentage >= 90 ? "bg-emerald-50 dark:bg-emerald-900/30" :
                        grade.percentage >= 70 ? "bg-blue-50 dark:bg-blue-900/30" :
                        grade.percentage >= 50 ? "bg-amber-50 dark:bg-amber-900/30" :
                        "bg-red-50 dark:bg-red-900/30"
                      }`}>
                        {grade.percentage >= 90 ? (
                          <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : grade.percentage >= 70 ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : grade.percentage >= 50 ? (
                          <Clock4 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{grade.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{grade.percentage}%</p>
                        <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              grade.percentage >= 90 ? "bg-emerald-500" :
                              grade.percentage >= 70 ? "bg-blue-500" :
                              grade.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${grade.percentage}%` }}
                          />
                        </div>
                      </div>
                      <Badge className={`text-xs px-2 py-0.5 ${
                        grade.grade === "A" || grade.grade === "A+" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0" :
                        grade.grade === "B" || grade.grade === "B+" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0" :
                        grade.grade === "C" || grade.grade === "C+" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0" :
                        grade.grade === "D" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0" :
                        grade.grade === "F" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-0"
                      }`}>
                        {grade.grade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500">No grades available yet</p>
              </div>
            )}
            {hasGrades && (
              <Button variant="outline" className="w-full mt-4 gap-2" onClick={() => router.push("/student/grades")}>
                View All Grades
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {quickActions?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {quickActions.slice(0, 4).map((action: any) => (
                    <button
                      key={action.id || action.label}
                      onClick={() => {
                        if (action.disabled) {
                          toast.error(action.disabledReason || "Not available");
                          return;
                        }
                        router.push(action.url);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[rgba(var(--brand-color-rgb),0.1)] flex items-center justify-center shrink-0">
                        {action.icon === "file" || action.icon === "FileText" ? (
                          <FileText className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                        ) : action.icon === "calendar" || action.icon === "Calendar" ? (
                          <Calendar className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                        ) : action.icon === "book" || action.icon === "BookOpen" ? (
                          <BookOpen className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                        ) : (
                          <ClipboardCheck className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{action.label}</p>
                        {action.description && (
                          <p className="text-xs text-slate-500 truncate">{action.description}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Upcoming Events</h3>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 3).map((event: any, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex flex-col items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300 leading-none">
                          {new Date(event.date).getDate()}
                        </span>
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 leading-none">
                          {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-slate-500 truncate">{event.description}</p>
                        )}
                        {event.type && (
                          <Badge variant="outline" className="text-[10px] mt-0.5 px-1.5 py-0">{event.type}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500">No upcoming events</p>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full mt-3 gap-1" onClick={() => router.push("/list/calendar")}>
                <Calendar className="w-3.5 h-3.5" />
                View Calendar
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentPage;
