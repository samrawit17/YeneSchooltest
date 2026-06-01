"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Download,
  Edit2,
  FileText,
  GraduationCap,
  Loader2,
  Medal,
  RefreshCw,
  Save,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { reportCardsAPI, type GradeDetail, type ReportCard } from "@/lib/api/reporting";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(1)}%`;
}

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
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [editedRemarks, setEditedRemarks] = useState({
    teacher: "",
    principal: "",
    internal: "",
  });

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
      setEditedRemarks({
        teacher: data.teacherRemarks || "",
        principal: data.principalRemarks || "",
        internal: data.internalRemarks || ""
      });
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

  const downloadPdf = async () => {
    if (!reportCardId) return;
    setDownloading(true);
    try {
      const response = await reportCardsAPI.downloadCertificatePdf(reportCardId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-card-${reportCardId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to download report card PDF");
    } finally {
      setDownloading(false);
    }
  };

  const saveRemarks = async () => {
    if (!reportCardId) return;
    setSavingRemarks(true);
    try {
      await reportCardsAPI.updateRemarks(reportCardId, {
        teacherRemarks: editedRemarks.teacher,
        principalRemarks: editedRemarks.principal,
        internalRemarks: editedRemarks.internal
      });
      toast.success("Remarks updated successfully");
      setIsEditingRemarks(false);
      void fetchReportCard();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update remarks");
    } finally {
      setSavingRemarks(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
        </div>
      </div>
    );
  }

  if (!reportCard) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
        <button
          onClick={() => router.push("/admin/report-cards")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Report card not found.</p>
        </div>
      </div>
    );
  }

  const classLabel = [reportCard.class?.name, reportCard.class?.section].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/admin/report-cards")}
              className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Back to report cards"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Report Card</h1>
                <StatusPill status={reportCard.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {reportCard.student?.name || "Unknown student"} · {classLabel || "No class"} · {reportCard.term}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchReportCard}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-color,#e35336)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Student</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{reportCard.student?.name || "-"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Class</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{classLabel || "-"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Academic Period</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{reportCard.academicYear} · {reportCard.term}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <Medal className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Rank</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{valueOrDash(reportCard.rank || reportCard.rankInClass)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase text-slate-500">Average</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatPercent(reportCard.percentage)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase text-slate-500">Total Marks</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{valueOrDash(reportCard.totalMarks)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase text-slate-500">Overall Grade</p>
            <p className="mt-2 text-2xl font-bold text-[var(--brand-color,#e35336)]">{valueOrDash(reportCard.overallGrade)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase text-slate-500">Attendance</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatPercent(reportCard.attendancePercentage)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Subjects</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{gradeRows.length} subject{gradeRows.length === 1 ? "" : "s"} listed</p>
            </div>
            <Award className="h-5 w-5 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  {assessmentColumns.map((column) => (
                    <th key={column.key} className="px-4 py-3 text-center">{column.label}</th>
                  ))}
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {gradeRows.length === 0 ? (
                  <tr>
                    <td colSpan={4 + assessmentColumns.length} className="px-4 py-10 text-center text-slate-500">
                      No subject rows are available for this report card.
                    </td>
                  </tr>
                ) : (
                  gradeRows.map((row, index) => (
                    <tr key={`${row.subjectId || row.subjectName}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {row.subjectName || "-"}
                        {row.subjectCode ? <span className="ml-2 text-xs text-slate-400">{row.subjectCode}</span> : null}
                      </td>
                      {assessmentColumns.map((column) => {
                        const score = row.assessmentBreakdown?.find(
                          (item) => String(item.type || item.title || "Assessment").toUpperCase() === column.key,
                        );
                        return (
                          <td key={column.key} className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">
                            {score?.score ?? "-"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">{valueOrDash(row.totalScore)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--brand-color,#e35336)]">{valueOrDash(row.gradeLetter)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">Governance & Remarks</h2>
            <div className="flex items-center gap-2">
              {isEditingRemarks ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingRemarks(false)} disabled={savingRemarks}>Cancel</Button>
                  <Button 
                    size="sm" 
                    onClick={saveRemarks} 
                    disabled={savingRemarks}
                    className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90"
                  >
                    {savingRemarks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingRemarks(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Remarks
                </Button>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-slate-500">Teacher Remarks (Public)</p>
                {isEditingRemarks ? (
                  <Textarea 
                    value={editedRemarks.teacher} 
                    onChange={e => setEditedRemarks(prev => ({...prev, teacher: e.target.value}))}
                    placeholder="Enter public teacher remark..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-200 italic">{reportCard.teacherRemarks || "No teacher remarks recorded."}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-slate-500">Principal Remarks (Public)</p>
                {isEditingRemarks ? (
                  <Textarea 
                    value={editedRemarks.principal} 
                    onChange={e => setEditedRemarks(prev => ({...prev, principal: e.target.value}))}
                    placeholder="Enter public principal remark..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-200 italic">{reportCard.principalRemarks || "No principal remarks recorded."}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-dashed border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Internal Advisory Notes (Private)</p>
              </div>
              {isEditingRemarks ? (
                <Textarea 
                  value={editedRemarks.internal} 
                  onChange={e => setEditedRemarks(prev => ({...prev, internal: e.target.value}))}
                  placeholder="Sensitive notes for internal use only (not shown on PDF)..."
                  className="min-h-[80px] bg-white"
                />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {reportCard.internalRemarks || "No internal staff notes recorded."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
