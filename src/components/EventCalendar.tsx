"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { eventsAPI, Event } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

const EventCalendar = () => {
  const [value, onChange] = useState<Value>(new Date());
  const { user } = useAuth();

  // Fetch events from API
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["events", user?.role],
    queryFn: async () => {
      const response = await eventsAPI.getAll({ role: user?.role });
      return response.data;
    },
    enabled: !!user,
  });

  // Transform API events to display format
  const displayEvents = events?.slice(0, 5).map((event) => ({
    id: event.id,
    title: event.title,
    time: event.allDay 
      ? "All Day" 
      : `${new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${event.endDate ? new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}`,
    description: event.description,
  })) || [];

  return (
    <div className="bg-white dark:bg-[#1E293B] p-4 rounded-md">
      <Calendar onChange={onChange} value={value} className="dark:text-white" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4 dark:text-white">Events</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#e35336]" />
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
          No events available
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayEvents.map((event) => (
            <div
              className="p-5 rounded-md border-2 border-gray-100 dark:border-[#334155] border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple dark:bg-[#1E293B]"
              key={event.id}
            >
              <div className="flex items-center justify-between">
                <h1 className="font-semibold text-gray-600 dark:text-gray-200">{event.title}</h1>
                <span className="text-gray-300 dark:text-gray-500 text-xs">{event.time}</span>
              </div>
              <p className="mt-2 text-gray-400 dark:text-gray-500 text-sm">{event.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
