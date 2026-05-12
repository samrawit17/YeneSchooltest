'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '@/lib/api/content';
import { useCalendar } from '@/context/CalendarContext';
import { convertToEthiopian, ETHIOPIAN_MONTH_NAMES } from '@/lib/calendar-utils';

interface WeeklyCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export default function WeeklyCalendar({ events, onEventClick }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { calendarType } = useCalendar();

  // Get the start of the week (Sunday)
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Get days of the week
  const getDaysOfWeek = (startOfWeek: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

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
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  // Format month and year
  const formatMonthYear = (date: Date) => {
    if (calendarType === 'ETHIOPIAN') {
      const ethiopian = convertToEthiopian(date);
      return `${ETHIOPIAN_MONTH_NAMES[ethiopian.month - 1]} ${ethiopian.year} E.C.`;
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-2 border-gray-300';
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-[var(--brand-color,#e35336)] dark:text-[var(--brand-color,#e35336)]">
          {formatMonthYear(currentDate)}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousWeek}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-[var(--brand-color,#e35336)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-[var(--brand-color,#e35336)] transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-[var(--brand-color,#e35336)] transition-colors"
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
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const today = isToday(day);
          
          return (
            <div
              key={index}
              className={`
                min-h-[60px] min-w-0 p-1 rounded border text-center cursor-pointer transition-all
                ${today 
                  ? 'border-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.05)] dark:bg-[rgba(var(--brand-color-rgb),0.1)]' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-[var(--brand-color,#e35336)] dark:hover:border-[var(--brand-color,#e35336)]'
                }
              `}
              onClick={() => onEventClick && onEventClick(dayEvents[0])}
            >
              <div className={`
                text-xs font-medium mb-1
                ${today ? 'text-[var(--brand-color,#e35336)] font-bold' : 'text-gray-700 dark:text-gray-300'}
              `}>
                {formatDayNumber(day)}
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
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => window.location.href = '/list/calendar'}
          className="w-full text-center text-xs text-[var(--brand-color,#e35336)] hover:text-[#c74428] hover:underline transition-colors"
        >
          View Calendar
        </button>
      </div>
    </div>
  );
}
