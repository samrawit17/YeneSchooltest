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
        icon: <Lock className="h-4 w-4 text-blue-500" />,
        badge: <Badge className="bg-blue-100 text-blue-700">Published</Badge>,
      };
    case "ready":
      return {
        label: "Ready",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        badge: <Badge className="bg-emerald-100 text-emerald-700">Ready to Publish</Badge>,
      };
    case "no_students":
      return {
        label: "No students",
        icon: <Users className="h-4 w-4 text-slate-500" />,
        badge: <Badge variant="outline">No students</Badge>,
      };
    default:
      return {
        label: "Has issues",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        badge: <Badge className="bg-amber-100 text-amber-700">Has Issues</Badge>,
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
    return [...blockers, ...row.issueReasons].filter(Boolean);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-transparent">
        <div className="w-full px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">Publish Results</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Release completed report cards to students and parents, and notify them immediately.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 w-[180px]">
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
                <SelectTrigger className="h-9 w-[160px]">
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
                className="dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Entry Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/report-cards")}
                className="dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                Open Report Cards
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="flex items-center gap-3 pt-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ready Classes</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{readyRows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Lock className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Published Classes</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{publishedRows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="flex items-center gap-3 pt-6">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Classes With Issues</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{issueRows.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="flex items-center gap-3 pt-6">
                  <ClipboardCheck className="h-8 w-8 text-violet-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Missing Marks</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totalMissingMarks}</p>
                  </div>
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

            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="dark:text-white">Assessment to Publish Status</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      Publish is available when assessment marks are complete and every enrolled student has a complete report card. Ranking is calculated automatically during publish.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setPublishTarget({ mode: "selected" })}
                    disabled={publishing || selectedClasses.length === 0}
                    className="bg-[var(--brand-color)] text-white hover:opacity-90"
                  >
                    {publishing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
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
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={readyRows.length > 0 && selectedClasses.length === readyRows.length}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Assessment Marks</TableHead>
                        <TableHead>Report Cards</TableHead>
                        <TableHead>Ranking</TableHead>
                        <TableHead>Certificate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const status = getStatusMeta(row.status);
                        return (
                          <>
                          <TableRow key={row.classId}>
                            <TableCell>
                              <Checkbox
                                checked={selectedClasses.includes(row.classId)}
                                onCheckedChange={() => toggleClass(row.classId)}
                                disabled={row.status !== "ready" || publishing}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900 dark:text-white">
                                {row.className}
                                {row.sectionName ? ` - ${row.sectionName}` : ""}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Grade {row.grade ?? "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900 dark:text-white">{row.expectedEntries}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                enrolled
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900 dark:text-white">
                                {row.assessmentEnteredScores}/{row.assessmentExpectedScores}
                              </div>
                              <div className={row.assessmentMissingScores > 0 ? "text-xs text-amber-600 dark:text-amber-400" : "text-xs text-slate-500 dark:text-slate-400"}>
                                {row.assessmentSubjects} subjects, {row.assessmentMissingScores} missing
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900 dark:text-white">
                                {row.generatedEntries}/{row.expectedEntries}
                              </div>
                              <div className={row.missingEntries + row.incompleteEntries > 0 ? "text-xs text-amber-600 dark:text-amber-400" : "text-xs text-slate-500 dark:text-slate-400"}>
                                {row.publishedEntries} published, {row.incompleteEntries} incomplete
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                                <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                                Auto on publish
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {row.rankingEntries}/{row.expectedEntries} already ranked
                              </div>
                            </TableCell>
                            <TableCell>
                              {row.certificateReady ? (
                                <Badge className="bg-emerald-100 text-emerald-700">Ready</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700">Needs setup</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {status.icon}
                                  {status.badge}
                                </div>
                                {row.issueReasons.length > 0 ? (
                                  <div className="max-w-[220px] text-xs text-amber-600 dark:text-amber-400">
                                    {row.issueReasons.slice(0, 2).join(", ")}
                                    {row.issueReasons.length > 2 ? ` +${row.issueReasons.length - 2} more` : ""}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPreview(row)}
                                className="dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                Preview
                              </Button>
                              {row.status === "ready" ? (
                                <Button
                                  size="sm"
                                  onClick={() => setPublishTarget({ mode: "single", classId: row.classId })}
                                  disabled={publishing}
                                  className="bg-[var(--brand-color)] text-white hover:opacity-90"
                                >
                                  {publishing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="mr-1.5 h-3.5 w-3.5" />
                                      Publish
                                    </>
                                  )}
                                </Button>
                              ) : row.status === "published" ? (
                                <span className="text-sm text-slate-500 dark:text-slate-400">Released</span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExpandedClassId((prev) => prev === row.classId ? null : row.classId)}
                                  className="dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                  {expandedClassId === row.classId ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
                                  View Blockers
                                </Button>
                              )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedClassId === row.classId && row.status !== "ready" && row.status !== "published" ? (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-amber-50/60 p-4 dark:bg-amber-950/10">
                                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                                  <div>
                                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Blockers to fix before publishing</p>
                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                                      {describeBlockers(row).map((reason, index) => (
                                        <li key={`${row.classId}-blocker-${index}`}>{reason}</li>
                                      ))}
                                    </ul>
                                    <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                                      <span>Subjects: {row.assessmentSubjects}</span>
                                      <span>Scores: {row.assessmentEnteredScores}/{row.assessmentExpectedScores}</span>
                                      <span>Report cards: {row.generatedEntries}/{row.expectedEntries}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => router.push("/admin/exams/entry-progress")}>
                                      Missing Scores
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => router.push("/admin/assessments")}>
                                      Subjects/Teachers
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openPreview(row)}>
                                      Report Cards
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
