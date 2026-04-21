"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { schoolSettingsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  formatDateByCalendarType,
  formatDateTimeByCalendarType,
  normalizeCalendarType,
  type CalendarType,
} from "@/lib/calendar-utils";

declare global {
  interface Window {
    __SMS_ACTIVE_CALENDAR_TYPE__?: CalendarType;
  }
}

const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleString = Date.prototype.toLocaleString;

let formatterShimInstalled = false;

const installCalendarFormatterShim = () => {
  if (formatterShimInstalled || typeof window === "undefined") {
    return;
  }

  Date.prototype.toLocaleDateString = function toLocaleDateStringPatched(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const activeCalendar = window.__SMS_ACTIVE_CALENDAR_TYPE__ || "ETHIOPIAN";
    if (activeCalendar === "ETHIOPIAN") {
      return formatDateByCalendarType(this, activeCalendar);
    }
    return originalToLocaleDateString.call(this, locales, options);
  };

  Date.prototype.toLocaleString = function toLocaleStringPatched(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const activeCalendar = window.__SMS_ACTIVE_CALENDAR_TYPE__ || "ETHIOPIAN";
    if (activeCalendar === "ETHIOPIAN") {
      return formatDateTimeByCalendarType(this, activeCalendar);
    }
    return originalToLocaleString.call(this, locales, options);
  };

  formatterShimInstalled = true;
};

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
    queryKey: ["school-calendar-setting", user?.schoolId],
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__SMS_ACTIVE_CALENDAR_TYPE__ = calendarType;
      installCalendarFormatterShim();
    }
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

