'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '@/lib/api/content';
import { useCalendar } from '@/context/CalendarContext';
import { convertToEthiopian, formatEthiopianMonthYear } from '@/lib/calendar-utils';
import { useTranslations } from '@/hooks/useTranslations';

interface WeeklyCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

interface NavigationMessages {
  labels?: Record<string, string>;
  calendar?: {
    dayNames?: string[];
    viewCalendar?: string;
  };
}

export default function WeeklyCalendar({ events = [], onEventClick }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { calendarType } = useCalendar();
  const { t: navigationText, language, locale } = useTranslations<NavigationMessages>('navigation');
  const calendarText = navigationText.calendar ?? {};
  const todayLabel = navigationText.labels?.Today ?? 'Today';

  // Get the first day of the month
  const getStartOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Get the last day of the month
  const getEndOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Get all days of the month (including empty slots before the 1st)
  const getDaysOfMonth = (date: Date) => {
    const start = getStartOfMonth(date);
    const end = getEndOfMonth(date);
    const days = [];
    
    // Add empty slots for days before the 1st (start day of week)
    const startDayOfWeek = start.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= end.getDate(); i++) {
      const day = new Date(date.getFullYear(), date.getMonth(), i);
      days.push(day);
    }
    
    return days;
  };

  const monthDays = getDaysOfMonth(currentDate);
  const monthLabel = calendarType === 'ETHIOPIAN' 
    ? formatEthiopianMonthYear(currentDate, language)
    : currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Navigate to current week
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return (events || []).filter((event) => {
      const eventDate = new Date(event.startDate).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  // Format month and year
  const formatMonthYear = (date: Date) => {
    if (calendarType === 'ETHIOPIAN') {
      return formatEthiopianMonthYear(date, language);
    }
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  // Format day number
  const formatDayNumber = (date: Date) => {
    if (calendarType === 'ETHIOPIAN') {
      const ethiopian = convertToEthiopian(date);
      return ethiopian.day;
    }
    return date.getDate();
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Day names
  const dayNames = calendarText.dayNames ?? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get event color based on type with accent color
  const getEventColor = (eventType?: string) => {
    switch (eventType) {
      case 'ACADEMIC':
        return 'bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)] dark:text-[var(--brand-color,#e35336)] border-l-2 border-[var(--brand-color,#e35336)]';
      case 'EXTRACURRICULAR':
        return 'bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)] dark:text-[var(--brand-color,#e35336)] border-l-2 border-[var(--brand-color,#e35336)]';
      case 'ADMINISTRATIVE':
        return 'bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)] dark:text-[var(--brand-color,#e35336)] border-l-2 border-[var(--brand-color,#e35336)]';
      case 'SPORTS':
        return 'bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)] dark:text-[var(--brand-color,#e35336)] border-l-2 border-[var(--brand-color,#e35336)]';
      default:
        return 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 border-l-2 border-gray-300';
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-[var(--brand-color,#e35336)] dark:text-[var(--brand-color,#e35336)]">
          {monthLabel}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-[var(--brand-color,#e35336)] hover:text-white rounded text-gray-600 dark:text-gray-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 text-xs hover:bg-[var(--brand-color,#e35336)] hover:text-white rounded text-gray-600 dark:text-gray-400 transition-colors"
          >
            {todayLabel}
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-[var(--brand-color,#e35336)] hover:text-white rounded text-gray-600 dark:text-gray-400 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day, index) => {
          if (!day) {
            return (
              <div key={index} className="min-h-[60px] min-w-0 p-1 rounded border border-transparent" />
            );
          }
          
          const dayEvents = getEventsForDate(day);
          const today = isToday(day);
          
          return (
            <div
              key={index}
              className={`
                min-h-[60px] min-w-0 p-1 rounded border text-center cursor-pointer transition-all
                ${today 
                  ? 'border-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.05)] dark:bg-[rgba(var(--brand-color-rgb),0.1)]' 
                  : 'border-gray-200 dark:border-[#2A2A2A] hover:border-[var(--brand-color,#e35336)] dark:hover:border-[var(--brand-color,#e35336)]'
                }
              `}
              onClick={() => onEventClick && onEventClick(dayEvents[0])}
            >
              <div className={`
                text-xs font-medium mb-1
                ${today ? 'text-[var(--brand-color,#e35336)] font-bold' : 'text-gray-700 dark:text-gray-300'}
              `}>
                {day.getDate()}
              </div>
              {/* Event markers */}
              <div className="min-w-0 space-y-0.5">
                {dayEvents.map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`block max-w-full overflow-hidden truncate whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-medium ${getEventColor(event.eventType)}`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar link for selected day */}
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
        <button
          onClick={() => window.location.href = '/list/calendar'}
          className="w-full text-center text-xs text-[var(--brand-color,#e35336)] hover:text-[#c74428] hover:underline transition-colors"
        >
          {calendarText.viewCalendar ?? 'View Calendar'}
        </button>
      </div>
    </div>
  );
}
