"use client";

import { useEffect, useMemo, useState } from "react";
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

type EthiopianPeriod = "morning" | "afternoon" | "evening" | "night";

const ETHIOPIAN_PERIODS: EthiopianPeriod[] = ["morning", "afternoon", "evening", "night"];

const ETHIOPIAN_PERIOD_HOURS: Record<EthiopianPeriod, string[]> = {
  morning: ["12", "1", "2", "3", "4", "5"],
  afternoon: ["6", "7", "8", "9", "10", "11"],
  evening: ["12", "1", "2", "3", "4", "5"],
  night: ["6", "7", "8", "9", "10", "11"],
};

const isEthiopianPeriod = (value: string): value is EthiopianPeriod =>
  ETHIOPIAN_PERIODS.includes(value as EthiopianPeriod);

const getEthiopianHoursForPeriod = (period: EthiopianPeriod) => ETHIOPIAN_PERIOD_HOURS[period];

const normalizeHourForPeriod = (hour12: number, period: EthiopianPeriod) => {
  const validHours = getEthiopianHoursForPeriod(period);
  const nextHour = String(hour12);
  return Number(validHours.includes(nextHour) ? nextHour : validHours[0]);
};

const toStoredHourFromEthiopian = (ethHour12: number, period: EthiopianPeriod) => {
  const periodBase = {
    morning: 0,
    afternoon: 0,
    evening: 12,
    night: 12,
  }[period];
  const normalizedHour = normalizeHourForPeriod(ethHour12, period);
  const ethHour24 = periodBase + (normalizedHour % 12);
  return String((ethHour24 + 6) % 24).padStart(2, "0");
};

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  calendarType?: CalendarType;
  showCalendarLabel?: boolean;
  allowedEthiopianPeriods?: EthiopianPeriod[];
  defaultEthiopianPeriod?: EthiopianPeriod;
  onCommit?: (time: string) => void | Promise<void>;
}

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = "Select time",
  disabled = false,
  calendarType,
  showCalendarLabel = true,
  allowedEthiopianPeriods,
  defaultEthiopianPeriod = "afternoon",
  onCommit,
}: TimePickerProps) {
  const { t } = useTranslations<any>("calendar");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const activeCalendarType = calendarType || user?.calendarType || "ETHIOPIAN";
  const isEthiopian = activeCalendarType === "ETHIOPIAN";
  const normalized = normalizeTimeValue(value);
  const ethiopianTime = getEthiopianClockParts(`${normalized.hour}:${normalized.minute}`);
  const normalizedAllowedPeriods = useMemo(() => {
    if (!allowedEthiopianPeriods?.length) return undefined;

    const validPeriods = allowedEthiopianPeriods.filter(isEthiopianPeriod);
    return validPeriods.length > 0 ? validPeriods : undefined;
  }, [allowedEthiopianPeriods]);
  const allowedPeriodSet = useMemo(
    () => new Set(normalizedAllowedPeriods),
    [normalizedAllowedPeriods],
  );
  const fallbackEthiopianPeriod =
    normalizedAllowedPeriods?.includes(defaultEthiopianPeriod)
      ? defaultEthiopianPeriod
      : normalizedAllowedPeriods?.[0] ?? defaultEthiopianPeriod;
  const selectedEthiopianPeriod =
    !normalizedAllowedPeriods || allowedPeriodSet.has(ethiopianTime.period)
      ? ethiopianTime.period
      : fallbackEthiopianPeriod;

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
  ].filter((period) => !normalizedAllowedPeriods || allowedPeriodSet.has(period.value as EthiopianPeriod)) as {
    value: EthiopianPeriod;
    label: string;
  }[];
  const selectedPeriodLabel =
    ethiopianPeriods.find((period) => period.value === selectedEthiopianPeriod)?.label ?? selectedEthiopianPeriod;
  const displayValue = value
    ? isEthiopian
      ? `${formatTimeByCalendarType(value, activeCalendarType)} ${selectedPeriodLabel}`
      : formatTimeByCalendarType(value, activeCalendarType)
    : placeholder === "Select time"
      ? t.time.selectTime
      : placeholder;
  const minutes = useMemo(
    () => Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0")),
    []
  );
  const selectedEthiopianHours = isEthiopian
    ? getEthiopianHoursForPeriod(selectedEthiopianPeriod)
    : ethiopianHours;
  const selectedHour12 = String(ethiopianTime.hour12);
  const selectedHourForPeriod = selectedEthiopianHours.includes(selectedHour12)
    ? selectedHour12
    : selectedEthiopianHours[0];
  const updateTime = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour}:${nextMinute}`);
  };

  const updateEthiopianTime = (
    nextHour12: number,
    nextPeriod: EthiopianPeriod,
    nextMinute: string,
  ) => {
    updateTime(toStoredHourFromEthiopian(nextHour12, nextPeriod), nextMinute);
  };

  useEffect(() => {
    if (!isEthiopian || !normalizedAllowedPeriods || allowedPeriodSet.has(ethiopianTime.period)) {
      return;
    }

    onChange(`${toStoredHourFromEthiopian(normalizeHourForPeriod(ethiopianTime.hour12, fallbackEthiopianPeriod), fallbackEthiopianPeriod)}:${normalized.minute}`);
  }, [
    allowedPeriodSet,
    ethiopianTime.hour12,
    ethiopianTime.period,
    fallbackEthiopianPeriod,
    isEthiopian,
    normalized.minute,
    normalizedAllowedPeriods,
    onChange,
  ]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start border-gray-200 bg-white text-left font-normal text-gray-900 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
          <span className="min-w-0 truncate">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-white p-4 dark:bg-[#1A1A1A]" align="start">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.time.selectTime}</p>
            <p className="text-xs text-gray-500 dark:text-[#CCCCCC]">
              {isEthiopian ? t.time.ethiopianHint : t.time.gregorianHint}
            </p>
          </div>

          <div className={cn("grid gap-3", isEthiopian ? "grid-cols-3" : "grid-cols-2")}>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-[#CCCCCC]">{t.time.hour}</label>
              <Select
                value={isEthiopian ? selectedHourForPeriod : normalized.hour}
                onValueChange={(hour) => {
                  if (isEthiopian) {
                    updateEthiopianTime(Number(hour), selectedEthiopianPeriod, normalized.minute);
                    return;
                  }
                  updateTime(hour, normalized.minute);
                }}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-[#1A1A1A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isEthiopian ? selectedEthiopianHours : hours).map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEthiopian ? (
              <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-[#CCCCCC]">{t.time.block}</label>
                <Select
                  value={selectedEthiopianPeriod}
                  onValueChange={(period) =>
                    updateEthiopianTime(normalizeHourForPeriod(ethiopianTime.hour12, period as EthiopianPeriod), period as EthiopianPeriod, normalized.minute)
                  }
                >
                  <SelectTrigger className="h-9 bg-white dark:bg-[#1A1A1A]">
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
              <label className="text-xs text-gray-500 dark:text-[#CCCCCC]">{t.time.minute}</label>
              <Select
                value={normalized.minute}
                onValueChange={(minute) => {
                  if (isEthiopian) {
                    updateEthiopianTime(Number(selectedHourForPeriod), selectedEthiopianPeriod, minute);
                    return;
                  }
                  updateTime(normalized.hour, minute);
                }}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-[#1A1A1A]">
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

          <div className="rounded-md bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:bg-[#2A2A2A]/60 dark:text-[#CCCCCC]">
            {showCalendarLabel
              ? isEthiopian
                ? `${formatTimeByCalendarType(`${normalized.hour}:${normalized.minute}`, activeCalendarType)} ${selectedPeriodLabel}`
                : formatTimeByCalendarType(`${normalized.hour}:${normalized.minute}`, activeCalendarType)
              : `${normalized.hour}:${normalized.minute}`}
          </div>

          <Button
            type="button"
            className="h-9 w-full text-sm"
            onClick={() => {
              void onCommit?.(`${normalized.hour}:${normalized.minute}`);
              setOpen(false);
            }}
          >
            {t.time.done}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
