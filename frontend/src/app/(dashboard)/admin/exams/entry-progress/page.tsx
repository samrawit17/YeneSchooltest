"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  entryProgressAPI,
  termsAPI,
  academicYearsAPI,
  type EntryProgressAssessmentType as AssessmentType,
  type EntryProgressQuery,
  type EntryProgressRow,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  GraduationCap,
  BarChart3,
  Users,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
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
import { useFilters } from "@/components/filters/Filters";
import Pagination from "@/components/Pagination";

type SortKey = "title" | "subject" | "className" | "progress" | "missing";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "COMPLETE" | "PARTIAL" | "EMPTY" | "LOCKED" | "NO_STUDENTS";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  QUIZ: {
    label: "Quiz",
    icon: <BookOpen className="w-3 h-3" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  TEST: {
    label: "Test",
    icon: <FileText className="w-3 h-3" />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
  },
  MID: {
    label: "Mid",
    icon: <GraduationCap className="w-3 h-3" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  FINAL: {
    label: "Final",
    icon: <BarChart3 className="w-3 h-3" />,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
  },
  ATTENDANCE: {
    label: "Attendance",
    icon: <Users className="w-3 h-3" />,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
  },
};

function getTypeMeta(type: string) {
  const key = String(type).toUpperCase();
  return (
    TYPE_META[key] ?? {
      label: key
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      icon: <BookOpen className="w-3 h-3" />,
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-50 dark:bg-slate-900/40",
      border: "border-slate-200 dark:border-slate-700",
    }
  );
}

function getProgressStatus(row: EntryProgressRow): StatusFilter {
  if (row.isLocked) return "LOCKED";
  if (row.expectedEntries === 0) return "NO_STUDENTS";
  if (row.enteredEntries === 0) return "EMPTY";
  if (row.missingEntries === 0) return "COMPLETE";
  return "PARTIAL";
}

function ProgressBar({ entered, expected }: { entered: number; expected: number }) {
  const pct = expected === 0 ? 0 : Math.min(100, Math.round((entered / expected) * 100));
  const color =
    pct === 100
      ? "bg-emerald-500"
      : pct >= 60
      ? "bg-amber-400"
      : pct > 0
      ? "bg-orange-400"
      : "bg-gray-200";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-500 shrink-0 w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

function StatusChip({ status }: { status: StatusFilter }) {
  if (status === "COMPLETE")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  if (status === "PARTIAL")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
        <AlertTriangle className="w-3 h-3" /> Partial
      </span>
    );
  if (status === "EMPTY")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
        <XCircle className="w-3 h-3" /> Not started
      </span>
    );
  if (status === "LOCKED")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">
        <Lock className="w-3 h-3" /> Locked
      </span>
    );
  if (status === "NO_STUDENTS")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">
        <Users className="w-3 h-3" /> No students
      </span>
    );
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EntryProgressPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<EntryProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const { selectedYear, setSelectedYear, selectedTerm, setSelectedTerm } = useFilters({
    academicYear: true,
  });

  // UI state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("missing");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

  // Load academic years on mount
  useEffect(() => {
    academicYearsAPI.getAll().then((res) => {
      const d = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setAcademicYears(d);
    }).catch(() => {});
  }, []);

  // Load terms when year changes
  useEffect(() => {
    if (!selectedYear) return;
    setSelectedTerm("");
    setTerms([]);
    termsAPI
      .getAll({ academicYearId: selectedYear })
      .then((res) => {
        const d = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setTerms(d);
        // Auto-select current term based on dates
        const now = new Date();
        const currentTerm = d.find((term: { startDate?: string; endDate?: string }) => {
          if (!term.startDate || !term.endDate) return false;
          const start = new Date(term.startDate);
          const end = new Date(term.endDate);
          return now >= start && now <= end;
        });
        if (currentTerm) {
          setSelectedTerm(currentTerm.id);
        } else if (d.length > 0) {
          setSelectedTerm(d[0].id);
        }
      })
      .catch(() => {});
  }, [selectedYear, setSelectedTerm]);

  const fetchData = useCallback(async (page = 1) => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const params: EntryProgressQuery = {
        academicYearId: selectedYear,
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (selectedTerm) params.termId = selectedTerm;
      const res = await entryProgressAPI.list(params);
      const response = res.data;
      const rows = Array.isArray(response.data) ? response.data : [];
      setData(rows);
      setTotalCount(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setCurrentPage(response.page || page);
      setHasFetched(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to load entry progress");
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedYear]);

  // Auto-fetch when filters are ready
  useEffect(() => {
    if (selectedYear) fetchData(1);
  }, [selectedYear, fetchData]);

  // ── Derived stats ──
  const stats = useMemo(() => {
    const total = data.length;
    const complete = data.filter((r) => getProgressStatus(r) === "COMPLETE").length;
    const partial = data.filter((r) => getProgressStatus(r) === "PARTIAL").length;
    const empty = data.filter((r) => getProgressStatus(r) === "EMPTY").length;
    const noStudents = data.filter((r) => getProgressStatus(r) === "NO_STUDENTS").length;
    const locked = data.filter((r) => r.isLocked).length;
    const totalMissing = data.reduce((s, r) => s + r.missingEntries, 0);
    const totalExpected = data.reduce((s, r) => s + r.expectedEntries, 0);
    const totalEntered = data.reduce((s, r) => s + r.enteredEntries, 0);
    const overallPct =
      totalExpected === 0 ? 0 : Math.round((totalEntered / totalExpected) * 100);

    return { total, complete, partial, empty, noStudents, locked, totalMissing, overallPct, totalExpected, totalEntered };
  }, [data]);

  // ── Filtered + sorted rows ──
  const rows = useMemo(() => {
    let filtered = data.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && getProgressStatus(r) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.subject.toLowerCase().includes(q) &&
          !r.className.toLowerCase().includes(q) &&
          !(r.sectionName ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortKey === "title") { va = a.title; vb = b.title; }
      else if (sortKey === "subject") { va = a.subject; vb = b.subject; }
      else if (sortKey === "className") { va = a.className; vb = b.className; }
      else if (sortKey === "progress") {
        va = a.expectedEntries === 0 ? 100 : (a.enteredEntries / a.expectedEntries) * 100;
        vb = b.expectedEntries === 0 ? 100 : (b.enteredEntries / b.expectedEntries) * 100;
      } else if (sortKey === "missing") {
        va = a.missingEntries;
        vb = b.missingEntries;
      }
      if (typeof va === "string") {
        return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return filtered;
  }, [data, typeFilter, statusFilter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-gray-300 dark:text-gray-600" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-[#e35336]" />
      : <ChevronDown className="w-3 h-3 text-[#e35336]" />;
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Score Entry Progress</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track which subjects still need marks entered by teachers
          </p>
        </div>
      </div>



      {/* ── Content ── */}
      {loading && !hasFetched ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading entry progress…</p>
        </div>
      ) : !hasFetched ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <SlidersHorizontal className="w-10 h-10 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Select an academic year above to load data</p>
        </div>
      ) : (
        <>


          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search title, subject, class…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Academic Year */}
            <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setData([]); setHasFetched(false); }}>
              <SelectTrigger className="h-8 text-xs w-40 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id} className="text-xs">{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Term */}
            <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={!selectedYear || terms.length === 0}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All types</SelectItem>
                {Array.from(
                  new Set(data.map((row) => String(row.type).toUpperCase())),
                ).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {getTypeMeta(t).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All statuses</SelectItem>
                <SelectItem value="COMPLETE" className="text-xs">Complete</SelectItem>
                <SelectItem value="PARTIAL" className="text-xs">Partial</SelectItem>
                <SelectItem value="EMPTY" className="text-xs">Not started</SelectItem>
                <SelectItem value="NO_STUDENTS" className="text-xs">No students</SelectItem>
                <SelectItem value="LOCKED" className="text-xs">Locked</SelectItem>
              </SelectContent>
            </Select>


          </div>

          {/* ── Table ── */}
          {rows.length === 0 ? (
            <Card className="border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {data.length === 0
                    ? "No assessment subjects found for this period."
                    : "No rows match your current filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                      {/* Assessment / Title */}
                      <th className="text-left px-4 py-2.5">
                        <button
                          onClick={() => toggleSort("title")}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Assessment <SortIcon k="title" />
                        </button>
                      </th>
                      {/* Subject */}
                      <th className="text-left px-3 py-2.5">
                        <button
                          onClick={() => toggleSort("subject")}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Subject <SortIcon k="subject" />
                        </button>
                      </th>
                      {/* Class / Section */}
                      <th className="text-left px-3 py-2.5">
                        <button
                          onClick={() => toggleSort("className")}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Class <SortIcon k="className" />
                        </button>
                      </th>
                      {/* Progress */}
                      <th className="text-left px-3 py-2.5 min-w-[140px]">
                        <button
                          onClick={() => toggleSort("progress")}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Progress <SortIcon k="progress" />
                        </button>
                      </th>
                      {/* Entered / Expected */}
                      <th className="text-center px-3 py-2.5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Entered
                        </span>
                      </th>
                      {/* Missing */}
                      <th className="text-center px-3 py-2.5">
                        <button
                          onClick={() => toggleSort("missing")}
                          className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200 w-full"
                        >
                          Missing <SortIcon k="missing" />
                        </button>
                      </th>
                      {/* Status */}
                      <th className="text-left px-3 py-2.5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Status
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                    {rows.map((row) => {
                      const status = getProgressStatus(row);
                      const typeMeta = getTypeMeta(row.type);
                      const pct =
                        row.expectedEntries === 0
                          ? 100
                          : Math.round((row.enteredEntries / row.expectedEntries) * 100);

                      return (
                        <tr
                          key={row.assessmentSubjectId}
                          className={`group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                            status === "EMPTY" && !row.isLocked
                              ? "bg-red-50/30 dark:bg-red-950/10"
                              : ""
                          }`}
                        >
                          {/* Assessment */}
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">
                                {row.title}
                              </span>
                            </div>
                          </td>

                          {/* Subject */}
                          <td className="px-3 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {row.subject}
                            </span>
                          </td>

                          {/* Class / Section */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                {row.className}
                              </span>
                              {row.sectionName && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{row.sectionName}</span>
                              )}
                            </div>
                          </td>

                          {/* Progress bar */}
                          <td className="px-3 py-3">
                            <ProgressBar
                              entered={row.enteredEntries}
                              expected={row.expectedEntries}
                            />
                          </td>

                          {/* Entered / Expected */}
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                              {row.enteredEntries}
                              <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
                              {row.expectedEntries}
                            </span>
                          </td>

                          {/* Missing count */}
                          <td className="px-3 py-3 text-center">
                            {row.missingEntries === 0 ? (
                              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                            ) : (
                              <span
                                className={`text-sm font-semibold tabular-nums ${
                                  row.missingEntries > 10
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {row.missingEntries}
                              </span>
                            )}
                          </td>

                          {/* Status chip */}
                          <td className="px-3 py-3">
                            <StatusChip status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing {rows.length} of {totalCount} subject{rows.length !== 1 ? "s" : ""}
                  {stats.totalMissing > 0 && (
                    <span className="ml-2">· {stats.totalMissing} missing</span>
                  )}
                </p>
                {loading && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Refreshing…
                  </span>
                )}
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {Math.max(totalPages, 1)} ({totalCount} total)
                </span>
                <Pagination
                  page={currentPage}
                  setPage={(page) => fetchData(page)}
                  totalPages={Math.max(totalPages, 1)}
                />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
