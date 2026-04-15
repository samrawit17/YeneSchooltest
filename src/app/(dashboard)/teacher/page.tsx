"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { dashboardAPI, lessonsAPI, announcementsAPI, teachersAPI, attendanceAPI, gradingAPI, academicYearsAPI, termsAPI } from "@/lib/api";
import {
  BookOpen,
  Users,
  CalendarCheck,
  ClipboardList,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  ChevronRight,
  Play,
  PenTool,
  Upload,
  TrendingUp,
  GraduationCap,
  Award,
  MessageSquare,
  Plus,
  Eye,
  Loader2
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
import { Progress } from "@/components/ui/progress";

interface TeacherStats {
  todayClasses: number;
  attendancePending: number;
  examsToGrade: number;
  upcomingExams: number;
  homeroomClasses: number;
  totalSections: number;
  totalStudents: number;
  pendingTasks: number;
}

interface UpcomingClass {
  id: string;
  className: string;
  grade: string;
  section: string;
  subject: string;
  time: string;
  room: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  canTakeAttendance?: boolean;
}

interface RecentLesson {
  id: string;
  title: string;
  subject: string;
  grade: string;
  section: string;
  createdAt: string;
  status: 'published' | 'draft';
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  section: string;
  dueDate: string;
  status: 'completed' | 'pending' | 'overdue';
  submissions: number;
  totalStudents: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isUrgent: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceData {
  averageScore: number;
  attendancePercentage: number;
  topSection: string;
  sectionScores: Array<{
    name: string;
    score: number;
  }>;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  className: string;
  sectionName: string;
  subjectName: string;
  averageScore: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'at-risk';
}

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
}

interface TeacherAssignmentsResponse {
  homeroomClasses?: Array<{ id: string; studentCount?: number }>;
  homeroomSections?: Array<{ id: string; studentCount?: number }>;
  teachingAssignments?: Array<{ id: string }>;
}

const TeacherDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { formattedYearLabel } = useAcademicYear();
  const router = useRouter();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [topPerformers, setTopPerformers] = useState<StudentPerformance[]>([]);
  const [needsImprovement, setNeedsImprovement] = useState<StudentPerformance[]>([]);

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

      // Fetch teacher dashboard stats from backend
      const dashboardResponse = await dashboardAPI.getTeacherDashboard();
      const dashboardData = dashboardResponse.data;

      if (dashboardData.stats) {
        const baseStats = dashboardData.stats;
        setStats({
          ...baseStats,
          totalSections: baseStats.homeroomClasses || 0,
          totalStudents: 0,
          pendingTasks: (baseStats.attendancePending || 0) + (baseStats.examsToGrade || 0)
        });
      }

      // Fetch teacher's assignments (classes and sections)
      try {
        const assignmentsResponse = await teachersAPI.getMyAssignments();
        if (assignmentsResponse.data) {
          const teacherData = assignmentsResponse.data as TeacherAssignmentsResponse;
          const homeroomSections = teacherData.homeroomSections || [];
          const homeroomClasses = teacherData.homeroomClasses || [];
          const totalStudentsFromSections = homeroomSections.reduce((sum, section) => sum + (section.studentCount || 0), 0);
          const fallbackStudentsFromClasses = homeroomClasses.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
          const totalStudents = totalStudentsFromSections || fallbackStudentsFromClasses;

          setStats(prev => prev ? {
            ...prev,
            totalSections: homeroomSections.length || homeroomClasses.length || prev.totalSections,
            totalStudents,
          } : null);
        }
      } catch (assignError) {
        // Keep dashboard stats fallback values when assignment endpoint is unavailable.
      }

      // Fetch recent lessons
      try {
        const lessonsResponse = await lessonsAPI.getAll({ limit: 5 });
        if (lessonsResponse.data?.data) {
          const lessonsData: RecentLesson[] = lessonsResponse.data.data.map((lesson: any) => ({
            id: lesson.id,
            title: lesson.title || 'Untitled Lesson',
            subject: lesson.subject?.name || 'Unknown',
            grade: lesson.class?.name?.replace('Grade ', '') || 'N/A',
            section: lesson.section?.name || 'N/A',
            createdAt: lesson.createdAt,
            status: lesson.isPublished ? 'published' as const : 'draft' as const
          }));
          setRecentLessons(lessonsData);
        }
      } catch (lessonError) {
        console.log('No lessons found');
      }

      // Fetch announcements
      try {
        const announcementsResponse = await announcementsAPI.getAll({ role: 'teacher' });
        if (announcementsResponse.data) {
          const announcementsData = announcementsResponse.data.map((ann: any) => ({
            id: ann.id,
            title: ann.title,
            content: ann.content,
            date: ann.createdAt,
            isUrgent: ann.priority === 'high',
            priority: ann.priority || 'medium'
          }));
          setAnnouncements(announcementsData.slice(0, 3));
        }
      } catch (announcementError) {
        console.log('No announcements found');
      }

      // Fetch today's schedule from attendance dashboard
      try {
        const attendanceResponse = await attendanceAPI.getTeacherDashboard();
        if (attendanceResponse.data?.todaySchedule) {
          const scheduleData = attendanceResponse.data.todaySchedule.map((slot: any, index: number) => ({
            id: slot.id || `slot-${index}`,
            className: slot.className || 'N/A',
            grade: slot.className?.replace('Grade ', '') || 'N/A',
            section: slot.sectionName || 'A',
            subject: slot.subjectName || 'Unknown',
            time: slot.startTime || '00:00',
            room: slot.room || 'TBD',
            status: slot.isCompleted ? 'completed' : slot.isCurrent ? 'in-progress' : 'upcoming',
            canTakeAttendance: slot.canTakeAttendance !== false,
          }));
          setUpcomingClasses(scheduleData);
        }
      } catch (attendanceError) {
        console.log('No schedule found');
      }

      // Set initial performance state - will be updated with real data
      setPerformance({
        averageScore: 0,
        attendancePercentage: 0,
        topSection: '-',
        sectionScores: []
      });

      // Fetch real student performance data
      try {
        // Get active academic year
        const academicYearResponse = await academicYearsAPI.getActive();
        const academicYear = academicYearResponse.data?.id || academicYearResponse.data;

        if (academicYear) {
          // Get current term
          const termResponse = await termsAPI.getCurrent();
          const currentTerm = termResponse.data;
          const termId = currentTerm?.id;

          if (termId) {
            // Get teacher's grading assignments
            const assignmentsResponse = await gradingAPI.getTeacherAssignments({ academicYear });
            const responseData = assignmentsResponse.data;
            const subjectAssignments = responseData?.subjectAssignments || [];

            if (subjectAssignments.length > 0) {
              // Fetch grades for each assignment and collect all student performances
              const allStudentPerformances: StudentPerformance[] = [];
              const sectionScores: { [key: string]: { total: number; count: number } } = {};

              for (const assignment of subjectAssignments.slice(0, 5)) { // Limit to first 5 assignments
                try {
                  const classId = assignment.classId || assignment.class?.id;
                  const sectionId = assignment.sectionId || assignment.section?.id;
                  const subjectId = assignment.subjectId || assignment.subject?.id;
                  const className = assignment.class?.name || 'Class';
                  const sectionName = assignment.section?.name || 'A';
                  const subjectName = assignment.subject?.name || 'Subject';

                  const studentsResponse = await gradingAPI.getTeacherStudents({
                    academicYear,
                    termId,
                    classId,
                    sectionId,
                    subjectId
                  });

                  const students = studentsResponse.data || [];

                  students.forEach((student: any) => {
                    const totalScore = student.totalScore || 0;
                    const hasScore = student.totalScore !== null;

                    if (hasScore) {
                      let status: 'excellent' | 'good' | 'needs-improvement' | 'at-risk' = 'needs-improvement';
                      if (totalScore >= 90) status = 'excellent';
                      else if (totalScore >= 75) status = 'good';
                      else if (totalScore >= 50) status = 'needs-improvement';
                      else status = 'at-risk';

                      allStudentPerformances.push({
                        studentId: student.studentId,
                        studentName: student.studentName,
                        rollNumber: student.rollNumber,
                        className,
                        sectionName,
                        subjectName,
                        averageScore: totalScore,
                        status
                      });

                      // Track section scores for averaging
                      const sectionKey = className;
                      if (!sectionScores[sectionKey]) {
                        sectionScores[sectionKey] = { total: 0, count: 0 };
                      }
                      sectionScores[sectionKey].total += totalScore;
                      sectionScores[sectionKey].count += 1;
                    }
                  });
                } catch (gradeError: any) {
                  const message = gradeError?.response?.data?.message;
                  if (message) {
                    toast.warning(message);
                  } else {
                    console.log('No grades found for assignment:', assignment.id);
                  }
                }
              }

              // Set student performances
              setStudentPerformance(allStudentPerformances);

              // Calculate top performers (top 5)
              const sortedByScore = [...allStudentPerformances].sort((a, b) => b.averageScore - a.averageScore);
              setTopPerformers(sortedByScore.slice(0, 5));

              // Calculate students needing improvement (bottom 5 with score < 75)
              const needsImprovementStudents = sortedByScore
                .filter(s => s.averageScore < 75)
                .slice(-5);
              setNeedsImprovement(needsImprovementStudents);

              // Calculate overall average and top section
              if (allStudentPerformances.length > 0) {
                const overallAvg = allStudentPerformances.reduce((sum, s) => sum + s.averageScore, 0) / allStudentPerformances.length;

                // Build section scores from real grades
                const realSectionScores = Object.entries(sectionScores).map(([name, data]) => ({
                  name,
                  score: Math.round(data.total / data.count)
                }));

                console.log('Real section scores:', realSectionScores);

                // Find top section
                let topSection = '';
                let highestAvg = 0;
                Object.entries(sectionScores).forEach(([section, data]) => {
                  const avg = data.total / data.count;
                  if (avg > highestAvg) {
                    highestAvg = avg;
                    topSection = section;
                  }
                });

                setPerformance({
                  averageScore: Math.round(overallAvg * 10) / 10,
                  attendancePercentage: performance?.attendancePercentage || 0,
                  topSection: topSection || 'N/A',
                  sectionScores: realSectionScores
                });
              } else {
                // No grades data - show message or empty state
                console.log('No student grades found. Please enter grades to see performance data.');
                setTopPerformers([]);
                setNeedsImprovement([]);
              }
            }
          }
        }
      } catch (perfError) {
        console.log('Could not fetch student performance data:', perfError);
      }

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDateLocal = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'overdue':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'published':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const quickActions = [
    { label: 'Create Lesson', icon: Plus, url: '/teacher/lessons/create', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Take Attendance', icon: ClipboardList, url: '/teacher/attendance', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Upload Assignment', icon: Upload, url: '/teacher/assignments', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Enter Grades', icon: PenTool, url: '/teacher/grading', color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'Send Message', icon: MessageSquare, url: '/communications', color: 'bg-cyan-600 hover:bg-cyan-700' },
  ];

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#e35336]" />
          <p className="text-gray-500 dark:text-gray-400">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Header Section */}
      <header className="bg-white dark:bg-[#1E293B] border-b border-gray-200 dark:border-[#334155] px-6 py-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-[#e35336]">
              {getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Teacher'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              Academic Year {formattedYearLabel}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Quick Actions - Always Visible */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                onClick={() => router.push(action.url)}
                className={`${action.color} text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200`}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Cards - 4 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* My Classes Card */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">My Classes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.totalSections || stats?.homeroomClasses || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sections assigned</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Students Card */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.totalStudents || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Across all classes</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Lessons Card */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Lessons</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.todayClasses || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Classes scheduled</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Tasks Card */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Tasks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.pendingTasks || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Require attention</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(stats?.pendingTasks || 0) > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <ClipboardList className={`w-6 h-6 ${(stats?.pendingTasks || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Today's Schedule - Takes 2 columns */}
          <Card className="lg:col-span-2 bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Today's Teaching Schedule
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                    {formatDateLocal(new Date())}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/teacher/timetable')}>
                  View Timetable
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingClasses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-[#334155]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade & Section</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingClasses.map((cls, index) => (
                        <tr
                          key={cls.id}
                          className="border-b border-gray-100 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.time}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${index % 2 === 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                }`}>
                                {cls.grade}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Section {cls.section}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{cls.subject}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{cls.room}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${cls.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : cls.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'} text-xs`}>
                              {cls.status === 'in-progress' ? 'In Progress' : cls.status === 'completed' ? 'Completed' : 'Upcoming'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {cls.canTakeAttendance ? (
                              <Button
                                size="sm"
                                variant={cls.status === 'completed' ? 'outline' : 'default'}
                                className={cls.status === 'completed' ? '' : 'bg-blue-600 hover:bg-blue-700'}
                                onClick={() => router.push('/teacher/attendance')}
                              >
                                {cls.status === 'completed' ? (
                                  <Eye className="w-3 h-3 mr-1" />
                                ) : (
                                  <Play className="w-3 h-3 mr-1" />
                                )}
                                {cls.status === 'completed' ? 'View' : 'Take Attendance'}
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">Teaching Class</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Snapshot */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Performance Snapshot
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Overview of your classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Average Score */}
                <div className="p-4 bg-gray-50 dark:bg-[#334155]/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Average Score</span>
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{performance?.averageScore || 0}%</p>
                </div>

                {/* Attendance Rate */}
                <div className="p-4 bg-gray-50 dark:bg-[#334155]/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</span>
                    <CalendarCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{performance?.attendancePercentage || 0}%</p>
                </div>

                {/* Top Performing Section */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-600 dark:text-blue-400">Top Section</span>
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">Grade {performance?.topSection || '-'}</p>
                </div>

                {/* Top Performers */}
                {topPerformers.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Award className="w-3 h-3 text-emerald-500" /> Top Performers
                    </p>
                    <div className="space-y-2">
                      {topPerformers.map((student, index) => (
                        <div key={student.studentId} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                              {student.studentName}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {student.averageScore}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Students Needing Improvement */}
                {needsImprovement.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500" /> Needs Support
                    </p>
                    <div className="space-y-2">
                      {needsImprovement.map((student) => (
                        <div key={student.studentId} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400">
                              !
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                              {student.studentName}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {student.averageScore}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini Progress Bars */}
                {performance?.sectionScores && performance.sectionScores.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section Performance</p>
                    {performance.sectionScores.map((section) => (
                      <div key={section.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-10">{section.name}</span>
                        <Progress value={section.score} className="flex-1 h-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">{section.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row: Recent Lessons and Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Lessons */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Recent Lessons
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Your latest created lessons
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/lessons')}>
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentLessons.length > 0 ? (
                <div className="space-y-3">
                  {recentLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#334155]/50 rounded-lg hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors cursor-pointer"
                      onClick={() => router.push(`/teacher/lessons/${lesson.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{lesson.subject} • Grade {lesson.grade}{lesson.section}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(lesson.status)} text-xs`}>
                          {lesson.status}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateLocal(lesson.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No lessons created yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push('/teacher/lessons/create')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lesson
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Overview */}
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    Assignment Overview
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Track assignments and submissions
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/assignments')}>
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#334155]/50 rounded-lg hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors cursor-pointer"
                      onClick={() => router.push('/teacher/assignments')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${assignment.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                          assignment.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                          }`}>
                          <FileText className={`w-5 h-5 ${assignment.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                            assignment.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                            }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{assignment.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{assignment.subject} • Grade {assignment.grade}{assignment.section}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(assignment.status)} text-xs mb-1`}>
                          {assignment.status}
                        </Badge>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {assignment.submissions}/{assignment.totalStudents} submitted
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No assignments yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Announcements Section */}
        <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Announcements
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Latest updates from administration
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/list/announcements')}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${announcement.isUrgent
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-[#334155]/50 border-gray-200 dark:border-[#334155]'
                      }`}
                    onClick={() => router.push(`/list/announcements/${announcement.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${announcement.isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                        <AlertCircle className={`w-4 h-4 ${announcement.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${announcement.isUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                          {announcement.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatDateLocal(announcement.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No announcements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherDashboard;
