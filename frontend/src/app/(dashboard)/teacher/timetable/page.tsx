"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { schoolSettingsAPI, timetableSlotsAPI } from "@/lib/api";
import { syncService } from "@/lib/db/sync-service";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";

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
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#e35336]" />
          <p className="text-gray-500 dark:text-gray-400">Loading timetable...</p>
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[rgba(var(--brand-color-rgb),0.14)] bg-[rgba(var(--brand-color-rgb),0.08)] text-[10px] text-[var(--brand-color,#e35336)] sm:text-xs">
                School hours {schoolStartTime} - {schoolEndTime}
              </Badge>

            </div>
          </div>
        </div>
      </div>



      {/* Mobile Day Agenda */}
      <Card className="overflow-hidden border-none bg-transparent shadow-none lg:hidden">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold dark:text-white">
            <Clock className="h-5 w-5 text-[#e35336]" />
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
                    ? "border-[#e35336] bg-[#e35336] text-white shadow-lg shadow-[#e35336]/20"
                    : "border-gray-200 bg-white text-slate-700 hover:border-[#e35336]/50 dark:border-[#334155] dark:bg-[#1E293B] dark:text-gray-300"
                }`}
              >
                <span className={`text-xs font-medium ${isActive ? "text-white/80" : "text-slate-500 dark:text-gray-400"}`}>
                  {day.name.slice(0, 3)}
                </span>
                <span className="text-sm font-bold">{day.name}</span>
                <span className={`mt-1 text-[10px] ${isActive ? "text-white/90" : "text-[#e35336]"}`}>
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
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#e35336]/30 hover:shadow-md dark:border-[#334155] dark:bg-[#1E293B]"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#e35336]" />
                      <h3 className="font-bold text-slate-900 dark:text-white">{slot.subject?.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      Class {slot.class?.name} • Section {slot.section?.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-[#e35336]/20 bg-[#e35336]/5 text-[#e35336]">
                    {slot.startTime}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4 dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 dark:text-gray-300">
                      {slot.startTime} - {slot.endTime}
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
                    className="mt-4 w-full rounded-xl bg-[#e35336] text-white hover:bg-[#c24128]"
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
              <Calendar className="h-5 w-5 text-[#e35336]" />
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#e35336]/10 hover:text-[#e35336]" onClick={handlePreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium dark:text-white sm:text-sm">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                {new Date(currentWeekStart.getTime() + 4 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: !isToday(new Date(currentWeekStart.getTime() + 4 * 86400000)) ? 'numeric' : undefined })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#e35336]/10 hover:text-[#e35336]" onClick={handleNextWeek}>
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
                          ? 'bg-[#e35336]/5 text-[#e35336]' 
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
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{slot.start} - {slot.end}</div>
                    </td>
                    
                    {weekdays.map((day) => {
                      const classForSlot = getSlotForTime(day.value, slot.start, slot.end);
                      const isToday = day.value === todayDayOfWeek;

                      return (
                        <td 
                          key={`${day.value}-${slot.start}-${slot.end}`}
                          className={`p-2 transition-colors ${todayIsWeekday && isToday ? 'bg-[#e35336]/5' : ''}`}
                        >
                          {classForSlot ? (
                            <div className="h-full rounded-xl border border-[#e35336]/10 bg-white p-3 shadow-sm transition-all hover:border-[#e35336]/30 hover:shadow-md dark:bg-[#0F172A]">
                              <p className="line-clamp-1 text-xs font-bold text-[#e35336]">
                                {classForSlot.class?.name}
                              </p>
                              <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                {classForSlot.subject?.name}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
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

      {/* Today's Schedule (Desktop/Mobile hybrid) */}
      <Card className="overflow-hidden border-none bg-white p-4 shadow-sm dark:bg-[#1E293B] sm:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold dark:text-white sm:text-xl">
              <Sparkles className="h-5 w-5 text-[#e35336]" />
              Today's Classes
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {todayIsWeekday && getTimetableForDay(todayDayOfWeek).length > 0 ? (
            getTimetableForDay(todayDayOfWeek).map((slot) => (
              <div 
                key={slot.id}
                className="group relative flex flex-col gap-4 rounded-2xl border border-gray-100 bg-slate-50/50 p-4 transition-all hover:border-[#e35336]/30 hover:bg-white hover:shadow-md dark:border-[#334155] dark:bg-[#0F172A]/50 dark:hover:bg-[#0F172A] sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4 sm:w-24 sm:flex-col sm:gap-1">
                  <Badge variant="outline" className="border-[#e35336]/20 bg-[#e35336]/5 text-[#e35336] sm:w-full sm:justify-center">
                    {slot.startTime}
                  </Badge>
                  <span className="text-[10px] font-medium text-slate-400 sm:text-center">to {slot.endTime}</span>
                </div>

                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {slot.subject?.name} • Class {slot.class?.name}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#e35336]" />
                      Room {slot.room || 'TBD'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#e35336]" />
                      Section {slot.section?.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  {canTakeAttendance(slot) && (
                    <Button
                      size="sm"
                      className="rounded-xl bg-[#e35336] text-white hover:bg-[#c24128]"
                      onClick={() => router.push('/teacher/attendance')}
                    >
                      Attendance
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-slate-200 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-500">
                {todayIsWeekday ? "No classes scheduled for today" : "Happy weekend! No classes scheduled."}
              </p>
            </div>
          )}
        </div>
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
