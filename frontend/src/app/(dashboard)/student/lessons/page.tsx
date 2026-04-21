"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { lessonsAPI, Lesson } from "@/lib/api";
import { toast } from "sonner";
import TableSearch from "@/components/TableSearch";
import {
  BookText,
  Search,
  Calendar,
  BookOpen,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// Shadcn/ui Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StudentLessonsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.role === "STUDENT") {
      fetchLessons();
    }
  }, [isAuthenticated, isLoading, user, page, filterSubject]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await lessonsAPI.getForStudent();
      const { data, meta: metaData } = response.data;
      setLessons(data);
      setMeta(metaData);
      setTotalPages(metaData?.totalPages || 1);
    } catch (error: any) {
      console.error("Failed to fetch lessons:", error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.subject?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject =
      filterSubject === "all" || lesson.subject?.name === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(lessons.map((l) => l.subject?.name).filter(Boolean))];

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
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">
            My Lessons
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View your published lesson plans and materials
          </p>
        </div>
      </div>

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

      {/* Lessons List */}
      <div className="grid gap-4">
        {filteredLessons.map((lesson) => (
          <Card
            key={lesson.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/student/lessons/${lesson.id}`)}
          >
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center">
                    <BookText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {lesson.subject?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(lesson.lessonDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Period {lesson.periodNumber}
                      </span>
                    </div>
                    {lesson.objective && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {lesson.objective}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lesson.homework && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      Homework
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

export default StudentLessonsPage;
