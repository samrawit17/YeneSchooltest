"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const severityStyles: Record<DataQualitySeverity, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"all" | DataQualitySeverity>("all");
  const [type, setType] = useState("all");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["data-quality", "student-consistency"],
    queryFn: async () => (await dataQualityAPI.getStudentConsistency()).data,
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

  const resetFilters = () => {
    setSearch("");
    setSeverity("all");
    setType("all");
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
    <div className="p-4 md:p-6 space-y-6 dark:bg-[#0F172A] min-h-screen">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Data Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Find records that need parent links, active-year placement, or profile cleanup.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportFilteredIssues} disabled={!filteredIssues.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex gap-3 py-4 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  {data?.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Students Checked</p>
                  <Database className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <p className="mt-1 text-lg font-semibold dark:text-white">{data?.checkedStudents || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data?.academicYear?.name || "No active year"}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Issues</p>
                <p className="mt-1 text-lg font-semibold dark:text-white">{data?.summary.total || 0}</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">High Severity</p>
                <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">
                  {data?.summary.bySeverity.high || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {(data?.summary.total || 0) === 0 && (data?.warnings.length || 0) === 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">Clean</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Needs action</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {topIssueTypes.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {topIssueTypes.map(([issueType, count]) => (
                <button
                  key={issueType}
                  type="button"
                  onClick={() => setType(issueType)}
                  className="rounded-md border bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-800 dark:hover:bg-slate-800/80"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Common issue
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatIssueType(issueType)}
                    </p>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Student Issues</CardTitle>
              <CardDescription>
                Showing {filteredIssues.length} of {data?.summary.total || 0} issues. Open a student to fix the record, or export the filtered list for follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_240px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student, code, class, or detail"
                    className="pl-9"
                  />
                </div>
                <Select value={severity} onValueChange={(value) => setSeverity(value as "all" | DataQualitySeverity)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All issue types</SelectItem>
                    {issueTypes.map((issueType) => (
                      <SelectItem key={issueType} value={issueType}>
                        {formatIssueType(issueType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" onClick={resetFilters} disabled={!search && severity === "all" && type === "all"}>
                  Clear
                </Button>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
                  No data consistency issues match the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Placement</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue: DataQualityIssue, index) => {
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
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {issue.placementAcademicYear}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={severityStyles[issue.severity]}>{issue.severity}</Badge>
                            </TableCell>
                            <TableCell>{formatIssueType(issue.type)}</TableCell>
                            <TableCell className="min-w-[360px] text-sm text-gray-600 dark:text-gray-300">
                              <p>{issue.detail}</p>
                              {issue.recommendation && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {issue.recommendation}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[140px] text-right">
                              <div className="flex justify-end gap-2">
                                {viewHref ? (
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={viewHref}>
                                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                      Open
                                    </Link>
                                  </Button>
                                ) : null}
                                {editHref ? (
                                  <Button asChild size="sm" variant="ghost">
                                    <Link href={editHref}>
                                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                      Edit
                                    </Link>
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
