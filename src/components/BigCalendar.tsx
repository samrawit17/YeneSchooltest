"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState, useEffect } from "react";
import { Event } from "@/lib/api";
import { useCalendar } from "@/context/CalendarContext";
import { convertToEthiopian, ETHIOPIAN_MONTH_NAMES } from "@/lib/calendar-utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid, Clock } from "lucide-react";

const localizer = momentLocalizer(moment);

interface BigCalendarProps {
  events: Event[];
}

const BigCalendar = ({ events }: BigCalendarProps) => {
  const [view, setView] = useState<View>(Views.MONTH);
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
    switch (screenSize) {
      case 'xs': return 300;
      case 'sm': return 350;
      case 'md': return 400;
      case 'lg': return 500;
      case 'xl': return 600;
      default: return 500;
    }
  };

  // Get visible views based on screen size
  const getVisibleViews = (): View[] => {
    if (screenSize === 'xs' || screenSize === 'sm') {
      return [Views.DAY, Views.MONTH];
    }
    return [Views.DAY, Views.WEEK, Views.WORK_WEEK, Views.MONTH];
  };

  // Transform API events to calendar format
  const calendarEvents = events?.map((event) => ({
    title: event.title,
    allDay: event.allDay,
    start: new Date(event.startDate),
    end: event.endDate ? new Date(event.endDate) : new Date(event.startDate),
  })) || [];

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  // Format date based on calendar type
  const formatDateHeader = (date: Date) => {
    if (calendarType === 'ETHIOPIAN') {
      const ethiopian = convertToEthiopian(date);
      // Shorten further for very small screens
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

  return (
    <div className="h-full w-full dark:bg-gray-800 dark:rounded-lg flex flex-col">
      {/* Custom Responsive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <button
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Today
          </button>
          
          <button
            className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Next"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        {/* Current Month/Week Label */}
        <div className="text-sm sm:text-base font-semibold dark:text-white order-first sm:order-none w-full sm:w-auto text-center sm:text-left">
          {/* This will be replaced by the calendar's label */}
        </div>
        
        {/* View Switcher */}
        <div className="flex items-center gap-1">
          {getVisibleViews().map((v) => (
            <button
              key={v}
              onClick={() => handleOnChangeView(v as View)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                view === v
                  ? 'bg-[#e35336] text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={v === 'work_week' ? 'Work Week' : v.charAt(0).toUpperCase() + v.slice(1)}
            >
              {screenSize === 'xs' ? (
                v === 'month' ? <Grid className="w-3 h-3" /> : v === 'day' ? <CalendarIcon className="w-3 h-3" /> : <List className="w-3 h-3" />
              ) : (
                v === 'work_week' ? 'Work' : v.charAt(0).toUpperCase() + v.slice(1)
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={handleOnChangeView}
          views={getVisibleViews()}
          style={{ height: getHeight() }}
          min={new Date(new Date().setHours(7, 0, 0, 0))}
          max={new Date(new Date().setHours(20, 0, 0, 0))}
          step={screenSize === 'xs' ? 60 : 30}
          timeslots={screenSize === 'xs' ? 1 : 2}
          eventPropGetter={() => ({
            style: {
              backgroundColor: "#e35336",
              borderRadius: screenSize === 'xs' ? "2px" : "4px",
              color: "white",
              border: "none",
              fontSize: screenSize === 'xs' ? "10px" : "12px",
              padding: screenSize === 'xs' ? "0 2px" : "0 4px",
            },
          })}
          dayPropGetter={(date) => {
            const isToday = new Date().toDateString() === date.toDateString();
            return {
              style: isToday ? {
                backgroundColor: "#fce8e6",
              } : {}
            };
          }}
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
