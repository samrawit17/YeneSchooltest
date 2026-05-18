"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, Search } from "lucide-react";
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
        issue.type,
        issue.detail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesSeverity && matchesType && (!term || haystack.includes(term));
    });
  }, [data?.issues, search, severity, type]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Data Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Find student records that need parent links, class placement, or profile cleanup.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Students Checked</p>
                  <Database className="h-4 w-4 text-gray-400" />
                </div>
                <p className="mt-2 text-2xl font-semibold dark:text-white">{data?.checkedStudents || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data?.academicYear?.name || "No active year"}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
                <p className="mt-2 text-2xl font-semibold dark:text-white">{data?.summary.total || 0}</p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">High Severity</p>
                <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
                  {data?.summary.bySeverity.high || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  {(data?.summary.total || 0) === 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">Clean</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">Needs review</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Student Issues</CardTitle>
              <CardDescription>
                Review missing parent links, missing active-year placements, and profile/class mismatches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_240px]">
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
                        <TableHead>Severity</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue: DataQualityIssue, index) => (
                        <TableRow key={`${issue.type}-${issue.studentProfileId || issue.studentCode || index}-${index}`}>
                          <TableCell className="font-medium">{issue.studentName || "-"}</TableCell>
                          <TableCell>{issue.studentCode || "-"}</TableCell>
                          <TableCell>{[issue.className, issue.section].filter(Boolean).join(" ") || "-"}</TableCell>
                          <TableCell>
                            <Badge className={severityStyles[issue.severity]}>{issue.severity}</Badge>
                          </TableCell>
                          <TableCell>{formatIssueType(issue.type)}</TableCell>
                          <TableCell className="min-w-[320px] text-sm text-gray-600 dark:text-gray-300">
                            {issue.detail}
                          </TableCell>
                        </TableRow>
                      ))}
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
