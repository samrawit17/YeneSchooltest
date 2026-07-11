"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Pencil,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { dataQualityAPI, type DataQualityIssue, type DataQualitySeverity } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/Pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const severityStyles: Record<DataQualitySeverity, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-700 dark:bg-[#1A1A1A] dark:text-[#CCCCCC]",
};

const formatIssueType = (type: string) =>
  type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

const csvValue = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const studentHref = (issue: DataQualityIssue, edit = false) => {
  if (!issue.studentUserId) return null;
  return `/list/students/${issue.studentUserId}${edit ? "/edit" : ""}`;
};

export default function DataConsistencyReportPage() {
  const searchParams = useSearchParams();
  const targetSchoolId = searchParams.get("schoolId") ?? undefined;

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"all" | DataQualitySeverity>("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["data-quality", "student-consistency", targetSchoolId],
    queryFn: async () =>
      (await dataQualityAPI.getStudentConsistency(targetSchoolId)).data,
  });

  const issueTypes = useMemo(
    () => Object.keys(data?.summary.byType || {}).sort(),
    [data?.summary.byType],
  );

  const topIssueTypes = useMemo(
    () =>
      Object.entries(data?.summary.byType || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [data?.summary.byType],
  );

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.issues || []).filter((issue) => {
      const matchesSeverity = severity === "all" || issue.severity === severity;
      const matchesType = type === "all" || issue.type === type;
      const haystack = [
        issue.studentCode,
        issue.studentName,
        issue.className,
        issue.section,
        issue.placementClassName,
        issue.placementSection,
        issue.placementAcademicYear,
        issue.type,
        issue.detail,
        issue.recommendation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesSeverity && matchesType && (!term || haystack.includes(term));
    });
  }, [data?.issues, search, severity, type]);

  const exportFilteredIssues = () => {
    const headers = [
      "Severity",
      "Issue",
      "Student",
      "Code",
      "Profile Class",
      "Profile Section",
      "Placement Class",
      "Placement Section",
      "Placement Year",
      "Detail",
      "Recommendation",
    ];
    const rows = filteredIssues.map((issue) => [
      issue.severity,
      formatIssueType(issue.type),
      issue.studentName || "",
      issue.studentCode || "",
      issue.className || "",
      issue.section || "",
      issue.placementClassName || "",
      issue.placementSection || "",
      issue.placementAcademicYear || "",
      issue.detail,
      issue.recommendation || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvValue).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-data-health-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const paginatedIssues = filteredIssues.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setSearch("");
    setSeverity("all");
    setType("all");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Data Health</h1>
          <p className="text-sm text-muted-foreground">
            Find records that need parent links, active-year placement, or profile cleanup.
          </p>
          {targetSchoolId && (
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <Badge variant="outline" className="font-medium">
                School: {targetSchoolId}
              </Badge>
              <Link
                href={`/list/schools/${targetSchoolId}/settings`}
                className="inline-flex items-center gap-1 text-[var(--brand-color,#e35336)] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Back to school settings
              </Link>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isError ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="py-5 text-sm text-red-700 dark:text-red-300">
            Failed to load data consistency report.
          </CardContent>
        </Card>
      ) : (
        <>
          {(data?.warnings?.length || 0) > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                {data?.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Students Checked</p>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-bold">{data?.checkedStudents || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {data?.academicYear?.name || "No active year"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Total Issues</p>
                <p className="mt-2 text-2xl font-bold">{data?.summary.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">High Severity</p>
                <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                  {data?.summary.bySeverity.high || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  {(data?.summary.total || 0) === 0 && (data?.warnings.length || 0) === 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-700 dark:text-green-400">Clean</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-700 dark:text-yellow-400">Needs action</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Student Issues</CardTitle>
                <CardDescription>
                  {filteredIssues.length} of {data?.summary.total || 0} issues shown
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {topIssueTypes.length > 0 && topIssueTypes.map(([issueType, count]) => (
                  <Button
                    key={issueType}
                    variant={type === issueType ? "default" : "outline"}
                    size="sm"
                    onClick={() => setType(type === issueType ? "all" : issueType)}
                  >
                    {formatIssueType(issueType)}
                    <Badge variant={type === issueType ? "secondary" : "outline"} className="ml-1.5">{count}</Badge>
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={exportFilteredIssues} disabled={!filteredIssues.length}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search..."
                    className="pl-9"
                  />
                </div>
                <Select value={severity} onValueChange={(v) => { setSeverity(v as "all" | DataQualitySeverity); setPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All issue types</SelectItem>
                    {issueTypes.map((t) => (
                      <SelectItem key={t} value={t}>{formatIssueType(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!search && severity === "all" && type === "all"}>
                  Clear
                </Button>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                  No issues match the current filters.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Placement</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Issue</TableHead>
                          <TableHead className="min-w-[280px]">Detail</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedIssues.map((issue, index) => {
                          const viewHref = studentHref(issue);
                          const editHref = studentHref(issue, true);
                          return (
                            <TableRow key={`${issue.type}-${issue.studentProfileId || issue.studentCode || index}-${index}`}>
                              <TableCell className="font-medium">{issue.studentName || "-"}</TableCell>
                              <TableCell>{issue.studentCode || "-"}</TableCell>
                              <TableCell>{[issue.className, issue.section].filter(Boolean).join(" ") || "-"}</TableCell>
                              <TableCell>
                                {[issue.placementClassName, issue.placementSection].filter(Boolean).join(" ") || "-"}
                                {issue.placementAcademicYear && (
                                  <p className="text-xs text-muted-foreground">{issue.placementAcademicYear}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={severityStyles[issue.severity]}>{issue.severity}</Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{formatIssueType(issue.type)}</TableCell>
                              <TableCell className="text-sm">
                                <p>{issue.detail}</p>
                                {issue.recommendation && (
                                  <p className="mt-1 text-xs text-muted-foreground">{issue.recommendation}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  {viewHref && (
                                    <Button asChild size="sm" variant="outline">
                                      <Link href={viewHref}><ExternalLink className="mr-1 h-3.5 w-3.5" />Open</Link>
                                    </Button>
                                  )}
                                  {editHref && (
                                    <Button asChild size="sm" variant="ghost">
                                      <Link href={editHref}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Link>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredIssues.length)} of {filteredIssues.length}
                    </p>
                    <Pagination page={page} setPage={setPage} totalPages={totalPages} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
