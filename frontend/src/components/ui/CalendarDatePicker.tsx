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
  placeholder?: string;
  disabled?: boolean;
  includeTime?: boolean;
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

export function CalendarDatePicker({
  value,
  onChange,
  className,
  placeholder = "Select Date",
  disabled = false,
  includeTime = false,
}: CalendarDatePickerProps) {
  const { user } = useAuth();
  const { t, language } = useTranslations<any>("calendar");
  const displayPlaceholder = placeholder === "Select Date"
    ? t.picker.selectDate
    : placeholder;
  const calendarType = user?.calendarType || "ETHIOPIAN";
  const [open, setOpen] = useState(false);
  const selectedTime = toTimeValue(value);

  // === ETHIOPIAN CALENDAR STATE ===
  const todayEth = convertToEthiopian(new Date());
  const [ethYear, setEthYear] = useState<number>(todayEth.year);
  const [ethMonth, setEthMonth] = useState<number>(todayEth.month);
  const [ethDay, setEthDay] = useState<number>(todayEth.day);

  const updateTime = (time: string) => {
    const baseDate = value || convertEthiopianToGregorian(ethYear, ethMonth, ethDay);
    onChange(applyTimeToDate(baseDate, time));
  };

  // Sync incoming Gregorian Date to Ethiopian state
  useEffect(() => {
    if (value && calendarType === "ETHIOPIAN") {
      const et = convertToEthiopian(value);
      setEthYear(et.year);
      setEthMonth(et.month);
      setEthDay(et.day);
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
              "w-full justify-start text-left font-normal border-gray-300 dark:border-gray-700 dark:bg-gray-800",
              !value && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, includeTime ? "PPP p" : "PPP") : <span>{displayPlaceholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto space-y-3 p-3" align="start">
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
            <div className="border-t border-slate-100 pt-3 dark:border-slate-700">
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
  const years = Array.from({ length: 20 }, (_, i) => todayEth.year - 10 + i);
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
            "w-full justify-start text-left font-normal border-gray-300 dark:border-gray-700 dark:bg-gray-800",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{ethiopianDisplay}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4 bg-white dark:bg-gray-800" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between font-semibold text-sm">
            <span>{t.picker.ethiopianCalendar}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.picker.month}</label>
              <Select
                value={ethMonth.toString()}
                onValueChange={(v) => handleEthChange("month", parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
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
              <label className="text-xs text-muted-foreground">{t.picker.day}</label>
              <Select
                value={ethDay.toString()}
                onValueChange={(v) => handleEthChange("day", parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
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
              <label className="text-xs text-muted-foreground">{t.picker.year}</label>
              <Select
                value={ethYear.toString()}
                onValueChange={(v) => handleEthChange("year", parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
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
            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-center text-muted-foreground">
              {t.picker.gregorianEquivalent}:<br />
              <span className="font-medium">{format(value, includeTime ? "PPP p" : "PPP")}</span>
            </div>
          )}

          {includeTime ? (
            <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                {t.picker.ethiopianTime}
              </div>
              <TimePicker
                value={selectedTime}
                onChange={updateTime}
                placeholder={t.time.selectTime}
              />
              <div className="rounded-md bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
                {formatTimeByCalendarType(selectedTime, "ETHIOPIAN")}
              </div>
            </div>
          ) : null}

          <Button
            className="w-full h-8 text-xs"
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
