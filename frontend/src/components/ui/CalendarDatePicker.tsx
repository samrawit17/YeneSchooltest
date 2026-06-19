"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  convertToEthiopian,
  convertEthiopianToGregorian,
  formatTimeByCalendarType,
  getLocalizedEthiopianEraLabel,
  getLocalizedEthiopianMonthName,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/useTranslations";

// Standard UI components (Assuming these exist or standard HTML inputs will be used instead)
import { Calendar } from "@/components/ui/calendar";

interface CalendarDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
  brandColor?: string;
  placeholder?: string;
  disabled?: boolean;
  includeTime?: boolean;
  minYear?: number; // In Ethiopian year if in Ethiopian mode
  maxYear?: number;
}

const toTimeValue = (date?: Date) => {
  if (!date) return "08:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const applyTimeToDate = (date: Date, time: string) => {
  const [hourText, minuteText] = time.split(":");
  const next = new Date(date);
  next.setHours(Number(hourText) || 0, Number(minuteText) || 0, 0, 0);
  return next;
};

const mergeDateAndTime = (date: Date, existingDate: Date | undefined, includeTime: boolean) => {
  if (!includeTime) return date;
  return applyTimeToDate(date, toTimeValue(existingDate));
};

const brandedSelectTriggerClassName =
  "h-8 text-xs border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-300 data-[state=open]:border-gray-500 dark:border-[#2A2A2A] dark:focus:border-[#555555] dark:focus:ring-[#333333] dark:data-[state=open]:border-[#555555]";

export function CalendarDatePicker({
  value,
  onChange,
  className,
  brandColor,
  placeholder = "Select Date",
  disabled = false,
  includeTime = false,
  minYear,
  maxYear,
}: CalendarDatePickerProps) {
  const { user } = useAuth();
  const { t, language } = useTranslations<any>("calendar");
  const displayPlaceholder = placeholder;
  const calendarType = user?.calendarType || "ETHIOPIAN";
  const [open, setOpen] = useState(false);
  const selectedTime = toTimeValue(value);
  const brandStyle = brandColor
    ? ({ "--brand-color": brandColor } as React.CSSProperties)
    : undefined;

  // === ETHIOPIAN CALENDAR STATE ===
  const todayEth = convertToEthiopian(new Date());
  
  // Directly initialize state using the initial value prop if available, to avoid hydration mismatches
  const initialEth = React.useMemo(() => {
    return convertToEthiopian(value || new Date());
  }, [value]);

  const [ethYear, setEthYear] = useState<number>(initialEth.year);
  const [ethMonth, setEthMonth] = useState<number>(initialEth.month);
  const [ethDay, setEthDay] = useState<number>(initialEth.day);

  const updateTime = (time: string) => {
    const baseDate = value || convertEthiopianToGregorian(ethYear, ethMonth, ethDay);
    onChange(applyTimeToDate(baseDate, time));
  };

  // Sync incoming Gregorian Date to Ethiopian state, and support resetting/clearing correctly
  useEffect(() => {
    if (value && calendarType === "ETHIOPIAN") {
      const et = convertToEthiopian(value);
      setEthYear(et.year);
      setEthMonth(et.month);
      setEthDay(et.day);
    } else if (!value) {
      const today = convertToEthiopian(new Date());
      setEthYear(today.year);
      setEthMonth(today.month);
      setEthDay(today.day);
    }
  }, [value, calendarType]);

  // Gregorian Picker
  if (calendarType === "GREGORIAN") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal border-gray-300 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]",
              !value && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, includeTime ? "PPP p" : "PPP") : <span>{displayPlaceholder}</span>}
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-auto space-y-3 p-3" align="start" style={brandStyle}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date ? mergeDateAndTime(date, value, includeTime) : undefined);
              if (!includeTime) setOpen(false);
            }}
            initialFocus
          />
          {includeTime ? (
            <div className="border-t border-gray-100 pt-3 dark:border-[#2A2A2A]">
              <TimePicker value={selectedTime} onChange={updateTime} />
              <Button className="mt-3 h-9 w-full text-sm" onClick={() => setOpen(false)}>
                {t.picker.done}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }

  // === ETHIOPIAN PICKER UI ===
  const startYear = minYear ?? (todayEth.year - 85);
  const endYear = maxYear ?? (todayEth.year + 15);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  // Months are 1-13 (Pagume is 13th month)
  const getDaysInEthMonth = (month: number, year: number) => {
    if (month === 13) {
      // Pagume has 5 days in normal year, 6 in leap year
      // A leap year in the Ethiopian calendar happens every four years, and the year is perfectly divisible by 4.
      // (Usually year + 1 % 4 === 0, but we approximate for UI sake or just allow 6 days and validate on change)
      const isLeap = (year + 1) % 4 === 0;
      return isLeap ? 6 : 5;
    }
    return 30; // All other months have exactly 30 days
  };

  const daysInCurrentMonth = getDaysInEthMonth(ethMonth, ethYear);
  const days = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  const handleEthChange = (type: "year" | "month" | "day", num: number) => {
    let newYear = ethYear;
    let newMonth = ethMonth;
    let newDay = ethDay;

    if (type === "year") newYear = num;
    if (type === "month") newMonth = num;
    if (type === "day") newDay = num;

    // Adjust day if month changed and it exceeds limits
    const maxDays = getDaysInEthMonth(newMonth, newYear);
    if (newDay > maxDays) newDay = maxDays;

    setEthYear(newYear);
    setEthMonth(newMonth);
    setEthDay(newDay);

    // Convert back to Gregorian to pass up
    const newGregorian = mergeDateAndTime(
      convertEthiopianToGregorian(newYear, newMonth, newDay),
      value,
      includeTime,
    );
    onChange(newGregorian);
  };

  // Format to show in trigger
  const ethiopianDisplay = value
    ? `${getLocalizedEthiopianMonthName(ethMonth, language)} ${ethDay}, ${ethYear} ${getLocalizedEthiopianEraLabel(language)}${includeTime ? ` • ${formatTimeByCalendarType(selectedTime, "ETHIOPIAN")}` : ""}`
    : displayPlaceholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border-gray-300 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{ethiopianDisplay}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] border-gray-200 bg-white p-4 shadow-lg dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
        align="start"
        style={brandStyle}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
            <span>{t.picker.ethiopianCalendar}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-[#CCCCCC]">{t.picker.month}</label>
              <Select
                value={ethMonth.toString()}
                onValueChange={(v) => handleEthChange("month", parseInt(v))}
              >
                <SelectTrigger className={brandedSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 13 }, (_, i) => getLocalizedEthiopianMonthName(i + 1, language)).map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-[#CCCCCC]">{t.picker.day}</label>
              <Select
                value={ethDay.toString()}
                onValueChange={(v) => handleEthChange("day", parseInt(v))}
              >
                <SelectTrigger className={brandedSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-[#CCCCCC]">{t.picker.year}</label>
              <Select
                value={ethYear.toString()}
                onValueChange={(v) => handleEthChange("year", parseInt(v))}
              >
                <SelectTrigger className={brandedSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {value && (
            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-[#2A2A2A] text-xs text-center text-muted-foreground">
              {t.picker.gregorianEquivalent}:<br />
              <span className="font-medium">{format(value, includeTime ? "PPP p" : "PPP")}</span>
            </div>
          )}

          {includeTime ? (
            <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-[#2A2A2A]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                {t.picker.ethiopianTime}
              </div>
              <TimePicker
                value={selectedTime}
                onChange={updateTime}
                placeholder={t.time.selectTime}
              />
              <div className="rounded-md bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:bg-[#2A2A2A]/60 dark:text-[#CCCCCC]">
                {formatTimeByCalendarType(selectedTime, "ETHIOPIAN")}
              </div>
            </div>
          ) : null}

          <Button
            className="h-8 w-full text-xs"
            onClick={() => {
              if (!value) {
                // If they never clicked a change but just opened and hit confirm
                handleEthChange("month", ethMonth);
              }
              setOpen(false);
            }}
          >
            {t.picker.confirm}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
