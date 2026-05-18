"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useTranslations } from "@/hooks/useTranslations";
import type { ParentTimetableMessages } from "@/messages/registry";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/timetable";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
import { BookOpen, Calendar, Clock, MapPin, UserRound } from "lucide-react";
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
  t,
}: {
  slot: TimetableSlot;
  timeLabel: string;
  periodLabel: string;
  t: ParentTimetableMessages;
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
            {slot.subject?.name || t.subject}
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
          <span className="truncate">{slot.teacher?.name || t.teacherPending}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{slot.room || t.roomNotSet}</span>
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
  const { schoolCalendarType, currentAcademicYear } = useAcademicYear();
  const { t } = useTranslations<ParentTimetableMessages>("parentTimetable");
  const [loading, setLoading] = useState(true);
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

  const displayDays = useMemo(() => SCHOOL_WEEK_DAYS, []);

  const loadProgram = useCallback(async () => {
    if (!schoolId || !classId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [settingsResponse, timetableResponse] = await Promise.all([
        schoolSettingsAPI.getAll(schoolId),
        timetableSlotsAPI.getGrid(
          classId,
          sectionId,
          currentAcademicYear?.id,
        ),
      ]);

      setSchoolSettings(settingsResponse.data || {});
      setSlots(timetableResponse.data?.slots || []);
    } catch (error: any) {
      console.error("Failed to load class program:", error);
      toast.error(error.response?.data?.message || t.failedLoad);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [classId, currentAcademicYear?.id, schoolId, sectionId]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const today = new Date().getDay();
  const todayIsWeekday = today >= 1 && today <= 5;
  const todayDayOfWeek = todayIsWeekday ? today : null;

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
      acc[range] = `${t.period} ${index + 1}`;
      return acc;
    }, {});
  }, [weekdaySlots, t.period]);

  const getPeriodLabel = (slot: TimetableSlot, fallbackIndex?: number) =>
    periodLabelByTime[`${slot.startTime}-${slot.endTime}`] ||
    `${t.period} ${(fallbackIndex ?? 0) + 1}`;

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
    <div className="bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Card className="overflow-hidden dark:bg-[#1E293B] dark:border-[#334155]">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t.weeklyProgram}</CardTitle>
          <CardDescription>
            {t.programDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {weekdaySlots.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>{t.noTimetable}</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 lg:grid-cols-5">
                {displayDays.map((day) => {
                  const daySlots = getSlotsForDay(day.value);
                  const isToday = todayIsWeekday && day.value === todayDayOfWeek;
                  const translatedDay = (t.weekdays as Record<string, string>)[day.name] || day.name;

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
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{translatedDay}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{daySlots.length} {daySlots.length === 1 ? t.class : t.classes}</p>
                        </div>
                        {isToday && <Badge className="bg-[var(--brand-color,#e35336)] text-white">{t.today}</Badge>}
                      </div>

                      {daySlots.length > 0 ? (
                        <div className="space-y-3">
                          {daySlots.map((slot, index) => (
                            <ClassSlotCard
                              key={slot.id}
                              slot={slot}
                              periodLabel={getPeriodLabel(slot, index)}
                              timeLabel={formatSlotTime(slot.startTime, slot.endTime)}
                              t={t}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-[150px] items-center justify-center rounded-md border border-dashed border-slate-200 text-center text-xs font-medium text-slate-400 dark:border-[#334155]">
                          {t.notScheduled}
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
