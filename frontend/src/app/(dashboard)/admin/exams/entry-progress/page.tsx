"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { gradingAPI, assessmentsAPI, classesAPI, sectionsAPI, termsAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, BookOpen, CheckCircle, AlertCircle, Clock, Send, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassEntry {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  entries: {
    [subjectId: string]: {
      subjectName: string;
      entered: number;
      total: number;
      percentage: number;
    };
  };
}

interface StudentEntry {
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: "entered" | "pending" | "locked";
}

export default function MarkEntryProgressPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { currentAcademicYear, getTermsForYear } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [entryData, setEntryData] = useState<ClassEntry[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    className: string;
    sectionName: string;
    subjectName: string;
    entries: StudentEntry[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTerms();
    }
  }, [isAuthenticated, currentAcademicYear]);

  async function loadTerms() {
    if (!currentAcademicYear?.id) {
      setLoading(false);
      return;
    }
    try {
      const termData = await termsAPI.getAll({ academicYearId: currentAcademicYear.id });
      const termList = termData.data?.data || termData.data || [];
      setTerms(termList);
      let termToSelect = "";
      const currentTerm = termList.find((t: any) => t.isCurrent);
      if (currentTerm) {
        termToSelect = currentTerm.id;
      } else if (termList.length > 0) {
        termToSelect = termList[0].id;
      }
      if (termToSelect) {
        setSelectedTerm(termToSelect);
        loadEntryProgress(termToSelect);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load terms", error);
      setLoading(false);
    }
  }

  async function loadEntryProgress(termId?: string) {
    const termToUse = termId || selectedTerm;
    if (!currentAcademicYear?.id) {
      setLoading(false);
      return;
    }
    if (!termToUse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const termName = terms.find((t: any) => t.id === termToUse)?.name || termToUse;
      const response = await gradingAPI.getEntryProgress({
        academicYear: currentAcademicYear.id,
        term: termName,
      });

      const data = response.data;
      if (data?.progress) {
        setEntryData([{
          classId: "all",
          className: "All Classes",
          sectionId: "all",
          sectionName: "",
          entries: data.progress.reduce((acc: any, p: any) => {
            acc[p.subjectName] = {
              subjectName: p.subjectName,
              entered: p.gradesEntered,
              total: p.totalStudents,
              percentage: p.percentage,
            };
            return acc;
          }, {}),
        }]);
      } else {
        setEntryData([]);
      }
    } catch (error: any) {
      console.error("Failed to load entry progress", error);
      toast.error("Failed to load entry progress");
    } finally {
      setLoading(false);
    }
  }

  async function sendReminder() {
    if (!currentAcademicYear?.id || !selectedTerm) return;
    setSendingReminder(true);
    try {
      const termName = terms.find((t: any) => t.id === selectedTerm)?.name || selectedTerm;
      const response = await gradingAPI.sendReminder({
        academicYear: currentAcademicYear.id,
        term: termName,
      });
      toast.success(response.data?.message || "Reminder sent");
    } catch (error: any) {
      console.error("Failed to send reminder", error);
      toast.error(error?.response?.data?.message || "Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return "bg-red-500";
    if (percentage < 100) return "bg-amber-500";
    return "bg-green-500";
  };

  const getProgressText = (percentage: number) => {
    if (percentage === 0) return "text-red-600";
    if (percentage < 100) return "text-amber-600";
    return "text-green-600";
  };

  const subjects = entryData.length > 0
    ? Object.keys(entryData[0].entries)
    : [];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
<div className="w-full px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="w-full px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#e35336]">
                  Mark Entry Progress
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Track teacher grade entry status across all classes and subjects
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-48 dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={sendReminder}
                disabled={sendingReminder}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              >
                {sendingReminder ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Reminder
              </Button>
              <Button variant="outline" onClick={loadEntryProgress} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="dark:bg-slate-900 dark:border-slate-800 w-full">
          <CardHeader>
            <CardTitle className="dark:text-white">
              Entry Progress Matrix
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Click on any cell to see student-by-student entry status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No entry data found for selected term</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="w-full table-auto">
                  <TableHeader>
                    <TableRow className="bg-slate-100 dark:bg-slate-800 w-full">
                      <TableHead className="w-auto dark:text-gray-200 text-center py-4">
                        Class / Section
                      </TableHead>
                      <TableHead className="dark:text-gray-200 text-center py-4">
                        Subject
                      </TableHead>
                      <TableHead className="dark:text-gray-200 text-center py-4">
                        Entered
                      </TableHead>
                      <TableHead className="dark:text-gray-200 text-center py-4">
                        Total
                      </TableHead>
                      <TableHead className="dark:text-gray-200 text-center py-4">
                        Progress
                      </TableHead>
                      <TableHead className="dark:text-gray-200 text-center py-4">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entryData.map((classEntry, idx) => (
                      <TableRow
                        key={`${idx}-${classEntry.classId}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <TableCell className="font-medium dark:text-white text-center py-4">
                          {classEntry.className}
                        </TableCell>
                        <TableCell className="text-center dark:text-gray-300 py-4">
                          All Subjects
                        </TableCell>
                        <TableCell className="text-center dark:text-gray-300 py-4">
                          {Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.entered || 0), 0)}
                        </TableCell>
                        <TableCell className="text-center dark:text-gray-300 py-4">
                          {Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.total || 0), 0)}
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Progress
                              value={Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.entered || 0), 0) / 
                                    Math.max(Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.total || 0), 0), 1) * 100}
                              className="h-2 w-20"
                            />
                            <span className={`font-medium text-sm ${getProgressText(
                              Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.entered || 0), 0) / 
                              Math.max(Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.total || 0), 0), 1) * 100
                            )}`}>
                              {Math.round(
                                Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.entered || 0), 0) /
                                Math.max(Object.values(classEntry.entries).reduce((sum: number, e: any) => sum + (e?.total || 0), 0), 1) * 100
                              )}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Badge className={
                            Object.values(classEntry.entries).every((e: any) => e?.percentage === 100)
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : Object.values(classEntry.entries).some((e: any) => e?.percentage > 0)
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }>
                            {Object.values(classEntry.entries).every((e: any) => e?.percentage === 100)
                              ? "Complete"
                              : Object.values(classEntry.entries).some((e: any) => e?.percentage > 0)
                              ? "In Progress"
                              : "Not Started"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm dark:text-gray-300">Not Started (0%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span className="text-sm dark:text-gray-300">Partial (1-99%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-sm dark:text-gray-300">Complete (100%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}