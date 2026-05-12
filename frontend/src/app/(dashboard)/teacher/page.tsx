"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { attendanceAPI } from "@/lib/api";
import { announcementsAPI, lessonsAPI } from "@/lib/api/content";
import {
  BookOpen,
  ClipboardList,
  Calendar,
  Clock,
  AlertCircle,
  Bell,
  ChevronRight,
  Play,
  PenTool,
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

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isUrgent: boolean;
  priority: 'high' | 'medium' | 'low';
}

const TeacherDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { formattedYearLabel } = useAcademicYear();
  const router = useRouter();
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

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
        const announcementsResponse = await announcementsAPI.getAll(
          { role: 'teacher' },
          { skipAuthErrorRedirect: true }
        );
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
        console.log('Teacher announcements unavailable');
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
    { label: 'Enter Grades', icon: PenTool, url: '/teacher/grading', color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'Messages', icon: MessageSquare, url: '/list/communications', color: 'bg-cyan-600 hover:bg-cyan-700' },
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

      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        {/* Quick Actions - Always Visible */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                onClick={() => router.push(action.url)}
                className={`${action.color} h-10 justify-start rounded-lg text-white shadow-sm transition-all duration-200 hover:shadow-md sm:justify-center`}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
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
                <div className="space-y-2">
                  {upcomingClasses.slice(0, 5).map((cls) => (
                    <div key={cls.id} className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-[#334155] dark:bg-[#0F172A] sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {cls.time} · {cls.subject}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Grade {cls.grade} Section {cls.section} · {cls.room}
                        </p>
                      </div>
                      {cls.canTakeAttendance && (
                        <Button
                          size="sm"
                          variant={cls.status === 'completed' ? 'outline' : 'default'}
                          className={cls.status === 'completed' ? 'w-full sm:w-auto' : 'w-full bg-blue-600 hover:bg-blue-700 sm:w-auto'}
                          onClick={() => router.push('/teacher/attendance')}
                        >
                          {cls.status === 'completed' ? <Eye className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          {cls.status === 'completed' ? 'View' : 'Attendance'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>

        {/* Announcements Section */}
        <Card className="mt-6 bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] shadow-sm">
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
