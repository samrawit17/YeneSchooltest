"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const normalizeTime = (value?: string) => {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: "08", minute: "00" };

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
};

const formatTimeLabel = (value?: string, placeholder = "Select time") => {
  if (!value) return placeholder;

  const { hour, minute } = normalizeTime(value);
  const hourNumber = Number(hour);
  const period = hourNumber >= 12 ? "PM" : "AM";
  const hour12 = hourNumber % 12 || 12;

  return `${hour12}:${minute} ${period}`;
};

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = "Select time",
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeTime(value);

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")),
    []
  );
  const minutes = useMemo(
    () => Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0")),
    []
  );

  const updateTime = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour}:${nextMinute}`);
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
          <span>{formatTimeLabel(value, placeholder)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-white p-4 dark:bg-slate-800" align="start">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Select time</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Stored in 24-hour format.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">Hour</label>
              <Select
                value={normalized.hour}
                onValueChange={(hour) => updateTime(hour, normalized.minute)}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">Minute</label>
              <Select
                value={normalized.minute}
                onValueChange={(minute) => updateTime(normalized.hour, minute)}
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
            {normalized.hour}:{normalized.minute}
          </div>

          <Button type="button" className="h-9 w-full text-sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
