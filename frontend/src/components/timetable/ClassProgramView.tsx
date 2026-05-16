"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAcademicYear } from "@/context/AcademicYearContext";
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
  SCHOOL_WEEK_DAYS,
  toMinutes,
} from "@/lib/timetable";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
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

function ClassSlotCard({
  slot,
  timeLabel,
  periodLabel,
}: {
  slot: TimetableSlot;
  timeLabel: string;
  periodLabel: string;
}) {
  const subjectCode = slot.subject?.code ? ` (${slot.subject.code})` : "";

  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:border-[rgba(var(--brand-color-rgb),0.28)] hover:bg-white dark:border-[#334155] dark:bg-[#0F172A] dark:hover:bg-[#111827]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge variant="outline" className="mb-2 h-5 px-1.5 text-[10px] font-semibold">
            {periodLabel}
          </Badge>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {slot.subject?.name || "Subject"}
            {subjectCode}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--brand-color,#e35336)]">
            <Clock className="h-3 w-3" />
            {timeLabel}
          </p>
        </div>
        <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        <p className="flex min-w-0 items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{slot.teacher?.name || "Teacher pending"}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{slot.room || "Room not set"}</span>
        </p>
      </div>
    </article>
  );
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
  const { schoolCalendarType } = useAcademicYear();
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

  const displayDays = useMemo(
    () => [
      ...SCHOOL_WEEK_DAYS,
      { value: 6, name: "Saturday", shortName: "Sat" },
      { value: 7, name: "Sunday", shortName: "Sun" },
    ],
    [],
  );

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

  const periodLabelByTime = useMemo(() => {
    const uniqueRanges = Array.from(
      new Set(
        weekdaySlots
          .map((slot) => `${slot.startTime}-${slot.endTime}`)
          .filter(Boolean),
      ),
    ).sort((a, b) => {
      const [aStart] = a.split("-");
      const [bStart] = b.split("-");
      return aStart.localeCompare(bStart);
    });

    return uniqueRanges.reduce<Record<string, string>>((acc, range, index) => {
      acc[range] = `Period ${index + 1}`;
      return acc;
    }, {});
  }, [weekdaySlots]);

  const getPeriodLabel = (slot: TimetableSlot, fallbackIndex?: number) =>
    periodLabelByTime[`${slot.startTime}-${slot.endTime}`] ||
    `Period ${(fallbackIndex ?? 0) + 1}`;

  const getSlotsForDay = (dayOfWeek: number) =>
    slots
      .filter((slot) => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const formatSlotTime = (startTime: string, endTime: string) =>
    `${formatTimeByCalendarType(startTime, schoolCalendarType)} - ${formatTimeByCalendarType(endTime, schoolCalendarType)}`;

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
                School hours {formatSlotTime(schoolStartTime, schoolEndTime)}
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
            <div className="space-y-4 p-4">
              {todayClasses.length > 0 && (
                <div className="rounded-lg border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.06)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--brand-color,#e35336)]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s Classes</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {todayClasses.map((slot, index) => (
                      <ClassSlotCard
                        key={slot.id}
                        slot={slot}
                        periodLabel={getPeriodLabel(slot, index)}
                        timeLabel={formatSlotTime(slot.startTime, slot.endTime)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-7">
                {displayDays.map((day) => {
                  const daySlots = getSlotsForDay(day.value);
                  const isToday = todayIsWeekday && day.value === todayDayOfWeek;

                  return (
                    <section
                      key={day.value}
                      className={`min-h-[220px] rounded-lg border bg-white p-3 shadow-sm dark:bg-[#111827] ${
                        isToday
                          ? "border-[var(--brand-color,#e35336)] ring-1 ring-[rgba(var(--brand-color-rgb),0.22)]"
                          : "border-slate-200 dark:border-[#334155]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-[#334155]">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{day.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{daySlots.length} class{daySlots.length === 1 ? "" : "es"}</p>
                        </div>
                        {isToday && <Badge className="bg-[var(--brand-color,#e35336)] text-white">Today</Badge>}
                      </div>

                      {daySlots.length > 0 ? (
                        <div className="space-y-3">
                          {daySlots.map((slot, index) => (
                            <ClassSlotCard
                              key={slot.id}
                              slot={slot}
                              periodLabel={getPeriodLabel(slot, index)}
                              timeLabel={formatSlotTime(slot.startTime, slot.endTime)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-[150px] items-center justify-center rounded-md border border-dashed border-slate-200 text-center text-xs font-medium text-slate-400 dark:border-[#334155]">
                          Not Scheduled
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
