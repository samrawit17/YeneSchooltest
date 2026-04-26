"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { attendanceAPI, classesAPI, gradingAPI } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  Calendar,
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
  Bell
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
function MissingClasses({ date, grade, section }: { date: string; grade: string; section: string }) {
  const [data, setData] = useState<Array<{ id: string; name: string; grade: number; section: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [notifying, setNotifying] = useState<boolean>(false);

  useEffect(() => {
    const fetchMissing = async () => {
      try {
        setLoading(true);
        const params: any = { date };
        if (grade && grade !== 'all') params.grade = grade.replace('Grade ', '');
        if (section && section !== 'all') params.section = section;
        const res = await attendanceAPI.getMissing(params);
        setData(res.data || []);
      } catch (e) {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMissing();
  }, [date, grade, section]);

  const handleNotifyAll = async () => {
    try {
      setNotifying(true);
      await attendanceAPI.notifyMissingAttendance({ date });
      toast.success('Notifications sent to homeroom teachers');
    } catch (e) {
      toast.error('Failed to send notifications');
    } finally {
      setNotifying(false);
    }
  };

  const handleNotifyAllTeachers = async () => {
    try {
      setNotifying(true);
      await api.post('/attendance/check-reminders');
      toast.success('Notifications sent to all teachers with missing attendance');
    } catch (e) {
      toast.error('Failed to send notifications');
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#e35336]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 py-4">All classes have attendance recorded</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between mb-2 gap-2">

        <Button 
          onClick={handleNotifyAllTeachers} 
          disabled={notifying}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {notifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
          Notify All Teachers
        </Button>
      </div>
      <ScrollArea className="h-[300px] pr-2">
        {data.map((c) => (
        <div key={c.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{c.name} - Section {c.section}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Grade {c.grade}</p>
          </div>
          <Badge variant="outline" className="text-orange-600 border-orange-300">Missing</Badge>
        </div>
      ))}
      </ScrollArea>
    </div>
  );
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

export default function AttendanceManagementPage() {
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
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Dynamic grades and sections from API
  const [gradeList, setGradeList] = useState<string[]>([]);
  const [sectionList, setSectionList] = useState<string[]>([]);

  // Grades data
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  // Curriculum data
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'date' | 'period'>('date');

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'SUPER_ADMIN';
  const { currentAcademicYear, currentTerm, getAllAcademicYears, getTermsForYear } = useAcademicYear();

  // Fetch academic years and periods
  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        // Fetch all academic years for the dropdown using centralized context
        const years = await getAllAcademicYears();
        if (years && years.length > 0) {
          setAcademicYears(years);
          
          // Use current academic year from context or find active year
          const activeYear = currentAcademicYear || years.find((y: any) => y.isActive) || years[0];
          if (activeYear?.id) {
            setSelectedAcademicYear(activeYear.id);
          }
          
          // Get terms for the active year
          const terms = await getTermsForYear(activeYear?.id);
          setPeriods(terms);
          
          // Use current term from context as default, fallback to first term
          if (currentTerm?.id) {
            const termExists = terms.some((t: any) => t.id === currentTerm.id);
            if (termExists) {
              setSelectedPeriod(currentTerm.id);
            } else if (terms.length > 0 && terms[0]?.id) {
              setSelectedPeriod(terms[0].id);
            }
          } else if (terms.length > 0 && terms[0]?.id) {
            setSelectedPeriod(terms[0].id);
          }
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
        // Fetch all classes without filtering by academic year to get all grades/sections
        const response = await classesAPI.getAll();
        const classData = response.data || [];
        setClasses(classData);
        
        // Extract unique grades and sections from all classes
        const gradeMap = new Map<number, boolean>();
        const sectionMap = new Map<string, boolean>();
        classData.forEach((c: Class) => {
          gradeMap.set(c.grade, true);
          sectionMap.set(c.section, true);
        });
        const uniqueGrades = Array.from(gradeMap.keys()).sort((a, b) => a - b);
        const uniqueSections = Array.from(sectionMap.keys()).sort();
        
        setGradeList(uniqueGrades.map(g => `Grade ${g}`));
        setSectionList(uniqueSections);
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      }
    };
    fetchClasses();
  }, []);

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

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated || !isAdmin) return;
      
      try {
        setLoading(true);
        const gradeParam = selectedGrade !== "all" ? selectedGrade.replace("Grade ", "") : undefined;
        const response = await attendanceAPI.getAdminDashboard({ 
          date: selectedDate,
          grade: gradeParam,
          section: selectedSection !== "all" ? selectedSection : undefined,
          range: timeRange,
        });
        setDashboardData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set empty data when API fails
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
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [isAuthenticated, isAdmin, selectedDate, selectedGrade, selectedSection, timeRange]);

  // Fetch sessions for selected date and period
  useEffect(() => {
    const fetchSessions = async () => {
      if (!isAuthenticated || !isAdmin) return;
      
      // Get period date range if selected
      let startDate = selectedDate;
      let endDate = selectedDate;
      
      if (viewMode === 'period' && selectedPeriod && periods.length > 0) {
        const period = periods.find(p => p.id === selectedPeriod);
        if (period) {
          // Use period date range
          startDate = period.startDate;
          endDate = period.endDate;
        }
      }
      
      // Parse grade from "Grade X" format to just the number
      const gradeParam = selectedGrade !== "all" ? selectedGrade.replace("Grade ", "") : undefined;
      
      try {
        setSessionsLoading(true);
        const response = await attendanceAPI.getAllSessions({
          startDate,
          endDate,
          grade: gradeParam,
          section: selectedSection !== "all" ? selectedSection : undefined,
        });
        setSessions(response.data || []);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [selectedDate, selectedPeriod, selectedGrade, selectedSection, isAuthenticated, isAdmin, periods, viewMode]);

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

  // Filter sessions - handle both regular sessions (timetableSlot) and homeroom sessions (class)
  const filteredSessions = sessions.filter(s => {
    // Get class grade from either timetableSlot or direct class reference
    const classGrade = s.timetableSlot?.class?.grade || s.class?.grade;
    const sectionName = s.timetableSlot?.section?.name || s.class?.section;
    const className = s.timetableSlot?.class?.name || s.class?.name || '';
    const subjectName = s.timetableSlot?.subject?.name || 'Homeroom';
    const teacherName = s.timetableSlot?.teacher?.name || s.takenBy?.name || '';
    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    if (selectedGrade !== "all" && classGrade !== parseInt(selectedGrade.replace("Grade ", ""))) {
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

  // Use actual weekly stats from API
  const weeklyStatsData = dashboardData?.weeklyStats || [];

  // Bar Chart Component - Weekly Attendance Trend
  const BarChart = ({ data }: { data: Array<{ date: string; attendanceRate: number; presentCount?: number; totalStudentsMarked?: number }> }) => {
    const chartData = data;
    
    // Format date to show day name
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Get color based on attendance rate
    const getBarColor = (rate: number) => {
      if (rate >= 90) return 'bg-green-500';
      if (rate >= 75) return 'bg-yellow-500';
      return 'bg-red-500';
    };
    
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          No data available
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between h-[200px] gap-3">
          {chartData.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center gap-1 h-[160px] justify-end">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {item.attendanceRate}%
                </span>
                <div 
                  className={`w-full ${getBarColor(item.attendanceRate)} rounded-t-md transition-all duration-500 shadow-sm`}
                  style={{ height: `${Math.max(item.attendanceRate, 5)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span> 
            <span className="text-gray-600 dark:text-gray-400">Excellent (90%+)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span> 
            <span className="text-gray-600 dark:text-gray-400">Good (75-89%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span> 
            <span className="text-gray-600 dark:text-gray-400">Needs Improvement (&lt;75%)</span>
          </span>
        </div>
      </div>
    );
  };

  // Donut Chart Component
  const DonutChart = () => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const presentOffset = circumference - (presentPercentage / 100) * circumference;
    const absentOffset = circumference - (absentPercentage / 100) * circumference;
    const lateOffset = circumference - (latePercentage / 100) * circumference;
    
    return (
      <div className="relative w-[200px] h-[200px] mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 150 150">
          {/* Background circle */}
          <circle cx="75" cy="75" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="20" />
          {/* Present */}
          <circle 
            cx="75" cy="75" r={radius} fill="none" stroke="#22C55E" strokeWidth="20"
            strokeDasharray={circumference}
            strokeDashoffset={presentOffset}
            className="transition-all duration-500"
          />
          {/* Absent */}
          <circle 
            cx="75" cy="75" r={radius - 24} fill="none" stroke="#F87171" strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={absentOffset}
            className="transition-all duration-500"
          />
          {/* Late */}
          <circle 
            cx="75" cy="75" r={radius - 44} fill="none" stroke="#FB923C" strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={lateOffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{presentPercentage}%</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Present</span>
        </div>
      </div>
    );
  };

  // Line Chart Component for trends
  const LineChart = ({ data }: { data: Array<{ date: string; attendanceRate: number; presentCount?: number; totalStudentsMarked?: number }> }) => {
    const maxRate = 100;
    const chartData = data.filter(d => d.attendanceRate > 0);
    
    return (
      <div className="relative h-[200px]">
        {/* Y-axis */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-8 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 25, 50, 75, 100].map((tick) => (
              <div key={tick} className="w-full border-b border-gray-100 dark:border-gray-700"></div>
            ))}
          </div>
          
          {/* Line chart */}
          <div className="absolute inset-0 flex items-end">
            <div className="w-full flex items-end gap-1">
              {chartData.map((item, index) => {
                const x = (index / (chartData.length - 1 || 1)) * 100;
                const y = 100 - item.attendanceRate;
                const prevY = index > 0 ? 100 - chartData[index - 1].attendanceRate : y;
                const isUp = item.attendanceRate >= chartData[index - 1]?.attendanceRate;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-full bg-blue-600 absolute transform -translate-x-1/2"
                      style={{ bottom: `${item.attendanceRate}%` }}
                    />
                    {index > 0 && (
                      <div 
                        className="absolute h-0.5 bg-blue-600 transform origin-left"
                        style={{
                          bottom: `${chartData[index - 1].attendanceRate}%`,
                          width: `${Math.sqrt(Math.pow(100 / chartData.length, 2) + Math.pow(Math.abs(y - prevY), 2))}%`,
                          left: `${((index - 1) / (chartData.length - 1)) * 100}%`,
                          transform: `rotate(${Math.atan2(y - prevY, 100 / chartData.length) * (180 / Math.PI)}deg)`
                        }}
                      />
                    )}
                    <span className="text-xs text-gray-500 absolute -bottom-6">{item.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    toast.success("Attendance report exported successfully!");
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-2">
        {/* Top Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-[#E2E8F0] dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">Attendance Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Monitor and analyze student attendance across all classes</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">


              {/* Date Picker */}
              {viewMode === 'date' && (
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 rounded-lg border border-[#E2E8F0] dark:border-gray-600 p-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const prevDate = new Date(selectedDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    setSelectedDate(prevDate.toISOString().split('T')[0]);
                  }}
                  className="h-8 w-8 hover:bg-[#e35336] hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 px-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[140px] border-0 bg-transparent focus-visible:ring-0 text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const nextDate = new Date(selectedDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    setSelectedDate(nextDate.toISOString().split('T')[0]);
                  }}
                  className="h-8 w-8 hover:bg-[#e35336] hover:text-white transition-colors"
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
                setPeriods(year?.terms || []);
                if (year?.terms?.length > 0 && year.terms[0]?.id) {
                  setSelectedPeriod(year.terms[0].id);
                }
              }}>
                <SelectTrigger className="w-[160px] border-[#E2E8F0] dark:border-gray-600">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.length > 0 ? (
                    academicYears.map(year => (
                      <SelectItem key={year.id} value={year.id || ''}>{year.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none_" disabled>No academic years</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Period/Term */}
              <Select value={selectedPeriod || 'all'} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[140px] border-[#E2E8F0] dark:border-gray-600">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.length > 0 ? (
                    periods.map(period => (
                      <SelectItem key={period.id} value={period.id || ''}>{period.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none_" disabled>No periods</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Grade */}
              <Select value={selectedGrade || 'all'} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[140px] border-[#E2E8F0] dark:border-gray-600">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {gradeList.length > 0 ? (
                    gradeList.map(grade => (
                      <SelectItem key={grade} value={grade || '_grade_'}>{(grade || '')}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none_" disabled>No grades</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Section */}
              <Select value={selectedSection || 'all'} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[140px] border-[#E2E8F0] dark:border-gray-600">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sectionList.length > 0 ? (
                    sectionList.map(section => (
                      <SelectItem key={section} value={section || '_section_'}>{section || ''}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none_" disabled>No sections</SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExport}
                variant="outline" 
                className="border-[#E2E8F0] dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Today's Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardData?.todayStats.totalStudentsMarked || 0}</p>
                </div>
                <div className="w-12 h-12 bg-[#e35336]/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#e35336]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{dashboardData?.todayStats.presentCount || 0}</p>
                  <p className="text-xs text-green-600 mt-1">{dashboardData?.todayStats.attendanceRate || 0}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500" 
                  style={{ width: `${dashboardData?.todayStats.attendanceRate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sessions Taken</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{dashboardData?.todayStats.submittedSessions || 0}/{dashboardData?.todayStats.totalSessions || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${dashboardData?.todayStats.totalSessions ? (dashboardData.todayStats.submittedSessions / dashboardData.todayStats.totalSessions) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{dashboardData?.todayStats.notSubmittedSessions || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Weekly Trend Bar Chart */}
          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm lg:col-span-2 dark:bg-gray-800">
            <CardHeader className="border-b border-[#E2E8F0] dark:border-gray-600">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#e35336]" />
                  Weekly Attendance Trend
                </CardTitle>
                <Tabs value={timeRange} onValueChange={setTimeRange} className="h-8">
                  <TabsList className="bg-gray-100 dark:bg-gray-700 h-7">
                    <TabsTrigger value="weekly" className="text-xs h-5 px-2 dark:text-gray-300">Week</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs h-5 px-2 dark:text-gray-300">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <BarChart data={weeklyStatsData} />
            </CardContent>
          </Card>

          {/* Today's Donut Chart */}
          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
            <CardHeader className="border-b border-[#E2E8F0] dark:border-gray-600">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#e35336]" />
                Today's Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DonutChart />
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Present
                  </span>
                  <span className="font-medium">{stats.present} ({presentPercentage}%)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                    Absent
                  </span>
                  <span className="font-medium">{stats.absent} ({absentPercentage}%)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                    Late
                  </span>
                  <span className="font-medium">{stats.late} ({latePercentage}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Missing Attendance */}
          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
          <CardHeader className="border-b border-[#E2E8F0] dark:border-gray-600">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-500" />
          Missing Attendance
          </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
          {/* Prefer exact classes without any recorded sessions via dedicated endpoint */}
          <MissingClasses date={selectedDate} grade={selectedGrade} section={selectedSection} />
          </CardContent>
          </Card>

          {/* Recent Absences */}
          <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
            <CardHeader className="border-b border-[#E2E8F0] dark:border-gray-600">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Recent Absences
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {dashboardData?.recentAbsences && dashboardData.recentAbsences.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentAbsences.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-red-100 text-red-600 text-xs">
                            {item.studentName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.studentName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.studentCode}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        {item.className} - {item.sectionName}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No recent absences</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card className="border-[#E2E8F0] dark:border-gray-700 shadow-sm dark:bg-gray-800">
          <CardHeader className="border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Attendance Sessions - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </CardTitle>
              <div className="relative w-64">
                <TableSearch
                  search={searchTerm}
                  setSearch={setSearchTerm}
                  placeholder="Search..."
                />
              </div>
            </div>
          </CardHeader>
          
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#e35336]" />
            </div>
           ) : filteredSessions.length > 0 ? (
             <div className="overflow-x-auto">
               <Table className="w-full">
                 <TableHeader>
                   <TableRow className="bg-gray-50 border-b border-[#E2E8F0] dark:border-gray-600">
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</TableHead>
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</TableHead>
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</TableHead>
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</TableHead>
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</TableHead>
                     <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</TableHead>
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
                           {session.timetableSlot?.class?.name || session.class?.name || 'Unknown'} - {session.timetableSlot?.section?.name || session.class?.section || 'N/A'}
                         </TableCell>
                         <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                           {session.timetableSlot?.subject?.name || 'Homeroom'}
                         </TableCell>
                         <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                           {session.timetableSlot?.teacher?.name || session.takenBy?.name || 'N/A'}
                         </TableCell>
                         <TableCell className="px-4 py-3">
                           <Badge variant={session.status === 'SUBMITTED' ? 'default' : 'destructive'}>
                             {session.status === 'SUBMITTED' ? 'Submitted' : 'Not Submitted'}
                           </Badge>
                         </TableCell>
                         <TableCell className="px-4 py-3 text-sm text-green-600 font-medium">{present}</TableCell>
                         <TableCell className="px-4 py-3 text-sm text-red-600 font-medium">{absent}</TableCell>
                         <TableCell className="px-4 py-3">
                           <div className="flex items-center gap-2">
                             <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                               <div 
                                 className={`h-full rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
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
             <div className="text-center py-12 text-gray-500 dark:text-gray-400">
               <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
               <p>No attendance sessions found for this date</p>
             </div>
           )}
        </Card>
      </div>
    </div>
  );
}
