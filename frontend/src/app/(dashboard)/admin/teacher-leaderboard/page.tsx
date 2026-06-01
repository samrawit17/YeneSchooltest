"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, RefreshCw, Trophy, Users } from "lucide-react";
import { dashboardAPI } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface TeacherLeaderboardEntry {
  rank: number;
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  overallScore: number;
  gradingScore: number;
  attendanceScore: number;
  lessonPlanScore: number;
  gradingSubmitted: number;
  gradingOnTime: number;
  attendanceSubmitted: number;
  lessonPlans: number;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

const scoreBand = (score: number) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Follow-up";
  return "At Risk";
};

export default function TeacherLeaderboardPage() {
  const [rows, setRows] = useState<TeacherLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await dashboardAPI.getTeacherLeaderboard();
      setRows(response.data?.metadata?.teacherLeaderboard || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Failed to load teacher leaderboard";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>([
      ["Excellent", 0],
      ["Strong", 0],
      ["Needs Follow-up", 0],
      ["At Risk", 0],
    ]);

    rows.forEach((row) => {
      const band = scoreBand(row.overallScore);
      counts.set(band, (counts.get(band) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [rows]);

  const comparisonData = rows.slice(0, 8).map((row) => ({
    name: row.teacherName.split(" ")[0] || row.teacherName,
    overall: row.overallScore,
    grading: row.gradingScore,
    attendance: row.attendanceScore,
    lessons: row.lessonPlanScore,
  }));

  const topTeacher = rows[0];
  const averageScore =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.overallScore, 0) / rows.length)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-900 md:p-6">
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-900 md:p-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
              Teacher Leaderboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ranking based on the last 30 days of on-time grading, attendance submissions, and lesson planning.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => loadLeaderboard(true)}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Teachers ranked</p>
                <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{rows.length}</p>
              </div>
              <Users className="h-9 w-9 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Average score</p>
                <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{averageScore}%</p>
              </div>
              <Trophy className="h-9 w-9 text-amber-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Current leader</p>
              <p className="mt-2 truncate text-xl font-bold text-slate-950 dark:text-white">
                {topTeacher?.teacherName || "No teacher data"}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {topTeacher ? `${topTeacher.overallScore}% overall` : "No activity found"}
              </p>
            </CardContent>
          </Card>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No teacher leaderboard data is available for the last 30 days.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={68}
                        outerRadius={105}
                        paddingAngle={3}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {distribution.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Teacher Metrics</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="grading" name="On-time grading" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="attendance" name="Attendance" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lessons" name="Lesson plans" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Teacher Ranking</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((teacher) => (
                    <div
                      key={teacher.teacherId}
                      className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_90px] lg:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-sm font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          #{teacher.rank}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {teacher.teacherName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {teacher.teacherEmail || "No email"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {[
                          {
                            label: "On-time grading",
                            value: teacher.gradingScore,
                            detail: `${teacher.gradingOnTime}/${teacher.gradingSubmitted} on time`,
                          },
                          {
                            label: "Attendance",
                            value: teacher.attendanceScore,
                            detail: `${teacher.attendanceSubmitted} submitted`,
                          },
                          {
                            label: "Lesson plans",
                            value: teacher.lessonPlanScore,
                            detail: `${teacher.lessonPlans} published`,
                          },
                        ].map((metric) => (
                          <div key={metric.label}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">{metric.value}%</span>
                            </div>
                            <Progress value={metric.value} className="h-2" />
                            <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Overall</p>
                        <p className="text-2xl font-bold text-slate-950 dark:text-white">
                          {teacher.overallScore}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
