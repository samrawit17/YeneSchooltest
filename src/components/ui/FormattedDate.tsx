"use client";

import { useAuth } from "@/context/AuthContext";
import { formatDateByCalendarType, formatDateTimeByCalendarType } from "@/lib/calendar-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface FormattedDateProps {
  date: Date | string | null | undefined;
  showTime?: boolean;
  className?: string;
  fallback?: string;
}

export function FormattedDate({ 
  date, 
  showTime = false, 
  className = "", 
  fallback = "—" 
}: FormattedDateProps) {
  const { user } = useAuth();
  
  if (!date) return <span className={className}>{fallback}</span>;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Invalid date check
  if (isNaN(d.getTime())) return <span className={className}>{fallback}</span>;

  const calendarType = user?.calendarType || 'ETHIOPIAN';
  
  const formattedString = showTime 
    ? formatDateTimeByCalendarType(d, calendarType)
    : formatDateByCalendarType(d, calendarType);

  // If using Ethiopian calendar, show Gregorian on hover for clarity
  if (calendarType === 'ETHIOPIAN') {
    const gregorianFormat = showTime ? 'PPP p' : 'PPP';
    const tooltipText = `${format(d, gregorianFormat)} (Gregorian)`;

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 ${className}`}>
              {formattedString}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className={className}>{formattedString}</span>;
}
