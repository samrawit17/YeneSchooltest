"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  academicYearsAPI,
  classesAPI,
  reportCardsAPI,
  termsAPI,
  type ParentPresentationReport,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

type Option = { id: string; name: string; isActive?: boolean; section?: string; grade?: number | null };

const ALL_CLASSES = "__all_classes__";

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value}%` : "-";
}

function formatChange(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ParentPresentationReportPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { periodLabel, periodLabelPlural } = useAcademicYear();
  const [academicYears, setAcademicYears] = useState<Option[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [fromTermId, setFromTermId] = useState("");
  const [toTermId, setToTermId] = useState("");
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [report, setReport] = useState<ParentPresentationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const briefTitle = `${periodLabel} Performance Brief`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    academicYearsAPI
      .getAll()
      .then((res) => {
        const years = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setAcademicYears(years);
        const active = years.find((year: Option) => year.isActive) || years[0];
        if (active) setSelectedYear(active.id);
      })
      .catch(() => toast.error("Failed to load academic years"));
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    setTerms([]);
    setClasses([]);
    setFromTermId("");
    setToTermId("");
    setClassId(ALL_CLASSES);
    setReport(null);

    Promise.all([
      termsAPI.getAll({ academicYearId: selectedYear }),
      classesAPI.getAll({ academicYearId: selectedYear }),
    ])
      .then(([termRes, classRes]) => {
        const nextTerms = Array.isArray(termRes.data) ? termRes.data : termRes.data?.data || [];
        const nextClasses = Array.isArray(classRes.data) ? classRes.data : classRes.data?.data || [];
        setTerms(nextTerms);
        setClasses(nextClasses);
        if (nextTerms.length >= 2) {
          setFromTermId(nextTerms[0].id);
          setToTermId(nextTerms[1].id);
        } else if (nextTerms.length === 1) {
          setFromTermId(nextTerms[0].id);
          setToTermId(nextTerms[0].id);
        }
      })
      .catch(() => toast.error("Failed to load report filters"));
  }, [selectedYear]);

  const query = useMemo(
    () => ({
      academicYearId: selectedYear,
      fromTermId,
      toTermId,
      classId: classId === ALL_CLASSES ? undefined : classId,
    }),
    [classId, fromTermId, selectedYear, toTermId],
  );

  const canRun = Boolean(selectedYear && fromTermId && toTermId);

  const loadReport = useCallback(async () => {
    if (!canRun) return;
    setLoading(true);
    try {
      const res = await reportCardsAPI.getParentPresentationReport(query);
      setReport(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to generate term performance brief");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [canRun, query]);

  useEffect(() => {
    if (canRun) loadReport();
  }, [canRun, loadReport]);

  const downloadReport = async (type: "pdf" | "excel") => {
    if (!canRun) return;
    setDownloading(type);
    try {
      const response =
        type === "pdf"
          ? await reportCardsAPI.downloadParentPresentationPdf(query)
          : await reportCardsAPI.downloadParentPresentationExcel(query);
      downloadBlob(
        response.data,
        type === "pdf" ? "term-performance-brief.pdf" : "term-performance-brief.xlsx",
        type === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      toast.success(`${type === "pdf" ? "PDF" : "Excel"} downloaded`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to download ${type}`);
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{briefTitle}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Compare published report-card results across {periodLabelPlural.toLowerCase()} and export a boardroom-ready parent meeting brief.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadReport("excel")} disabled={!report || downloading !== null}>
            {downloading === "excel" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <Button onClick={() => downloadReport("pdf")} disabled={!report || downloading !== null} className="bg-[var(--brand-color)] text-white">
            {downloading === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6 dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="grid gap-3 pt-6 md:grid-cols-5">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger><SelectValue placeholder="Academic year" /></SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fromTermId} onValueChange={setFromTermId}>
            <SelectTrigger><SelectValue placeholder="Previous term" /></SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toTermId} onValueChange={setToTermId}>
            <SelectTrigger><SelectValue placeholder="New term" /></SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
              {classes.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}{item.section ? ` ${item.section}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadReport} disabled={!canRun || loading} variant="outline">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}
        </div>
      ) : !report ? (
        <Card className="border-dashed dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">Select an academic year and two terms to generate the report.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric title="Average Result" from={report.summary.from.average} to={report.summary.to.average} change={report.summary.averageChange} />
            <Metric title="Attendance" from={report.summary.from.attendance} to={report.summary.to.attendance} change={report.summary.attendanceChange} />
            <Metric title="Pass Rate" from={report.summary.from.passRate} to={report.summary.to.passRate} />
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Published Students</p>
                <p className="mt-2 text-2xl font-semibold dark:text-white">{report.summary.to.students}</p>
                <p className="text-xs text-slate-500">{report.fromTerm.name}: {report.summary.from.students}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InsightCard title="Top Improving Classes" icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} rows={report.insights.improvedClasses.map((row) => `${row.className}${row.sectionName ? ` ${row.sectionName}` : ""}: ${formatChange(row.change)}`)} />
            <InsightCard title="Classes Needing Attention" icon={<TrendingDown className="h-5 w-5 text-red-500" />} rows={report.insights.decliningClasses.map((row) => `${row.className}${row.sectionName ? ` ${row.sectionName}` : ""}: ${formatChange(row.change)}`)} />
            <InsightCard title="Improving Subjects" icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} rows={report.insights.improvedSubjects.map((row) => `${row.subjectName}: ${formatChange(row.change)}`)} />
            <InsightCard title="Weak Subjects" icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} rows={report.insights.weakSubjects.map((row) => `${row.subjectName}: ${formatPercent(row.toAverage)}`)} />
          </div>

          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Class Comparison</CardTitle>
              <CardDescription>{report.fromTerm.name} compared with {report.toTerm.name}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="py-2">Class</th>
                    <th className="py-2">{report.fromTerm.name}</th>
                    <th className="py-2">{report.toTerm.name}</th>
                    <th className="py-2">Change</th>
                    <th className="py-2">Attendance</th>
                    <th className="py-2">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.classSummaries.map((row) => (
                    <tr key={row.classId} className="border-b last:border-0 dark:border-slate-800">
                      <td className="py-3 font-medium dark:text-white">{row.className}{row.sectionName ? ` ${row.sectionName}` : ""}</td>
                      <td>{formatPercent(row.fromAverage)}</td>
                      <td>{formatPercent(row.toAverage)}</td>
                      <td><ChangeBadge value={row.change} /></td>
                      <td>{formatPercent(row.toAttendance)}</td>
                      <td>{formatPercent(row.passRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ title, from, to, change }: { title: string; from: number | null; to: number | null; change?: number | null }) {
  return (
    <Card className="dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-semibold dark:text-white">{formatPercent(to)}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>Previous {formatPercent(from)}</span>
          {change !== undefined ? <ChangeBadge value={change} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ChangeBadge({ value }: { value: number | null | undefined }) {
  if (typeof value !== "number") return <Badge variant="outline">No comparison</Badge>;
  if (value > 0) return <Badge className="bg-emerald-100 text-emerald-700">{formatChange(value)}</Badge>;
  if (value < 0) return <Badge className="bg-red-100 text-red-700">{formatChange(value)}</Badge>;
  return <Badge variant="outline">No change</Badge>;
}

function InsightCard({ title, icon, rows }: { title: string; icon: ReactNode; rows: string[] }) {
  return (
    <Card className="dark:border-slate-800 dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No data available.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row} className="text-sm text-slate-700 dark:text-slate-200">{row}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
