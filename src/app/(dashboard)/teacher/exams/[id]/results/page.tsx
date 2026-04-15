"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { assessmentsAPI } from "@/lib/api";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScoreEntryRow {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  score: number | null;
  isAbsent: boolean;
  remarks: string | null;
  status: string;
}

interface ScoreEntryPayload {
  id: string;
  maxScore: number;
  subject: { name: string };
  class: { name: string };
  section?: { name: string } | null;
  assessment: {
    title: string;
    type: string;
    status: string;
  };
  students: ScoreEntryRow[];
}

export default function AssessmentScoreEntryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const assessmentSubjectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<ScoreEntryPayload | null>(null);
  const [rows, setRows] = useState<Record<string, ScoreEntryRow>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadScoreEntry = useCallback(async () => {
    try {
      setLoading(true);
      const response = await assessmentsAPI.getScoreEntry(assessmentSubjectId);
      const data = response.data as ScoreEntryPayload;
      setPayload(data);
      const mapped = Object.fromEntries(
        data.students.map((student) => [student.studentId, student]),
      );
      setRows(mapped);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load score entry sheet");
    } finally {
      setLoading(false);
    }
  }, [assessmentSubjectId]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && assessmentSubjectId) {
      loadScoreEntry();
    }
  }, [isLoading, isAuthenticated, assessmentSubjectId, loadScoreEntry]);

  const updateRow = (
    studentId: string,
    field: keyof ScoreEntryRow,
    value: string | boolean | number | null,
  ) => {
    setRows((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: value,
      },
    }));
  };

  const persistScores = async (status: "DRAFT" | "SUBMITTED") => {
    if (!payload) return;

    try {
      setSaving(true);
      await assessmentsAPI.saveScores(payload.id, {
        status,
        scores: Object.values(rows).map((row) => ({
          studentId: row.studentId,
          score:
            row.isAbsent || row.score === null || row.score === undefined
              ? undefined
              : Number(row.score),
          isAbsent: row.isAbsent,
          remarks: row.remarks || undefined,
        })),
      });

      toast.success(
        status === "DRAFT" ? "Draft scores saved" : "Scores submitted",
      );
      await loadScoreEntry();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to save assessment scores",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading || !payload) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isLocked = payload.assessment.status === "LOCKED";

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9" onClick={() => router.back()}>
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-[#e35336]">
            {payload.assessment.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            {payload.subject.name} • {payload.class.name}
            {payload.section?.name ? ` - ${payload.section.name}` : ""} • Max{" "}
            {payload.maxScore}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base md:text-lg">Score Entry</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Save draft marks while working, then submit final when complete.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Badge variant={isLocked ? "destructive" : "secondary"} className="text-xs md:text-sm">
              {payload.assessment.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={saving || isLocked}
              onClick={() => persistScores("DRAFT")}
              className="text-xs md:text-sm h-8 md:h-9"
            >
              <Save className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Save Draft</span>
              <span className="sm:hidden">Draft</span>
            </Button>
            <Button
              size="sm"
              disabled={saving || isLocked}
              onClick={() => persistScores("SUBMITTED")}
              className="text-xs md:text-sm h-8 md:h-9"
            >
              <Send className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Submit Final</span>
              <span className="sm:hidden">Submit</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs md:text-sm w-24 md:w-32">Student ID</TableHead>
                  <TableHead className="text-xs md:text-sm">Student Name</TableHead>
                  <TableHead className="text-xs md:text-sm w-20 md:w-32">Score</TableHead>
                  <TableHead className="text-xs md:text-sm w-16 md:w-24">Absent</TableHead>
                  <TableHead className="text-xs md:text-sm w-32 md:w-48">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(rows).map((row) => (
                  <TableRow key={row.studentId} className="h-10 md:h-12">
                    <TableCell className="py-1 md:py-2 text-xs md:text-sm">
                      {row.rollNumber || row.studentId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="py-1 md:py-2 text-xs md:text-sm font-medium">
                      {row.studentName}
                    </TableCell>
                    <TableCell className="py-1 md:py-2">
                      <Input
                        type="number"
                        min={0}
                        max={payload.maxScore}
                        value={row.score ?? ""}
                        disabled={saving || isLocked || row.isAbsent}
                        className="h-7 md:h-9 text-xs md:text-sm w-full"
                        onChange={(event) =>
                          updateRow(
                            row.studentId,
                            "score",
                            event.target.value === ""
                              ? null
                              : Math.min(
                                payload.maxScore,
                                Number(event.target.value),
                              ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1 md:py-2">
                      <input
                        type="checkbox"
                        checked={row.isAbsent}
                        disabled={saving || isLocked}
                        className="w-3 h-3 md:w-4 md:h-4"
                        onChange={(event) =>
                          updateRow(row.studentId, "isAbsent", event.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1 md:py-2">
                      <Input
                        value={row.remarks ?? ""}
                        disabled={saving || isLocked}
                        className="h-7 md:h-9 text-xs md:text-sm w-full"
                        onChange={(event) =>
                          updateRow(row.studentId, "remarks", event.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
