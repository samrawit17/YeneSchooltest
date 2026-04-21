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

export default function ParentChildAssessmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<any[]>([]);

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
      const response = await assessmentsAPI.getChildUpcoming(childId);
      setUpcoming(response.data || []);
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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Child Assessments</h1>
          <p className="text-sm text-slate-500">
            Upcoming quizzes, tests, mid exams, and final exams.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          <CardDescription>Scheduled assessment items for your child.</CardDescription>
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
    </div>
  );
}
