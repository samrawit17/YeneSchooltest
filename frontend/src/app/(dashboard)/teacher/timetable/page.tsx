"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { schoolSettingsAPI, timetableSlotsAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Loader2,
  Users
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
    } catch (error: any) {
      console.error('Failed to fetch timetable:', error);
      toast.error('Failed to load timetable');
      setTimetable([]);
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Implementation for downloading timetable as CSV
    const headers = ['Day', 'Start Time', 'End Time', 'Class', 'Section', 'Subject', 'Room'];
    const rows = teachingSlots.map(slot => [
      weekdays.find(d => d.value === slot.dayOfWeek)?.name || '',
      slot.startTime,
      slot.endTime,
      slot.class?.name || '',
      slot.section?.name || '',
      slot.subject?.name || '',
      slot.room || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Timetable downloaded successfully');
  };

  const getSlotForTime = (dayValue: number, startTime: string, endTime: string) => {
    return teachingSlots.find(
      slot => slot.dayOfWeek === dayValue && slot.startTime === startTime && slot.endTime === endTime
    );
  };

  const canTakeAttendance = (slot: TimeSlot) =>
    slot.class?.homeroomTeacherId === user?.id;

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

  const today = new Date().getDay();
  const todayDayOfWeek = today >= 1 && today <= 5 ? today : 1;
  const todayIsWeekday = today >= 1 && today <= 5;
  const totalTeachingMinutes = teachingSlots.reduce(
    (sum, slot) => sum + Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime)),
    0,
  );

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">My Timetable</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 hidden sm:block">
            Professional weekly view for school hours {schoolStartTime} to {schoolEndTime}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2 bg-white dark:bg-[#1E293B] rounded-lg border border-gray-200 dark:border-[#334155] px-2 md:px-4 py-1.5 md:py-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 hover:bg-[#e35336]/10 hover:text-[#e35336] transition-colors" onClick={handlePreviousWeek}>
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
            <span className="text-xs md:text-sm font-medium dark:text-white whitespace-nowrap">
              {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
              {new Date(currentWeekStart.getTime() + 4 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 hover:bg-[#e35336]/10 hover:text-[#e35336] transition-colors" onClick={handleNextWeek}>
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="dark:border-[#334155] dark:text-white hover:bg-[#e35336] hover:text-white hover:border-[#e35336] dark:hover:bg-[#e35336] transition-colors" onClick={handleDownload}>
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
 
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#e35336]/10 dark:bg-[#e35336]/20 rounded-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-[#e35336]" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Classes</p>
                <p className="text-lg md:text-xl font-bold">{teachingSlots.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Teaching Hours</p>
                <p className="text-lg md:text-xl font-bold">{(totalTeachingMinutes / 60).toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Working Days</p>
                <p className="text-lg md:text-xl font-bold">{new Set(teachingSlots.map(t => t.dayOfWeek)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Rooms Used</p>
                <p className="text-lg md:text-xl font-bold">{new Set(timetable.map(t => t.room).filter(Boolean)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Timetable Grid */}
      <Card className="overflow-hidden dark:bg-[#1E293B] dark:border-[#334155]">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl dark:text-white">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#e35336]" />
            Weekly Schedule
          </CardTitle>
          <CardDescription className="text-xs md:text-sm dark:text-gray-400">Your classes for the week</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] md:min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1E293B]">
                  <th className="py-2 md:py-4 px-1 md:px-2 text-center font-semibold text-xs md:text-sm text-gray-500 dark:text-gray-400 border-b border-r dark:border-[#334155] w-16 md:w-24">
                    Time
                  </th>
                  {weekdays.map((day) => (
                    <th 
                      key={day.value}
                      className={`py-2 md:py-4 text-center font-semibold text-xs md:text-sm border-b border-r last:border-r-0 ${
                        todayIsWeekday && day.value === todayDayOfWeek ? 'bg-[#e35336]/10 text-[#e35336] dark:bg-[#e35336]/20' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <div className="hidden sm:block">{day.name}</div>
                      <div className="sm:hidden">{day.name.slice(0, 3)}</div>
                      {todayIsWeekday && day.value === todayDayOfWeek && (
                        <Badge variant="default" className="mt-1 text-xs bg-[#e35336] hover:bg-[#c24128] text-white border-none">Today</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="dark:bg-[#0F172A]">
                {uniqueSlotRanges.map((slot) => (
                  <tr key={`${slot.start}-${slot.end}`}>
                    {/* Time Column */}
                    <td className="py-1.5 md:py-2 px-1 md:px-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1E293B] border-b border-r dark:border-[#334155] text-center">
                      <div className="font-medium text-xs md:text-sm">{slot.label}</div>
                      <div className="hidden sm:block">{slot.start} - {slot.end}</div>
                    </td>
                    
                    {/* Day Columns */}
                    {weekdays.map((day) => {
                      const classForSlot = getSlotForTime(day.value, slot.start, slot.end);
                      const isToday = day.value === todayDayOfWeek;

                      return (
                        <td 
                          key={`${day.value}-${slot.start}-${slot.end}`}
                          className={`py-1 md:py-2 px-0.5 md:px-1 border-b border-r dark:border-[#334155] last:border-r-0 min-h-[60px] md:min-h-[80px] ${
                            todayIsWeekday && isToday ? 'bg-[#e35336]/5 dark:bg-[#e35336]/10' : ''
                          }`}
                        >
                          {classForSlot ? (
                            <div className="h-full border border-transparent bg-[#e35336]/10 dark:bg-[#e35336]/20 rounded-md md:rounded-lg p-1 md:p-2 hover:bg-[#e35336]/20 dark:hover:bg-[#e35336]/30 hover:border-[#e35336]/30 transition-all cursor-pointer">
                              <p className="font-semibold text-xs md:text-sm text-[#e35336] line-clamp-2">
                                {classForSlot.class?.name || 'Class'}
                              </p>
                              <p className="text-xs text-[#e35336]/80 dark:text-[#e35336]/90 line-clamp-1 hidden sm:block">
                                {classForSlot.subject?.name || 'Subject'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5 md:gap-1 mt-0.5 md:mt-1">
                                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                <span className="hidden sm:inline">{classForSlot.room || 'TBD'}</span>
                                <span className="sm:hidden">{classForSlot.room?.slice(0, 3) || 'TBD'}</span>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5 md:gap-1 hidden md:block">
                                <Users className="w-3 h-3" />
                                {classForSlot.section?.name || 'Section'}
                              </p>
                            </div>
                          ) : null}
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

      {/* Today's Schedule */}
      <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl dark:text-white">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#e35336]" />
            Today's Schedule
          </CardTitle>
          <CardDescription className="text-xs md:text-sm dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:gap-4">
            {todayIsWeekday && getTimetableForDay(todayDayOfWeek).length > 0 ? (
              getTimetableForDay(todayDayOfWeek).map((slot) => (
                <div 
                  key={slot.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 p-2 md:p-4 bg-gray-50 dark:bg-[#0F172A] rounded-lg md:rounded-xl hover:bg-gray-100 dark:hover:bg-[#1E293B] transition-colors"
                >
                  <div className="w-full sm:w-20 text-center sm:text-left">
                    <Badge variant="outline" className="text-xs md:text-sm">
                      {slot.startTime}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base truncate">
                      {slot.subject?.name || 'Subject'} - Class {slot.class?.name || ''}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      {slot.room || 'TBD'} • Section {slot.section?.name || ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-xs md:text-sm text-gray-500">
                      {slot.endTime}
                    </span>
                    {canTakeAttendance(slot) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs hover:bg-[#e35336] hover:text-white hover:border-[#e35336] transition-colors"
                        onClick={() => router.push('/teacher/attendance')}
                      >
                        <span className="hidden sm:inline">Take Attendance</span>
                        <span className="sm:hidden">Attendance</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 opacity-30" />
                <p className="text-sm md:text-base">{todayIsWeekday ? "No classes scheduled for today" : "No classes scheduled on weekends"}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

     
    </div>
  );
};

export default TeacherTimetablePage;
