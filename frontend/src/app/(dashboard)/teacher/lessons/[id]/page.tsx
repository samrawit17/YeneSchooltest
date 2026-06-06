"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { lessonsAPI, Lesson } from "@/lib/api/content";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  Users,
  Clock,
  FileText,
  Send,
  Download,
} from "lucide-react";

// Shadcn/ui Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TranslatedText } from "@/components/translation/TranslatedText";

const LessonDetailPage = () => {
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
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Lesson Plans", href: "/teacher/lessons", isCurrent: false },
      { label: lesson?.title || "Lesson Details", isCurrent: true },
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
      setLesson(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      await lessonsAPI.publish(lessonId);
      toast.success("Lesson submitted for review successfully!");
      fetchLesson();
    } catch (error: any) {
      console.error("Failed to publish lesson:", error);
      toast.error("Failed to publish lesson");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    
    try {
      await lessonsAPI.delete(lessonId);
      toast.success("Lesson deleted successfully");
      router.push("/teacher/lessons");
    } catch (error: any) {
      console.error("Failed to delete lesson:", error);
      toast.error("Failed to delete lesson");
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

  const isOwner = user?.id === lesson.teacherId;
  const canEdit = isOwner && lesson.status !== "PUBLISHED" && lesson.status !== "PENDING_REVIEW";
  const canPublish = isOwner && lesson.status === "DRAFT";

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
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
                textClassName="text-2xl font-bold text-[#e35336]"
              />
              <Badge
                variant={lesson.status === "PUBLISHED" ? "default" : "secondary"}
              >
                {lesson.status}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {lesson.subject?.name} • Grade {lesson.grade} - Section {lesson.section}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canPublish && (
            <Button onClick={handleSubmitForReview}>
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => router.push(`/teacher/lessons/${lessonId}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lesson Content, Objective & Homework combined */}
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {lesson.objective && (
                <div className="p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    <BookOpen className="w-4 h-4 text-[#e35336]" />
                    Learning Objective
                  </h3>
                  <TranslatedText text={lesson.objective} textClassName="text-sm text-slate-700 dark:text-slate-300" />
                </div>
              )}

              <div className="p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    <FileText className="w-4 h-4 text-[#e35336]" />
                    Lesson Content
                </h3>
                {lesson.lessonContent ? (
                  <TranslatedText text={lesson.lessonContent} textClassName="text-sm text-slate-700 dark:text-slate-300" />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">No content added yet.</p>
                )}
              </div>

              {(lesson.homework || lesson.instructions) && (
                <div className="p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    <FileText className="w-4 h-4 text-[#e35336]" />
                    Homework
                  </h3>
                  {typeof lesson.homework === "string" ||
                  (lesson.homework as any)?.description ||
                  (lesson.homework as any)?.title ||
                  lesson.instructions ? (
                    <TranslatedText
                      text={
                        typeof lesson.homework === "string"
                          ? lesson.homework
                          : (lesson.homework as any)?.description ||
                            (lesson.homework as any)?.title ||
                            lesson.instructions ||
                            ""
                      }
                      textClassName="text-sm text-slate-700 dark:text-slate-300"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300">No homework assigned.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {((lesson as any).attachmentsNew || lesson.attachments) && (((lesson as any).attachmentsNew || lesson.attachments).length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(((lesson as any).attachmentsNew || lesson.attachments) as any[]).map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{attachment.fileName || attachment.name}</p>
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

export default LessonDetailPage;
