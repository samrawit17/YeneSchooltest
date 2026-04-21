"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { schoolSettingsAPI, timetableSlotsAPI } from "@/lib/api";
import {
  getSchoolTimeBounds,
  getSlotRanges,
  getUniqueSlotRanges,
  SCHOOL_WEEK_DAYS,
  toMinutes,
} from "@/lib/timetable";
import { BookOpen, Calendar, Clock, MapPin, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  section?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  teacher?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface ClassProgramViewProps {
  schoolId?: string;
  classId?: string;
  sectionId?: string;
  ownerName: string;
  subtitle: string;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
}

export default function ClassProgramView({
  schoolId,
  classId,
  sectionId,
  ownerName,
  subtitle,
  title,
  emptyTitle,
  emptyDescription,
}: ClassProgramViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, any>>({});
  const [slots, setSlots] = useState<TimetableSlot[]>([]);

  const { startTime: schoolStartTime, endTime: schoolEndTime } = getSchoolTimeBounds(schoolSettings);
  const weekdaySlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5)
        .sort((a, b) =>
          a.dayOfWeek === b.dayOfWeek
            ? a.startTime.localeCompare(b.startTime)
            : a.dayOfWeek - b.dayOfWeek,
        ),
    [slots],
  );

  const slotRanges = useMemo(() => {
    const uniqueRanges = getUniqueSlotRanges(weekdaySlots);
    if (uniqueRanges.length > 0) {
      return uniqueRanges.map((range, index) => ({
        ...range,
        label: `Period ${index + 1}`,
      }));
    }

    return getSlotRanges(schoolStartTime, schoolEndTime);
  }, [schoolEndTime, schoolStartTime, weekdaySlots]);

  const loadProgram = useCallback(async (isRefresh = false) => {
    if (!schoolId || !classId) {
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [settingsResponse, timetableResponse] = await Promise.all([
        schoolSettingsAPI.getAll(schoolId),
        timetableSlotsAPI.getGrid(classId, sectionId),
      ]);

      setSchoolSettings(settingsResponse.data || {});
      setSlots(timetableResponse.data?.slots || []);
    } catch (error: any) {
      console.error("Failed to load class program:", error);
      toast.error(error.response?.data?.message || "Failed to load class program");
      setSlots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, schoolId, sectionId]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const totalTeachingMinutes = weekdaySlots.reduce(
    (sum, slot) => sum + Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime)),
    0,
  );

  const today = new Date().getDay();
  const todayIsWeekday = today >= 1 && today <= 5;
  const todayDayOfWeek = todayIsWeekday ? today : null;
  const todayClasses = todayDayOfWeek
    ? weekdaySlots.filter((slot) => slot.dayOfWeek === todayDayOfWeek)
    : [];

  const getSlotForRange = (dayOfWeek: number, startTime: string, endTime: string) =>
    weekdaySlots.find(
      (slot) =>
        slot.dayOfWeek === dayOfWeek &&
        slot.startTime === startTime &&
        slot.endTime === endTime,
    );

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900">{emptyTitle}</h2>
            <p className="mt-2 text-sm text-gray-500">{emptyDescription}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Card className="border-0 shadow-sm bg-white dark:bg-[#1E293B]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {subtitle}
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{ownerName}</Badge>
              <Badge variant="outline">
                School hours {schoolStartTime} - {schoolEndTime}
              </Badge>
              <Badge variant="outline">Monday to Friday</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={() => loadProgram(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Classes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{weekdaySlots.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Study Hours</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{(totalTeachingMinutes / 60).toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Days</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {new Set(weekdaySlots.map((slot) => slot.dayOfWeek)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <UserRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Teachers</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {new Set(weekdaySlots.map((slot) => slot.teacher?.id).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden dark:bg-[#1E293B] dark:border-[#334155]">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Weekly Class Program</CardTitle>
          <CardDescription>
            This timetable reflects the assigned class program for the current class and section.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {weekdaySlots.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No timetable has been published for this class yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1E293B]">
                    <th className="w-24 border-b border-r px-2 py-4 text-center text-sm font-semibold text-gray-500 dark:border-[#334155] dark:text-gray-400">
                      Time
                    </th>
                    {SCHOOL_WEEK_DAYS.map((day) => (
                      <th
                        key={day.value}
                        className={`border-b border-r py-4 text-center text-sm font-semibold last:border-r-0 dark:border-[#334155] ${
                          todayIsWeekday && day.value === todayDayOfWeek
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <div>{day.name}</div>
                        {todayIsWeekday && day.value === todayDayOfWeek && (
                          <Badge className="mt-1 bg-blue-600 text-white">Today</Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="dark:bg-[#0F172A]">
                  {slotRanges.map((range) => (
                    <tr key={`${range.start}-${range.end}`}>
                      <td className="border-b border-r bg-gray-50 px-2 py-2 text-center text-xs text-gray-500 dark:border-[#334155] dark:bg-[#1E293B] dark:text-gray-400">
                        <div className="font-medium">{range.label}</div>
                        <div>{range.start} - {range.end}</div>
                      </td>
                      {SCHOOL_WEEK_DAYS.map((day) => {
                        const slot = getSlotForRange(day.value, range.start, range.end);
                        const isToday = todayIsWeekday && day.value === todayDayOfWeek;

                        return (
                          <td
                            key={`${day.value}-${range.start}`}
                            className={`min-h-[88px] border-b border-r px-1 py-2 align-top last:border-r-0 dark:border-[#334155] ${
                              isToday ? "bg-blue-50/60 dark:bg-blue-900/20" : ""
                            }`}
                          >
                            {slot ? (
                              <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-[#111827] dark:ring-[#334155]">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {slot.subject?.name || "Subject"}
                                </p>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                  {slot.teacher?.name || "Teacher pending"}
                                </p>
                                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <MapPin className="h-3 w-3" />
                                  {slot.room || "Room not set"}
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
          )}
        </CardContent>
      </Card>

      <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Today&apos;s Classes</CardTitle>
          <CardDescription>
            {todayIsWeekday
              ? "Today’s learning plan based on the published timetable."
              : "Weekend days do not display class sessions."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!todayIsWeekday || todayClasses.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <Calendar className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>{todayIsWeekday ? "No classes scheduled for today." : "No classes scheduled on weekends."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center dark:border-[#334155] dark:bg-[#111827]"
                >
                  <div className="min-w-[110px]">
                    <Badge variant="outline">
                      {slot.startTime} - {slot.endTime}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {slot.subject?.name || "Subject"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {slot.teacher?.name || "Teacher pending"} • {slot.room || "Room not set"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
