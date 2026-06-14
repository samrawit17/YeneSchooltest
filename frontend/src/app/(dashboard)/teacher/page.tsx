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
  Loader2,
  Users,
  GraduationCap,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/hooks/useTranslations";

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

const TeacherDashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111111]">
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-16 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5">
            <Skeleton className="h-5 w-28 mb-4" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

const getGreeting = (labels: any) => {
  const hour = new Date().getHours();
  if (hour < 12) return labels.goodMorning;
  if (hour < 18) return labels.goodAfternoon;
  return labels.goodEvening;
};

const formatDateLocal = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TeacherDashboard = () => {
  const { t } = useTranslations<any>("roleDashboard");
  const { user, isAuthenticated, isLoading } = useAuth();
  const { formattedYearLabel, displayTermName, periodLabel } = useAcademicYear();
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
      toast.error(t.common.failedLoad);
    } finally {
      setLoading(false);
    }
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

  const todayCount = upcomingClasses.length;
  const lessonsCount = recentLessons.length;
  const announcementsCount = announcements.length;

  if (loading || isLoading) {
    return <TeacherDashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111111]">
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getGreeting(t.teacher)}, {user?.name ? user.name.split(' ')[0] : t.common.teacher}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t.teacher.subtitle}
            </p>
          </div>
          {displayTermName ? (
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {displayTermName}
            </div>
          ) : null}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-[var(--brand-color,#e35336)]/40 transition-colors"
            onClick={() => router.push('/teacher/timetable')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.teacher.todaysClasses}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{todayCount}</p>
                <p className="text-xs text-gray-400 mt-1">{todayCount === 1 ? t.teacher.class : t.teacher.classes} {t.teacher.scheduled}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div
            className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-[var(--brand-color,#e35336)]/40 transition-colors"
            onClick={() => router.push('/teacher/lessons')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.teacher.lessons}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{lessonsCount}</p>
                <p className="text-xs text-gray-400 mt-1">{t.teacher.recentlyCreated}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div
            className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-[var(--brand-color,#e35336)]/40 transition-colors"
            onClick={() => router.push('/teacher/attendance')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.teacher.attendance}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">
                  <ClipboardList className="w-5 h-5 inline text-emerald-500 mr-1" />
                  {t.teacher.take}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t.teacher.markAttendance}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div
            className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-[var(--brand-color,#e35336)]/40 transition-colors"
            onClick={() => router.push('/list/announcements')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.teacher.announcements}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{announcementsCount}</p>
                <p className="text-xs text-gray-400 mt-1">{t.teacher.recentUpdates}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push('/teacher/attendance')} className="gap-1.5">
            <ClipboardList className="w-4 h-4" />
            {t.teacher.takeAttendance}
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push('/teacher/grading')} className="gap-1.5">
            <PenTool className="w-4 h-4" />
            {t.teacher.enterMarks}
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push('/list/communications')} className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            {t.teacher.messages}
          </Button>
        </div>

        {/* Today's Schedule + Recent Lessons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t.teacher.todaysSchedule}</h3>
                <p className="text-xs text-gray-500">{formatDateLocal(new Date())}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/timetable')}>
                {t.teacher.viewTimetable}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {upcomingClasses.length > 0 ? (
              <div className="space-y-2">
                {upcomingClasses.slice(0, 5).map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#2A2A2A]/30 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {cls.subject}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {cls.time} &middot; {t.common.grade} {cls.grade} &middot; {t.common.section} {cls.section} &middot; {cls.room}
                        </p>
                      </div>
                    </div>
                    {cls.canTakeAttendance && (
                      <Button
                        size="sm"
                        variant={cls.status === 'completed' ? 'outline' : 'default'}
                        className={cls.status === 'completed' ? 'shrink-0' : 'shrink-0 bg-[var(--brand-color,#e35336)] hover:opacity-90'}
                        onClick={() => router.push('/teacher/attendance')}
                      >
                        {cls.status === 'completed' ? <Eye className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                        {cls.status === 'completed' ? t.teacher.view : t.teacher.lessonAttendance}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500">{t.teacher.noClassesToday}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t.teacher.recentLessons}</h3>
                  <p className="text-xs text-gray-500">{t.teacher.latestLessons}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/lessons')}>
                  {t.common.viewAll}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              {recentLessons.length > 0 ? (
                <div className="space-y-2">
                  {recentLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#2A2A2A]/30 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/teacher/lessons/${lesson.id}`)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lesson.title}</p>
                        <p className="text-xs text-gray-500 truncate">{lesson.subject} &middot; {t.common.grade} {lesson.grade}{lesson.section}</p>
                      </div>
                      <Badge className={`${getStatusColor(lesson.status)} text-[10px] shrink-0`}>
                        {lesson.status === "published" ? t.teacher.published : t.teacher.draft}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500">{t.teacher.noLessons}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/teacher/lessons')}>
                    <Plus className="w-3 h-3 mr-1" />
                    {t.teacher.createLesson}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t.teacher.announcements}</h3>
              <p className="text-xs text-gray-500">{t.teacher.latestAdminUpdates}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/list/announcements')}>
              {t.common.viewAll}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {announcements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-xl border transition-all hover:border-[var(--brand-color,#e35336)]/30 cursor-pointer ${
                    announcement.isUrgent
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-[#2A2A2A]/30 border-gray-200 dark:border-[#2A2A2A]'
                  }`}
                  onClick={() => router.push(`/list/announcements/${announcement.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${announcement.isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-[#2A2A2A]'}`}>
                      <AlertCircle className={`w-4 h-4 ${announcement.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <TranslatedText
                        as="h4"
                        text={announcement.title}
                        textClassName={`text-sm font-semibold ${announcement.isUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}
                        showControls={false}
                      />
                      <TranslatedText
                        text={announcement.content}
                        textClassName="text-xs text-gray-600 dark:text-gray-400 line-clamp-2"
                        className="mt-1"
                        showControls={false}
                      />
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatDateLocal(announcement.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500">{t.common.noAnnouncements}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherDashboard;
