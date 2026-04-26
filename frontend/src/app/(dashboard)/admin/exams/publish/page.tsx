"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { examsAPI, gradingAPI, termsAPI } from "@/lib/api";
import { Filters } from "@/components/filters/Filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Send,
  FileCheck,
  Users,
  BookOpen,
  Lock,
  Unlock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ExamItem {
  id: string;
  title: string;
  subject: { name: string };
  class: { name: string; grade: string; academicYearId: string };
  section: { name: string } | null;
  type: string;
  date: string;
  maxMarks: number;
  published: boolean;
  description: string | null;
}

interface ClassSummary {
  classId: string;
  className: string;
  grade: string;
  totalExams: number;
  publishedExams: number;
  unpublishedExams: number;
  hasResults: boolean;
  status: "ready" | "has_issues" | "published";
}

export default function PublishResultsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { currentAcademicYear, getTermsForYear } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && currentAcademicYear?.id) {
      loadTerms();
    }
  }, [isAuthenticated, currentAcademicYear]);

  useEffect(() => {
    if (selectedTerm && currentAcademicYear?.id) {
      loadExams();
    }
  }, [selectedTerm, currentAcademicYear]);

  async function loadTerms() {
    if (!currentAcademicYear?.id) {
      setLoading(false);
      return;
    }
    try {
      const termData = await termsAPI.getAll({ academicYearId: currentAcademicYear.id });
      const termList = termData.data?.data || termData.data || [];
      setTerms(termList);
      // Auto-select current term based on dates
      const now = new Date();
      const currentTerm = termList.find((t: { startDate?: string; endDate?: string; isCurrent?: boolean }) => {
        if (t.isCurrent) return true;
        if (!t.startDate || !t.endDate) return false;
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        return now >= start && now <= end;
      });
      if (currentTerm) {
        setSelectedTerm(currentTerm.id);
      } else if (termList.length > 0) {
        setSelectedTerm(termList[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load terms", error);
      toast.error("Failed to load terms");
      setLoading(false);
    }
  }

  async function loadExams() {
    if (!currentAcademicYear?.id || !selectedTerm) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Get the term details to filter by date range
      const termRes = await termsAPI.getById(selectedTerm);
      const term = termRes.data?.data || termRes.data;

// Fetch all exams for the school in this academic year
      const response = await examsAPI.getAll({
        academicYearId: currentAcademicYear.id,
        termId: selectedTerm,
      });

      const examList: ExamItem[] = response.data?.data || response.data || [];
      setExams(examList);

      // Group by class and compute summary
      const classMap = new Map<string, ClassSummary>();

      for (const exam of examList) {
        const classId = exam.class?.name || exam.classId || "unknown";
        const existing = classMap.get(classId);

        if (existing) {
          existing.totalExams++;
          if (exam.published) {
            existing.publishedExams++;
          } else {
            existing.unpublishedExams++;
          }
        } else {
          classMap.set(classId, {
            classId: exam.class?.name || classId,
            className: exam.class?.name || "Unknown Class",
            grade: exam.class?.grade || "",
            totalExams: 1,
            publishedExams: exam.published ? 1 : 0,
            unpublishedExams: exam.published ? 0 : 1,
            hasResults: false, // Would need exam/:id endpoint to check results
            status: exam.published ? "published" : "ready",
          });
        }
      }

      // Update status based on publish state
      const summaries = Array.from(classMap.values()).map((summary) => {
        if (summary.publishedExams === summary.totalExams && summary.totalExams > 0) {
          summary.status = "published";
        } else if (summary.unpublishedExams > 0) {
          summary.status = "ready";
        }
        return summary;
      });

      setClassSummaries(summaries);
    } catch (error: any) {
      console.error("Failed to load exams", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishClass(classId: string) {
    if (!currentAcademicYear?.id || !selectedTerm) {
      toast.error("Missing academic year or term");
      return;
    }

    setPublishing(true);
    try {
      // Backend expects: { academicYear: string, termId: string, classId: string }
      // Note: The backend uses classId from the exam table, but we may need to map className to actual class ID
      const targetClass = classSummaries.find(c => c.classId === classId || c.className === classId);

      const response = await gradingAPI.publishResults({
        academicYear: currentAcademicYear.id,
        termId: selectedTerm,
        classId: targetClass?.classId || classId,
      });

      toast.success(response.data?.message || "Results published successfully");
      loadExams();
      setSelectedClasses((prev) => prev.filter((id) => id !== classId));
    } catch (error: any) {
      console.error("Failed to publish", error);
      toast.error(error?.response?.data?.message || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  }

  async function handleBulkPublish() {
    if (selectedClasses.length === 0) {
      toast.error("Please select at least one class to publish");
      return;
    }

    setPublishing(true);
    try {
      // Publish each selected class sequentially
      for (const classId of selectedClasses) {
        await handlePublishClass(classId);
      }
      toast.success("All selected classes published successfully");
      setSelectedClasses([]);
    } catch (error: any) {
      console.error("Bulk publish failed", error);
      toast.error("Some classes failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  function toggleClass(classId: string) {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((x) => x !== classId) : [...prev, classId]
    );
  }

  function toggleAll() {
    const selectable = classSummaries.filter(c => c.status !== "published");
    if (selectedClasses.length === selectable.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(selectable.map((a) => a.classId));
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <Unlock className="h-4 w-4 text-green-500" />;
      case "has_issues":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "published":
        return <Lock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-700">Ready to Publish</Badge>;
      case "has_issues":
        return <Badge className="bg-amber-100 text-amber-700">Has Issues</Badge>;
      case "published":
        return <Badge className="bg-blue-100 text-blue-700">Published & Locked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const readyCount = classSummaries.filter((a) => a.status === "ready").length;
  const issuesCount = classSummaries.filter((a) => a.status === "has_issues").length;
  const publishedCount = classSummaries.filter((a) => a.status === "published").length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-32" />
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
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#e35336]">
                  Publish Results
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Publish and lock exam results by class for a term
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Filters
                config={{ academicYear: true, term: true }}
                selectedYear={currentAcademicYear?.id || ""}
                onYearChange={() => {}}
                selectedTerm={selectedTerm}
                onTermChange={setSelectedTerm}
                termOptions={terms}
              />
              <Button
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? "Exit Preview" : "Preview"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold dark:text-white">{classSummaries.length}</p>
                  <p className="text-sm text-gray-500">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Unlock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold dark:text-white">{readyCount}</p>
                  <p className="text-sm text-gray-500">Ready to Publish</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold dark:text-white">{issuesCount}</p>
                  <p className="text-sm text-gray-500">Has Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Lock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold dark:text-white">{publishedCount}</p>
                  <p className="text-sm text-gray-500">Published & Locked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {previewMode && (
          <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Eye className="h-5 w-5" />
                <span className="font-medium">Preview Mode</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                This shows how the publish status will appear. Publishing locks all exams for the selected class and term.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Class Publish Status</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Select classes to publish all exam results for the term
                </CardDescription>
              </div>
              {readyCount > 0 && (
                <Button
                  onClick={handleBulkPublish}
                  disabled={publishing || selectedClasses.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publish Selected ({selectedClasses.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {classSummaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No exams found for selected term</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                    <TableHead className="w-12 dark:text-gray-200">
                      <Checkbox
                        checked={
                          selectedClasses.length === classSummaries.filter(c => c.status !== "published").length &&
                          classSummaries.filter(c => c.status !== "published").length > 0
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="dark:text-gray-200">Class</TableHead>
                    <TableHead className="dark:text-gray-200">Grade</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Total Exams</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Published</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Unpublished</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Status</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classSummaries.map((item) => (
                    <TableRow
                      key={item.classId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedClasses.includes(item.classId)}
                          onCheckedChange={() => toggleClass(item.classId)}
                          disabled={item.status === "published"}
                        />
                      </TableCell>
                      <TableCell className="font-medium dark:text-white">
                        {item.className}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{item.grade}</TableCell>
                      <TableCell className="text-center dark:text-gray-300">
                        {item.totalExams}
                      </TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">
                        {item.publishedExams}
                      </TableCell>
                      <TableCell className={`text-center ${item.unpublishedExams > 0 ? "text-amber-600 font-medium" : "dark:text-gray-300"}`}>
                        {item.unpublishedExams}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(item.status)}
                          {getStatusBadge(item.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status !== "published" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublishClass(item.classId)}
                            disabled={publishing}
                            className="h-8"
                          >
                            {publishing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Lock className="h-3 w-3 mr-1" />
                            )}
                            Publish
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-400">Locked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Exam Detail View */}
        {exams.length > 0 && (
          <Card className="dark:bg-slate-900 dark:border-slate-800 mt-6">
            <CardHeader>
              <CardTitle className="dark:text-white">Exam Details</CardTitle>
              <CardDescription className="dark:text-gray-400">
                All exams for the selected term
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                    <TableHead className="dark:text-gray-200">Title</TableHead>
                    <TableHead className="dark:text-gray-200">Subject</TableHead>
                    <TableHead className="dark:text-gray-200">Class</TableHead>
                    <TableHead className="dark:text-gray-200">Type</TableHead>
                    <TableHead className="dark:text-gray-200">Date</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Max Marks</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow
                      key={exam.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <TableCell className="font-medium dark:text-white">{exam.title}</TableCell>
                      <TableCell className="dark:text-gray-300">{exam.subject?.name}</TableCell>
                      <TableCell className="dark:text-gray-300">{exam.class?.name}</TableCell>
                      <TableCell className="dark:text-gray-300">{exam.type}</TableCell>
                      <TableCell className="dark:text-gray-300">
                        {new Date(exam.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center dark:text-gray-300">{exam.maxMarks}</TableCell>
                      <TableCell className="text-center">
                        {exam.published ? (
                          <Badge className="bg-blue-100 text-blue-700">
                            <Lock className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <Unlock className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
