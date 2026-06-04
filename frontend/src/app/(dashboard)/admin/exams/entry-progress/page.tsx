"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  entryProgressAPI,
  termsAPI,
  academicYearsAPI,
  type EntryProgressQuery,
  type EntryProgressRow,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Download,
  CalendarClock,
  LayoutGrid,
  SendHorizontal,
  Bell,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Users,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Loader2,
  Mail,
  ExternalLink,
  BarChart3,
  ClipboardCheck,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/components/filters/Filters";

type SortKey = "subject" | "className" | "progress" | "missing";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "COMPLETE" | "PARTIAL" | "EMPTY" | "NO_STUDENTS";

function getProgressStatus(row: EntryProgressRow): StatusFilter {
  if (row.totalStudents === 0) return "NO_STUDENTS";
  if (row.enteredGrades === 0) return "EMPTY";
  if (row.missingGrades === 0) return "COMPLETE";
  return "PARTIAL";
}

function ProgressBar({ percentage }: { percentage: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  const color =
    pct === 100
      ? "from-emerald-500 to-teal-400"
      : pct >= 80
        ? "from-blue-500 to-indigo-400"
        : pct >= 50
          ? "from-amber-500 to-orange-400"
          : pct > 0
            ? "from-rose-500 to-red-400"
            : "from-gray-300 to-gray-200";

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800/50 p-0.5 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
        <div 
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out shadow-sm ${color}`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-slate-500 shrink-0 w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatusChip({ status }: { status: StatusFilter }) {
  if (status === "COMPLETE") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  }
  if (status === "PARTIAL") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
        <AlertTriangle className="w-3 h-3" /> Partial
      </span>
    );
  }
  if (status === "EMPTY") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
        <XCircle className="w-3 h-3" /> Not started
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">
      <Users className="w-3 h-3" /> No students
    </span>
  );
}

export default function EntryProgressPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<EntryProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [terms, setTerms] = useState<
    { id: string; name: string; startDate?: string; endDate?: string }[]
  >([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);

  const { selectedYear, setSelectedYear, selectedTerm, setSelectedTerm } = useFilters({
    academicYear: true,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("missing");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    academicYearsAPI.getAll().then((res) => {
      const years = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setAcademicYears(years);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    setSelectedTerm("");
    setTerms([]);
    termsAPI
      .getAll({ academicYearId: selectedYear })
      .then((res) => {
        const nextTerms = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setTerms(nextTerms);
        if (nextTerms.length > 0) {
          const today = new Date();
          const currentTerm = nextTerms.find((term: { startDate?: string; endDate?: string }) => {
            if (!term.startDate || !term.endDate) return false;
            const start = new Date(term.startDate);
            const end = new Date(term.endDate);
            return today >= start && today <= end;
          });
          setSelectedTerm(currentTerm?.id ?? nextTerms[0].id);
        }
      })
      .catch(() => {});
  }, [selectedYear, setSelectedTerm]);

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const params: EntryProgressQuery = {
        academicYearId: selectedYear,
        termId: selectedTerm || undefined,
      };
      const res = await entryProgressAPI.list(params);
      setData(Array.isArray(res.data) ? res.data : []);
      setHasFetched(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to load entry progress");
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedYear]);

  useEffect(() => {
    if (selectedYear && selectedTerm) {
      fetchData();
    }
  }, [selectedYear, selectedTerm, fetchData]);

  const stats = useMemo(() => {
    const total = data.length;
    const totalStudents = data.reduce((sum, row) => sum + row.totalStudents, 0);
    const totalEntered = data.reduce((sum, row) => sum + row.enteredGrades, 0);
    const totalMissing = data.reduce((sum, row) => sum + row.missingGrades, 0);
    const complete = data.filter((row) => getProgressStatus(row) === "COMPLETE").length;
    const partial = data.filter((row) => getProgressStatus(row) === "PARTIAL").length;
    const empty = data.filter((row) => getProgressStatus(row) === "EMPTY").length;
    const noStudents = data.filter((row) => getProgressStatus(row) === "NO_STUDENTS").length;
    const hasScoreEntries = totalStudents > 0;
    const overallPct = hasScoreEntries ? Math.round((totalEntered / totalStudents) * 100) : 0;
    return { total, totalStudents, totalEntered, totalMissing, complete, partial, empty, noStudents, overallPct, hasScoreEntries };
  }, [data]);

  const rows = useMemo(() => {
    const filtered = data.filter((row) => {
      if (statusFilter !== "ALL" && getProgressStatus(row) !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        row.subject.toLowerCase().includes(q) ||
        row.className.toLowerCase().includes(q) ||
        (row.sectionName ?? "").toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      let va: string | number = 0;
      let vb: string | number = 0;
      if (sortKey === "subject") {
        va = a.subject;
        vb = b.subject;
      } else if (sortKey === "className") {
        va = `${a.className} ${a.sectionName ?? ""}`.trim();
        vb = `${b.className} ${b.sectionName ?? ""}`.trim();
      } else if (sortKey === "progress") {
        va = a.percentage;
        vb = b.percentage;
      } else {
        va = a.missingGrades;
        vb = b.missingGrades;
      }

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return filtered;
  }, [data, search, sortDir, sortKey, statusFilter]);

  const deadlineLabel = useMemo(() => {
    const term = terms.find((item) => item.id === selectedTerm);
    if (!term?.endDate) return "No deadline";
    const end = new Date(term.endDate);
    const today = new Date();
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
    if (days === 0) return "Due today";
    return `${days} day${days === 1 ? "" : "s"} left`;
  }, [selectedTerm, terms]);

  const getDeadlineTone = (row: EntryProgressRow) => {
    if (deadlineLabel.startsWith("Overdue") || deadlineLabel === "Due today") return "text-red-600 dark:text-red-400";
    return "text-amber-600 dark:text-amber-400";
  };

  const openReview = (row: EntryProgressRow) => {
    const params = new URLSearchParams();
    params.set("academicYearId", selectedYear);
    if (selectedTerm) params.set("termId", selectedTerm);
    params.set("classId", row.classId);
    router.push(`/admin/report-cards?${params.toString()}`);
  };

  const messageTeacher = (row: EntryProgressRow) => {
    if (!row.teacherId || row.teacherId === "unassigned") {
      toast.error("No teacher is assigned to this assessment subject");
      return;
    }
    const template = `Hello ${row.teacherName || 'Teacher'},\n\nThis is a friendly reminder that the marks for ${row.subject} (${row.className}) are currently at ${row.percentage}% completion. The deadline is ${deadlineLabel}. Please ensure all entries are completed on time.\n\nThank you!`;
    router.push(`/messages?recipientId=${row.teacherId}&content=${encodeURIComponent(template)}`);
  };

  const remindAllPending = async () => {
    if (!selectedYear || !selectedTerm) {
      toast.error("Select an academic year and term first");
      return;
    }
    const pendingCount = rows.filter((r) => r.missingGrades > 0 && r.teacherId !== "unassigned").length;
    if (pendingCount === 0) {
      toast.success("No assigned teachers have pending marks");
      return;
    }

    toast(`Send automated reminders to all ${pendingCount} teachers with missing marks?`, {
      action: {
        label: "Send Reminders",
        onClick: async () => {
          setReminding(true);
          try {
            const res = await entryProgressAPI.sendReminder({
              academicYearId: selectedYear,
              termId: selectedTerm,
            });
            const sent = Number(res.data?.remindersSent ?? 0);
            const skipped = Number(res.data?.skippedUnassigned ?? 0);
            toast.success(
              sent > 0
                ? `Sent reminders to ${sent} teacher${sent === 1 ? "" : "s"}${skipped > 0 ? `; ${skipped} unassigned row${skipped === 1 ? "" : "s"} skipped` : ""}`
                : "No new reminders were sent",
            );
          } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to send reminders");
          } finally {
            setReminding(false);
          }
        },
      },
    });
  };

  const exportMissingRows = () => {
    const exportRows = rows
      .filter((row) => row.missingGrades > 0)
      .map((row) => ({
        teacher: row.teacherName || row.teacherId || "Unassigned",
        subject: row.subject,
        class: row.className,
        section: row.sectionName || "",
        entered: row.enteredGrades,
        total: row.totalStudents,
        missing: row.missingGrades,
        progress: `${row.percentage}%`,
        deadline: deadlineLabel,
      }));

    if (exportRows.length === 0) {
      toast.success("No missing marks to export");
      return;
    }

    const headers = Object.keys(exportRows[0]);
    const csv = [
      headers.join(","),
      ...exportRows.map((row) =>
        headers
          .map((header) => `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "missing-marks.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-gray-300 dark:text-gray-600" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-[#e35336]" />
      : <ChevronDown className="w-3 h-3 text-[#e35336]" />;
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="w-full px-6 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Entry Progress</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl font-normal">
              Real-time monitoring of grading status across all departments. Track missing scores and manage submission deadlines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 shadow-sm">
              <Select value={selectedYear} onValueChange={(value) => { setSelectedYear(value); setData([]); setHasFetched(false); }}>
                <SelectTrigger className="h-9 w-[180px] border-none bg-slate-50 dark:bg-slate-800/50 rounded-xl font-medium text-xs transition-all hover:bg-slate-100">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl ring-1 ring-black/5">
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id} className="text-xs font-normal">
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={!selectedYear || terms.length === 0}>
                <SelectTrigger className="h-9 w-[160px] border-none bg-slate-50 dark:bg-slate-800/50 rounded-xl font-medium text-xs transition-all hover:bg-slate-100">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent className="rounded-xl ring-1 ring-black/5">
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id} className="text-xs font-normal">
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={remindAllPending}
                disabled={reminding}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white font-medium text-xs"
              >
                {reminding ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#e35336]" /> : <Bell className="mr-2 h-4 w-4 text-[#e35336]" />}
                {reminding ? "Sending..." : "Remind Pending"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-1">Total Progress</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">
              {stats.hasScoreEntries ? `${stats.overallPct}%` : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-1">Finalized</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.complete}</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-1">Action Required</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.totalMissing}</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 mb-1">Attention</p>
            <p className="text-2xl font-semibold text-rose-600">{stats.empty}</p>
          </CardContent>
        </Card>
      </div>

      {loading && !hasFetched ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading entry progress...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full md:w-[26rem] lg:w-[32rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#e35336] transition-colors" />
              <Input
                placeholder="Search subject, class, section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 text-sm border-none bg-slate-50 dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-[#e35336]/20 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="h-10 text-xs w-full md:w-36 bg-slate-50 dark:bg-slate-800 border-none rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL" className="text-xs">All statuses</SelectItem>
                  <SelectItem value="COMPLETE" className="text-xs font-medium text-emerald-600">Complete</SelectItem>
                  <SelectItem value="PARTIAL" className="text-xs font-medium text-amber-600">Partial</SelectItem>
                  <SelectItem value="EMPTY" className="text-xs font-medium text-rose-600">Not started</SelectItem>
                  <SelectItem value="NO_STUDENTS" className="text-xs">No students</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {rows.length === 0 ? (
            <Card className="border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {hasFetched ? "No teacher grading progress rows match the current filters." : "Select an academic year and term to load data."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 rounded-2xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">
                        <button onClick={() => toggleSort("subject")} className="flex items-center gap-1">
                          Subject <SortIcon k="subject" />
                        </button>
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">
                        <button onClick={() => toggleSort("className")} className="flex items-center gap-1">
                          Class <SortIcon k="className" />
                        </button>
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400 min-w-[140px]">
                        <button onClick={() => toggleSort("progress")} className="flex items-center gap-1">
                          Progress <SortIcon k="progress" />
                        </button>
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400 text-center">
                        Entered
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400 text-center">
                        <button onClick={() => toggleSort("missing")} className="flex items-center justify-center gap-1 w-full">
                          Missing <SortIcon k="missing" />
                        </button>
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">
                        Deadline
                      </TableHead>
                      <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const status = getProgressStatus(row);
                      const tone = getDeadlineTone(row);
                      return (
                        <TableRow
                          key={`${row.teacherId}:${row.subject}:${row.className}:${row.sectionName ?? "none"}`}
                          className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                        >
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                               <span className="text-sm font-medium text-slate-800 dark:text-gray-100">{row.subject}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{row.className}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{row.sectionName || "Core Section"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <ProgressBar percentage={row.percentage} />
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
                              {row.enteredGrades}
                              <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                              {row.totalStudents}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            {row.missingGrades === 0 ? (
                              <div className="flex justify-center">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                              </div>
                            ) : (
                              <span className={`text-sm font-medium tabular-nums ${row.missingGrades > 5 ? "text-rose-600" : "text-amber-500"}`}>
                                {row.missingGrades}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <StatusChip status={status} />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col text-xs font-medium">
                               <div className="flex items-center gap-1">
                                 <CalendarClock className="h-3 w-3" />
                                 <span className={tone}>{deadlineLabel.toUpperCase()}</span>
                               </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                                     <MoreVertical className="h-4 w-4 text-slate-400" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="w-48 rounded-xl ring-1 ring-black/5">
                                   <DropdownMenuItem onClick={() => messageTeacher(row)} className="gap-2 font-medium">
                                     <Mail className="h-4 w-4 text-blue-500" />
                                     Send DM to Teacher
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => openReview(row)} className="gap-2 font-medium">
                                     <ExternalLink className="h-4 w-4 text-[#e35336]" />
                                     Review Report Cards
                                   </DropdownMenuItem>
                                   <DropdownMenuItem className="gap-2 font-medium text-rose-500 focus:text-rose-500">
                                     <AlertTriangle className="h-4 w-4" />
                                     Escalate Issue
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing {rows.length} of {stats.total} assignments
                  {stats.totalMissing > 0 && <span className="ml-2">· {stats.totalMissing} missing</span>}
                </p>
                {loading && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Refreshing...
                  </span>
                )}
              </div>
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  );
}
