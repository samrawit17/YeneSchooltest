"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { lessonsAPI, Lesson } from "@/lib/api/content";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Users,
  Clock,
  FileText,
  Download,
  User,
} from "lucide-react";

// Shadcn/ui Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TranslatedText } from "@/components/translation/TranslatedText";

const ParentLessonDetailPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { setItems } = useBreadcrumb();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  const lessonId = params.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  // Set breadcrumbs with lesson title
  useEffect(() => {
    const lessonTitle = lesson?.title || "Lesson Details";
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Children Lessons", href: "/parent/lessons", isCurrent: false },
      { label: lessonTitle, isCurrent: true },
    ]);
    return () => setItems(null);
  }, [lesson?.title, setItems]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && lessonId) {
      fetchLesson();
    }
  }, [isAuthenticated, isLoading, lessonId]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await lessonsAPI.getById(lessonId);
      setLesson(response.data);
    } catch (error: any) {
      console.error("Failed to fetch lesson:", error);
      toast.error("Failed to load lesson details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const homework =
    typeof lesson?.homework === "string"
      ? { title: "Homework", description: lesson.homework }
      : lesson?.homework && typeof lesson.homework === "object"
        ? (lesson.homework as { title?: string; description?: string })
        : null;

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-[var(--brand-color,#e35336)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !lesson) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#111111]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <TranslatedText
                as="h1"
                text={lesson.title}
                textClassName="text-2xl font-bold text-gray-900 dark:text-white"
              />
              <Badge
                variant={lesson.status === "PUBLISHED" ? "default" : "secondary"}
              >
                {lesson.status}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {lesson.subject?.name} • Grade {lesson.grade} - Section {lesson.section}
              {lesson.studentName && ` • Child: ${lesson.studentName}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lesson Content & Objective */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Lesson Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lesson.objective && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    Learning Objective
                  </h3>
                  <TranslatedText text={lesson.objective} textClassName="text-gray-700 dark:text-gray-300" />
                </div>
              )}
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: lesson.lessonContent || "<p>No content added yet.</p>" }}
              />
            </CardContent>
          </Card>

          {/* Homework */}
          {homework && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {homework.title ? (
                    <TranslatedText as="span" text={homework.title} showControls={false} />
                  ) : (
                    "Homework"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {homework.description ? (
                  <TranslatedText text={homework.description} textClassName="text-gray-700 dark:text-gray-300" />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">No homework details added.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {lesson.attachments && lesson.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lesson.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{attachment.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.fileSize && (attachment.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(lesson.lessonDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="font-medium">Period {lesson.periodNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="font-medium">{lesson.subject?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Class</p>
                  <p className="font-medium">
                    Grade {lesson.grade} - Section {lesson.section}
                    {lesson.stream && ` (${lesson.stream})`}
                  </p>
                </div>
              </div>
              {lesson.semester && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Semester</p>
                    <p className="font-medium">{lesson.semester.name}</p>
                  </div>
                </div>
              )}
              {lesson.academicYear && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Academic Year</p>
                    <p className="font-medium">{lesson.academicYear.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teacher Info */}
          <Card>
            <CardHeader>
              <CardTitle>Teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-medium">
                    {lesson.teacher?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{lesson.teacher?.name}</p>
                  <p className="text-sm text-gray-500">{lesson.teacher?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParentLessonDetailPage;
