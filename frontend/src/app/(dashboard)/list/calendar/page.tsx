"use client";

import { useEffect, useState } from 'react';
import FormModal from '@/components/FormModal';
import TableSearch from '@/components/TableSearch';
import { eventsAPI, Event } from '@/lib/api/content';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from "@/hooks/useTranslations";
import BigCalendar from '@/components/BigCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { TranslatedText } from '@/components/translation/TranslatedText';

const getEventCategoryBadge = (category: string) => {
  switch (category) {
    case "ACADEMIC":
      return "bg-blue-100 text-blue-800";
    case "SPORTS":
      return "bg-orange-100 text-orange-800";
    case "CULTURAL":
      return "bg-green-100 text-green-800";
    case "HOLIDAY":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const CalendarSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-[300px] md:h-[400px] w-full" />
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const EventListPage = () => {
  const { t, locale } = useTranslations<any>("calendar");
  const [role, setRole] = useState<string>('admin');
  
  useEffect(() => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setRole(user.role?.toLowerCase() || 'admin');
    }
  }, []);

  // Fetch unified school calendar feed from API.
  const { data: eventsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.events.calendarFeed,
    queryFn: async () => {
      const response = await eventsAPI.getCalendarFeed();
      const payload = response.data as Event[] | { data?: Event[] };
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    staleTime: 30000,
    retry: 2,
  });

  // Filter activities in the next month
  const upcomingActivities = (eventsData || []).filter((event: Event) => {
    const eventDate = new Date(event.startDate);
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return eventDate >= now && eventDate <= oneMonthLater;
  }).sort((a: Event, b: Event) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const eventCount = upcomingActivities.length;

  return (
    <div className="bg-white dark:bg-[#1E293B] p-2 md:p-4 rounded-md flex-1 m-1 sm:m-2 md:m-4 mt-0 border border-gray-200 dark:border-[#334155] overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 mb-4 sm:mb-6 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold dark:text-white truncate">{t.title}</h1>
          {role === 'admin' && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{t.description}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:min-w-0">
          <div className="w-full sm:flex-1 order-2 sm:order-1">
            <div className="w-full sm:max-w-md">
              <TableSearch placeholder={t.searchPlaceholder || t.title} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 order-1 sm:order-2 shrink-0">
            {role === 'admin' && <FormModal table="event" type="create" />}
          </div>
        </div>
      </div>

      <div className="min-h-[300px] sm:min-h-[350px] md:min-h-[450px] lg:min-h-[550px]">
        {isLoading ? (
          <CalendarSkeleton />
        ) : isError ? (
          <Card className="border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30">
            <CardContent className="space-y-3 p-4 text-sm text-red-700 dark:text-red-200">
              <p className="font-medium">Calendar could not load</p>
              <p>{error instanceof Error ? error.message : "Failed to load calendar feed."}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        ) : (
          <BigCalendar events={(eventsData || []).map((event) => ({
            ...event,
            endDate: event.endDate || undefined,
          }))} />
        )}
      </div>

      {/* UPCOMING EVENTS SECTION */}
      <div className="mt-4 md:mt-6 border-t border-gray-200 dark:border-[#334155] pt-3 md:pt-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
          <h2 className="text-sm sm:text-base md:text-xl font-semibold dark:text-white">{t.upcoming}</h2>
          <span className="text-[11px] sm:text-sm text-gray-500">{t.activities.replace("{count}", String(eventCount))}</span>
        </div>
        
        {eventCount === 0 ? (
          <div className="text-center p-3 sm:p-4 md:p-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t.noActivities}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
            {upcomingActivities.map((event) => (
              <div
                key={event.id}
                className="p-2.5 sm:p-3 md:p-4 rounded-lg border-2 border-[var(--brand-color,#e35336)]/30 hover:border-[var(--brand-color,#e35336)] hover:shadow-md transition-all bg-white dark:bg-[#1E293B] dark:border-[#334155] cursor-pointer active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <TranslatedText
                    as="h3"
                    text={event.title}
                    textClassName="font-semibold text-xs sm:text-sm text-gray-800 dark:text-white line-clamp-1"
                    className="flex-1"
                  />
                    <span className={`px-1 py-0.5 rounded-full text-[9px] sm:text-xs flex-shrink-0 leading-tight ${getEventCategoryBadge(event.category || "OTHER")}`}>
                    {t.categories[event.category || "OTHER"]}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1 sm:mb-1.5">
                  <span className="text-[10px] sm:text-xs">📅</span>
                  <span className="truncate">
                    {new Date(event.startDate).toLocaleDateString(locale)}
                    {event.endDate ? ` - ${new Date(event.endDate).toLocaleDateString(locale)}` : ""}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1 sm:mb-1.5">
                    <span className="text-[10px] sm:text-xs">📍</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                {event.description && (
                  <TranslatedText
                    text={event.description}
                    textClassName="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2"
                    className="hidden sm:block"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventListPage;
