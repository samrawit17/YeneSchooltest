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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-amber-400"
        : pct > 0
          ? "bg-orange-400"
          : "bg-gray-200";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 shrink-0 w-8 text-right">{pct}%</span>
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
          const currentTerm = nextTerms.find((term) => {
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
    const overallPct = totalStudents > 0 ? Math.round((totalEntered / totalStudents) * 100) : 100;
    return { total, totalStudents, totalEntered, totalMissing, complete, partial, empty, noStudents, overallPct };
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
    <div className="p-6 space-y-5 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Score Entry Progress</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track grading entry progress from teacher submissions
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Overall Progress</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.overallPct}%</p>
            <p className="mt-1 text-xs text-gray-500">{stats.totalEntered}/{stats.totalStudents} grades entered</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Complete</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.complete}</p>
            <p className="mt-1 text-xs text-gray-500">subjects fully entered</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.totalMissing}</p>
            <p className="mt-1 text-xs text-gray-500">student grades still missing</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Not Started</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">{stats.empty}</p>
            <p className="mt-1 text-xs text-gray-500">teacher assignments with zero entries</p>
          </CardContent>
        </Card>
      </div>

      {loading && !hasFetched ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading entry progress...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search subject, class, section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
              />
            </div>

            <Select value={selectedYear} onValueChange={(value) => { setSelectedYear(value); setData([]); setHasFetched(false); }}>
              <SelectTrigger className="h-8 text-xs w-40 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id} className="text-xs">{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={!selectedYear || terms.length === 0}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id} className="text-xs">{term.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All statuses</SelectItem>
                <SelectItem value="COMPLETE" className="text-xs">Complete</SelectItem>
                <SelectItem value="PARTIAL" className="text-xs">Partial</SelectItem>
                <SelectItem value="EMPTY" className="text-xs">Not started</SelectItem>
                <SelectItem value="NO_STUDENTS" className="text-xs">No students</SelectItem>
              </SelectContent>
            </Select>
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
            <Card className="shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5">
                        <button onClick={() => toggleSort("subject")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Subject <SortIcon k="subject" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2.5">
                        <button onClick={() => toggleSort("className")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Class <SortIcon k="className" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2.5 min-w-[140px]">
                        <button onClick={() => toggleSort("progress")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Progress <SortIcon k="progress" />
                        </button>
                      </th>
                      <th className="text-center px-3 py-2.5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entered</span>
                      </th>
                      <th className="text-center px-3 py-2.5">
                        <button onClick={() => toggleSort("missing")} className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-full">
                          Missing <SortIcon k="missing" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2.5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                    {rows.map((row) => {
                      const status = getProgressStatus(row);
                      return (
                        <tr
                          key={`${row.teacherId}:${row.subject}:${row.className}:${row.sectionName ?? "none"}`}
                          className={`group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                            status === "EMPTY" ? "bg-red-50/30 dark:bg-red-950/10" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{row.subject}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{row.className}</span>
                              {row.sectionName && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{row.sectionName}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <ProgressBar percentage={row.percentage} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                              {row.enteredGrades}
                              <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
                              {row.totalStudents}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {row.missingGrades === 0 ? (
                              <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                            ) : (
                              <span className={`text-sm font-semibold tabular-nums ${row.missingGrades > 10 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                                {row.missingGrades}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <StatusChip status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
  );
}
