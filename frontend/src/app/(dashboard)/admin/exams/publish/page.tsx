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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="dark:text-white">Class Release Status</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      A class becomes publishable only when every enrolled student has a complete report card.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={publishSelected}
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
                        <TableHead>Expected</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Missing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const status = getStatusMeta(row.status);
                        return (
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
                            <TableCell>{row.expectedEntries}</TableCell>
                            <TableCell>{row.generatedEntries}</TableCell>
                            <TableCell>{row.publishedEntries}</TableCell>
                            <TableCell>{row.missingEntries}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {status.icon}
                                {status.badge}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.status === "ready" ? (
                                <Button
                                  size="sm"
                                  onClick={() => publishClass(row.classId)}
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
                                <span className="text-sm text-amber-600 dark:text-amber-400">
                                  Complete all report cards first
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
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
    </div>
  );
}
