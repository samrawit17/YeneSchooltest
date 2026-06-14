"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { lessonsAPI, Lesson, UpdateLessonBundleDto } from "@/lib/api/content";
import { periodTimeAPI, type PeriodTime } from "@/lib/api/siren-period-time";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
import { toast } from "sonner";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  title: string;
  objective: string;
  lessonContent: string;
  homework: string;
  periodNumber: number | null;
  status: "DRAFT" | "PUBLISHED" | "PENDING_REVIEW" | "COVERED" | "MISSED" | "RESCHEDULED";
};

type PeriodOption = {
  value: number;
  label: string;
};

export default function EditLessonPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { schoolCalendarType } = useAcademicYear();
  const { setItems } = useBreadcrumb();
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [form, setForm] = useState<FormState>({
    title: "",
    objective: "",
    lessonContent: "",
    homework: "",
    periodNumber: null,
    status: "DRAFT",
  });

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Lesson Plans", href: "/teacher/lessons", isCurrent: false },
      { label: "Edit Lesson", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const load = async () => {
      if (!lessonId || !isAuthenticated || isLoading) return;

      try {
        setLoading(true);
        const [lessonResponse, periodsResponse] = await Promise.all([
          lessonsAPI.getById(lessonId),
          user?.schoolId ? periodTimeAPI.list(user.schoolId) : Promise.resolve({ data: [] }),
        ]);
        const configuredPeriods = ((periodsResponse.data || []) as PeriodTime[])
          .filter((period) => Number.isInteger(Number(period.periodNumber)) && Number(period.periodNumber) > 0)
          .sort((left, right) => Number(left.periodNumber) - Number(right.periodNumber))
          .map((period) => {
            const start = formatTimeByCalendarType(period.startTime, schoolCalendarType);
            const end = formatTimeByCalendarType(period.endTime, schoolCalendarType);
            return {
              value: Number(period.periodNumber),
              label: `Period ${period.periodNumber} (${start} - ${end})`,
            };
          });
        setPeriodOptions(
          configuredPeriods.length
            ? configuredPeriods
            : Array.from({ length: 8 }, (_, index) => ({
                value: index + 1,
                label: `Period ${index + 1}`,
              })),
        );
        const response = lessonResponse;
        const data = response.data;
        if (data.status === "PUBLISHED" || data.status === "PENDING_REVIEW") {
          toast.error("This lesson can no longer be edited");
          router.push(`/teacher/lessons/${lessonId}`);
          return;
        }
        setLesson(data);
        setForm({
          title: data.title || "",
          objective: data.objective || "",
          lessonContent: data.lessonContent || "",
          homework:
            typeof data.homework === "string"
              ? data.homework
              : data.homework?.description || data.homework?.title || data.instructions || "",
          periodNumber: data.periodNumber || null,
          status: (data.status as FormState["status"]) || "DRAFT",
        });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load lesson");
        router.push("/teacher/lessons");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lessonId, isAuthenticated, isLoading, router, schoolCalendarType, user?.schoolId]);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (submitForReview: boolean) => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (
      form.periodNumber !== null &&
      !periodOptions.some((period) => period.value === form.periodNumber)
    ) {
      toast.error("Please select a valid configured period");
      return;
    }

    try {
      setSaving(true);
      const payload: UpdateLessonBundleDto = {
        title: form.title,
        objective: form.objective || undefined,
        lessonContent: form.lessonContent || undefined,
        periodNumber: form.periodNumber || undefined,
        status: submitForReview ? "DRAFT" : form.status,
        homework: form.homework
          ? {
              title: `Homework for ${form.title}`,
              description: form.homework,
            }
          : undefined,
      };

      await lessonsAPI.updateBundle(lessonId, payload);

      if (submitForReview) {
        await lessonsAPI.publish(lessonId);
      }

      toast.success(
        submitForReview
          ? "Lesson submitted for review successfully!"
          : "Lesson updated successfully!",
      );
      router.push(`/teacher/lessons/${lessonId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update lesson");
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 animate-spin rounded-full border-4 border-[var(--brand-color,#e35336)] border-t-transparent" />
      </div>
    );
  }

  if (!lesson) {
    return null;
  }

  const canSubmitForReview = form.status === "DRAFT";

  return (
    <div className="space-y-6 bg-[#F8FAFC] p-6 dark:bg-[#111111]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Edit Lesson</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Update lesson content and review details
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
              <CardDescription>
                Title, objective, content, and homework can be updated here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Learning Objective</Label>
                <Textarea
                  id="objective"
                  rows={3}
                  value={form.objective}
                  onChange={(e) => handleChange("objective", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lessonContent">Lesson Content</Label>
                <Textarea
                  id="lessonContent"
                  rows={8}
                  value={form.lessonContent}
                  onChange={(e) => handleChange("lessonContent", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homework">Homework</Label>
                <Textarea
                  id="homework"
                  rows={4}
                  value={form.homework}
                  onChange={(e) => handleChange("homework", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={lesson.subject?.name || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input value={lesson.grade ? `Grade ${lesson.grade}` : ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={lesson.section || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Lesson Date</Label>
                <Input value={new Date(lesson.lessonDate).toLocaleDateString()} disabled />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={form.periodNumber?.toString() || ""}
                  onValueChange={(value) => handleChange("periodNumber", Number(value))}
                  disabled={periodOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((period) => (
                      <SelectItem key={period.value} value={period.value.toString()}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => handleChange("status", value as FormState["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="COVERED">Covered</SelectItem>
                    <SelectItem value="MISSED">Missed</SelectItem>
                    <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-6">
              <Button className="w-full" disabled={saving} onClick={() => handleSubmit(false)}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
              <Button
                className="w-full bg-[#e35336] hover:bg-[#d4482f]"
                disabled={saving || !canSubmitForReview}
                onClick={() => handleSubmit(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
