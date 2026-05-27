"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { academicYearsAPI, reportCardsAPI, termsAPI, type ReportPublishSummaryRow } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  Send,
  Users,
  XCircle,
  FileText,
  Award,
  BarChart3,
  ClipboardCheck,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
        icon: <Lock className="h-4 w-4 text-sky-500" />,
        badge: <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-800 font-medium tracking-tight">Released</Badge>,
      };
    case "ready":
      return {
        label: "Ready",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        badge: <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800 font-medium tracking-tight">Ready to Publish</Badge>,
      };
    case "no_students":
      return {
        label: "No students",
        icon: <Users className="h-4 w-4 text-slate-400" />,
        badge: <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-800 font-medium tracking-tight">Empty Class</Badge>,
      };
    default:
      return {
        label: "Pending",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
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
  }, []);

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
  const certificateIssue = useMemo(
    () => rows.find((row) => !row.certificateReady)?.certificateIssue || null,
    [rows],
  );
  const publishTargetRows = useMemo(() => {
    if (!publishTarget) return [];
    if (publishTarget.mode === "single") {
      return rows.filter((row) => row.classId === publishTarget.classId);
    }
    return rows.filter((row) => selectedClasses.includes(row.classId));
  }, [publishTarget, rows, selectedClasses]);

  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  };

  const toggleAll = () => {
    const selectable = readyRows.map((row) => row.classId);
    setSelectedClasses((prev) =>
      prev.length === selectable.length ? [] : selectable,
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
      const summary = await reportCardsAPI.getPublishSummary({
        academicYearId: selectedYear,
        termId: selectedTerm,
      });
      setRows(Array.isArray(summary.data) ? summary.data : []);
      setSelectedClasses((prev) => prev.filter((id) => id !== classId));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  };

  const publishSelected = async () => {
    if (selectedClasses.length === 0) return;
    setPublishing(true);
    try {
      let published = 0;
      let ranked = 0;
      let notifiedStudents = 0;
      let notifiedParents = 0;
      for (const classId of selectedClasses) {
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
      }
      toast.success(
        `Ranked ${ranked} students and published ${published} report cards. Notifications sent to ${notifiedStudents} students and ${notifiedParents} parents.`,
      );
      const summary = await reportCardsAPI.getPublishSummary({
        academicYearId: selectedYear,
        termId: selectedTerm,
      });
      setRows(Array.isArray(summary.data) ? summary.data : []);
      setSelectedClasses([]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to publish selected classes");
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="w-full px-6 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <div className="p-1.5 rounded-lg bg-[#e35336]/10 text-[#e35336]">
                 <Send className="w-5 h-5" />
               </div>
               <span className="text-xs font-medium text-[#e35336] uppercase tracking-wider">Academic Governance</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Publish Results</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl font-normal">
              Validate assessment completion, finalize rankings, and release end-of-term reports to parents and students in a single click.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 w-[180px] border-none bg-slate-50 dark:bg-slate-800/50 rounded-xl font-medium text-xs transition-all hover:bg-slate-100">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl ring-1 ring-black/5">
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id} className="text-xs font-normal">
                        {year.name} {year.isActive ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
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
                onClick={() => router.push("/admin/exams/entry-progress")}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white font-medium text-xs"
              >
                <ClipboardCheck className="mr-2 h-4 w-4 text-[#e35336]" />
                Entry Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/report-cards")}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white font-medium text-xs"
              >
                <FileText className="mr-2 h-4 w-4 text-blue-500" />
                Report Cards
              </Button>
            </div>
          </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-white dark:bg-slate-900 border-none shadow-sm overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                     <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Ready</p>
                     <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                       <CheckCircle2 className="w-4 h-4" />
                     </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-medium text-slate-900 dark:text-white">{readyRows.length}</p>
                    <span className="text-[10px] font-medium text-emerald-600 uppercase">Classes</span>
                  </div>
                  <p className="mt-2 text-[10px] font-normal text-slate-400">Validated and ready for release</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-none shadow-sm overflow-hidden group">
                <CardContent className="p-5">
                   <div className="flex justify-between items-start mb-2">
                     <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Released</p>
                     <div className="p-2 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-500">
                       <Lock className="h-4 w-4" />
                     </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-medium text-slate-900 dark:text-white">{publishedRows.length}</p>
                    <span className="text-[10px] font-medium text-sky-600 uppercase">Classes</span>
                  </div>
                  <p className="mt-2 text-[10px] font-normal text-slate-400">Viewable by parents and students</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-none shadow-sm overflow-hidden group">
                <CardContent className="p-5">
                   <div className="flex justify-between items-start mb-2">
                     <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Incomplete</p>
                     <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500">
                       <AlertTriangle className="h-4 w-4" />
                     </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-medium text-amber-600">{issueRows.length}</p>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Classes</span>
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-amber-600 uppercase">Follow-up Required</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-none shadow-sm overflow-hidden group">
                <CardContent className="p-5">
                   <div className="flex justify-between items-start mb-2">
                     <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Missing</p>
                     <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
                       <ClipboardCheck className="h-4 w-4" />
                     </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-medium text-indigo-600">{totalMissingMarks}</p>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Scores</span>
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-indigo-600 uppercase tracking-tight">Across All Subjects</p>
                </CardContent>
              </Card>
            </div>

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

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-[#e35336]" />
                       Publication Tracker
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400 font-normal">
                      Publishing triggers automatic ranking calculation and instant parent notification via SMS/Portal.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setPublishTarget({ mode: "selected" })}
                    disabled={publishing || selectedClasses.length === 0}
                    className="rounded-xl bg-[#e35336] hover:bg-[#c4442b] text-white shadow-lg shadow-[#e35336]/20 transition-all font-medium px-6 h-11"
                  >
                    {publishing ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-5 w-5" />
                    )}
                    Publish Selected ({selectedClasses.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No report-card data found for the selected academic year and term.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                        <TableHead className="w-12 py-4">
                          <Checkbox
                            checked={readyRows.length > 0 && selectedClasses.length === readyRows.length}
                            onCheckedChange={toggleAll}
                            className="rounded-md border-slate-300"
                          />
                        </TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">Class & Section</TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">Students</TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400 text-center">Marks Entry</TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400 text-center">Generation</TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">Ranking Status</TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">Certificate</TableHead>
                        <TableHead className="font-medium text-[10px] uppercase tracking-wider text-slate-400">Approval Status</TableHead>
                        <TableHead className="text-right font-medium text-[10px] uppercase tracking-wider text-slate-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
<TableBody>
                      {rows.map((row) => {
                        const status = getStatusMeta(row.status);
                        return (
                          <>
                          <TableRow key={row.classId} className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <TableCell className="py-4">
                              <Checkbox
                                checked={selectedClasses.includes(row.classId)}
                                onCheckedChange={() => toggleClass(row.classId)}
                                disabled={row.status !== "ready" || publishing}
                                className="rounded-md border-slate-300 data-[state=checked]:bg-[#e35336] data-[state=checked]:border-[#e35336]"
                              />
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-[#e35336] transition-colors">
                                  {row.className}
                                  {row.sectionName ? ` - ${row.sectionName}` : ""}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                  Level Grade {row.grade ?? "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                 <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                   <Users className="w-3.5 h-3.5 text-slate-500" />
                                 </div>
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">{row.expectedEntries}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className={`text-sm font-medium tabular-nums ${row.assessmentMissingScores > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                                  {row.assessmentEnteredScores}
                                  <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                                  {row.assessmentExpectedScores}
                                </span>
                                <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tighter">
                                  {row.assessmentMissingScores} Missing
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className={`text-sm font-medium tabular-nums ${row.missingEntries + row.incompleteEntries > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                                  {row.generatedEntries}
                                  <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                                  {row.expectedEntries}
                                </span>
                                <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tighter">
                                  {row.incompleteEntries} Pending
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                                  AUTO-RANK
                                </div>
                                <span className="text-[9px] font-normal text-slate-400 tabular-nums">
                                  {row.rankingEntries}/{row.expectedEntries} Cached
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {row.certificateReady ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-950 font-medium text-[9px] uppercase tracking-widest">Cert-Ready</Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-950 font-medium text-[9px] uppercase tracking-widest">Setup-Reqd</Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                {status.badge}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPreview(row)}
                                className="h-8 w-8 p-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-[#e35336]/10 hover:text-[#e35336]"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {row.status === "ready" ? (
                                <Button
                                  size="sm"
                                  onClick={() => setPublishTarget({ mode: "single", classId: row.classId })}
                                  disabled={publishing}
                                  className="h-8 rounded-lg bg-[#e35336] text-white hover:opacity-90 font-bold text-xs"
                                >
                                  {publishing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              ) : row.status === "published" ? (
                                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-500/10">
                                   <Lock className="h-4 w-4 text-sky-500" />
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedClassId((prev) => prev === row.classId ? null : row.classId)}
                                  className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-500 hover:text-white"
                                >
                                  {expandedClassId === row.classId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedClassId === row.classId && row.status !== "ready" && row.status !== "published" ? (
                            <TableRow className="bg-amber-50/10 dark:bg-amber-950/5">
                              <TableCell colSpan={9} className="p-6 border-b border-amber-100 dark:border-amber-900/40">
                                <div className="flex flex-col lg:flex-row gap-6">
                                  <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2">
                                       <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600">
                                          <AlertTriangle className="w-5 h-5" />
                                       </div>
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
                                         <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Marks Progress</span>
                                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">{row.assessmentEnteredScores} / {row.assessmentExpectedScores}</span>
                                      </div>
                                      <div className="flex flex-col">
                                         <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Report Generation</span>
                                         <span className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">{row.generatedEntries} / {row.expectedEntries}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-row lg:flex-col gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => router.push("/admin/exams/entry-progress")} className="rounded-xl border-amber-200 dark:border-amber-800 font-medium text-xs bg-white dark:bg-slate-900">
                                      Fix Missing Scores
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => router.push("/admin/assessments")} className="rounded-xl border-amber-200 dark:border-amber-800 font-medium text-xs bg-white dark:bg-slate-900">
                                      Configure Subjects
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openPreview(row)} className="rounded-xl border-amber-200 dark:border-amber-800 font-medium text-xs bg-white dark:bg-slate-900">
                                       Review Incomplete Cards
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                          </>
                      );
                    })}
                  </TableBody>
                </Table>
                )}
              </CardContent>
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            {publishTargetRows.slice(0, 5).map((row) => (
              <div key={row.classId} className="flex justify-between gap-3 py-1">
                <span>{row.className}{row.sectionName ? ` - ${row.sectionName}` : ""}</span>
                <span className="text-slate-500">{row.expectedEntries} students</span>
              </div>
            ))}
            {publishTargetRows.length > 5 ? <p className="pt-1 text-xs text-slate-500">+{publishTargetRows.length - 5} more classes</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish} disabled={publishing} className="bg-[#e35336] text-white hover:opacity-90">
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish and Notify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
