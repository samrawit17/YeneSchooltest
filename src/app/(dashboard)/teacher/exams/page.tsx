"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { assessmentsAPI, termsAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";

interface TeacherExamRow {
  id: string;
  assessmentId: string;
  title: string;
  type: string;
  status: string;
  className: string;
  sectionName?: string | null;
  subject: string;
  totalMarks: number;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  academicYear?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
  canEditScores?: boolean;
  isReadOnly?: boolean;
}

interface AcademicYear {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Term {
  id: string;
  name: string;
}

const normalizeTeacherExamRows = (payload: any): TeacherExamRow[] => {
  const root = payload?.data ?? payload;
  const list = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];

  return list.map((exam: any) => ({
    id: exam.id,
    assessmentId: exam.assessmentId || exam.assessment?.id || exam.id,
    title: exam.title,
    type: exam.type,
    status: exam.status,
    className: exam.className || exam.class?.name || "",
    sectionName: exam.sectionName || exam.section?.name || null,
    subject: exam.subject?.name || exam.subject || "",
    totalMarks: exam.maxScore ?? exam.totalMarks ?? exam.maxMarks ?? 0,
    description: exam.description || null,
    startDate: exam.startDate || exam.examDate || exam.date || "",
    endDate: exam.endDate || null,
    academicYear: exam.academicYear || null,
    term: exam.term || null,
    canEditScores: exam.canEditScores,
    isReadOnly: exam.isReadOnly,
  }));
};

export default function TeacherExamsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const { currentAcademicYear, getAllAcademicYears, getTermsForYear } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeacherExamRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("all");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "My Exams", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  const loadRows = useCallback(async (academicYearId?: string, termId?: string) => {
    const response = await assessmentsAPI.getTeacherAssessments({
      academicYearId,
      termId,
    });
    setRows(normalizeTeacherExamRows(response.data));
  }, []);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use centralized context to get academic years
      const years = await getAllAcademicYears();
      setAcademicYears(years);

      // Use current academic year from context as default
      const activeYear = currentAcademicYear?.id || years.find((row: AcademicYear) => row.isActive)?.id || years[0]?.id || "";
      setSelectedYear(activeYear);

      if (activeYear) {
        // Use centralized context to get terms
        const termData = await getTermsForYear(activeYear);
        setTerms(termData);
        setSelectedTerm("all");
      } else {
        setTerms([]);
      }

      await loadRows(activeYear || undefined, undefined);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load teacher exams");
    } finally {
      setLoading(false);
    }
  }, [loadRows, currentAcademicYear, getAllAcademicYears, getTermsForYear]);

  useEffect(() => {
    if (!isLoading && user?.role === "TEACHER") {
      initialize();
    }
  }, [isLoading, user?.role, initialize]);

  const getExamStatus = (row: TeacherExamRow): "upcoming" | "ongoing" | "completed" | "overdue" => {
    const normalized = (row.status || "").toUpperCase();
    if (normalized.includes("LOCKED") || normalized.includes("COMPLETED")) return "completed";
    if (normalized.includes("ACTIVE") || normalized.includes("IN_PROGRESS") || normalized.includes("ONGOING")) return "ongoing";
    if (normalized.includes("DRAFT") || normalized.includes("SCHEDULED") || normalized.includes("UPCOMING")) return "upcoming";

    const examDate = row.startDate ? new Date(row.startDate) : null;
    const now = new Date();
    if (examDate) {
      if (examDate < now) return "completed";
      if (examDate > now) return "upcoming";
    }
    return "ongoing";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400">Upcoming</Badge>;
      case "ongoing":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400">Ongoing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">Completed</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Overdue</Badge>;
      default:
        return <Badge variant="outline" className="dark:text-gray-300">{status}</Badge>;
    }
  };

  const summary = {
    total: rows.length,
    completed: rows.filter((r) => getExamStatus(r) === "completed").length,
    pending: rows.filter((r) => getExamStatus(r) === "ongoing").length,
    overdue: rows.filter((r) => getExamStatus(r) === "overdue").length,
  };

  const upcomingExams = rows
    .filter((r) => getExamStatus(r) === "upcoming" || getExamStatus(r) === "ongoing")
    .slice(0, 4);

  const notifications = [
    ...rows
      .filter((r) => getExamStatus(r) === "overdue")
      .map((r) => ({
        type: "error" as const,
        message: `${r.title} for ${r.className} is overdue`,
      })),
    ...rows
      .filter((r) => getExamStatus(r) === "upcoming")
      .slice(0, 3)
      .map((r) => ({
        type: "warning" as const,
        message: `${r.title} is scheduled for ${r.className}`,
      })),
  ];

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeYear = academicYears.find((y) => y.isActive) || academicYears[0];
  const activeTerm = terms[0];

  const goToGradeEntry = (exam: TeacherExamRow) => {
    router.push(`/teacher/exams/${exam.id}/results`);
  };

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#e35336]">My Exams</h1>
        <p className="text-slate-600 dark:text-gray-400">
          {activeYear?.name} Academic Year {activeTerm ? `| ${activeTerm.name}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-black dark:text-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 dark:text-gray-300">Total Assigned</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <BookOpen className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="text-black dark:text-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 dark:text-gray-300">Completed</p>
                <p className="text-2xl font-bold">{summary.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="text-black dark:text-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 dark:text-gray-300">Pending</p>
                <p className="text-2xl font-bold">{summary.pending}</p>
              </div>
              <Clock className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="text-black dark:text-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 dark:text-gray-300">Overdue</p>
                <p className="text-2xl font-bold">{summary.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="dark:bg-slate-800/50">
              <CardTitle className="dark:text-white">Official Exam List</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Exams assigned to your teaching subjects and classes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  value={selectedYear}
                  onValueChange={async (value) => {
                    setSelectedYear(value);
                    const termRes = await termsAPI.getAll({ academicYearId: value });
                    const termData = Array.isArray(termRes.data) ? termRes.data : termRes.data?.data || [];
                    setTerms(termData);
                    setSelectedTerm("all");
                    await loadRows(value, undefined);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedTerm}
                  onValueChange={async (value) => {
                    setSelectedTerm(value);
                    await loadRows(selectedYear, value !== "all" ? value : undefined);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b dark:bg-slate-800 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-sm font-medium text-slate-600 dark:text-gray-300">Exam</th>
                      <th className="px-3 py-3 text-left text-sm font-medium text-slate-600 dark:text-gray-300">Subject</th>
                      <th className="px-3 py-3 text-left text-sm font-medium text-slate-600 dark:text-gray-300">Class</th>
                      <th className="px-3 py-3 text-left text-sm font-medium text-slate-600 dark:text-gray-300">Date</th>
                      <th className="px-3 py-3 text-left text-sm font-medium text-slate-600 dark:text-gray-300">Status</th>
                      <th className="px-3 py-3 text-left text-sm font-medium text-slate-600 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-500 dark:text-gray-400">
                          No exams found for your class and subject assignments
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-3 py-3">
                            <div className="font-medium dark:text-white">{row.title}</div>
                            <div className="text-xs text-slate-500 dark:text-gray-400">{row.type}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-gray-300">{row.subject}</td>
                          <td className="px-3 py-3 text-slate-600 dark:text-gray-300">
                            {row.className}
                            {row.sectionName ? ` - ${row.sectionName}` : ""}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-gray-300">
                            {row.startDate ? new Date(row.startDate).toLocaleDateString() : "TBD"}
                          </td>
                          <td className="px-3 py-3">{getStatusBadge(getExamStatus(row))}</td>
                          <td className="px-3 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => goToGradeEntry(row)}
                            >
                              Grade Entry
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="dark:bg-slate-800/50">
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Calendar className="h-5 w-5" />
                Upcoming Exams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingExams.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-gray-400">No upcoming exams</p>
              ) : (
                upcomingExams.map((exam) => (
                  <div key={exam.id} className="p-3 border rounded-lg space-y-1 dark:border-slate-600 dark:bg-slate-700/30">
                    <div className="font-medium text-sm dark:text-white">{exam.title}</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      {exam.subject} • {exam.className}
                    </div>
                      <div className="text-xs text-slate-400 dark:text-gray-500">
                      {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : "TBD"}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {getStatusBadge(getExamStatus(exam))}
                      <Button size="sm" variant="outline" onClick={() => goToGradeEntry(exam)}>
                        Grade Entry
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="dark:bg-slate-800/50">
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <AlertCircle className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-gray-400">No notifications</p>
              ) : (
                notifications.map((notif, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      notif.type === "error"
                        ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
                    }`}
                  >
                    {notif.message}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
