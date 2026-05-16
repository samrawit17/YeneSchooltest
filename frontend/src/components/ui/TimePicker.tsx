"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarType,
  formatTimeByCalendarType,
  getEthiopianClockParts,
  normalizeTimeValue,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/useTranslations";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  calendarType?: CalendarType;
  showCalendarLabel?: boolean;
}

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = "Select time",
  disabled = false,
  calendarType,
  showCalendarLabel = true,
}: TimePickerProps) {
  const { t } = useTranslations<any>("calendar");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const activeCalendarType = calendarType || user?.calendarType || "ETHIOPIAN";
  const isEthiopian = activeCalendarType === "ETHIOPIAN";
  const normalized = normalizeTimeValue(value);
  const ethiopianTime = getEthiopianClockParts(`${normalized.hour}:${normalized.minute}`);

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")),
    []
  );
  const ethiopianHours = useMemo(
    () => Array.from({ length: 12 }, (_, index) => String(index + 1)),
    []
  );
  const ethiopianPeriods = [
    { value: "morning", label: t.time.morning },
    { value: "afternoon", label: t.time.afternoon },
    { value: "evening", label: t.time.evening },
    { value: "night", label: t.time.night },
  ] as const;
  const minutes = useMemo(
    () => Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0")),
    []
  );

  const updateTime = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour}:${nextMinute}`);
  };

  const toStoredHourFromEthiopian = (
    ethHour12: number,
    period: "morning" | "afternoon" | "evening" | "night",
  ) => {
    const periodBase = {
      morning: 0,
      afternoon: 6,
      evening: 12,
      night: 18,
    }[period];
    const ethHour24 = periodBase + (ethHour12 % 12);
    return String((ethHour24 + 6) % 24).padStart(2, "0");
  };

  const updateEthiopianTime = (
    nextHour12: number,
    nextPeriod: "morning" | "afternoon" | "evening" | "night",
    nextMinute: string,
  ) => {
    updateTime(toStoredHourFromEthiopian(nextHour12, nextPeriod), nextMinute);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start border-slate-200 bg-white text-left font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
          <span>{value ? formatTimeByCalendarType(value, activeCalendarType) : placeholder === "Select time" ? t.time.selectTime : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-white p-4 dark:bg-slate-800" align="start">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.time.selectTime}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEthiopian ? t.time.ethiopianHint : t.time.gregorianHint}
            </p>
          </div>

          <div className={cn("grid gap-3", isEthiopian ? "grid-cols-3" : "grid-cols-2")}>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">{t.time.hour}</label>
              <Select
                value={isEthiopian ? String(ethiopianTime.hour12) : normalized.hour}
                onValueChange={(hour) => {
                  if (isEthiopian) {
                    updateEthiopianTime(Number(hour), ethiopianTime.period, normalized.minute);
                    return;
                  }
                  updateTime(hour, normalized.minute);
                }}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isEthiopian ? ethiopianHours : hours).map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEthiopian ? (
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">{t.time.block}</label>
                <Select
                  value={ethiopianTime.period}
                  onValueChange={(period) =>
                    updateEthiopianTime(
                      ethiopianTime.hour12,
                      period as "morning" | "afternoon" | "evening" | "night",
                      normalized.minute,
                    )
                  }
                >
                  <SelectTrigger className="h-9 bg-white dark:bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ethiopianPeriods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">{t.time.minute}</label>
              <Select
                value={normalized.minute}
                onValueChange={(minute) => {
                  if (isEthiopian) {
                    updateEthiopianTime(ethiopianTime.hour12, ethiopianTime.period, minute);
                    return;
                  }
                  updateTime(normalized.hour, minute);
                }}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
            {showCalendarLabel
              ? formatTimeByCalendarType(`${normalized.hour}:${normalized.minute}`, activeCalendarType)
              : `${normalized.hour}:${normalized.minute}`}
          </div>

          <Button type="button" className="h-9 w-full text-sm" onClick={() => setOpen(false)}>
            {t.time.done}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
