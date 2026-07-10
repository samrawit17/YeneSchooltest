"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { academicYearsAPI, reportCardsAPI, termsAPI, type ReportPublishSummaryRow } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Send,
  XCircle,
  FileText,
  Award,
  ClipboardCheck,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination from "@/components/Pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getStatusMeta(status: ReportPublishSummaryRow["status"]) {
  switch (status) {
    case "published":
      return {
        label: "Published",
        badge: <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-800 font-medium tracking-tight">Released</Badge>,
      };
    case "ready":
      return {
        label: "Ready",
        badge: <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800 font-medium tracking-tight">Ready to Publish</Badge>,
      };
    case "no_students":
      return {
        label: "No students",
        badge: <Badge variant="outline" className="text-gray-400 border-gray-200 dark:border-[#2A2A2A] font-medium tracking-tight">Empty Class</Badge>,
      };
    default:
      return {
        label: "Pending",
        badge: <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800 font-medium tracking-tight">Blockers Found</Badge>,
      };
  }
}

export default function PublishResultsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentAcademicYear, currentTerm } = useAcademicYear();
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [terms, setTerms] = useState<{ id: string; name: string; startDate?: string; endDate?: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; isActive?: boolean }[]>([]);
  const [rows, setRows] = useState<ReportPublishSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<{ mode: "single"; classId: string } | { mode: "selected" } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredRows = useMemo(
    () => {
      if (!search) return rows;
      const q = search.toLowerCase();
      return rows.filter((row) => row.className.toLowerCase().includes(q) || (row.sectionName || "").toLowerCase().includes(q));
    },
    [rows, search],
  );

  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filteredRows, page],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));

  useEffect(() => { setPage(1); }, [search, selectedYear, selectedTerm]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    academicYearsAPI.getAll().then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAcademicYears(data);
      if (!selectedYear) {
        const active = data.find((y: any) => y.isActive) || data[0];
        if (active) setSelectedYear(active.id);
      }
    }).catch(() => {});
  }, [selectedYear]);

  useEffect(() => {
    if (currentAcademicYear?.id && !selectedYear) {
      setSelectedYear(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, selectedYear]);

  useEffect(() => {
    if (currentTerm?.id && !selectedTerm) {
      setSelectedTerm(currentTerm.id);
    }
  }, [currentTerm?.id, selectedTerm]);

  useEffect(() => {
    if (!selectedYear) return;
    setSelectedTerm("");
    setTerms([]);
    termsAPI
      .getAll({ academicYearId: selectedYear })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setTerms(data);
        const now = new Date();
        const matchingCurrentTerm =
          currentTerm?.id
            ? data.find((term: { id: string }) => term.id === currentTerm.id)
            : null;
        const currentTermByDate =
          data.find((term: { startDate?: string; endDate?: string }) => {
            if (!term.startDate || !term.endDate) return false;
            return now >= new Date(term.startDate) && now <= new Date(term.endDate);
          }) || data[0];
        const nextTerm = matchingCurrentTerm || currentTermByDate;
        if (nextTerm) setSelectedTerm(nextTerm.id);
      })
      .catch(() => {
        setTerms([]);
      });
  }, [selectedYear, currentTerm?.id]);

  useEffect(() => {
    if (!selectedYear || !selectedTerm) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    reportCardsAPI
      .getPublishSummary({ academicYearId: selectedYear, termId: selectedTerm })
      .then((res) => {
        setRows(Array.isArray(res.data) ? res.data : []);
        setSelectedClasses([]);
      })
      .catch((error: any) => {
        toast.error(error?.response?.data?.message || "Failed to load publish summary");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [selectedYear, selectedTerm]);

  const readyRows = useMemo(() => rows.filter((row) => row.status === "ready"), [rows]);
  const publishedRows = useMemo(() => rows.filter((row) => row.status === "published"), [rows]);
  const issueRows = useMemo(() => rows.filter((row) => row.status === "has_issues"), [rows]);
  const totalMissingMarks = useMemo(
    () => rows.reduce((sum, row) => sum + (row.assessmentMissingScores || 0), 0),
    [rows],
  );
  const readyClassIds = useMemo(() => readyRows.map((row) => row.classId), [readyRows]);
  const selectedReadyClasses = useMemo(
    () => selectedClasses.filter((classId) => readyClassIds.includes(classId)),
    [readyClassIds, selectedClasses],
  );
  const certificateIssue = useMemo(
    () => rows.find((row) => !row.certificateReady)?.certificateIssue || null,
    [rows],
  );
  const publishTargetRows = useMemo(() => {
    if (!publishTarget) return [];
    if (publishTarget.mode === "single") {
      return rows.filter((row) => row.classId === publishTarget.classId);
    }
    return rows.filter((row) => selectedReadyClasses.includes(row.classId));
  }, [publishTarget, rows, selectedReadyClasses]);

  const toggleClass = (classId: string) => {
    if (!readyClassIds.includes(classId)) return;
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  };

  const toggleAll = () => {
    setSelectedClasses((prev) =>
      readyClassIds.length > 0 && readyClassIds.every((id) => prev.includes(id)) ? [] : readyClassIds,
    );
  };

  const openPreview = (row: ReportPublishSummaryRow) => {
    const params = new URLSearchParams();
    params.set("academicYearId", selectedYear);
    params.set("termId", selectedTerm);
    params.set("classId", row.classId);
    router.push(`/admin/report-cards?${params.toString()}`);
  };

  const describeBlockers = (row: ReportPublishSummaryRow) => {
    const blockers: string[] = [];
    if (row.status === "no_students") blockers.push("No enrolled students found for this class.");
    if (row.assessmentMissingScores > 0) blockers.push(`${row.assessmentMissingScores} assessment score entries are missing.`);
    if (row.missingEntries > 0) blockers.push(`${row.missingEntries} student report cards have not been generated.`);
    if (row.incompleteEntries > 0) blockers.push(`${row.incompleteEntries} report cards are incomplete.`);
    if (row.rankingMissingEntries > 0) blockers.push(`${row.rankingMissingEntries} ranking entries will be finalized during publish.`);
    if (!row.certificateReady && row.certificateIssue) blockers.push(row.certificateIssue);
    return Array.from(new Set([...blockers, ...row.issueReasons].filter(Boolean)));
  };

  const refreshPublishSummary = async () => {
    if (!selectedYear || !selectedTerm) return;
    const summary = await reportCardsAPI.getPublishSummary({
      academicYearId: selectedYear,
      termId: selectedTerm,
    });
    setRows(Array.isArray(summary.data) ? summary.data : []);
  };

  const publishClass = async (classId: string) => {
    if (!selectedYear || !selectedTerm) return;
    setPublishing(true);
    try {
      const res = await reportCardsAPI.publishClassResults({
        academicYearId: selectedYear,
        termId: selectedTerm,
        classId,
        notifyStudents: true,
        notifyParents: true,
      });
      toast.success(
        `Ranked ${res.data.ranked || 0} students and published ${res.data.published} report cards. Notifications sent to ${res.data.notifiedStudents} students and ${res.data.notifiedParents} parents.`,
      );
      await refreshPublishSummary();
      setSelectedClasses((prev) => prev.filter((id) => id !== classId));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to publish results");
      await refreshPublishSummary().catch(() => null);
    } finally {
      setPublishing(false);
    }
  };

  const publishSelected = async () => {
    const targetClassIds = selectedReadyClasses;
    if (targetClassIds.length === 0 || !selectedYear || !selectedTerm) return;
    setPublishing(true);
    const publishedClassIds: string[] = [];
    try {
      let published = 0;
      let ranked = 0;
      let notifiedStudents = 0;
      let notifiedParents = 0;
      const failures: string[] = [];
      for (const classId of targetClassIds) {
        try {
          const res = await reportCardsAPI.publishClassResults({
            academicYearId: selectedYear,
            termId: selectedTerm,
            classId,
            notifyStudents: true,
            notifyParents: true,
          });
          published += res.data.published;
          ranked += res.data.ranked || 0;
          notifiedStudents += res.data.notifiedStudents;
          notifiedParents += res.data.notifiedParents;
          publishedClassIds.push(classId);
        } catch (error: any) {
          const className = rows.find((row) => row.classId === classId)?.className || "Class";
          failures.push(`${className}: ${error?.response?.data?.message || "failed"}`);
        }
      }
      if (publishedClassIds.length > 0) {
        toast.success(
          `Ranked ${ranked} students and published ${published} report cards. Notifications sent to ${notifiedStudents} students and ${notifiedParents} parents.`,
        );
      }
      if (failures.length > 0) {
        toast.error(`Failed to publish ${failures.length} class${failures.length === 1 ? "" : "es"}: ${failures.slice(0, 2).join("; ")}`);
      }
      await refreshPublishSummary();
      setSelectedClasses((prev) => prev.filter((id) => !publishedClassIds.includes(id)));
    } finally {
      setPublishing(false);
    }
  };

  const confirmPublish = async () => {
    const target = publishTarget;
    setPublishTarget(null);
    if (!target) return;
    if (target.mode === "single") {
      await publishClass(target.classId);
    } else {
      await publishSelected();
    }
  };

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111111]">
      <div className="w-full px-6 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Publish Results</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl font-normal">
              Finalize and release end-of-term reports in one click.
            </p>
          </div>
          <Button
            onClick={() => setPublishTarget({ mode: "selected" })}
            disabled={publishing || selectedReadyClasses.length === 0}
            className="rounded-xl bg-[var(--brand-color)] hover:opacity-90 text-white shadow-lg shadow-[var(--brand-color)]/20 transition-all font-medium px-6 h-11"
          >
            {publishing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            Publish Selected ({selectedReadyClasses.length})
          </Button>
        </div>
      </div>

      <div className="w-full px-6 py-6 space-y-6">
        {loading ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <Card key={n}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-3 h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>

            {certificateIssue ? (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <Award className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">Certificate template needs attention</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {certificateIssue}. Results can still be published, but certificate downloads will fail until this is fixed.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/admin/report-cards/certificate-template")}
                    className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
                  >
                    Fix Template
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-white dark:bg-[#111111] border-gray-200 dark:border-[#2A2A2A] shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-[#2A2A2A]/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search class, section..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 bg-gray-50 dark:bg-[#1A1A1A]/50 border-gray-200 dark:border-[#2A2A2A] rounded-lg text-sm w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[180px] bg-transparent dark:bg-transparent">
                        <SelectValue placeholder="Academic Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name} {year.isActive ? "(Active)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                      <SelectTrigger className="w-[160px] bg-transparent dark:bg-transparent">
                        <SelectValue placeholder="Term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin/exams/entry-progress")}
                      className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs"
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Entry Progress
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin/report-cards")}
                      className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Report Cards
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-500 dark:text-[#888888]">
                      {search ? "No classes match your search." : "No report-card data found for the selected academic year and term."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-[#111111]/50 sticky top-0">
                        <tr className="border-b border-gray-100 dark:border-[#2A2A2A]">
                          <th className="w-12 px-4 py-3">
                            <Checkbox
                              checked={readyClassIds.length > 0 && readyClassIds.every((id) => selectedClasses.includes(id))}
                              onCheckedChange={toggleAll}
                              className="rounded-md border-gray-300"
                            />
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Class & Section</th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Students</th>
                          <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Marks Entry</th>
                          <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Generation</th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Ranking</th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Certificate</th>
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</th>
                          <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row) => {
                          const status = getStatusMeta(row.status);
                          const rowKey = `${row.classId}-${row.sectionName || "all"}`;
                          return (
                            <Fragment key={rowKey}>
                            <tr className="group border-b border-gray-100 dark:border-[#2A2A2A]/50 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/30 transition-colors">
                              <td className="px-4 py-3">
                                <Checkbox
                                  checked={selectedClasses.includes(row.classId)}
                                  onCheckedChange={() => toggleClass(row.classId)}
                                  disabled={row.status !== "ready" || publishing}
                                  className="rounded-md border-gray-300 data-[state=checked]:bg-[var(--brand-color)] data-[state=checked]:border-[var(--brand-color)]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-[var(--brand-color)] transition-colors">
                                    {row.className}
                                    {row.sectionName ? ` - ${row.sectionName}` : ""}
                                  </span>
                                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                                    Level Grade {row.grade ?? "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{row.expectedEntries}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className={`text-sm font-medium tabular-nums ${row.assessmentMissingScores > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                                    {row.assessmentEnteredScores}
                                    <span className="text-gray-300 dark:text-gray-700 mx-1">/</span>
                                    {row.assessmentExpectedScores}
                                  </span>
                                  <span className="text-[9px] font-normal text-gray-400 uppercase tracking-tighter">
                                    {row.assessmentMissingScores} Missing
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className={`text-sm font-medium tabular-nums ${row.missingEntries + row.incompleteEntries > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                                    {row.generatedEntries}
                                    <span className="text-gray-300 dark:text-gray-700 mx-1">/</span>
                                    {row.expectedEntries}
                                  </span>
                                  <span className="text-[9px] font-normal text-gray-400 uppercase tracking-tighter">
                                    {row.incompleteEntries} Pending
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                    AUTO-RANK
                                  </span>
                                  <span className="text-[9px] font-normal text-gray-400 tabular-nums">
                                    {row.rankingEntries}/{row.expectedEntries} Cached
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {row.certificateReady ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-950 font-medium text-[9px] uppercase tracking-widest">Cert-Ready</Badge>
                                ) : (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-950 font-medium text-[9px] uppercase tracking-widest">Setup-Reqd</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  {status.badge}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPreview(row)}
                                  className="h-8 w-8 p-0 rounded-lg bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-[#888888] hover:bg-[var(--brand-color)]/10 hover:text-[var(--brand-color)]"
                                >
                                  Preview
                                </Button>
                                {row.status === "ready" ? (
                                  <Button
                                    size="sm"
                                    onClick={() => setPublishTarget({ mode: "single", classId: row.classId })}
                                    disabled={publishing}
                                    className="h-8 rounded-lg bg-[var(--brand-color)] text-white hover:opacity-90 font-bold text-xs"
                                  >
                                    {publishing ? "Publishing..." : "Publish"}
                                  </Button>
                                ) : row.status === "published" ? (
                                  <span className="px-2 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 rounded-lg">Done</span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedClassId((prev) => prev === row.classId ? null : row.classId)}
                                    className="h-8 rounded-lg bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-[#888888] hover:bg-amber-500 hover:text-white"
                                  >
                                    {expandedClassId === row.classId ? "Less" : "Details"}
                                  </Button>
                                )}
                                </div>
                              </td>
                            </tr>
                            {expandedClassId === row.classId && row.status !== "ready" && row.status !== "published" ? (
                              <tr className="bg-amber-50/10 dark:bg-amber-950/5">
                                <td colSpan={9} className="p-6 border-b border-amber-100 dark:border-amber-900/40">
                                  <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1 space-y-4">
                                      <div className="flex items-center gap-2">
                                          <p className="text-lg font-semibold text-amber-900 dark:text-amber-100 uppercase tracking-tight">Publication Blockers</p>
                                      </div>
                                      <div className="grid gap-2 pl-1.5 border-l-2 border-amber-200 dark:border-amber-800 ml-4">
                                        {describeBlockers(row).map((reason, index) => (
                                          <p key={`${row.classId}-blocker-${index}`} className="text-sm font-medium text-amber-800/80 dark:text-amber-200/80 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            {reason}
                                          </p>
                                        ))}
                                      </div>
                                      <div className="flex flex-wrap gap-4 pt-2 ml-4">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Marks Progress</span>
                                           <span className="text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{row.assessmentEnteredScores} / {row.assessmentExpectedScores}</span>
                                        </div>
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Report Generation</span>
                                           <span className="text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{row.generatedEntries} / {row.expectedEntries}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-row lg:flex-col gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => router.push("/admin/exams/entry-progress")} className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs">
                                        Fix Missing Scores
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => router.push("/admin/assessments")} className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs">
                                        Configure Subjects
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => openPreview(row)} className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs">
                                         Review Incomplete Cards
                                      </Button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              {filteredRows.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[#2A2A2A]/50">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredRows.length)} of {filteredRows.length}
                  </p>
                  <Pagination
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                    className="flex-wrap"
                  />
                </div>
              )}
            </Card>
          </>
        )}
      </div>
      <AlertDialog open={!!publishTarget} onOpenChange={(open) => { if (!open) setPublishTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish results and notify parents?</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize rankings, publish {publishTargetRows.reduce((sum, row) => sum + row.expectedEntries, 0)} report cards across {publishTargetRows.length} class{publishTargetRows.length === 1 ? "" : "es"}, and send notifications to parents and students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
            {publishTargetRows.slice(0, 5).map((row) => (
              <div key={`${row.classId}-${row.sectionName || "all"}`} className="flex justify-between gap-3 py-1">
                <span>{row.className}{row.sectionName ? ` - ${row.sectionName}` : ""}</span>
                <span className="text-gray-500">{row.expectedEntries} students</span>
              </div>
            ))}
            {publishTargetRows.length > 5 ? <p className="pt-1 text-xs text-gray-500">+{publishTargetRows.length - 5} more classes</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish} disabled={publishing} className="bg-[var(--brand-color)] text-white hover:opacity-90">
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish and Notify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
