"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState, useEffect } from "react";
import { useCalendar } from "@/context/CalendarContext";
import { convertToEthiopian, ETHIOPIAN_MONTH_NAMES } from "@/lib/calendar-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const localizer = momentLocalizer(moment);

export interface CalendarDisplayEvent {
  id?: string;
  title: string;
  startDate?: string | Date;
  endDate?: string | Date;
  start?: string | Date;
  end?: string | Date;
  eventType?: string;
  resource?: unknown;
}

interface BigCalendarProps {
  events: CalendarDisplayEvent[];
  initialView?: View;
  views?: View[];
  height?: number;
  onEventClick?: (event: CalendarDisplayEvent) => void;
}

const BigCalendar = ({
  events,
  initialView = Views.MONTH,
  views,
  height,
  onEventClick,
}: BigCalendarProps) => {
  const [view, setView] = useState<View>(initialView);
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('xl');
  const { calendarType } = useCalendar();

  // Track screen size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setScreenSize('xs');
      } else if (width < 640) {
        setScreenSize('sm');
      } else if (width < 768) {
        setScreenSize('md');
      } else if (width < 1024) {
        setScreenSize('lg');
      } else {
        setScreenSize('xl');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get height based on screen size
  const getHeight = () => {
    if (height) return height;
    switch (screenSize) {
      case 'xs': return 300;
      case 'sm': return 350;
      case 'md': return 400;
      case 'lg': return 500;
      case 'xl': return 600;
      default: return 500;
    }
  };

  const getVisibleViews = (): View[] => {
    return views || [Views.MONTH];
  };

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Transform API events to calendar format
  const calendarEvents = events?.map((event) => ({
    title: event.title,
    allDay: true,
    start: new Date(event.start || event.startDate || new Date()),
    end: new Date(event.end || event.endDate || event.start || event.startDate || new Date()),
    resource: event,
  })) || [];

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  // Navigate to previous month
  const goToPrevious = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  // Navigate to next month
  const goToNext = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date based on calendar type
  const formatDateHeader = (date: Date) => {
    if (calendarType === 'ETHIOPIAN') {
      const ethiopian = convertToEthiopian(date);
      if (screenSize === 'xs') {
        return `${ETHIOPIAN_MONTH_NAMES[ethiopian.month - 1]?.slice(0, 2)} ${ethiopian.day}`;
      }
      return `${ETHIOPIAN_MONTH_NAMES[ethiopian.month - 1]?.slice(0, 3)} ${ethiopian.day}`;
    }
    if (screenSize === 'xs') {
      return moment(date).format('D');
    }
    return moment(date).format('MMM D');
  };

  // Day style getter for today highlight
  const getDayStyle = (date: Date) => {
    const isToday = new Date().toDateString() === date.toDateString();
    const isDark = document.documentElement.classList.contains('dark');
    return {
      style: isToday ? {
        backgroundColor: isDark ? "rgba(var(--brand-color-rgb), 0.2)" : "rgba(var(--brand-color-rgb), 0.1)",
      } : {
        backgroundColor: isDark ? "transparent" : "transparent"
      }
    };
  };

  // Event styling for light/dark mode
  const getEventStyle = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      style: {
        backgroundColor: "var(--brand-color, #e35336)",
        borderRadius: screenSize === 'xs' ? "2px" : "4px",
        color: "white",
        border: "none",
        fontSize: screenSize === 'xs' ? "10px" : "12px",
        padding: screenSize === 'xs' ? "0 2px" : "0 4px",
        opacity: isDark ? 0.9 : 1,
      },
    };
  };

  return (
    <div className="h-full w-full dark:bg-gray-800 dark:rounded-lg flex flex-col">
      {/* Custom Responsive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevious}
            className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
          >
            Today
          </button>
          
          <button
            onClick={goToNext}
            className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        {/* Current Month Label - Hidden since calendar provides its own */}
        <div className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white order-first sm:order-none w-full sm:w-auto text-center sm:text-left">
          {/* Calendar provides its own header */}
        </div>
        
        {/* Spacer for alignment */}
        <div className="w-16" />
      </div>

      <div className="flex-1 min-h-0">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={handleOnChangeView}
          date={currentDate}
          onNavigate={setCurrentDate}
          views={getVisibleViews()}
          style={{ height: getHeight() }}
          eventPropGetter={getEventStyle}
          dayPropGetter={getDayStyle}
          onSelectEvent={(event) => onEventClick?.(event.resource as CalendarDisplayEvent)}
          popup={screenSize !== 'xs'}
          selectable
          longPressThreshold={10}
          toolbar={false}
          formats={{
            dateFormat: formatDateHeader,
            dayHeaderFormat: (date: Date) => {
              if (calendarType === 'ETHIOPIAN') {
                const ethiopian = convertToEthiopian(date);
                return `${ETHIOPIAN_MONTH_NAMES[ethiopian.month - 1]?.slice(0, 3)} ${ethiopian.day} (${moment(date).format('ddd')})`;
              }
              return moment(date).format('ddd, MMM D');
            },
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
              if (calendarType === 'ETHIOPIAN') {
                const startEth = convertToEthiopian(start);
                const endEth = convertToEthiopian(end);
                return `${ETHIOPIAN_MONTH_NAMES[startEth.month - 1]?.slice(0, 3)} ${startEth.day} - ${ETHIOPIAN_MONTH_NAMES[endEth.month - 1]?.slice(0, 3)} ${endEth.day}`;
              }
              return moment(start).format('MMM D') + ' - ' + moment(end).format('MMM D');
            },
            monthHeaderFormat: (date: Date) => {
              if (calendarType === 'ETHIOPIAN') {
                const ethiopian = convertToEthiopian(date);
                return `${ETHIOPIAN_MONTH_NAMES[ethiopian.month - 1]} ${ethiopian.year} E.C.`;
              }
              return moment(date).format('MMMM YYYY');
            },
            weekdayFormat: (date: Date) => {
              if (screenSize === 'xs') {
                return moment(date).format('dd').charAt(0);
              }
              return moment(date).format('ddd');
            },
          }}
        />
      </div>
    </div>
  );
};

export default BigCalendar;
