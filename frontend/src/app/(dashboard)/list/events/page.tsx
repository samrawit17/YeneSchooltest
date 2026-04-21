"use client";

import { useEffect, useState } from 'react';
import FormModal from '@/components/FormModal';
import Pagination from '@/components/Pagination';
import Table from '@/components/Table';
import TableSearch from '@/components/TableSearch';
import { eventsAPI, Event } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import BigCalendar from '@/components/BigCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Filter, ArrowDownUp, Calendar, List } from 'lucide-react';
import Image from 'next/image';

const columns = [
  {
    header: 'Title',
    accessor: 'title',
  },
  {
    header: 'Type',
    accessor: 'eventType',
    className: 'hidden md:table-cell',
  },
  {
    header: 'Date',
    accessor: 'startDate',
    className: 'hidden md:table-cell',
  },
  {
    header: 'Location',
    accessor: 'location',
    className: 'hidden lg:table-cell',
  },
  {
    header: 'Actions',
    accessor: 'action',
  },
];

const EventListPage = () => {
  const [role, setRole] = useState<string>('admin');
  const [page, setPage] = useState(1);

  // Get user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setRole(user.role?.toLowerCase() || 'admin');
    }
  }, []);

  // Fetch events from API
  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ['events', role],
    queryFn: async () => {
      const response = await eventsAPI.getAll({ role });
      return response.data;
    },
  });

  // Filter upcoming events (within the next 2 weeks)
  const upcomingEvents = eventsData?.filter((event) => {
    const eventDate = new Date(event.startDate);
    const now = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    return eventDate >= now && eventDate <= twoWeeksLater;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) || [];

  const renderRow = (item: Event) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-3 p-3 md:p-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.title}</p>
          <p className="text-xs text-gray-500 line-clamp-1 md:hidden">{item.description}</p>
        </div>
      </td>
      <td className="hidden md:table-cell p-3 md:p-4">
        <span className={`px-2 py-1 rounded-full text-xs ${item.eventType === 'ACADEMIC' ? 'bg-blue-100 text-blue-800' :
            item.eventType === 'EXTRACURRICULAR' ? 'bg-green-100 text-green-800' :
              item.eventType === 'SPORTS' ? 'bg-orange-100 text-orange-800' :
                item.eventType === 'ADMINISTRATIVE' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
          }`}>
          {item.eventType}
        </span>
      </td>
      <td className="hidden md:table-cell p-3 md:p-4 text-xs md:text-sm">
        {new Date(item.startDate).toLocaleDateString()}
      </td>
      <td className="hidden lg:table-cell p-3 md:p-4 text-xs md:text-sm">{item.location || '-'}</td>
      <td className="p-3 md:p-4">
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <>
              <FormModal table="event" type="update" data={item} />
              <FormModal table="event" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white dark:bg-[#1E293B] p-2 md:p-4 rounded-md flex-1 m-0 md:m-4 mt-0 md:mt-0 border border-gray-200 dark:border-[#334155] overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 mb-3 md:mb-4">
        <h1 className="text-lg md:text-xl font-semibold dark:text-white">All Events</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-auto order-2 sm:order-1">
            <div className="w-full sm:w-48">
              <TableSearch />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow dark:bg-amber-600">
              <Filter className="w-4 h-4 text-gray-700 dark:text-white" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow dark:bg-amber-600">
              <ArrowDownUp className="w-4 h-4 text-gray-700 dark:text-white" />
            </button>
            {role === 'admin' && <FormModal table="event" type="create" />}
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full h-full flex flex-col">
        {/* Mobile-friendly Tab Switcher */}
        <div className="flex items-center justify-between mb-3">
          <TabsList className="bg-gray-100 dark:bg-gray-700">
            <TabsTrigger 
              value="calendar" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#e35336] data-[state=active]:text-white"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="list" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#e35336] data-[state=active]:text-white"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="sm:hidden text-xs text-gray-500">
            {upcomingEvents.length} upcoming
          </div>
        </div>

        <TabsContent value="calendar" className="h-[350px] sm:h-[380px] sm:h-[450px] md:h-[550px] lg:h-[650px] mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
            </div>
          ) : (
            <BigCalendar events={eventsData || []} />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0 overflow-hidden">
          <div className="overflow-x-auto -mx-2 px-2">
            <Table
              columns={columns}
              renderRow={renderRow}
              data={eventsData || []}
            />
          </div>
          <div className="mt-3">
            <Pagination page={page} setPage={setPage} totalPages={10} />
          </div>
        </TabsContent>
      </Tabs>

      {/* UPCOMING EVENTS SECTION */}
      <div className="mt-4 md:mt-6 border-t border-gray-200 dark:border-[#334155] pt-3 md:pt-4">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold dark:text-white">Upcoming Events</h2>
          <span className="hidden sm:block text-sm text-gray-500">{upcomingEvents.length} events</span>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-[#e35336]" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center p-4 md:p-6 text-sm text-gray-500 dark:text-gray-400">
            No upcoming events in the next 2 weeks
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
            {upcomingEvents.map((event) => (
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
                  <Image src="/date.png" alt="" width={12} height={12} className="w-3 h-3" />
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
