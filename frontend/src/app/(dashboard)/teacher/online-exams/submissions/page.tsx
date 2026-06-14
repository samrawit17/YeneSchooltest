"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
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
import { practiceExamsAPI, type PracticeExamSubmission } from "@/lib/api";

const statusTone: Record<PracticeExamSubmission["status"], string> = {
  SUBMITTED: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  EXPIRED: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStudent(submission: PracticeExamSubmission) {
  return submission.student.name || submission.student.username || "Student";
}

function formatClass(submission: PracticeExamSubmission) {
  const className = submission.exam.class?.name || submission.student.studentProfile?.className || `Grade ${submission.exam.grade}`;
  const sectionName = submission.exam.section?.name || submission.student.studentProfile?.section;
  return sectionName ? `${className} ${sectionName}` : className;
}

export default function TeacherOnlineExamSubmissionsPage() {
  const submissionsQuery = useQuery({
    queryKey: ["teacher-online-exam-submissions"],
    queryFn: async () => (await practiceExamsAPI.teacherSubmissions()).data,
  });

  const submissions = submissionsQuery.data || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/teacher/online-exams/manage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Submitted Exams</h1>
            <p className="text-sm text-gray-500">Student submissions for your assigned classes and subjects.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/teacher/online-exams/manage">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Manage Exams
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submissionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No submitted online exams yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="min-w-48 font-medium">{formatStudent(submission)}</TableCell>
                      <TableCell>{submission.student.studentProfile?.studentCode || "-"}</TableCell>
                      <TableCell className="min-w-44">{submission.exam.title}</TableCell>
                      <TableCell>{submission.exam.subject?.name || "-"}</TableCell>
                      <TableCell>{formatClass(submission)}</TableCell>
                      <TableCell className="min-w-40">{formatDate(submission.submittedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusTone[submission.status]}>
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {submission.percentage ?? 0}% ({submission.correctCount}/{submission.exam._count?.questions ?? 0})
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
