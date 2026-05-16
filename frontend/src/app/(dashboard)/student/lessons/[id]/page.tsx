"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { lessonsAPI, Lesson } from "@/lib/api/content";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileText,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentLessonDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { setItems } = useBreadcrumb();
  const { formatDate: formatSchoolDate } = useAcademicYear();
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const title = lesson?.title || "Lesson Details";
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "My Lessons", href: "/student/lessons", isCurrent: false },
      { label: title, isCurrent: true },
    ]);
    return () => setItems(null);
  }, [lesson?.title, setItems]);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!isAuthenticated || isLoading || !lessonId) return;

      try {
        setLoading(true);
        const response = await lessonsAPI.getById(lessonId);
        setLesson(response.data);
      } catch (error: any) {
        console.error("Failed to fetch lesson:", error);
        toast.error(error?.response?.data?.message || "Failed to load lesson details");
        router.push("/student/lessons");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [isAuthenticated, isLoading, lessonId, router]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "N/A";
    return formatSchoolDate(date);
  };

  const homework =
    typeof lesson?.homework === "string"
      ? { title: "Homework", description: lesson.homework }
      : lesson?.homework && typeof lesson.homework === "object"
        ? (lesson.homework as { title?: string; description?: string })
        : null;

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e35336] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !lesson) {
    return null;
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] p-6 dark:bg-[#0F172A]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#e35336]">{lesson.title}</h1>
              <Badge variant={lesson.status === "PUBLISHED" ? "default" : "secondary"}>
                {lesson.status}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {lesson.subject?.name || "Subject"} - Grade {lesson.grade} Section{" "}
              {lesson.section}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="space-y-6 p-6">
              {lesson.objective && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <BookOpen className="h-5 w-5" />
                    Learning Objective
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">{lesson.objective}</p>
                </div>
              )}

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5" />
                  Lesson Content
                </h3>
                <div
                  className="prose max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: lesson.lessonContent || "<p>No content added yet.</p>",
                  }}
                />
              </div>

              {homework && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5" />
                    {homework.title || "Homework"}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {homework.description || "No homework details added."}
                  </p>
                </div>
              )}

              {lesson.attachments && lesson.attachments.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <Download className="h-5 w-5" />
                    Attachments
                  </h3>
                  <div className="space-y-2">
                    {lesson.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {attachment.fileSize
                                ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                                : "Attachment"}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(lesson.lessonDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-medium">Period {lesson.periodNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="font-medium">{lesson.subject?.name || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Class</p>
                  <p className="font-medium">
                    Grade {lesson.grade} - Section {lesson.section}
                    {lesson.stream && ` (${lesson.stream})`}
                  </p>
                </div>
              </div>
              {lesson.academicYear && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Academic Year</p>
                    <p className="font-medium">{lesson.academicYear.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <span className="font-medium text-indigo-600">
                    {lesson.teacher?.name?.charAt(0) || "T"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{lesson.teacher?.name || "Teacher"}</p>
                  <p className="text-sm text-gray-500">{lesson.teacher?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
