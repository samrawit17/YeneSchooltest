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
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-[#111111] md:p-6">
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
    <div className="bg-gray-50 dark:bg-[#111111]">
      <div className="space-y-3 px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-white">
              Teacher Leaderboard
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last 30 days — on-time grading, attendance, lesson planning.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLeaderboard(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Teachers ranked</p>
                <p className="text-xl font-bold text-gray-950 dark:text-white">{rows.length}</p>
              </div>
              <Users className="h-6 w-6 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average score</p>
                <p className="text-xl font-bold text-gray-950 dark:text-white">{averageScore}%</p>
              </div>
              <Trophy className="h-6 w-6 text-amber-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current leader</p>
              <p className="truncate text-base font-bold text-gray-950 dark:text-white">
                {topTeacher?.teacherName || "No teacher data"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {topTeacher ? `${topTeacher.overallScore}% overall` : "No activity found"}
              </p>
            </CardContent>
          </Card>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
              No teacher leaderboard data is available for the last 30 days.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={70}
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
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Top Teacher Metrics</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={25} />
                      <Tooltip />
                      <Bar dataKey="grading" name="On-time grading" fill="#2563eb" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="attendance" name="Attendance" fill="#16a34a" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="lessons" name="Lesson plans" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm">Teacher Ranking</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                  {rows.map((teacher) => (
                    <div
                      key={teacher.teacherId}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <div className="flex w-8 shrink-0 items-center justify-center rounded bg-amber-50 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        #{teacher.rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-950 dark:text-white">
                          {teacher.teacherName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span title="On-time grading">{teacher.gradingScore}% <span className="hidden sm:inline">grade</span></span>
                        <span title="Attendance">{teacher.attendanceScore}% <span className="hidden sm:inline">attd</span></span>
                        <span title="Lesson plans">{teacher.lessonPlanScore}% <span className="hidden sm:inline">lesson</span></span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-950 dark:text-white">{teacher.overallScore}%</span>
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
