"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { eventsAPI, Event } from "@/lib/api/content";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/hooks/useTranslations";
import BigCalendar from "@/components/BigCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { useAuth } from "@/context/AuthContext";
import { formatDateByCalendarType } from "@/lib/calendar-utils";
import {
  CalendarDays,
  MapPin,
  Search,
} from "lucide-react";

type CalendarView = "today" | "upcoming" | "month";

const categoryBadgeClass: Record<string, string> = {
  ACADEMIC: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  SPORTS: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  CULTURAL: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  HOLIDAY: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  OTHER: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const getEventStart = (event: Event) => new Date(event.startDate);

const getEventEnd = (event: Event) =>
  event.endDate ? new Date(event.endDate) : new Date(event.startDate);

const isFeeDeadlineEvent = (event: Event) =>
  event.source === "FEE_DEADLINE" || event.eventType === "FEE_DEADLINE";

const humanizeInstallmentTitle = (value: string) =>
  value
    .replace(/\b([A-Z][A-Z0-9]*)_INSTALLMENT_(\d+)\b/gi, (_, feeType: string, index: string) => {
      const feeLabel = feeType
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return `${feeLabel} installment ${index}`;
    })
    .replace(/_/g, " ");

const normalizeFeeDeadlineEvent = (event: Event): Event => {
  if (!isFeeDeadlineEvent(event)) return event;

  const rawTitle = String(event.title || "Fee payment").trim();
  const title = /^Fee due:\s*\d+\s+students?/i.test(rawTitle)
    ? "Fee payment"
    : humanizeInstallmentTitle(rawTitle);
  return {
    ...event,
    title,
    description: `${title} due.`,
  };
};

const EventListPage = () => {
  const { t } = useTranslations<any>("calendar");
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isAdmin = role === "ADMIN" || role === "IT_MANAGER" || role === "REGISTRAR";
  const calendarType = user?.calendarType || "ETHIOPIAN";
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<CalendarView>("month");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const feedFrom = useMemo(() => startOfDay(new Date()).toISOString(), []);

  useEffect(() => {
    setSelectedEventId(null);
  }, [view, searchQuery]);

  const { data: eventsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKeys.events.calendarFeed, feedFrom],
    queryFn: async () => {
      const response = await eventsAPI.getCalendarFeed({ from: feedFrom });
      const payload = response.data as Event[] | { data?: Event[] };
      const items = Array.isArray(payload) ? payload : payload.data || [];
      return items.map(normalizeFeeDeadlineEvent);
    },
    staleTime: 30000,
    retry: 2,
  });

  const calendarEvents = useMemo(
    () =>
      (eventsData || []).filter(
        (event) =>
          event.source !== "TERM" &&
          event.eventType !== "ACADEMIC_TERM" &&
          getEventEnd(event) >= startOfDay(today),
      ),
    [eventsData, today],
  );

  const sortedEvents = useMemo(
    () =>
      calendarEvents
        .slice()
        .sort((a: Event, b: Event) => getEventStart(a).getTime() - getEventStart(b).getTime()),
    [calendarEvents],
  );

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedEvents;

    return sortedEvents.filter((event) =>
      [event.title, event.description, event.location, event.category, event.eventType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [searchQuery, sortedEvents]);

  const todayEvents = useMemo(
    () =>
      filteredEvents.filter((event) => {
        const start = getEventStart(event);
        const end = getEventEnd(event);
        return start <= endOfDay(today) && end >= startOfDay(today);
      }),
    [filteredEvents, today],
  );

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 30);
    return filteredEvents.filter((event) => {
      const start = getEventStart(event);
      const end = getEventEnd(event);
      return end >= startOfDay(now) && start <= endOfDay(limit);
    });
  }, [filteredEvents]);

  const monthEvents = filteredEvents;
  const visibleEvents =
    view === "today" ? todayEvents : view === "upcoming" ? upcomingEvents : monthEvents;
  const selectedEvent =
    selectedEventId && visibleEvents.find((event) => event.id === selectedEventId)
      ? visibleEvents.find((event) => event.id === selectedEventId)
      : visibleEvents[0];

  const formatDateRange = (event: Event) => {
    const start = getEventStart(event);
    const end = getEventEnd(event);
    const startLabel = formatDateByCalendarType(start, calendarType);
    const endLabel = formatDateByCalendarType(end, calendarType);
    return isSameDay(start, end) ? startLabel : `${startLabel} - ${endLabel}`;
  };

  const renderEventCard = (event: Event, compact = false) => {
    const isSelected = selectedEvent?.id === event.id;
    const category = event.category || "OTHER";
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => setSelectedEventId(event.id)}
        className={`w-full rounded-lg border bg-white p-3 text-left transition hover:border-[var(--brand-color,#e35336)] hover:shadow-sm dark:bg-slate-900 ${
          isSelected
            ? "border-[var(--brand-color,#e35336)] ring-2 ring-[rgba(var(--brand-color-rgb,227,83,54),0.16)]"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <TranslatedText
            as="h3"
            text={event.title}
            textClassName={`${compact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-white line-clamp-2`}
            className="min-w-0"
          />
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${categoryBadgeClass[category] || categoryBadgeClass.OTHER}`}>
            {t.categories?.[category] || category}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateRange(event)}
          </span>
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
        </div>
        {!compact && event.description ? (
          <TranslatedText
            text={event.description}
            textClassName="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2"
          />
        ) : null}
      </button>
    );
  };

  const renderEmptyState = () => (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
      {searchQuery ? "No events match your search." : t.noActivities}
    </div>
  );

  return (
    <div className="m-1 mt-0 flex-1 overflow-x-hidden rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:m-2 md:m-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950 dark:text-white">{t.title}</h1>
          {isAdmin ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-[220px] sm:w-[400px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder || t.title}
              className="pl-9"
            />
          </div>
          {isAdmin ? <FormModal table="event" type="create" /> : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[420px] rounded-lg" />
          <Skeleton className="h-[420px] rounded-lg" />
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30">
          <CardContent className="space-y-3 p-4 text-sm text-red-700 dark:text-red-200">
            <p className="font-medium">Calendar could not load</p>
            <p>{error instanceof Error ? error.message : "Failed to load calendar feed."}</p>
            <Button type="button" onClick={() => refetch()} size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={view} onValueChange={(value) => setView(value as CalendarView)} className="space-y-4">
          <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-800">
            <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
              <TabsTrigger
                value="month"
                className="shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs font-semibold data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-color,#e35336)] data-[state=active]:shadow-none md:px-4 md:text-sm"
              >
                Month
              </TabsTrigger>
              <TabsTrigger
                value="today"
                className="shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs font-semibold data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-color,#e35336)] data-[state=active]:shadow-none md:px-4 md:text-sm"
              >
                Today ({todayEvents.length})
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs font-semibold data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-color,#e35336)] data-[state=active]:shadow-none md:px-4 md:text-sm"
              >
                Next 30 days ({upcomingEvents.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="month" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-h-[360px] rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <BigCalendar
                  events={monthEvents.map((event) => ({
                    ...event,
                    endDate: event.endDate || undefined,
                  }))}
                  height={460}
                  onEventClick={(event) => setSelectedEventId(event.id || null)}
                />
              </div>
              <aside className="max-h-[520px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                {monthEvents.length ? monthEvents.map((event) => renderEventCard(event, true)) : renderEmptyState()}
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="today" className="mt-0">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-2">{todayEvents.length ? todayEvents.map((event) => renderEventCard(event)) : renderEmptyState()}</div>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                {selectedEvent ? renderEventCard(selectedEvent, true) : renderEmptyState()}
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-2">{upcomingEvents.length ? upcomingEvents.map((event) => renderEventCard(event)) : renderEmptyState()}</div>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                {selectedEvent ? renderEventCard(selectedEvent, true) : renderEmptyState()}
              </aside>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EventListPage;
