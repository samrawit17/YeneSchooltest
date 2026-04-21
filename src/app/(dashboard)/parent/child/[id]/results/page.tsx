"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentsAPI } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ParentChildAssessmentResultsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === "PARENT" && childId) {
      loadData();
    }
  }, [isLoading, isAuthenticated, user?.role, childId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await assessmentsAPI.getChildResults(childId);
      setResults(response.data || []);
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Child Performance</h1>
          <p className="text-sm text-slate-500">
            Detailed assessment-by-assessment breakdown for the selected child.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Includes pending items where scores have not been entered yet.</CardDescription>
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
