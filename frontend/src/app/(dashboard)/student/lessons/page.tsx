"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Views } from "react-big-calendar";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { lessonsAPI, Lesson } from "@/lib/api/content";
import { periodTimeAPI, type PeriodTime } from "@/lib/api/siren-period-time";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
import BigCalendar, { type CalendarDisplayEvent } from "@/components/BigCalendar";
import TableSearch from "@/components/TableSearch";
import { BookOpen, BookText, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const StudentLessonsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { schoolCalendarType } = useAcademicYear();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [periodTimes, setPeriodTimes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.role === "STUDENT") {
      void fetchLessons();
      void fetchPeriodTimes();
    }
  }, [isAuthenticated, isLoading, user, schoolCalendarType]);

  const fetchPeriodTimes = async () => {
    if (!user?.schoolId) return;
    try {
      const response = await periodTimeAPI.list(user.schoolId);
      const mapped = (response.data || []).reduce((acc: Record<number, string>, period: PeriodTime) => {
        acc[period.periodNumber] = formatTimeByCalendarType(period.startTime, schoolCalendarType);
        return acc;
      }, {});
      setPeriodTimes(mapped);
    } catch {
      setPeriodTimes({});
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await lessonsAPI.getForStudent();
      setLessons(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch lessons:", error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    const subjectName = lesson.subject?.name || "";
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === "all" || subjectName === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = Array.from(new Set(lessons.map((lesson) => lesson.subject?.name).filter(Boolean)));
  const lessonCalendarEvents: CalendarDisplayEvent[] = filteredLessons.map((lesson) => ({
    id: lesson.id,
    title: `${lesson.subject?.name || "Lesson"}: ${lesson.title}${lesson.periodNumber ? ` ${periodTimes[lesson.periodNumber] || `P${lesson.periodNumber}`}` : ""}`,
    startDate: lesson.lessonDate,
    endDate: lesson.lessonDate,
    eventType: "ACADEMIC",
    resource: lesson,
  }));

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-color,#e35336)] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 bg-[#F8FAFC] p-6 dark:bg-[#111111]">
      <div>
        <h1 className="text-2xl font-bold text-[#e35336]">My Lessons</h1>
        <p className="text-gray-500 dark:text-gray-400">View your published lesson plans and materials</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 pt-6"><BookText className="h-5 w-5 text-gray-500" /><div><p className="text-sm text-gray-500">Total Lessons</p><p className="text-xl font-bold">{lessons.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><BookOpen className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-gray-500">Visible</p><p className="text-xl font-bold">{filteredLessons.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Calendar className="h-5 w-5 text-green-500" /><div><p className="text-sm text-gray-500">Subjects</p><p className="text-xl font-bold">{subjects.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Clock className="h-5 w-5 text-orange-500" /><div><p className="text-sm text-gray-500">Homework</p><p className="text-xl font-bold">{lessons.filter((lesson) => lesson.homework).length}</p></div></CardContent></Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <TableSearch search={searchTerm} setSearch={setSearchTerm} placeholder="Search lessons..." className="flex-1" />
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject || ""}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
        <CardHeader className="border-b border-gray-100 dark:border-[#2A2A2A]">
          <CardTitle className="text-lg">Lesson Calendar</CardTitle>
          <CardDescription>Weekly calendar view for your lessons</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <BigCalendar
            events={lessonCalendarEvents}
            initialView={Views.MONTH}
            views={[Views.MONTH]}
            height={640}
            onEventClick={(event) => {
              const lesson = event.resource as Lesson | undefined;
              if (lesson?.id) router.push(`/student/lessons/${lesson.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLessonsPage;
