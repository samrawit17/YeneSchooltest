"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { practiceExamsAPI, type PracticeExam, type PracticeExamStatus } from "@/lib/api";

const statusTone: Record<PracticeExamStatus, string> = {
  DRAFT: "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
  READY: "border-sky-200 text-sky-700 dark:border-sky-900 dark:text-sky-300",
  ACTIVE: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  ARCHIVED: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300",
};

function formatStream(stream?: string | null) {
  if (stream === "NATURAL") return "Natural";
  if (stream === "SOCIAL") return "Social";
  return "-";
}

export default function TeacherManageOnlineExamsPage() {
  const queryClient = useQueryClient();

  const examsQuery = useQuery({
    queryKey: ["teacher-online-exams"],
    queryFn: async () => (await practiceExamsAPI.listAdmin()).data,
  });

  const deleteExam = useMutation({
    mutationFn: (id: string) => practiceExamsAPI.delete(id),
    onSuccess: () => {
      toast.success("Exam deleted");
      queryClient.invalidateQueries({ queryKey: ["teacher-online-exams"] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Failed to delete exam"),
  });

  const exams: PracticeExam[] = examsQuery.data || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/teacher/online-exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Manage Exams</h1>
            <p className="text-sm text-slate-500">Your created online exams.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/teacher/online-exams#create-exams">
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Exams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {examsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No online exams created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Pass Mark</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="min-w-56 font-medium">{exam.title}</TableCell>
                      <TableCell>Grade {exam.grade}</TableCell>
                      <TableCell>{formatStream(exam.stream)}</TableCell>
                      <TableCell className="font-mono">{exam.accessCode}</TableCell>
                      <TableCell>{exam._count?.questions ?? 0}</TableCell>
                      <TableCell>{exam._count?.attempts ?? 0}</TableCell>
                      <TableCell>{exam.durationMinutes} min</TableCell>
                      <TableCell>{exam.passMark}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusTone[exam.status]}>
                          {exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" asChild>
                            <Link href={`/teacher/online-exams?examId=${exam.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={deleteExam.isPending}
                            onClick={() => deleteExam.mutate(exam.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
