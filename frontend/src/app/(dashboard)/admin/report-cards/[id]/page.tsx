"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  Lock,
  Loader2,
  Medal,
  Percent,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { reportCardsAPI, type GradeDetail, type ReportCard } from "@/lib/api/reporting";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(1)}%`;
}

const toDownloadFileName = (value: string | null | undefined, fallback: string) => {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
};

function StatusPill({ status }: { status: ReportCard["status"] }) {
  const published = status === "PUBLISHED";
  return (
    <span
      className={
        published
          ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export default function ReportCardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reportCardId = params?.id;
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const gradeRows = useMemo<GradeDetail[]>(() => reportCard?.gradeDetails || [], [reportCard]);
  const assessmentColumns = useMemo(() => {
    const seen = new Map<string, string>();
    gradeRows.forEach((row) => {
      row.assessmentBreakdown?.forEach((item) => {
        const key = String(item.type || item.title || "Assessment").toUpperCase();
        if (!seen.has(key)) seen.set(key, item.title || item.type || "Assessment");
      });
    });
    return Array.from(seen, ([key, label]) => ({ key, label })).slice(0, 6);
  }, [gradeRows]);

  const fetchReportCard = useCallback(async () => {
    if (!reportCardId) return;
    setLoading(true);
    try {
      const response = await reportCardsAPI.getById(reportCardId);
      const data = response.data;
      setReportCard(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load report card");
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  }, [reportCardId]);

  useEffect(() => {
    void fetchReportCard();
  }, [fetchReportCard]);

  const loadPdfPreview = useCallback(async () => {
    if (!reportCardId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const response = await reportCardsAPI.downloadCertificatePdf(reportCardId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } catch (error: any) {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl("");
      setPreviewError(error?.response?.data?.message || "Failed to load report card preview");
    } finally {
      setPreviewLoading(false);
    }
  }, [reportCardId]);

  useEffect(() => {
    void loadPdfPreview();
    return () => {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [loadPdfPreview]);

  const downloadPdf = async () => {
    if (!reportCardId) return;
    setDownloading(true);
    try {
      const response = await reportCardsAPI.downloadCertificatePdf(reportCardId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${toDownloadFileName(reportCard?.student?.name, `report-card-${reportCardId}`)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to download report card PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#111111]">
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
        </div>
      </div>
    );
  }

  if (!reportCard) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 dark:bg-[#111111]">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/report-cards")}
          className="mb-4 rounded-lg border-gray-200 bg-white dark:border-[#2A2A2A] dark:bg-[#111111]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report Cards
        </Button>
        <div className="mx-auto flex min-h-[420px] max-w-2xl flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#1A1A1A]">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">Report card not found</h1>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            This report-card record is not available in the current school database.
          </p>
          <Button
            onClick={() => router.push("/admin/report-cards")}
            className="mt-5 rounded-lg bg-[var(--brand-color,#e35336)] text-white hover:opacity-90"
          >
            Open Report Cards
          </Button>
        </div>
      </div>
    );
  }

  const classLabel = [reportCard.class?.name, reportCard.class?.section].filter(Boolean).join(" ");
  const studentName = reportCard.student?.name || "Unknown student";
  const studentInitial = studentName.trim().charAt(0).toUpperCase() || "?";
  const rankValue = valueOrDash(reportCard.rank ?? reportCard.rankInClass);
  const summaryMetrics = [
    { label: "Average", value: formatPercent(reportCard.percentage), icon: Percent, tone: "text-sky-600 dark:text-sky-400" },
    { label: "Total Marks", value: valueOrDash(reportCard.totalMarks), icon: BarChart3, tone: "text-violet-600 dark:text-violet-400" },
    { label: "Grade", value: valueOrDash(reportCard.overallGrade), icon: Medal, tone: "text-[var(--brand-color,#e35336)]" },
    { label: "Attendance", value: formatPercent(reportCard.attendancePercentage), icon: CalendarDays, tone: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#111111]">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/admin/report-cards")}
              className="mt-1 h-9 w-9 rounded-lg border-gray-200 bg-white dark:border-[#2A2A2A] dark:bg-[#111111]"
              title="Back to report cards"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Report Card Review</h1>
                <StatusPill status={reportCard.status} />
              </div>
              <p className="mt-1 truncate text-sm text-gray-500">
                {studentName} / {classLabel || "No class"} / {reportCard.academicYear} / {reportCard.term}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReportCard}
              className="rounded-lg border-gray-200 bg-white text-xs font-medium dark:border-[#2A2A2A] dark:bg-[#111111]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPdfPreview}
              disabled={previewLoading}
              className="rounded-lg border-gray-200 bg-white text-xs font-medium dark:border-[#2A2A2A] dark:bg-[#111111]"
            >
              {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Reload Preview
            </Button>
            <Button
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
              className="rounded-lg bg-[var(--brand-color,#e35336)] text-xs font-medium text-white hover:opacity-90"
            >
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[#2A2A2A]">
            <div>
              <h2 className="text-sm font-semibold text-gray-950 dark:text-white">Generated Document</h2>
              <p className="text-xs text-gray-500">Certificate/report-card PDF preview</p>
            </div>
          </div>
          <div className="bg-gray-200/60 p-3 dark:bg-[#111111]">
            <div className="min-h-[760px] overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
              {previewLoading ? (
                <div className="flex min-h-[760px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-color,#e35336)]" />
                </div>
              ) : previewError ? (
                <div className="flex min-h-[760px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="h-10 w-10 text-gray-300" />
                  <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{previewError}</p>
                  <Button variant="outline" size="sm" onClick={loadPdfPreview} className="rounded-lg">Try Again</Button>
                </div>
              ) : previewUrl ? (
                <iframe
                  title={`Report card preview for ${studentName}`}
                  src={previewUrl}
                  className="h-[860px] w-full bg-white"
                />
              ) : (
                <div className="flex min-h-[760px] items-center justify-center text-sm text-gray-500">
                  Preview is not available.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-color,#e35336)] text-base font-semibold text-white">
                {studentInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-gray-950 dark:text-white">{studentName}</p>
                <p className="mt-0.5 text-sm text-gray-500">{classLabel || "No class assigned"}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {summaryMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#2A2A2A] dark:bg-[#111111]/50">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${metric.tone}`} />
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{metric.label}</p>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">{metric.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 text-sm dark:border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Rank</span>
                <span className="ml-auto font-semibold text-gray-950 dark:text-white">{rankValue}</span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Period</span>
                <span className="ml-auto text-right font-semibold text-gray-950 dark:text-white">{reportCard.academicYear} / {reportCard.term}</span>
              </div>
              <div className="flex items-center gap-3">
                <UserRound className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Subjects</span>
                <span className="ml-auto font-semibold text-gray-950 dark:text-white">{gradeRows.length}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-950 dark:text-white">Remarks</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:border-[#2A2A2A] dark:bg-[#111111] dark:text-gray-400">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Read-only
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Teacher</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">{reportCard.teacherRemarks || "No teacher remarks recorded."}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Principal</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">{reportCard.principalRemarks || "No principal remarks recorded."}</p>
              </div>
              <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Internal Only</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200">{reportCard.internalRemarks || "No internal staff notes recorded."}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="px-4 pb-6 sm:px-6">

        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Subjects</h2>
              <p className="text-sm text-gray-500">{gradeRows.length} subject{gradeRows.length === 1 ? "" : "s"} listed</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:border-[#2A2A2A] dark:bg-[#111111] dark:text-gray-400">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Marks read-only
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 dark:bg-[#1A1A1A]/30 border-b border-gray-100 dark:border-[#2A2A2A] hover:bg-gray-50/50">
                  <TableHead className="font-medium text-[10px] uppercase tracking-wider text-gray-400">#</TableHead>
                  <TableHead className="font-medium text-[10px] uppercase tracking-wider text-gray-400">Subject</TableHead>
                  {assessmentColumns.map((column) => (
                    <TableHead key={column.key} className="font-medium text-[10px] uppercase tracking-wider text-gray-400 text-center">{column.label}</TableHead>
                  ))}
                  <TableHead className="font-medium text-[10px] uppercase tracking-wider text-gray-400 text-center">Total</TableHead>
                  <TableHead className="font-medium text-[10px] uppercase tracking-wider text-gray-400 text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradeRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4 + assessmentColumns.length} className="py-10 text-center text-gray-500">
                      No subject rows are available for this report card.
                    </TableCell>
                  </TableRow>
                ) : (
                  gradeRows.map((row, index) => (
                    <TableRow key={`${row.subjectId || row.subjectName}-${index}`} className="group transition-all hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/40">
                      <TableCell className="py-4 text-gray-500">{index + 1}</TableCell>
                      <TableCell className="py-4 font-medium text-gray-900 dark:text-white">
                        {row.subjectName || "-"}
                        {row.subjectCode ? <span className="ml-2 text-xs text-gray-400">{row.subjectCode}</span> : null}
                      </TableCell>
                      {assessmentColumns.map((column) => {
                        const score = row.assessmentBreakdown?.find(
                          (item) => String(item.type || item.title || "Assessment").toUpperCase() === column.key,
                        );
                        return (
                          <TableCell key={column.key} className="py-4 text-center text-gray-700 dark:text-gray-200">
                            {score?.score ?? "-"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="py-4 text-center font-semibold text-gray-900 dark:text-white">{valueOrDash(row.totalScore)}</TableCell>
                      <TableCell className="py-4 text-center font-semibold text-[var(--brand-color,#e35336)]">{valueOrDash(row.gradeLetter)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
