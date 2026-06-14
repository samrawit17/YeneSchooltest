"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { studentsAPI } from "@/lib/api";
import { disciplineAPI } from "@/lib/api/people";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDateInputValue = (value: string) => {
  if (!value) return undefined;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

interface Student {
  id: string;
  studentId: string;
  studentCode: string;
  name: string;
  grade: number;
  section: string;
}

export default function CreateIncidentPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    studentId: "",
    incidentDate: toLocalDateInputValue(new Date()),
    title: "",
    description: "",
    severity: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    actionTaken: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user?.schoolId) {
      loadStudents();
    }
  }, [isAuthenticated, user?.schoolId]);

  async function loadStudents() {
    setStudentsLoading(true);
    try {
      const resp = await studentsAPI.getAll({
        schoolId: user!.schoolId,
        academicYearId: "",
        page: 1,
        limit: 1000,
      });
      const data = resp.data?.data || resp.data || [];
      const mapped = data.map((s: any) => ({
        id: s.id,
        studentId: s.studentId,
        studentCode: s.studentCode,
        name: s.name,
        grade: s.grade,
        section: s.section,
      }));
      setStudents(mapped);
    } catch (error) {
      console.error("Failed to load students", error);
    } finally {
      setStudentsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.studentId || !formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await disciplineAPI.createIncident({
        schoolId: user!.schoolId!,
        studentId: formData.studentId,
        reportedBy: user!.id!,
        incidentDate: formData.incidentDate,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        actionTaken: formData.actionTaken || undefined,
      });

      toast.success("Incident logged successfully");
      router.push("/admin/discipline");
    } catch (error: any) {
      console.error("Failed to create incident", error);
      toast.error(error.response?.data?.message || "Failed to log incident");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#111111]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <div className="border-b border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111]">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/discipline")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">
                Log Discipline Incident
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Report a new disciplinary incident
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6">
        <form onSubmit={handleSubmit}>
          <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student">Student *</Label>
                <Select
                  value={formData.studentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, studentId: value })
                  }
                >
                  <SelectTrigger className="dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.studentCode}) - Grade {student.grade}
                        {student.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentDate">Incident Date *</Label>
                <CalendarDatePicker
                  value={parseLocalDateInputValue(formData.incidentDate)}
                  onChange={(date) =>
                    setFormData({ ...formData, incidentDate: date ? toLocalDateInputValue(date) : "" })
                  }
                  placeholder="Select incident date"
                  className="dark:bg-[#1A1A1A] dark:border-[#2A2A2A]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of incident"
                  className="dark:bg-[#1A1A1A] dark:border-[#2A2A2A]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed description of what happened"
                  rows={4}
                  className="dark:bg-[#1A1A1A] dark:border-[#2A2A2A]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") =>
                    setFormData({ ...formData, severity: value })
                  }
                >
                  <SelectTrigger className="dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low - Minor issue</SelectItem>
                    <SelectItem value="MEDIUM">Medium - Moderate issue</SelectItem>
                    <SelectItem value="HIGH">High - Serious issue</SelectItem>
                    <SelectItem value="CRITICAL">Critical - Very serious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionTaken">Action Taken</Label>
                <Textarea
                  id="actionTaken"
                  value={formData.actionTaken}
                  onChange={(e) =>
                    setFormData({ ...formData, actionTaken: e.target.value })
                  }
                  placeholder="What action was taken immediately?"
                  rows={3}
                  className="dark:bg-[#1A1A1A] dark:border-[#2A2A2A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/discipline")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#e35336] hover:bg-[#d1482f]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Log Incident"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
