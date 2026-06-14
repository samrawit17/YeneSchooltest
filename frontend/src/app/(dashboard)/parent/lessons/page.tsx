"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { lessonsAPI, Lesson } from "@/lib/api/content";
import { periodTimeAPI, type PeriodTime } from "@/lib/api/siren-period-time";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
import TableSearch from "@/components/TableSearch";
import BigCalendar, { type CalendarDisplayEvent } from "@/components/BigCalendar";
import { Views } from "react-big-calendar";
import {
  BookText,
  Calendar,
  BookOpen,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
} from "lucide-react";

// Shadcn/ui Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Child {
  studentId: string;
  studentName: string;
}

// Helper to get subject name
const getSubjectName = (subject: Lesson['subject']) => {
  if (!subject) return 'N/A';
  if (typeof subject === 'string') return subject;
  return subject?.name || 'N/A';
};

// Helper to get student name
const getStudentName = (lesson: Lesson) => {
  return lesson.studentName || 'N/A';
};

const ParentLessonsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { schoolCalendarType } = useAcademicYear();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [periodTimes, setPeriodTimes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterChild, setFilterChild] = useState<string>("all");
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.role === "PARENT") {
      fetchLessons();
      fetchPeriodTimes();
    }
  }, [isAuthenticated, isLoading, user, page, filterSubject, filterChild, schoolCalendarType]);

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
      const studentId = filterChild !== "all" ? filterChild : undefined;
      const response = await lessonsAPI.getForParent(studentId);
      const { data, meta } = response.data;
      
      setLessons(data || []);
      setTotalPages(meta?.totalPages || 1);

      // Extract unique children from lessons
      const uniqueChildren = (data || [])
        .filter((l: any) => l.studentId)
        .reduce((acc: Child[], lesson: any) => {
          if (!acc.find((c) => c.studentId === lesson.studentId)) {
            acc.push({
              studentId: lesson.studentId,
              studentName: lesson.studentName || "Unknown",
            });
          }
          return acc;
        }, []);
      setChildren(uniqueChildren);
    } catch (error: any) {
      console.error("Failed to fetch lessons:", error);
      setLessons([]);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSubjectName(lesson.subject).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject =
      filterSubject === "all" || getSubjectName(lesson.subject) === filterSubject;
    const matchesChild =
      filterChild === "all" ||
      (lesson as any).studentId === filterChild;
    return matchesSearch && matchesSubject && matchesChild;
  });

  const subjectList = lessons
    .map((l) => l.subject?.name)
    .filter((name): name is string => Boolean(name));
  const subjects = Array.from(new Set(subjectList));
  const lessonCalendarEvents: CalendarDisplayEvent[] = filteredLessons.map((lesson) => ({
    id: lesson.id,
    title: `${getSubjectName(lesson.subject)}: ${lesson.title}${lesson.periodNumber ? ` ${periodTimes[lesson.periodNumber] || `P${lesson.periodNumber}`}` : ""}`,
    startDate: lesson.lessonDate,
    endDate: lesson.lessonDate,
    eventType: "ACADEMIC",
    resource: lesson,
  }));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (loading || isLoading) {
    return (
      <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#111111]">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-[200px]" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="dark:bg-[#111111] dark:border-[#2A2A2A]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div>
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[180px]" />
        </div>

        <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
          <CardContent className="p-4">
            <Skeleton className="h-[640px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#111111]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Children's Lessons
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View lesson plans and materials for your children
          </p>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <User className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Select Child:</span>
              <Select value={filterChild} onValueChange={setFilterChild}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Children" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Children</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.studentId} value={child.studentId}>
                      {child.studentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Total Lessons</p>
                <p className="text-xl font-bold">{lessons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-xl font-bold">
                  {lessons.filter(
                    (l) =>
                      new Date(l.lessonDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Subjects</p>
                <p className="text-xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">With Homework</p>
                <p className="text-xl font-bold">
                  {lessons.filter((l) => l.homework).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <TableSearch
          search={searchTerm}
          setSearch={setSearchTerm}
          placeholder="Search lessons..."
          className="flex-1"
        />
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject!}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lesson Calendar */}
      <Card className="overflow-hidden border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
        <CardHeader className="border-b border-gray-100 dark:border-[#2A2A2A]">
          <CardTitle className="text-lg">Lesson Calendar</CardTitle>
          <CardDescription>Weekly calendar view for your children's lessons</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <BigCalendar
            events={lessonCalendarEvents}
            initialView={Views.MONTH}
            views={[Views.MONTH]}
            height={640}
            onEventClick={(event) => {
              const lesson = event.resource as Lesson | undefined;
              if (lesson?.id) router.push(`/parent/lessons/${lesson.id}`);
            }}
          />
        </CardContent>
      </Card>

      {filteredLessons.length === 0 && (
        <div className="text-center py-12">
          <BookText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No lessons found
          </h3>
          <p className="text-gray-500">Check back later for new lessons</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ParentLessonsPage;
