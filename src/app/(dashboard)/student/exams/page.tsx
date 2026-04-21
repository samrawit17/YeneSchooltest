"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentsAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentAssessmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === "STUDENT") {
      loadData();
    }
  }, [isLoading, isAuthenticated, user?.role]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [upcomingRes, resultsRes] = await Promise.all([
        assessmentsAPI.getStudentUpcoming(),
        assessmentsAPI.getStudentResults(),
      ]);
      setUpcoming(upcomingRes.data || []);
      setResults(resultsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e35336]">My Assessments</h1>
        <p className="text-sm text-slate-500">
          Track scheduled quizzes, tests, mid exams, final exams, and your results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          <CardDescription>Scheduled assessments for your current class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {upcoming.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.assessment.title}</div>
                <Badge variant="outline">{item.assessment.type}</Badge>
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {item.subject.name} • Max {item.maxScore}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {new Date(item.assessment.startDate).toLocaleString()}
              </div>
            </div>
          ))}
          {!upcoming.length && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
              No upcoming assessments.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Results</CardTitle>
          <CardDescription>Per-subject breakdown with pending items included.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.map((subject) => (
            <div key={`${subject.subjectId}-${subject.termName || "term"}`} className="rounded-lg border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{subject.subjectName}</div>
                  <div className="text-sm text-slate-500">{subject.termName || "Current Term"}</div>
                </div>
                <Badge variant="secondary">
                  {subject.summary.gradeLetter || "Pending"} {subject.summary.totalScore !== null ? `• ${subject.summary.totalScore.toFixed(1)}/100` : ""}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {subject.assessments.map((assessment: any) => (
                  <div key={assessment.assessmentSubjectId} className="rounded-md bg-slate-50 p-3">
                    <div className="text-sm font-medium">{assessment.title}</div>
                    <div className="text-xs text-slate-500">{assessment.type}</div>
                    <div className="mt-2 text-sm">
                      {assessment.score === null ? "Pending" : `${assessment.score}/${assessment.maxScore}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!results.length && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
              No results available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
