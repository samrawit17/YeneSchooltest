"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Clock, KeyRound, Loader2, PlayCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { practiceExamsAPI, type PracticeExam } from "@/lib/api";

function getAttemptLabel(status?: string) {
  if (status === "SUBMITTED" || status === "EXPIRED") return "Submitted";
  return "Start or Resume";
}

export default function StudentPracticeExamsPage() {
  const router = useRouter();
  const [selectedExam, setSelectedExam] = useState<PracticeExam | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const examsQuery = useQuery({
    queryKey: ["practice-exams-available"],
    queryFn: async () => (await practiceExamsAPI.available()).data,
  });

  const startExam = useMutation({
    mutationFn: ({ examId, code }: { examId: string; code: string }) => practiceExamsAPI.start(examId, code),
    onSuccess: (res) => {
      setSelectedExam(null);
      setAccessCode("");
      router.push(`/student/practice-exams/${res.data.id}`);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to start online exam"),
  });

  const exams = examsQuery.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Online Exam</h1>
          <p className="text-sm text-slate-500">Multiple-choice online exams for your grade and stream.</p>
        </div>
        <Badge variant="outline" className="w-fit">Online</Badge>
      </div>

      {examsQuery.isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : exams.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam: PracticeExam) => {
            const attemptStatus = exam.attempts?.[0]?.status;
            const isSubmitted = attemptStatus === "SUBMITTED" || attemptStatus === "EXPIRED";
            return (
              <Card key={exam.id} className="overflow-hidden">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <BookOpenCheck className="mt-1 h-5 w-5 text-[#e35336]" />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant="secondary">Grade {exam.grade}{exam.stream ? ` ${exam.stream}` : ""}</Badge>
                      {isSubmitted ? <Badge variant="outline">{getAttemptLabel(attemptStatus)}</Badge> : null}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{exam.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exam.description ? <p className="text-sm text-slate-500">{exam.description}</p> : null}
                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">
                      <Clock className="h-4 w-4" /> {exam.durationMinutes} min
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">Pass {exam.passMark}%</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">{exam._count?.questions || 0} questions</span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={startExam.isPending || isSubmitted}
                    onClick={() => {
                      if (isSubmitted) return;
                      setSelectedExam(exam);
                      setAccessCode("");
                    }}
                  >
                    {startExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    {getAttemptLabel(attemptStatus)}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500">
            No active online exams are available for your grade right now.
          </CardContent>
        </Card>
      )}

      {selectedExam && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg">Enter Exam Code</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{selectedExam.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedExam(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-access-code">Exam code</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="exam-access-code"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && accessCode.trim()) {
                        startExam.mutate({ examId: selectedExam.id, code: accessCode });
                      }
                    }}
                    className="pl-9 uppercase"
                    autoFocus
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={startExam.isPending || !accessCode.trim()}
                onClick={() => startExam.mutate({ examId: selectedExam.id, code: accessCode })}
              >
                {startExam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
