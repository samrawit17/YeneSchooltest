"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { schoolSettingsAPI, timetableSlotsAPI } from "@/lib/api";
import { syncService } from "@/lib/db/sync-service";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSchoolTimeBounds,
  getUniqueSlotRanges,
  SCHOOL_WEEK_DAYS,
  toMinutes,
} from "@/lib/timetable";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  class: {
    id: string;
    name: string;
    grade: number;
    homeroomTeacherId?: string | null;
  };
  section: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
    code?: string;
  };
}

const TeacherTimetablePage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { schoolCalendarType, formatDate } = useAcademicYear();
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const [timetable, setTimetable] = useState<TimeSlot[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(1);

  const weekdays = SCHOOL_WEEK_DAYS;
  const teachingSlots = timetable
    .filter((slot) => slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5)
    .sort((a, b) =>
      a.dayOfWeek === b.dayOfWeek
        ? a.startTime.localeCompare(b.startTime)
        : a.dayOfWeek - b.dayOfWeek,
    );
  const uniqueSlotRanges = getUniqueSlotRanges(teachingSlots).map((slot, index) => ({
    ...slot,
    label: `Period ${index + 1}`,
  }));
  const { startTime: schoolStartTime, endTime: schoolEndTime } = getSchoolTimeBounds(schoolSettings);
  const formatSlotTime = (time?: string) =>
    formatTimeByCalendarType(time, schoolCalendarType, { includePeriodName: true });
  const formatTimeRange = (start?: string, end?: string) =>
    `${formatSlotTime(start)} - ${formatSlotTime(end)}`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "My Timetable", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      // Use the teacher-specific endpoint
      const [timetableResponse, schoolSettingsResponse] = await Promise.all([
        timetableSlotsAPI.getByTeacher(user?.id || ''),
        user?.schoolId ? schoolSettingsAPI.getAll(user.schoolId) : Promise.resolve({ data: {} }),
      ]);
      setTimetable(timetableResponse.data || []);
      setSchoolSettings(schoolSettingsResponse.data || {});
      await syncService.cacheTeacherTimetable(
        user?.id || '',
        timetableResponse.data || [],
        schoolSettingsResponse.data || {},
      );
    } catch (error: any) {
      console.error('Failed to fetch timetable:', error);
      const cached = user?.id ? await syncService.getCachedTeacherTimetable(user.id) : null;
      if (cached) {
        setTimetable((cached.slots || []) as unknown as TimeSlot[]);
        setSchoolSettings(cached.schoolSettings || {});
        toast.info('Loaded cached timetable from this device');
      } else {
        toast.error('Failed to load timetable');
        setTimetable([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.schoolId]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.id) {
      fetchTimetable();
    }
  }, [fetchTimetable, isAuthenticated, isLoading, user?.id]);

  const getTimetableForDay = (dayValue: number) => {
    const daySlots = teachingSlots.filter(slot => slot.dayOfWeek === dayValue);
    return daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getSlotForTime = (dayValue: number, startTime: string, endTime: string) => {
    return teachingSlots.find(
      slot => slot.dayOfWeek === dayValue && slot.startTime === startTime && slot.endTime === endTime
    );
  };

  const canTakeAttendance = (slot: TimeSlot) =>
    slot.class?.homeroomTeacherId === user?.id;

  const today = new Date().getDay();
  const todayDayOfWeek = today >= 1 && today <= 5 ? today : 1;
  const todayIsWeekday = today >= 1 && today <= 5;
  const selectedMobileSlots = getTimetableForDay(selectedMobileDay);
  const totalTeachingMinutes = teachingSlots.reduce(
    (sum, slot) => sum + Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime)),
    0,
  );
  const nextUpcomingSlot =
    todayIsWeekday
      ? getTimetableForDay(todayDayOfWeek).find((slot) => toMinutes(slot.endTime) >= toMinutes(new Date().toTimeString().slice(0, 5))) || null
      : null;

  useEffect(() => {
    if (todayIsWeekday) {
      setSelectedMobileDay(todayDayOfWeek);
    }
  }, [todayDayOfWeek, todayIsWeekday]);

  if (loading || isLoading) {
    return (
      <div className="w-full max-w-full space-y-4 bg-[#F8FAFC] p-3 dark:bg-[#0F172A] sm:p-4 md:space-y-6 md:p-6 overflow-x-hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#334155] dark:bg-[#111827] sm:rounded-3xl">
          <div className="p-4 sm:p-6 space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-[100px] shrink-0 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="hidden lg:block rounded-xl border border-slate-200 dark:border-[#334155] overflow-hidden">
          <div className="border-b dark:border-[#334155] p-6 space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 dark:bg-[#1E293B] sm:p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full max-w-full space-y-4 bg-[#F8FAFC] p-3 dark:bg-[#0F172A] sm:p-4 md:space-y-6 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(var(--brand-color-rgb),0.12)] bg-white shadow-sm dark:border-[#334155] dark:bg-[#111827] sm:rounded-3xl">
        <div className="p-4 sm:p-6">
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
                My Timetable
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Clean daily teaching view for phone use, with a full weekly grid available on larger screens.
              </p>
            </div>

          </div>
        </div>
      </div>



      {/* Mobile Day Agenda */}
      <Card className="overflow-hidden border-none bg-transparent shadow-none lg:hidden">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold dark:text-white">
            <Clock className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
            Daily Agenda
          </h2>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {weekdays.map((day) => {
            const isActive = selectedMobileDay === day.value;
            const count = getTimetableForDay(day.value).length;
            return (
              <button
                key={day.value}
                onClick={() => setSelectedMobileDay(day.value)}
                className={`flex min-w-[100px] flex-col rounded-2xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-[var(--brand-color,#e35336)] bg-[var(--brand-color,#e35336)] text-white shadow-lg shadow-[rgba(var(--brand-color-rgb),0.2)]"
                    : "border-gray-200 bg-white text-slate-700 hover:border-[rgba(var(--brand-color-rgb),0.5)] dark:border-[#334155] dark:bg-[#1E293B] dark:text-gray-300"
                }`}
              >
                <span className={`text-xs font-medium ${isActive ? "text-white/80" : "text-slate-500 dark:text-gray-400"}`}>
                  {day.name.slice(0, 3)}
                </span>
                <span className="text-sm font-bold">{day.name}</span>
                <span className={`mt-1 text-[10px] ${isActive ? "text-white/90" : "text-[var(--brand-color,#e35336)]"}`}>
                  {count} {count === 1 ? 'Class' : 'Classes'}
                </span>
              </button>
            );
          })}
        </div>

        {selectedMobileSlots.length > 0 ? (
          <div className="space-y-3">
            {selectedMobileSlots.map((slot) => (
              <div
                key={slot.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[rgba(var(--brand-color-rgb),0.3)] hover:shadow-md dark:border-[#334155] dark:bg-[#1E293B]"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-color,#e35336)]" />
                      <h3 className="font-bold text-slate-900 dark:text-white">{slot.subject?.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      Class {slot.class?.name} • Section {slot.section?.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-[rgba(var(--brand-color-rgb),0.2)] bg-[rgba(var(--brand-color-rgb),0.05)] text-[var(--brand-color,#e35336)]">
                    {formatSlotTime(slot.startTime)}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4 dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 dark:text-gray-300">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 dark:text-gray-300">
                      Room {slot.room || "TBD"}
                    </span>
                  </div>
                </div>

                {canTakeAttendance(slot) && (
                  <Button
                    size="sm"
                    className="mt-4 w-full rounded-xl bg-[var(--brand-color,#e35336)] text-white hover:brightness-75"
                    onClick={() => router.push('/teacher/attendance')}
                  >
                    Take Attendance
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center dark:border-[#334155] dark:bg-[#1E293B]/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-[#1E293B]">
              <Calendar className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
              No classes scheduled for {weekdays.find((day) => day.value === selectedMobileDay)?.name}
            </p>
          </div>
        )}
      </Card>

      {/* Weekly Timetable Grid */}
      <Card className="hidden overflow-hidden dark:bg-[#1E293B] dark:border-[#334155] lg:block">
        <CardHeader className="border-b dark:border-[#334155]">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl dark:text-white">
              <Calendar className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[rgba(var(--brand-color-rgb),0.1)] hover:text-[var(--brand-color,#e35336)]" onClick={handlePreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium dark:text-white sm:text-sm">
                {formatDate(currentWeekStart)} - {formatDate(new Date(currentWeekStart.getTime() + 4 * 86400000))}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[rgba(var(--brand-color-rgb),0.1)] hover:text-[var(--brand-color,#e35336)]" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>Full overview of your teaching week</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0F172A]">
                  <th className="sticky left-0 z-10 bg-slate-50 p-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-[#0F172A] dark:text-slate-400">
                    Time
                  </th>
                  {weekdays.map((day) => (
                    <th 
                      key={day.value}
                      className={`min-w-[150px] p-4 text-center text-xs font-bold uppercase tracking-wider ${
                        todayIsWeekday && day.value === todayDayOfWeek 
                          ? 'bg-[rgba(var(--brand-color-rgb),0.05)] text-[var(--brand-color,#e35336)]' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {uniqueSlotRanges.map((slot) => (
                  <tr key={`${slot.start}-${slot.end}`} className="group hover:bg-slate-50/50 dark:hover:bg-[#0F172A]/50">
                    <td className="sticky left-0 z-10 bg-white p-4 dark:bg-[#1E293B]">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{slot.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{formatTimeRange(slot.start, slot.end)}</div>
                    </td>
                    
                    {weekdays.map((day) => {
                      const classForSlot = getSlotForTime(day.value, slot.start, slot.end);
                      const isToday = day.value === todayDayOfWeek;

                      return (
                        <td 
                          key={`${day.value}-${slot.start}-${slot.end}`}
                          className={`p-2 transition-colors ${todayIsWeekday && isToday ? 'bg-[rgba(var(--brand-color-rgb),0.05)]' : ''}`}
                        >
                          {classForSlot ? (
                            <div className="h-full rounded-xl border border-[rgba(var(--brand-color-rgb),0.1)] bg-white p-3 shadow-sm transition-all hover:border-[rgba(var(--brand-color-rgb),0.3)] hover:shadow-md dark:bg-[#0F172A]">
                              <p className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">
                                {classForSlot.class?.name}
                              </p>
                              <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {classForSlot.subject?.name}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <MapPin className="h-3 w-3" />
                                {classForSlot.room || 'TBD'}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full min-h-[80px] rounded-xl border border-dashed border-gray-100 dark:border-[#334155]/50" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


    </div>
  );
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export default TeacherTimetablePage;
