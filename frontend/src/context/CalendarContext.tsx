"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { schoolSettingsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/query-keys";
import {
  formatDateByCalendarType,
  formatDateTimeByCalendarType,
  normalizeCalendarType,
  type CalendarType,
} from "@/lib/calendar-utils";

interface CalendarContextValue {
  calendarType: CalendarType;
  isLoading: boolean;
  isLocked: boolean;
  formatDate: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
}

const CalendarContext = createContext<CalendarContextValue | undefined>(undefined);

export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.school.settings(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return {};
      const response = await schoolSettingsAPI.getAll(user.schoolId);
      return response.data || {};
    },
    enabled: !!user?.schoolId,
    staleTime: 60 * 1000,
  });

  const calendarType = normalizeCalendarType(settings?.calendar_type);
  const isLocked = settings?.calendar_type !== undefined && settings?.calendar_type !== null;

  const originalsRef = useRef<{
    toLocaleDateString: typeof Date.prototype.toLocaleDateString;
    toLocaleString: typeof Date.prototype.toLocaleString;
  } | null>(null);

  useEffect(() => {
    if (!originalsRef.current) {
      originalsRef.current = {
        toLocaleDateString: Date.prototype.toLocaleDateString,
        toLocaleString: Date.prototype.toLocaleString,
      };
    }

    if (calendarType === 'GREGORIAN') {
      Date.prototype.toLocaleDateString = originalsRef.current.toLocaleDateString;
      Date.prototype.toLocaleString = originalsRef.current.toLocaleString;
      return;
    }

    const etFormatDate = (date: Date, ...args: any[]) =>
      formatDateByCalendarType(date, 'ETHIOPIAN');
    const etFormatDateTime = (date: Date, ...args: any[]) =>
      formatDateTimeByCalendarType(date, 'ETHIOPIAN');

    Date.prototype.toLocaleDateString = etFormatDate as typeof Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleString = etFormatDateTime as typeof Date.prototype.toLocaleString;

    return () => {
      if (originalsRef.current) {
        Date.prototype.toLocaleDateString = originalsRef.current.toLocaleDateString;
        Date.prototype.toLocaleString = originalsRef.current.toLocaleString;
      }
    };
  }, [calendarType]);

  const value = useMemo<CalendarContextValue>(
    () => ({
      calendarType,
      isLoading,
      isLocked,
      formatDate: (date: Date | string) => formatDateByCalendarType(date, calendarType),
      formatDateTime: (date: Date | string) => formatDateTimeByCalendarType(date, calendarType),
    }),
    [calendarType, isLoading, isLocked],
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within CalendarProvider");
  }
  return context;
};
