"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useTranslations } from "@/hooks/useTranslations";
import { attendanceAPI, classesAPI, gradingAPI } from "@/lib/api";
import { formatDateByCalendarType } from "@/lib/calendar-utils";
import { toast } from "sonner";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import DynamicChart from "@/components/charts/DynamicChart";
import { 
  Download,
  Users,
  UserCheck,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  RefreshCw,
  LayoutGrid,
  ClipboardCheck
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import TableSearch from "@/components/TableSearch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Missing Classes component
function MissingClasses({
  date,
  grade,
  section,
  disableNotifyReason,
}: {
  date: string;
  grade: string;
  section: string;
  disableNotifyReason?: string;
}) {
  const { t } = useTranslations<any>("attendance");
  const [data, setData] = useState<Array<{ id: string; name: string; grade: number; section: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [notifying, setNotifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMissing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { date };
      if (grade && grade !== 'all') params.grade = extractGradeValue(grade);
      if (section && section !== 'all') params.section = section;
      const res = await attendanceAPI.getMissing(params);
      setData(res.data || []);
    } catch (e: any) {
      const message = e?.response?.data?.message || "Failed to load missing attendance";
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [date, grade, section]);

  useEffect(() => {
    fetchMissing();
  }, [fetchMissing]);

  const handleNotifyAllTeachers = async () => {
    try {
      setNotifying(true);
      const response = await attendanceAPI.notifyMissingAttendance({
        date,
        grade: grade && grade !== "all" ? extractGradeValue(grade) : undefined,
        section: section && section !== "all" ? section : undefined,
      });
      const sentCount = Array.isArray(response.data?.notifications)
        ? response.data.notifications.length
        : 0;
      if (sentCount > 0) {
        toast.success(
          response.data?.message || t.notificationsSentDetailed,
        );
      } else {
        toast.info(
          response.data?.message ||
            "No teacher notifications were sent for the selected date and filters.",
        );
      }
    } catch (e) {
      toast.error(t.notificationsFailed);
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <AlertCircle className="w-10 h-10 text-[var(--brand-color,#e35336)]" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{t.errorTitle || "Unable to load missing attendance"}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
        </div>
        <Button onClick={fetchMissing} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" />
          {t.tryAgain || "Try again"}
        </Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-[var(--brand-color,#e35336)] mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t.allClassesRecorded}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between mb-2 gap-2">
        <Button 
          onClick={handleNotifyAllTeachers} 
          disabled={notifying || Boolean(disableNotifyReason)}
          size="sm"
          className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90"
          title={disableNotifyReason}
        >
          {notifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
          {t.notifyAll}
        </Button>
      </div>
      {disableNotifyReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {disableNotifyReason}
        </div>
      ) : null}
      <ScrollArea className="h-[300px] pr-2">
        <div className="space-y-2">
        {data.map((c) => (
        <div key={c.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatClassSectionLabel(t, c.name, c.grade, c.section)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatGradeLabel(t, c.grade, c.name)}</p>
          </div>
          <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">{t.missing}</Badge>
        </div>
      ))}
      </div>
      </ScrollArea>
    </div>
  );
}

interface AttendanceDashboardMessages {
  title: string;
  description: string;
  academicYear: string;
  noAcademicYears: string;
  period: string;
  noPeriods: string;
  grade: string;
  allGrades: string;
  noGrades: string;
  section: string;
  allSections: string;
  noSections: string;
  weeklyTrend: string;
  week: string;
  month: string;
  todayOverview: string;
  present: string;
  absent: string;
  late: string;
  excused: string;
  excellent: string;
  good: string;
  needsImprovement: string;
  noData: string;
  missingAttendance: string;
  notifyAll: string;
  allClassesRecorded: string;
  missing: string;
  gradeLabel: string;
  sectionLabel: string;
  recentAbsences: string;
  noRecentAbsences: string;
  attendanceSessions: string;
  search: string;
  class: string;
  subject: string;
  teacher: string;
  status: string;
  rate: string;
  submitted: string;
  notSubmitted: string;
  noSessions: string;
  unknown: string;
  nA: string;
  homeroom: string;
  exportSuccess: string;
  notificationsSent: string;
  notificationsSentDetailed: string;
  notificationsFailed: string;
  errorTitle: string;
  tryAgain: string;
  refresh: string;
  attendanceRate: string;
  today: string;
  ofTotal: string;
  sessions: string;
  submittedShort: string;
  totalMarked: string;
  studentsToday: string;
  attendanceByClass: string;
}

// Types
interface Class {
  id: string;
  name: string;
  grade: number;
  section: string;
}

interface AttendanceSession {
  id: string;
  date: string;
  status: "NOT_SUBMITTED" | "SUBMITTED";
  takenBy?: { id: string; name: string };
  timetableSlot?: {
    id: string;
    class: { id: string; name: string; grade: number };
    section: { id: string; name: string };
    subject: { name: string; code?: string };
    teacher: { id: string; name: string };
  };
  class?: { id: string; name: string; grade: number; section?: string };
  attendanceRecords: Array<{
    id: string;
    studentId: string;
    student: { id: string; name: string };
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remark?: string;
  }>;
}

interface DailyStats {
  date: string;
  totalSessions: number;
  submittedSessions: number;
  notSubmittedSessions: number;
  totalStudentsMarked: number;
  presentCount: number;
  attendanceRate: number;
}

interface DashboardData {
  todayStats: {
    totalSessions: number;
    submittedSessions: number;
    notSubmittedSessions: number;
    attendanceRate: number;
    totalStudentsMarked: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
  };
  weeklyStats: Array<{
    date: string;
    attendanceRate: number;
    presentCount?: number;
    totalStudentsMarked?: number;
  }>;
  missingAttendance: Array<{
    className: string;
    sectionName: string;
    subjectName: string;
    time: string;
    endTime?: string;
  }>;
  recentAbsences: Array<{
    studentName: string;
    studentCode: string;
    className: string;
    sectionName: string;
  }>;
}

// Dynamic grades and sections - populated from API
const GRADES: string[] = [];
const SECTIONS: string[] = [];

const stripLocalizedPrefix = (value: string | null | undefined, prefixes: string[]) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const prefixPattern = prefixes.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return text.replace(new RegExp(`^(${prefixPattern})\\s+`, "i"), "").trim();
};

const extractGradeValue = (grade: string | number | null | undefined, fallback?: string | null) => {
  if (grade !== null && grade !== undefined && String(grade).trim()) {
    return stripLocalizedPrefix(String(grade), ["Grade", "Fasalka", "Kutaa", "الصف", "ክፍል"]);
  }
  const fallbackText = String(fallback || "");
  const match = fallbackText.match(/(?:Grade|Fasalka|Kutaa|الصف|ክፍል)\s*([0-9A-Za-z]+)/i);
  return match?.[1] || fallbackText.trim();
};

const formatGradeLabel = (t: any, grade: string | number | null | undefined, fallback?: string | null) => {
  const gradeValue = extractGradeValue(grade, fallback);
  return gradeValue ? `${t.gradeLabel} ${gradeValue}` : (fallback || t.unknown);
};

const formatSectionLabel = (t: any, section: string | null | undefined) => {
  const sectionValue = stripLocalizedPrefix(section, ["Section", "Qaybta", "Ramaddii", "الشعبة", "ሴክሽን", "ክፍል"]);
  return sectionValue ? `${t.sectionLabel} ${sectionValue}` : t.nA;
};

const formatClassSectionLabel = (
  t: any,
  className: string | null | undefined,
  grade: string | number | null | undefined,
  section: string | null | undefined
) => `${formatGradeLabel(t, grade, className)} - ${formatSectionLabel(t, section)}`;

export default function AttendanceManagementPage() {
  const { t } = useTranslations<AttendanceDashboardMessages>("attendance");
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("weekly");
  
  // Data
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedDashboardRef = useRef(false);
  const dashboardRequestSeqRef = useRef(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Dynamic grades and sections from API
  const [gradeList, setGradeList] = useState<string[]>([]);

  // Grades data
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  // Curriculum data
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'date' | 'period'>('date');

  const isAdmin =
    user?.role?.toUpperCase() === 'ADMIN' ||
    user?.role?.toUpperCase() === 'IT_MANAGER' ||
    user?.role?.toUpperCase() === 'SUPER_ADMIN';
  const { currentAcademicYear, currentTerm, getAllAcademicYears, getTermsForYear, formattedYearLabel, displayTermName, formatDate: formatSchoolDate } = useAcademicYear();

  const calendarType = user?.calendarType || "ETHIOPIAN";
  const selectedPeriodData = periods.find((period) => period.id === selectedPeriod);
  const visibleStartDate =
    viewMode === "period" && selectedPeriodData?.startDate
      ? selectedPeriodData.startDate
      : selectedDate;
  const visibleEndDate =
    viewMode === "period" && selectedPeriodData?.endDate
      ? selectedPeriodData.endDate
      : selectedDate;
  const visibleDateLabel =
    viewMode === "period" && selectedPeriodData
      ? `${selectedPeriodData.name} • ${formatDateByCalendarType(visibleStartDate, calendarType)} - ${formatDateByCalendarType(visibleEndDate, calendarType)}`
      : formatDateByCalendarType(selectedDate, calendarType);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated || !isAdmin) return;

    const isInitialLoad = !hasLoadedDashboardRef.current;
    const requestSeq = dashboardRequestSeqRef.current + 1;
    dashboardRequestSeqRef.current = requestSeq;
    
    try {
      if (isRefresh || !isInitialLoad) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const gradeParam = selectedGrade !== "all" ? extractGradeValue(selectedGrade) : undefined;
      const response = await attendanceAPI.getAdminDashboard({ 
        date: viewMode === "date" ? selectedDate : undefined,
        startDate: viewMode === "period" ? visibleStartDate : undefined,
        endDate: viewMode === "period" ? visibleEndDate : undefined,
        grade: gradeParam,
        section: selectedSection !== "all" ? selectedSection : undefined,
        range: timeRange,
      });
      if (requestSeq !== dashboardRequestSeqRef.current) return;
      setDashboardData(response.data);
      hasLoadedDashboardRef.current = true;
    } catch (err: any) {
      if (requestSeq !== dashboardRequestSeqRef.current) return;
      const message = err?.response?.data?.message || 'Failed to load attendance data';
      setError(message);
      toast.error(message);
      setDashboardData({
        todayStats: {
          totalSessions: 0,
          submittedSessions: 0,
          notSubmittedSessions: 0,
          attendanceRate: 0,
          totalStudentsMarked: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
        },
        weeklyStats: [],
        missingAttendance: [],
        recentAbsences: []
      });
      hasLoadedDashboardRef.current = true;
    } finally {
      if (requestSeq !== dashboardRequestSeqRef.current) return;
      if (isInitialLoad) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [isAuthenticated, isAdmin, selectedDate, selectedGrade, selectedSection, timeRange, viewMode, visibleStartDate, visibleEndDate]);

  // Fetch academic years and periods
  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        const years = await getAllAcademicYears();
        if (years && years.length > 0) {
          setAcademicYears(years);
          
          const activeYear = currentAcademicYear || years.find((y: any) => y.isActive) || years[0];
          if (activeYear?.id) {
            setSelectedAcademicYear(activeYear.id);
          }
          
          const terms = await getTermsForYear(activeYear?.id);
          setPeriods(terms);
          
          const selectCurrentTerm = (termList: any[]) => {
            if (currentTerm?.id && termList.some((t: any) => t.id === currentTerm.id)) {
              setSelectedPeriod(currentTerm.id);
              return;
            }
            const today = new Date();
            const dateMatch = termList.find((t: any) => {
              const start = t.startDate ? new Date(t.startDate) : null;
              const end = t.endDate ? new Date(t.endDate) : null;
              return start && end && today >= start && today <= end;
            });
            if (dateMatch?.id) {
              setSelectedPeriod(dateMatch.id);
            } else if (termList.length > 0 && termList[0]?.id) {
              setSelectedPeriod(termList[0].id);
            }
          };
          selectCurrentTerm(terms);
        }
      } catch (error) {
        console.error('Failed to fetch academic years:', error);
      }
    };
    fetchAcademicData();
  }, [currentAcademicYear, currentTerm, getAllAcademicYears, getTermsForYear]);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classesAPI.getAll();
        const classData = response.data || [];
        setClasses(classData);
        
        const gradeMap = new Map<number, boolean>();
        classData.forEach((c: Class) => {
          gradeMap.set(c.grade, true);
        });
        const uniqueGrades = Array.from(gradeMap.keys()).sort((a, b) => a - b);
        
        setGradeList(uniqueGrades.map(g => String(g)));
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      }
    };
    fetchClasses();
  }, []);

  const selectedGradeValue = selectedGrade !== "all" ? extractGradeValue(selectedGrade) : "";
  const sectionList = useMemo(() => {
    if (!selectedGradeValue) return [];

    const gradeNumber = Number(selectedGradeValue);
    const sectionMap = new Map<string, boolean>();
    classes.forEach((classItem) => {
      if (classItem.grade === gradeNumber && classItem.section) {
        sectionMap.set(classItem.section, true);
      }
    });

    return Array.from(sectionMap.keys()).sort();
  }, [classes, selectedGradeValue]);

  useEffect(() => {
    if (!selectedGradeValue && selectedSection !== "all") {
      setSelectedSection("all");
      return;
    }

    if (
      selectedGradeValue &&
      selectedSection !== "all" &&
      !sectionList.includes(selectedSection)
    ) {
      setSelectedSection("all");
    }
  }, [selectedGradeValue, selectedSection, sectionList]);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fetch grades data when academic year or period changes
  useEffect(() => {
    const fetchGradesData = async () => {
      if (!selectedAcademicYear) return;
      
      try {
        setGradesLoading(true);
        const response = await gradingAPI.getStudentFinalGrades({
          academicYear: selectedAcademicYear,
        });
        setGradesData(response.data || []);
      } catch (error) {
        console.error('Failed to fetch grades data:', error);
        setGradesData([]);
      } finally {
        setGradesLoading(false);
      }
    };
    fetchGradesData();
  }, [selectedAcademicYear, selectedPeriod]);

  // Fetch sessions for selected date and period
  useEffect(() => {
    const fetchSessions = async () => {
      if (!isAuthenticated || !isAdmin) return;
      
      const gradeParam = selectedGrade !== "all" ? extractGradeValue(selectedGrade) : undefined;
      
      try {
        setSessionsLoading(true);
        setSessionsError(null);
        const response = await attendanceAPI.getAllSessions({
          startDate: visibleStartDate,
          endDate: visibleEndDate,
          grade: gradeParam,
          section: selectedSection !== "all" ? selectedSection : undefined,
        });
        setSessions(response.data || []);
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Failed to load attendance sessions';
        setSessionsError(message);
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [selectedGrade, selectedSection, isAuthenticated, isAdmin, visibleStartDate, visibleEndDate]);

  // Lazy load charts
  useEffect(() => {
    setShowCharts(false);

    if (!dashboardData) return;

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

  // Use stats from dashboardData when available, fallback to sessions calculation
  const stats = dashboardData?.todayStats ? {
    total: dashboardData.todayStats.totalStudentsMarked || 0,
    present: dashboardData.todayStats.presentCount || 0,
    absent: dashboardData.todayStats.absentCount || 0,
    late: dashboardData.todayStats.lateCount || 0,
    excused: dashboardData.todayStats.excusedCount || 0,
    submittedSessions: dashboardData.todayStats.submittedSessions || 0,
    notSubmittedSessions: dashboardData.todayStats.notSubmittedSessions || 0,
  } : {
    total: sessions.reduce((acc, s) => acc + s.attendanceRecords.length, 0),
    present: sessions.reduce((acc, s) => acc + s.attendanceRecords.filter(r => r.status === 'PRESENT').length, 0),
    absent: sessions.reduce((acc, s) => acc + s.attendanceRecords.filter(r => r.status === 'ABSENT').length, 0),
    late: sessions.reduce((acc, s) => acc + s.attendanceRecords.filter(r => r.status === 'LATE').length, 0),
    excused: sessions.reduce((acc, s) => acc + s.attendanceRecords.filter(r => r.status === 'EXCUSED').length, 0),
    submittedSessions: sessions.filter(s => s.status === 'SUBMITTED').length,
    notSubmittedSessions: sessions.filter(s => s.status === 'NOT_SUBMITTED').length,
  };

  const presentPercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const absentPercentage = stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0;
  const latePercentage = stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0;
  const excusedPercentage = stats.total > 0 ? Math.round((stats.excused / stats.total) * 100) : 0;
  const attendanceRate = dashboardData?.todayStats?.attendanceRate || presentPercentage;

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    const classGrade = s.timetableSlot?.class?.grade || s.class?.grade;
    const sectionName = s.timetableSlot?.section?.name || s.class?.section;
    const className = s.timetableSlot?.class?.name || s.class?.name || '';
    const subjectName = s.timetableSlot?.subject?.name || 'Homeroom';
    const teacherName = s.timetableSlot?.teacher?.name || s.takenBy?.name || '';
    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    if (selectedGrade !== "all" && classGrade !== parseInt(extractGradeValue(selectedGrade))) {
      return false;
    }
    if (selectedSection !== "all" && sectionName !== selectedSection) {
      return false;
    }
    if (normalizedSearch) {
      const haystack = `${className} ${subjectName} ${teacherName} ${sectionName || ''}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }
    return true;
  });

  const weeklyStatsData = dashboardData?.weeklyStats || [];

  // Build chart data for DynamicChart
  const attendanceChartData = weeklyStatsData.length > 0 ? {
    type: "bar" as const,
    title: t.weeklyTrend,
      labels: weeklyStatsData.map((d: any) => {
      return formatDateByCalendarType(d.date, calendarType);
    }),
    datasets: [{
      label: t.present,
      data: weeklyStatsData.map((d: any) => d.attendanceRate),
      backgroundColor: weeklyStatsData.map((d: any) => {
        if (d.attendanceRate >= 90) return 'rgba(227, 83, 54, 0.85)';
        if (d.attendanceRate >= 75) return 'rgba(227, 83, 54, 0.6)';
        return 'rgba(227, 83, 54, 0.4)';
      }),
      borderColor: 'var(--brand-color, #e35336)',
    }],
  } : null;

  const overviewChartData = {
    type: "doughnut" as const,
    title: t.todayOverview,
    labels: [t.present, t.absent, t.late, t.excused || 'Excused'],
    datasets: [{
      label: t.todayOverview,
      data: [stats.present, stats.absent, stats.late, stats.excused],
      backgroundColor: [
        'rgba(227, 83, 54, 0.85)',
        'rgba(227, 83, 54, 0.55)',
        'rgba(227, 83, 54, 0.35)',
        'rgba(227, 83, 54, 0.2)',
      ],
      borderColor: '#ffffff',
    }],
  };

  const attendanceByClassChartData = sessions.length > 0 ? {
    type: "bar" as const,
    title: t.attendanceByClass,
    labels: filteredSessions.slice(0, 8).map(s => {
      const name = s.timetableSlot?.class?.name || s.class?.name || '';
      const section = s.timetableSlot?.section?.name || s.class?.section || '';
      return `${name} ${section}`;
    }),
    datasets: [{
      label: t.present,
      data: filteredSessions.slice(0, 8).map(s => {
        const present = s.attendanceRecords.filter(r => r.status === 'PRESENT').length;
        const total = s.attendanceRecords.length;
        return total > 0 ? Math.round((present / total) * 100) : 0;
      }),
      backgroundColor: 'rgba(227, 83, 54, 0.75)',
      borderColor: 'var(--brand-color, #e35336)',
    }],
  } : null;

  if (isLoading || (loading && !hasLoadedDashboardRef.current)) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gray-50 p-3 dark:bg-[#111111] sm:p-4 md:p-6">
        <div className="w-full space-y-5 md:space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
            {[1, 2].map((i) => (
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

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111111] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[var(--brand-color,#e35336)] mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.errorTitle}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Button onClick={() => fetchDashboard()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 transition-colors dark:bg-[#111111]">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="w-full space-y-5 md:space-y-6">
          {/* Header */}
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-black sm:text-2xl">
                {t.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                {t.description}
              </p>
            </div>
            {displayTermName && (
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-base font-bold text-black sm:text-xl">{displayTermName}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-[rgba(var(--brand-color-rgb),0.3)] bg-[rgba(var(--brand-color-rgb),0.06)] p-3 text-sm text-gray-700 dark:text-gray-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-color,#e35336)]" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{t.errorTitle || "Attendance data is incomplete"}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <Card className="w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
                {/* Date Picker */}
                {viewMode === 'date' && (
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 rounded-lg border border-[#E2E8F0] dark:border-gray-600 p-1 w-full">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const prevDate = new Date(selectedDate);
                        prevDate.setDate(prevDate.getDate() - 1);
                        setSelectedDate(prevDate.toISOString().split('T')[0]);
                      }}
                      className="h-8 w-8 hover:bg-[var(--brand-color,#e35336)] hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CalendarDatePicker
                      value={selectedDate ? new Date(selectedDate) : undefined}
                      onChange={(date) => {
                        if (date) {
                          setSelectedDate(date.toISOString().split('T')[0]);
                        }
                      }}
                      className="flex-1 bg-transparent border-0 shadow-none dark:bg-transparent dark:text-white min-w-0"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const nextDate = new Date(selectedDate);
                        nextDate.setDate(nextDate.getDate() + 1);
                        setSelectedDate(nextDate.toISOString().split('T')[0]);
                      }}
                      className="h-8 w-8 hover:bg-[var(--brand-color,#e35336)] hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Academic Year */}
                <Select value={selectedAcademicYear || 'all'} onValueChange={(value) => {
                  if (!value || value === '_none_') return;
                  setSelectedAcademicYear(value);
                  const year = academicYears.find(y => y.id === value);
                  const termList = year?.terms || [];
                  setPeriods(termList);
                  if (termList.length > 0) {
                    const today = new Date();
                    const dateMatch = termList.find((t: any) => {
                      const start = t.startDate ? new Date(t.startDate) : null;
                      const end = t.endDate ? new Date(t.endDate) : null;
                      return start && end && today >= start && today <= end;
                    });
                    setSelectedPeriod(dateMatch?.id || termList[0].id);
                  }
                }}>
                  <SelectTrigger className="w-full border-[#E2E8F0] dark:border-gray-600">
                    <SelectValue placeholder={t.academicYear} />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.length > 0 ? (
                      academicYears.map(year => (
                        <SelectItem key={year.id} value={year.id || ''}>{year.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none_" disabled>{t.noAcademicYears}</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Period/Term */}
                <Select value={selectedPeriod || 'all'} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full border-[#E2E8F0] dark:border-gray-600">
                    <SelectValue placeholder={t.period} />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.length > 0 ? (
                      periods.map(period => (
                        <SelectItem key={period.id} value={period.id || ''}>{period.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none_" disabled>{t.noPeriods}</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Grade */}
                <Select value={selectedGrade || 'all'} onValueChange={(value) => {
                  setSelectedGrade(value);
                  setSelectedSection("all");
                }}>
                  <SelectTrigger className="w-full border-[#E2E8F0] dark:border-gray-600">
                    <SelectValue placeholder={t.grade} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allGrades}</SelectItem>
                    {gradeList.length > 0 ? (
                      gradeList.map(grade => (
                        <SelectItem key={grade} value={grade || '_grade_'}>{formatGradeLabel(t, grade)}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none_" disabled>{t.noGrades}</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Section */}
                <Select
                  value={selectedSection || 'all'}
                  onValueChange={setSelectedSection}
                  disabled={!selectedGradeValue}
                >
                  <SelectTrigger className="w-full border-[#E2E8F0] dark:border-gray-600" disabled={!selectedGradeValue}>
                    <SelectValue placeholder={t.section} />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedGradeValue ? (
                      <SelectItem value="all" disabled>
                        Select a grade first
                      </SelectItem>
                    ) : sectionList.length > 0 ? (
                      <>
                        <SelectItem value="all">{t.allSections}</SelectItem>
                        {sectionList.map(section => (
                          <SelectItem key={section} value={section || '_section_'}>{section || ''}</SelectItem>
                        ))}
                      </>
                    ) : (
                      <SelectItem value="_none_" disabled>{t.noSections}</SelectItem>
                    )}
                  </SelectContent>
                </Select>


              </div>
            </CardContent>
          </Card>

          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Attendance Rate */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.attendanceRate}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {attendanceRate}%
                    </p>
                    <p className="mt-1 text-xs text-gray-900 dark:text-white">{t.today}</p>
                  </div>
                  <div className="p-2 bg-gray-900/10 dark:bg-gray-100/20 rounded-lg shrink-0">
                    <ClipboardCheck className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Present Today */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.present}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats.present.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-900 dark:text-white">{presentPercentage}% {t.ofTotal}</p>
                  </div>
                  <div className="p-2 bg-gray-900/10 dark:bg-gray-100/20 rounded-lg shrink-0">
                    <UserCheck className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Absent Today */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.absent}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats.absent.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-900 dark:text-white">{absentPercentage}% {t.ofTotal}</p>
                  </div>
                  <div className="p-2 bg-gray-900/10 dark:bg-gray-100/20 rounded-lg shrink-0">
                    <UserX className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Late Today */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.late}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats.late.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-900 dark:text-white">{latePercentage}% {t.ofTotal}</p>
                  </div>
                  <div className="p-2 bg-gray-900/10 dark:bg-gray-100/20 rounded-lg shrink-0">
                    <Clock className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Sessions */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.sessions}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats.submittedSessions}
                    </p>
                    <p className="mt-1 text-xs text-gray-900 dark:text-white">/{stats.submittedSessions + stats.notSubmittedSessions} {t.submittedShort}</p>
                  </div>
                  <div className="p-2 bg-gray-900/10 dark:bg-gray-100/20 rounded-lg shrink-0">
                    <LayoutGrid className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Students */}
            <Card className="min-w-0 w-full shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] lg:max-w-[185px] lg:justify-self-center">
              <CardContent className="p-2.5 sm:p-3 lg:p-2.5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.totalMarked}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                      {stats.total.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-900 dark:text-white">{t.studentsToday}</p>
                  </div>
                  <div className="p-2 bg-gray-900/10 dark:bg-gray-100/20 rounded-lg shrink-0">
                    <Users className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Weekly Attendance Chart */}
            {attendanceChartData && (
              <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
                <CardContent className="p-3 sm:p-4">
                  {showCharts ? (
                    <DynamicChart chartData={attendanceChartData} height={240} />
                  ) : (
                    <Skeleton className="h-[240px] w-full" />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Today Overview - Doughnut */}
            <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
              <CardContent className="p-3 sm:p-4">
                {showCharts ? (
                  <DynamicChart chartData={overviewChartData} height={240} />
                ) : (
                  <Skeleton className="h-[240px] w-full" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Attendance by Class - Full Width */}
          {attendanceByClassChartData && (
            <Card className="min-w-0 overflow-hidden shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]" style={{ contain: 'layout style paint' }}>
              <CardContent className="p-3 sm:p-4">
                {showCharts ? (
                  <DynamicChart chartData={attendanceByClassChartData} height={240} />
                ) : (
                  <Skeleton className="h-[240px] w-full" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
            {/* Missing Attendance */}
            <Card className="min-w-0 shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardHeader className="border-b border-red-200 dark:border-red-800 pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Activity className="w-4 h-4 text-red-500" />
                  {t.missingAttendance}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                  <MissingClasses
                    date={selectedDate}
                    grade={selectedGrade}
                    section={selectedSection}
                    disableNotifyReason={
                      viewMode === "period"
                        ? "Switch to Date view to notify teachers for a specific attendance day."
                        : undefined
                    }
                  />
              </CardContent>
            </Card>

            {/* Recent Absences */}
            <Card className="min-w-0 shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardHeader className="border-b border-gray-200 dark:border-[#2A2A2A] pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                  {t.recentAbsences}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {dashboardData?.recentAbsences && dashboardData.recentAbsences.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentAbsences.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[rgba(var(--brand-color-rgb),0.06)] dark:bg-[rgba(var(--brand-color-rgb),0.12)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {item.studentName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.studentName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.studentCode}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[var(--brand-color,#e35336)] border-[rgba(var(--brand-color-rgb),0.3)]">
                          {formatClassSectionLabel(t, item.className, undefined, item.sectionName)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-[var(--brand-color,#e35336)] mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.noRecentAbsences}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sessions Table */}
          <Card className="min-w-0 shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
            <CardHeader className="border-b border-gray-200 dark:border-[#2A2A2A] pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {t.attendanceSessions} - {visibleDateLabel}
                </CardTitle>
                <div className="relative w-64">
                  <TableSearch
                    search={searchTerm}
                    setSearch={setSearchTerm}
                    placeholder={t.search}
                  />
                </div>
              </div>
            </CardHeader>
            
            {sessionsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
             ) : sessionsError ? (
               <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                 <AlertCircle className="h-10 w-10 text-[var(--brand-color,#e35336)]" />
                 <div>
                   <p className="text-sm font-medium text-gray-900 dark:text-white">{t.errorTitle || "Unable to load attendance sessions"}</p>
                   <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sessionsError}</p>
                 </div>
               </div>
             ) : filteredSessions.length > 0 ? (
               <div className="overflow-x-auto">
                 <Table className="w-full">
                   <TableHeader>
                     <TableRow className="bg-gray-50 border-b border-[#E2E8F0] dark:border-gray-600">
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.class}</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.subject}</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.teacher}</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.status}</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.present}</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.absent}</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.rate}</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody className="divide-y divide-[#E2E8F0]">
                     {filteredSessions.map((session) => {
                       const present = session.attendanceRecords.filter(r => r.status === 'PRESENT').length;
                       const absent = session.attendanceRecords.filter(r => r.status === 'ABSENT').length;
                       const total = session.attendanceRecords.length;
                       const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                       
                       return (
                         <TableRow key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {formatClassSectionLabel(
                                t,
                                session.timetableSlot?.class?.name || session.class?.name,
                                session.timetableSlot?.class?.grade || session.class?.grade,
                                session.timetableSlot?.section?.name || session.class?.section
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {session.timetableSlot?.subject?.name || t.homeroom}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {session.timetableSlot?.teacher?.name || session.takenBy?.name || t.nA}
                           </TableCell>
                           <TableCell className="px-4 py-3">
                              <Badge variant={session.status === 'SUBMITTED' ? 'default' : 'destructive'}>
                                {session.status === 'SUBMITTED' ? t.submitted : t.notSubmitted}
                              </Badge>
                           </TableCell>
                           <TableCell className="px-4 py-3 text-sm text-[var(--brand-color,#e35336)] font-medium">{present}</TableCell>
                           <TableCell className="px-4 py-3 text-sm text-[var(--brand-color,#e35336)] font-medium">{absent}</TableCell>
                           <TableCell className="px-4 py-3">
                             <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-[rgba(var(--brand-color-rgb),0.1)] rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${rate >= 90 ? 'bg-[var(--brand-color,#e35336)]' : rate >= 75 ? 'bg-[rgba(var(--brand-color-rgb),0.72)]' : 'bg-[rgba(var(--brand-color-rgb),0.45)]'}`}
                                   style={{ width: `${rate}%` }}
                                 />
                               </div>
                               <span className="text-xs font-medium">{rate}%</span>
                             </div>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </div>
             ) : (
                <div className="text-center py-12 text-[var(--brand-color,#e35336)]">
                  <Users className="w-12 h-12 mx-auto mb-4 text-[var(--brand-color,#e35336)]" />
                  <p className="text-[var(--brand-color,#e35336)]">{t.noSessions}</p>
               </div>
             )}
          </Card>
        </div>
      </div>
    </div>
  );
}
