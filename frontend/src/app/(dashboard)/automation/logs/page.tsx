"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { automationAPI, type AutomationExecutionLog } from "@/lib/api/automation";

const EVENT_LABELS: Record<string, string> = {
  "attendance.marked": "Attendance Marked",
  "fee.overdue": "Fee Overdue",
  "grade.published": "Grade Published",
  "student.created": "Student Created",
};

export default function AutomationLogsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["automation-logs", statusFilter, page],
    queryFn: async () =>
      (await automationAPI.getLogs({ status: statusFilter || undefined, page, limit: 30 })).data,
  });

  const logs = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/automation")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Execution Logs</h1>
            <p className="text-sm text-gray-500">History of all automation rule executions.</p>
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500">No execution logs yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log: AutomationExecutionLog) => (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {EVENT_LABELS[log.eventType] || log.eventType}
                      </span>
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>
                        {log.status === "success" ? (
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Success</span>
                        ) : (
                          <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</span>
                        )}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {log.ruleName && <span className="mr-2">Rule: {log.ruleName}</span>}
                      {new Date(log.triggeredAt).toLocaleString()}
                      {log.executionTimeMs != null && ` · ${log.executionTimeMs}ms`}
                    </p>
                    {log.errorMessage && (
                      <p className="mt-1 text-xs text-red-500">{log.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {log.executedActions && Array.isArray(log.executedActions) && (
                      <span>{log.executedActions.length} action{(log.executedActions.length || 0) !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
