"use client";

import { useEffect, useState } from 'react';
import FormModal from '@/components/FormModal';
import TableSearch from '@/components/TableSearch';
import { eventsAPI, Event } from '@/lib/api/content';
import { useQuery } from '@tanstack/react-query';
import BigCalendar from '@/components/BigCalendar';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

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
  const [role, setRole] = useState<string>('admin');
  const [initialLoad, setInitialLoad] = useState(true);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setRole(user.role?.toLowerCase() || 'admin');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoad(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch events from API
  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const response = await eventsAPI.getAll();
        return response.data?.data || response.data;
      } catch (error) {
        console.error("Failed to fetch events:", error);
        return [];
      } finally {
        setInitialLoad(false);
        setLoadTimeout(false);
      }
    },
    staleTime: 30000,
    retry: 1,
  });

  // Filter activities in the next month
  const upcomingActivities = eventsData?.filter((event) => {
    const eventDate = new Date(event.startDate);
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return eventDate >= now && eventDate <= oneMonthLater;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) || [];

  const eventCount = upcomingActivities.length;

  return (
    <div className="bg-white dark:bg-[#1E293B] p-2 md:p-4 rounded-md flex-1 m-0 md:m-4 mt-0 md:mt-0 border border-gray-200 dark:border-[#334155] overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 mb-3 md:mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-semibold dark:text-white">School Calendar</h1>
          {role === 'admin' && (
            <p className="text-sm text-muted-foreground mt-1">View and manage school events, holidays, and important dates on the calendar.</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:flex-1 order-2 sm:order-1">
            <div className="w-full sm:max-w-md">
              <TableSearch />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            {role === 'admin' && <FormModal table="event" type="create" />}
          </div>
        </div>
      </div>

      <div className="h-[350px] sm:h-[380px] sm:h-[450px] md:h-[550px] lg:h-[650px]">
        {initialLoad ? (
          <CalendarSkeleton />
        ) : (
          <BigCalendar events={eventsData || []} />
        )}
      </div>

      {/* UPCOMING EVENTS SECTION */}
      <div className="mt-4 md:mt-6 border-t border-gray-200 dark:border-[#334155] pt-3 md:pt-4">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold dark:text-white">Upcoming Activities</h2>
          <span className="text-sm text-gray-500">{eventCount} activities</span>
        </div>
        
        {eventCount === 0 ? (
          <div className="text-center p-4 md:p-6 text-sm text-gray-500 dark:text-gray-400">
            No activities in the next month
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
            {upcomingActivities.map((event) => (
              <div
                key={event.id}
                className="p-3 md:p-4 rounded-lg border-2 border-[#e35336]/30 hover:border-[#e35336] hover:shadow-md transition-all bg-white dark:bg-[#1E293B] dark:border-[#334155] cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-1 flex-1">{event.title}</h3>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs flex-shrink-0 ${event.eventType === 'ACADEMIC' ? 'bg-blue-100 text-blue-800' :
                      event.eventType === 'EXTRACURRICULAR' ? 'bg-green-100 text-green-800' :
                        event.eventType === 'SPORTS' ? 'bg-orange-100 text-orange-800' :
                          event.eventType === 'ADMINISTRATIVE' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                    }`}>
                    {event.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1.5 md:mb-2">
                  <span>📅</span>
                  <span className="truncate">{new Date(event.startDate).toLocaleDateString()}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                    <span>📍</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 hidden sm:block">{event.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventListPage;
