"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { academicYearsAPI, practiceExamsAPI, type PracticeExam, type PracticeExamStatus } from "@/lib/api";

const statusTone: Record<PracticeExamStatus, string> = {
  DRAFT: "border-gray-200 text-gray-600 dark:border-[#2A2A2A] dark:text-gray-300",
  READY: "border-sky-200 text-sky-700 dark:border-sky-900 dark:text-sky-300",
  ACTIVE: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  ARCHIVED: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300",
};

interface AcademicYear {
  id: string;
  name?: string;
  label?: string;
  ethiopianYear?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  curriculumType?: string;
}

function formatStream(stream?: string | null) {
  if (stream === "NATURAL") return "Natural";
  if (stream === "SOCIAL") return "Social";
  return "-";
}

export default function TeacherManageOnlineExamsPage() {
  const queryClient = useQueryClient();
  const { currentAcademicYear } = useAcademicYear();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await academicYearsAPI.getAll();
        const years = (res.data || []) as AcademicYear[];
        const sorted = years.sort((a, b) => {
          const aNum = parseInt(a.name, 10);
          const bNum = parseInt(b.name, 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
          return b.name.localeCompare(a.name);
        });
        setAcademicYears(sorted);
        if (currentAcademicYear && !selectedAcademicYear) {
          setSelectedAcademicYear(currentAcademicYear.id);
        }
      } catch {}
    };
    fetchYears();
  }, [currentAcademicYear]);

  const examsQuery = useQuery({
    queryKey: ["teacher-online-exams", selectedAcademicYear],
    queryFn: async () =>
      (await practiceExamsAPI.listAdmin({ academicYearId: selectedAcademicYear || undefined })).data,
    enabled: !!selectedAcademicYear,
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
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/teacher/online-exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Manage Exams</h1>
            <p className="text-sm text-gray-500">Your created online exams.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/teacher/online-exams#create-exams">
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
          <SelectTrigger className="w-[220px] bg-white dark:bg-[#111111] border-gray-200 dark:border-[#334155] dark:text-white">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1C1C1C] dark:border-[#334155]">
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id} className="dark:text-white dark:focus:bg-[#2A2A2A]">
                {year.name} {year.isActive ? "(Active)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Exams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {examsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
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
                            disabled={deleteExam.isPending || (exam._count?.attempts ?? 0) > 0}
                            title={(exam._count?.attempts ?? 0) > 0 ? "Archive attempted exams instead of deleting them" : "Delete exam"}
                            onClick={() => {
                              if ((exam._count?.attempts ?? 0) > 0) return;
                              if (!window.confirm(`Delete "${exam.title}"? This cannot be undone.`)) return;
                              deleteExam.mutate(exam.id);
                            }}
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
