"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { academicYearsAPI, financeAPI, gradingAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";
import {
  User,
  Calendar,
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  Award,
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Recharts for charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Types
interface Child {
  id: string;
  userId?: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
  relation: string;
  attendance: string;
  presentDays: number;
  totalDays: number;
  upcomingExams: number;
  recentAbsences: { date: string; reason: string | null }[];
  latestGrade: string;
  overallGrade: string;
  feeBalance: number;
  totalPaid: number;
  totalDue: number;
  reportCard: {
    status: string;
    percentage: number | null;
    publishedAt: string | null;
  } | null;
  grades: {
    subject: string;
    currentGrade: string;
    average: string;
    status: string;
  }[];
  attendanceTrend: {
    week: string;
    percentage: number;
  }[];
}

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

interface AcademicYear {
  id: string;
  name: string;
}

interface DashboardData {
  stats: {
    totalChildren: number;
    children: Child[];
    averageAttendance: string;
    totalUpcomingExams: number;
  };
  recentNotices: {
    id: string;
    title: string;
    type: string;
    date: string;
    description?: string;
  }[];
  recentActivity: {
    id: string;
    type: string;
    message: string;
    date: string;
    icon: string;
  }[];
}

// Skeleton component for initial load
const ParentDashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {payload[0].value}% Attendance
        </p>
      </div>
    );
  }
  return null;
};

// Helper functions for grade calculations
const calculateAverage = (grades: SubjectGrade[]) => {
  const totalScores = grades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
  if (totalScores.length === 0) return 0;
  return Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100;
};

const calculateGPA = (grades: SubjectGrade[]) => {
  const avg = calculateAverage(grades);
  if (avg >= 90) return "4.0";
  if (avg >= 80) return "3.5";
  if (avg >= 70) return "3.0";
  if (avg >= 60) return "2.5";
  return "0.0";
};

const getGPAColor = (gpa: number) => {
  if (gpa >= 3.5) return "text-green-600";
  if (gpa >= 3.0) return "text-blue-600";
  if (gpa >= 2.5) return "text-yellow-600";
  if (gpa >= 2.0) return "text-orange-600";
  return "text-red-600";
};

const getGradeStatus = (avg: number): { text: string; color: string } => {
  if (avg >= 90) return { text: "Excellent", color: "text-green-600" };
  if (avg >= 80) return { text: "Very Good", color: "text-blue-600" };
  if (avg >= 70) return { text: "Good", color: "text-yellow-600" };
  if (avg >= 60) return { text: "Pass", color: "text-orange-600" };
  return { text: "Needs Improvement", color: "text-red-600" };
};

const ParentDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  
  // Grade-related state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [childGrades, setChildGrades] = useState<Record<string, SubjectGrade[]>>({});
  const [gradesLoading, setGradesLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await parentDashboardAPI.getGeneralDashboard();
        const data = response.data;

        // Fetch academic years
        let years: AcademicYear[] = [];
        let activeYearId = "";
        
        try {
          const yearsRes = await academicYearsAPI.getAll();
          years = Array.isArray(yearsRes.data) ? yearsRes.data : (yearsRes.data?.data || []);
          setAcademicYears(years);
        } catch (yearError) {
          console.warn("Could not fetch academic years:", yearError);
        }
        
        // Try to get active academic year
        try {
          const activeYearRes = await academicYearsAPI.getActive();
          const activeYear = activeYearRes.data?.data || activeYearRes.data;
          if (activeYear?.id) {
            activeYearId = activeYear.id;
            if (years.length === 0) {
              years = [{ id: activeYear.id, name: activeYear.name }];
              setAcademicYears(years);
            }
          }
        } catch (activeError) {
          console.warn("Could not fetch active academic year:", activeError);
        }
        
        if (years.length > 0 && !activeYearId) {
          activeYearId = years[0].id;
        }
        setSelectedYear(activeYearId);

        const enhancedChildren = await Promise.all(
          (data.stats?.children || []).map(async (child: Child) => {
            const schoolId = (child as any).schoolId || data?.metadata?.schoolId;
            const academicYearId = (child as any).academicYearId || data?.metadata?.academicYear || activeYearId;

            // Pull fee summary only when required identifiers are available
            // and never inject dummy/random fallback values.
            let feeBalance = 0;
            let totalPaid = 0;
            let totalDue = 0;
          
            if (schoolId && academicYearId) {
              try {
                const feeResponse = await financeAPI.getStudentFees(child.id, schoolId, academicYearId);
                const feeData = feeResponse.data;
                if (feeData.summary) {
                  feeBalance = feeData.summary.totalBalance || 0;
                  totalPaid = feeData.summary.totalPaid || 0;
                  totalDue = feeData.summary.totalFees || 0;
                }
              } catch (feeError) {
                console.error("Could not fetch fee data for child:", child.id, feeError);
              }
            }
          
            return {
              ...child,
              overallGrade: child.overallGrade || child.latestGrade || "N/A",
              feeBalance,
              totalPaid,
              totalDue,
              grades: Array.isArray(child.grades) ? child.grades : [],
              attendanceTrend: Array.isArray(child.attendanceTrend)
                ? child.attendanceTrend
                : [],
            };
          }),
        );

        // Fetch grades for all children
        const gradesMap: Record<string, SubjectGrade[]> = {};
        setGradesLoading(true);
        for (const child of enhancedChildren) {
          const childId = child.userId || child.id;
          if (activeYearId && childId) {
            try {
              const gradesRes = await gradingAPI.getChildGrades(childId, {
                academicYear: activeYearId,
              });
              const gradesData = Array.isArray(gradesRes.data) ? gradesRes.data : (gradesRes.data?.data || []);
              gradesMap[childId] = gradesData as SubjectGrade[];
            } catch (gradeError) {
              console.error("Could not fetch grades for child:", childId, gradeError);
              gradesMap[childId] = [];
            }
          }
        }
        setChildGrades(gradesMap);
        setGradesLoading(false);

        const normalizedData = {
          ...data,
          stats: {
            ...data.stats,
            children: enhancedChildren,
          },
          recentNotices: Array.isArray(data.recentNotices) ? data.recentNotices : [],
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
        };

        setDashboardData(normalizedData);
        if (normalizedData.stats?.children?.length > 0) {
          setSelectedChild(normalizedData.stats.children[0]);
        }
      } catch (error: any) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading || initialLoad) {
    return <ParentDashboardSkeleton />;
  }

  const children = dashboardData?.stats?.children || [];

  // Calculate stats for the selected child
  const attendancePercentage = selectedChild
    ? parseFloat(selectedChild.attendance)
    : 0;
  
  // Get grades for selected child
  const selectedChildId = selectedChild?.userId || selectedChild?.id;
  const grades = selectedChildId ? childGrades[selectedChildId] || [] : [];
  const averageScore = calculateAverage(grades);
  const gpa = calculateGPA(grades);
  const gradeStatus = getGradeStatus(averageScore);
  const hasGrades = grades.length > 0;
  
  const overallGrade = hasGrades ? gpa : (selectedChild?.overallGrade || "N/A");
  const feeBalance = selectedChild?.feeBalance || 0;
  const upcomingExams = selectedChild?.upcomingExams || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#e35336]">Parent Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor your children's academic progress
            </p>
          </div>

          {/* Top Section - Student Selector and Profile Card */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Student Selector Dropdown */}
            {children.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                  className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">
                      {selectedChild?.name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedChild?.name || "Select Student"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedChild?.className} - Section {selectedChild?.section}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {studentDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelectedChild(child);
                          setStudentDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg ${
                          selectedChild?.id === child.id ? "bg-blue-50 dark:bg-blue-900/30" : ""
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">
                            {child.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {child.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {child.className} - Section {child.section}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Student Profile Card */}
            {selectedChild && (
              <Card className="flex-1 shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-lg">
                        {selectedChild.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedChild.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Grade {selectedChild.className} - Section {selectedChild.section}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Student ID</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedChild.studentCode}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* KPI Cards - 4 cards in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Attendance Percentage */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Attendance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {attendancePercentage}%
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">+2.5%</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">this term</span>
                    </div>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPA */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">GPA</p>
                    {gradesLoading ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : hasGrades ? (
                      <>
                        <p className={`text-2xl font-bold mt-1 ${getGPAColor(parseFloat(gpa))}`}>
                          {gpa}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs ${gradeStatus.color}`}>{gradeStatus.text}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          N/A
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">No grades</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Score */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                    {gradesLoading ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : hasGrades ? (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {averageScore}%
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        N/A
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">out of 100</span>
                    </div>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fee Balance */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fee Balance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {feeBalance.toLocaleString()} Birr
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {feeBalance > 0 ? (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600 dark:text-amber-400">Due</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">Paid</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Section - 2 column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Attendance Trend Chart */}
              <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                    Attendance Trend
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">This Term</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedChild?.attendanceTrend && (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={selectedChild.attendanceTrend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} className="dark:stroke-slate-700" />
                        <XAxis
                          dataKey="week"
                          axisLine={false}
                          tick={{ fill: "#64748B", fontSize: 11 }}
                          tickLine={false}
                          dy={10}
                          className="dark:fill-gray-400"
                        />
                        <YAxis
                          axisLine={false}
                          tick={{ fill: "#64748B", fontSize: 11 }}
                          tickLine={false}
                          tickMargin={10}
                          domain={[0, 100]}
                          className="dark:fill-gray-400"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 5, fill: "#3B82F6" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Recent Notices Card */}
              <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                    Recent Notices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.recentNotices?.map((notice) => (
                      <div
                        key={notice.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            notice.type === "assignment"
                              ? "bg-blue-100 dark:bg-blue-900/50"
                              : notice.type === "meeting"
                              ? "bg-purple-100 dark:bg-purple-900/50"
                              : "bg-amber-100 dark:bg-amber-900/50"
                          }`}
                        >
                          <Bell
                            className={`w-4 h-4 ${
                              notice.type === "assignment"
                                ? "text-blue-600 dark:text-blue-400"
                                : notice.type === "meeting"
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notice.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {notice.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(notice.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fee Summary Card */}
              <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                    Fee Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Paid</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Brr {selectedChild?.totalPaid || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Due</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Brr {selectedChild?.totalDue || 0}
                      </span>
                    </div>
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Balance</span>
                        <span
                          className={`text-lg font-bold ${
                            (selectedChild?.feeBalance || 0) > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          Brr {selectedChild?.feeBalance || 0}
                        </span>
                      </div>
                    </div>
                    {(selectedChild?.totalDue || 0) > 0 && (
                      <Button
                        className="w-full mt-2"
                        style={{ backgroundColor: "#1E3A8A" }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Grades Overview - Full Width */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Grades Overview
              </CardTitle>
              {hasGrades && (
                <Badge variant="outline" className="text-xs">
                  {grades.length} Subjects
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {gradesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedChild?.grades && selectedChild.grades.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b border-gray-100 dark:border-slate-700">
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                          Subject
                        </TableHead>
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                          Current Grade
                        </TableHead>
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                          Average
                        </TableHead>
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedChild.grades.map((grade, index) => (
                        <TableRow key={index} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                          <TableCell className="py-3 text-sm text-gray-900 dark:text-gray-100">
                            {grade.subject}
                          </TableCell>
                          <TableCell className="py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {grade.currentGrade}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {grade.average}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                grade.status === "Excellent"
                                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                  : grade.status === "Good"
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              {grade.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No grades available yet</p>
                  <Button variant="link" asChild className="mt-2">
                    <a href="/parent/grades">View Grades</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Section - Recent Activity Feed */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {dashboardData?.recentActivity?.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 py-4 ${
                      index !== (dashboardData.recentActivity?.length || 0) - 1
                        ? "border-b border-gray-100 dark:border-slate-700"
                        : ""
                    }`}
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`p-2 rounded-full ${
                          activity.type === "payment"
                            ? "bg-emerald-100 dark:bg-emerald-900/50"
                            : activity.type === "grade"
                            ? "bg-blue-100 dark:bg-blue-900/50"
                            : activity.type === "attendance"
                            ? "bg-purple-100 dark:bg-purple-900/50"
                            : "bg-amber-100 dark:bg-amber-900/50"
                        }`}
                      >
                        {activity.type === "payment" && (
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {activity.type === "grade" && (
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                        {activity.type === "attendance" && (
                          <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        )}
                        {activity.type === "notice" && (
                          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      {index !== (dashboardData.recentActivity?.length || 0) - 1 && (
                        <div className="w-px h-full absolute top-10 bg-gray-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(activity.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
