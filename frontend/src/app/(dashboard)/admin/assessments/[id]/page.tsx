"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Unlock,
  Save,
  Users,
} from "lucide-react";
import { assessmentsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type AssessmentStatus = "ACTIVE" | "LOCKED" | "COMPLETED" | "DRAFT";

interface AssessmentSubject {
  id: string;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  section?: { id: string; name: string } | null;
  teacher?: { id: string; name: string } | null;
  maxScore: number;
  passMark?: number | null;
  _count: { scores: number };
}

interface AssessmentDetail {
  id: string;
  title: string;
  type: string;
  status: AssessmentStatus;
  startDate: string;
  endDate: string;
  calendarEventId?: string | null;
  academicYear?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  subjects: AssessmentSubject[];
}

const statusMeta: Record<AssessmentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  LOCKED: {
    label: "Locked",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#1A1A1A] dark:text-[#CCCCCC] dark:border-[#2A2A2A]",
    icon: <Lock className="h-3.5 w-3.5" />,
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  DRAFT: {
    label: "Draft",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatLocalDate(value: Date) {
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value?: string | null) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString();
}

function normalizePayload(payload: any): AssessmentDetail | null {
  return payload?.data ?? payload ?? null;
}

export default function AssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const assessmentId = params?.id;
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [form, setForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    addToCalendar: false,
  });

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const response = await assessmentsAPI.getById(assessmentId);
      const next = normalizePayload(response.data);
      if (!next) {
        throw new Error("Assessment not found");
      }

      setAssessment(next);
      setForm({
        title: next.title || "",
        startDate: toDateInputValue(next.startDate),
        endDate: toDateInputValue(next.endDate),
        addToCalendar: Boolean(next.calendarEventId),
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const isLocked = assessment?.status === "LOCKED";
  const hasChanges = useMemo(() => {
    if (!assessment) return false;
    return (
      form.title.trim() !== assessment.title ||
      form.startDate !== toDateInputValue(assessment.startDate) ||
      form.endDate !== toDateInputValue(assessment.endDate) ||
      form.addToCalendar !== Boolean(assessment.calendarEventId)
    );
  }, [assessment, form]);

  const totalScores = useMemo(
    () => assessment?.subjects.reduce((sum, subject) => sum + subject._count.scores, 0) ?? 0,
    [assessment],
  );

  const canUnlock = user?.role === "ADMIN" || user?.role === "REGISTRAR" || user?.role === "SUPER_ADMIN";

  const handleUnlock = async () => {
    if (!assessmentId) return;
    setUnlocking(true);
    try {
      await assessmentsAPI.unlock(assessmentId);
      toast.success("Assessment unlocked");
      await loadAssessment();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to unlock assessment");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    if (!assessment || !assessmentId) return;
    if (isLocked) {
      toast.error("Locked assessments cannot be edited");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Assessment title is required");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end date are required");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date cannot be before start date");
      return;
    }

    setSaving(true);
    try {
      await assessmentsAPI.update(assessmentId, {
        title: form.title.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        addToCalendar: form.addToCalendar,
      });
      toast.success("Assessment updated");
      await loadAssessment();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update assessment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Button variant="outline" onClick={() => router.push("/admin/assessments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Assessment not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusMeta[assessment.status] ?? statusMeta.ACTIVE;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/exams"
            className="mb-2 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-[var(--brand-color)]"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Assessments
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-gray-900 dark:text-white">
              {assessment.title}
            </h1>
            <Badge variant="outline" className={status.className}>
              <span className="mr-1">{status.icon}</span>
              {status.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {assessment.type} · {assessment.academicYear?.name ?? "No academic year"}
            {assessment.term?.name ? ` · ${assessment.term.name}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLocked && canUnlock && (
            <Button
              variant="outline"
              onClick={handleUnlock}
              disabled={unlocking}
              className="w-full sm:w-auto"
            >
              {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
              Unlock
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || isLocked || !hasChanges}
            className="w-full sm:w-auto"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Assessment Window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="assessment-title">Title</Label>
                <Input
                  id="assessment-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assessment-start">Start date</Label>
                <CalendarDatePicker
                  value={parseLocalDate(form.startDate)}
                  onChange={(value) => {
                    const startDate = value ? formatLocalDate(value) : "";
                    setForm((prev) => ({
                      ...prev,
                      startDate,
                      endDate:
                        prev.endDate &&
                        startDate &&
                        Number(parseLocalDate(prev.endDate)) < Number(parseLocalDate(startDate))
                          ? startDate
                          : prev.endDate,
                    }));
                  }}
                  disabled={isLocked}
                  placeholder="Select start date"
                  className="mt-1 bg-white text-gray-900 border-gray-200 focus-visible:ring-[var(--brand-color,#e35336)] dark:bg-[#1A1A1A] dark:border-[#2A2A2A] dark:text-[#F2F2F2]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assessment-end">End date</Label>
                <CalendarDatePicker
                  value={parseLocalDate(form.endDate)}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      endDate: value ? formatLocalDate(value) : "",
                    }))
                  }
                  disabled={isLocked}
                  placeholder="Select end date"
                  className="mt-1 bg-white text-gray-900 border-gray-200 focus-visible:ring-[var(--brand-color,#e35336)] dark:bg-[#1A1A1A] dark:border-[#2A2A2A] dark:text-[#F2F2F2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-gray-200 p-3 dark:border-[#2A2A2A]">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Show on school calendar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keeps the calendar event date range synced with this assessment.
                </p>
              </div>
              <Switch
                checked={form.addToCalendar}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, addToCalendar: checked }))}
                disabled={isLocked}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(assessment.startDate)} - {formatDate(assessment.endDate)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entry window</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {assessment.subjects.length} subject targets
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {totalScores} score rows entered
                </p>
              </div>
            </div>
            {assessment.creator?.name && (
              <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-[#1A1A1A] dark:text-gray-300">
                Created by {assessment.creator.name}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          {assessment.subjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No subjects attached.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-[#2A2A2A]">
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Section</th>
                    <th className="px-3 py-2 font-medium">Teacher</th>
                    <th className="px-3 py-2 text-right font-medium">Max</th>
                    <th className="px-3 py-2 text-right font-medium">Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.subjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-gray-100 last:border-0 dark:border-[#2A2A2A]">
                      <td className="px-3 py-3 text-gray-900 dark:text-white">{subject.subject.name}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{subject.class.name}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{subject.section?.name ?? "-"}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{subject.teacher?.name ?? "Unassigned"}</td>
                      <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-300">{subject.maxScore}</td>
                      <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-300">{subject._count.scores}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
