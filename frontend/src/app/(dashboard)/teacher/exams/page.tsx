"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  ChevronRight,
  Filter,
  GraduationCap,
  FileText,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const { currentAcademicYear, getAllAcademicYears, getTermsForYear, formatDate } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeacherExamRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      const years = await getAllAcademicYears();
      setAcademicYears(years);

      const activeYear = currentAcademicYear?.id || years.find((row: AcademicYear) => row.isActive)?.id || years[0]?.id || "";
      setSelectedYear(activeYear);

      if (activeYear) {
        const termData = await getTermsForYear(activeYear);
        setTerms(termData);
        // Default to the term that contains today's date, otherwise leave as "all"
        const now = new Date();
        const currentPeriod = termData.find((t: any) => t?.startDate && t?.endDate && new Date(t.startDate) <= now && new Date(t.endDate) >= now);
        setSelectedTerm(currentPeriod?.id || "all");
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "upcoming":
        return { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400", icon: Clock, label: "Upcoming" };
      case "ongoing":
        return { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400", icon: AlertCircle, label: "Ongoing" };
      case "completed":
        return { color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400", icon: CheckCircle, label: "Completed" };
      case "overdue":
        return { color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400", icon: AlertTriangle, label: "Overdue" };
      default:
        return { color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400", icon: AlertCircle, label: status };
    }
  };

  const filteredRows = useMemo(() => {
    let filtered = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => getExamStatus(r) === statusFilter);
    }
    return filtered;
  }, [rows, searchQuery, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const completed = filteredRows.filter((r) => getExamStatus(r) === "completed").length;
    const ongoing = filteredRows.filter((r) => getExamStatus(r) === "ongoing").length;
    const overdue = filteredRows.filter((r) => getExamStatus(r) === "overdue").length;
    const upcoming = filteredRows.filter((r) => getExamStatus(r) === "upcoming").length;
    return { total, completed, ongoing, overdue, upcoming };
  }, [filteredRows]);

  const upcomingExams = useMemo(
    () =>
      rows
        .filter((r) => getExamStatus(r) === "upcoming" || getExamStatus(r) === "ongoing")
        .slice(0, 5),
    [rows]
  );

  const notifications = useMemo(() => {
    const notifs = [];
    const overdue = rows.filter((r) => getExamStatus(r) === "overdue");
    if (overdue.length > 0) {
      notifs.push({ type: "error" as const, count: overdue.length, message: `${overdue.length} exam(s) overdue` });
    }
    const upcomingSoon = rows.filter((r) => {
      const status = getExamStatus(r);
      if (status !== "upcoming") return false;
      const date = r.startDate ? new Date(r.startDate) : null;
      if (!date) return false;
      const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 3;
    });
    if (upcomingSoon.length > 0) {
      notifs.push({ type: "warning" as const, count: upcomingSoon.length, message: `${upcomingSoon.length} exam(s) in next 3 days` });
    }
    return notifs;
  }, [rows]);

  const activeYear = academicYears.find((y) => y.isActive) || academicYears[0];
  const activeTerm = terms[0];

  const goToGradeEntry = (exam: TeacherExamRow) => {
    router.push(`/teacher/exams/${exam.id}/results`);
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-6 space-y-4 md:space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#e35336]">My Exams</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 mt-0.5">
            {activeYear?.name} {activeTerm ? `• ${activeTerm.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-gray-300">
            <GraduationCap className="h-3 w-3 mr-1" />
            {user?.name || "Teacher"}
          </Badge>
        </div>
      </div>

      {/* Stats - Compact Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
        {[
          { label: "Total", value: summary.total, icon: BookOpen, color: "text-slate-600 dark:text-slate-300" },
          { label: "Upcoming", value: summary.upcoming, icon: Calendar, color: "text-blue-600 dark:text-blue-400" },
          { label: "Ongoing", value: summary.ongoing, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Completed", value: summary.completed, icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
          { label: "Overdue", value: summary.overdue, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="dark:bg-slate-800 dark:border-slate-700 hover:shadow-sm transition-shadow">
            <CardContent className="p-2.5 md:p-3 flex items-center gap-2.5">
              <stat.icon className={`h-4 w-4 md:h-5 md:w-5 shrink-0 ${stat.color}`} />
              <div className="min-w-0">
                <p className="text-lg md:text-xl font-bold leading-tight dark:text-white">{stat.value}</p>
                <p className="text-[10px] md:text-xs text-slate-500 dark:text-gray-400 truncate">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Exam List */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 px-4 pt-3 md:px-5 md:pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#e35336]" />
                    Exam List
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm dark:text-gray-400">
                    {filteredRows.length} of {rows.length} exams
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-4 pb-3 md:pb-4 space-y-3">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search exams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedYear} onValueChange={async (value) => {
                    setSelectedYear(value);
                    const termRes = await termsAPI.getAll({ academicYearId: value });
                    const termData = Array.isArray(termRes.data) ? termRes.data : termRes.data?.data || [];
                    setTerms(termData);
                    setSelectedTerm("all");
                    await loadRows(value, undefined);
                  }}>
                    <SelectTrigger className="w-[130px] h-8 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id} className="text-xs">{year.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedTerm} onValueChange={async (value) => {
                    setSelectedTerm(value);
                    await loadRows(selectedYear, value !== "all" ? value : undefined);
                  }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                      <SelectValue placeholder="Term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Terms</SelectItem>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id} className="text-xs">{term.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Show selected term date range when available */}
              
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[110px] h-8 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                      <Filter className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Status</SelectItem>
                      <SelectItem value="upcoming" className="text-xs">Upcoming</SelectItem>
                      <SelectItem value="ongoing" className="text-xs">Ongoing</SelectItem>
                      <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                      <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Exams */}
              {filteredRows.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <BookOpen className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-gray-400">No exams found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRows.map((row) => {
                    const status = getExamStatus(row);
                    const config = getStatusConfig(status);
                    const StatusIcon = config.icon;
                    return (
                      <div
                        key={row.id}
                        className="group flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 md:p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => goToGradeEntry(row)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold dark:text-white truncate">{row.title}</h3>
                            <Badge className={`text-[10px] px-1.5 py-0 h-5 ${config.color}`}>
                              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {row.subject}
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {row.className}{row.sectionName ? ` - ${row.sectionName}` : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {row.startDate ? new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                            </span>
                            <span>{row.totalMarks} marks</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 self-start sm:self-auto opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToGradeEntry(row);
                          }}
                        >
                          Grade
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Quick Actions / Notifications */}
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#e35336]" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-gray-400 py-2">No alerts</p>
              ) : (
                notifications.map((notif, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                      notif.type === "error"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                    }`}
                  >
                    {notif.type === "error" ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    )}
                    <span>{notif.message}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Exams */}
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Upcoming ({upcomingExams.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {upcomingExams.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-gray-400 py-2">No upcoming exams</p>
              ) : (
                upcomingExams.map((exam) => {
                  const daysLeft = exam.startDate
                    ? Math.ceil((new Date(exam.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div
                      key={exam.id}
                      className="p-2 rounded-md border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      onClick={() => goToGradeEntry(exam)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium dark:text-white truncate pr-2">{exam.title}</p>
                        {daysLeft !== null && daysLeft >= 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0 dark:border-slate-600">
                            {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                        {exam.subject} • {exam.className}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-500">
                        {exam.startDate ? new Date(exam.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "TBD"}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
