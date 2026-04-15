"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ETHIOPIAN_MONTH_NAMES, convertToEthiopian, convertEthiopianToGregorian } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

// Standard UI components (Assuming these exist or standard HTML inputs will be used instead)
import { Calendar } from "@/components/ui/calendar";

interface CalendarDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CalendarDatePicker({
  value,
  onChange,
  className,
  placeholder = "Select Date",
  disabled = false,
}: CalendarDatePickerProps) {
  const { user } = useAuth();
  const calendarType = user?.calendarType || "ETHIOPIAN";
  const [open, setOpen] = useState(false);

  // === ETHIOPIAN CALENDAR STATE ===
  const todayEth = convertToEthiopian(new Date());
  const [ethYear, setEthYear] = useState<number>(todayEth.year);
  const [ethMonth, setEthMonth] = useState<number>(todayEth.month);
  const [ethDay, setEthDay] = useState<number>(todayEth.day);

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
            {value ? format(value, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            initialFocus
          />
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
    const newGregorian = convertEthiopianToGregorian(newYear, newMonth, newDay);
    onChange(newGregorian);
  };

  // Format to show in trigger
  const ethiopianDisplay = value
    ? `${ETHIOPIAN_MONTH_NAMES[ethMonth - 1]} ${ethDay}, ${ethYear} E.C.`
    : placeholder;

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
          <span>{ethiopianDisplay}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4 bg-white dark:bg-gray-800" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between font-semibold text-sm">
            <span>Ethiopian Calendar</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Month</label>
              <Select
                value={ethMonth.toString()}
                onValueChange={(v) => handleEthChange("month", parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETHIOPIAN_MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Day</label>
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
              <label className="text-xs text-muted-foreground">Year</label>
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
              Gregorian equivalent:<br />
              <span className="font-medium">{format(value, "PPP")}</span>
            </div>
          )}

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
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
