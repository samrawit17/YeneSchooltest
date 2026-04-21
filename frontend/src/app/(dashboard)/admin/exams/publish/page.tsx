"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { gradingAPI, assessmentsAPI, termsAPI } from "@/lib/api";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PublishCheck {
  assessmentId: string;
  assessmentName: string;
  classId: string;
  className: string;
  totalStudents: number;
  enteredMarks: number;
  missingMarks: number;
  pendingOverrides: number;
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
  const [checkList, setCheckList] = useState<PublishCheck[]>([]);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

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
        loadPublishChecklist(termToSelect);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load terms", error);
      setLoading(false);
    }
  }

async function loadPublishChecklist(termId?: string) {
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
      const termName = terms.find((t: any) => t.id === selectedTerm)?.name || selectedTerm;
      const response = await gradingAPI.getPublishChecklist({
        academicYear: currentAcademicYear.id,
        term: termName,
      });
      const checklist = response.data?.checklist || [];
      setCheckList(checklist.map((item: any) => ({
        assessmentId: item.assignmentId,
        assessmentName: item.subjectName,
        classId: item.classId,
        className: item.className,
        totalStudents: item.gradesCount,
        enteredMarks: item.gradesCount,
        missingMarks: 0,
        pendingOverrides: 0,
        status: item.readyToPublish ? "ready" : "has_issues",
      })));
    } catch (error: any) {
      console.error("Failed to load checklist", error);
      toast.error("Failed to load publish checklist");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkPublish() {
    if (selectedAssessments.length === 0) {
      toast.error("Please select at least one assessment to publish");
      return;
    }

    setPublishing(true);
    try {
      const response = await gradingAPI.bulkPublish({
        assessmentIds: selectedAssessments,
        notifyParents: true,
      });
      toast.success(response.data?.message || "Results published successfully");
      loadPublishChecklist();
      setSelectedAssessments([]);
    } catch (error: any) {
      console.error("Failed to publish", error);
      toast.error(error?.response?.data?.message || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  }

  function toggleAssessment(id: string) {
    setSelectedAssessments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selectedAssessments.length === checkList.length) {
      setSelectedAssessments([]);
    } else {
      setSelectedAssessments(checkList.map((a) => a.assessmentId));
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "has_issues":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "published":
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-700">Ready</Badge>;
      case "has_issues":
        return <Badge className="bg-amber-100 text-amber-700">Has Issues</Badge>;
      case "published":
        return <Badge className="bg-blue-100 text-blue-700">Published</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const readyCount = checkList.filter((a) => a.status === "ready").length;
  const issuesCount = checkList.filter((a) => a.status === "has_issues").length;
  const publishedCount = checkList.filter((a) => a.status === "published").length;

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
                  Review and publish assessment results to parents
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
                  <p className="text-2xl font-bold dark:text-white">{checkList.length}</p>
                  <p className="text-sm text-gray-500">Total Assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
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
                <FileCheck className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold dark:text-white">{publishedCount}</p>
                  <p className="text-sm text-gray-500">Published</p>
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
                This is how parents will see the results. No actual data will be sent.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Pre-Publish Checklist</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Review each assessment before publishing to parents
                </CardDescription>
              </div>
              {readyCount > 0 && (
                <Button
                  onClick={handleBulkPublish}
                  disabled={publishing || selectedAssessments.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publish Selected ({selectedAssessments.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {checkList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No assessments found for selected term</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                    <TableHead className="w-12 dark:text-gray-200">
                      <Checkbox
                        checked={selectedAssessments.length === checkList.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="dark:text-gray-200">Assessment</TableHead>
                    <TableHead className="dark:text-gray-200">Class</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Students</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Entered</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Missing</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Overrides</TableHead>
                    <TableHead className="text-center dark:text-gray-200">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkList.map((item) => (
                    <TableRow
                      key={`${item.assessmentId}-${item.classId}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedAssessments.includes(item.assessmentId)}
                          onCheckedChange={() => toggleAssessment(item.assessmentId)}
                          disabled={item.status === "published"}
                        />
                      </TableCell>
                      <TableCell className="font-medium dark:text-white">
                        {item.assessmentName}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{item.className}</TableCell>
                      <TableCell className="text-center dark:text-gray-300">
                        {item.totalStudents}
                      </TableCell>
                      <TableCell className="text-center dark:text-gray-300">
                        {item.enteredMarks}
                      </TableCell>
                      <TableCell className={`text-center ${item.missingMarks > 0 ? "text-red-600 font-medium" : "dark:text-gray-300"}`}>
                        {item.missingMarks}
                      </TableCell>
                      <TableCell className={`text-center ${item.pendingOverrides > 0 ? "text-amber-600 font-medium" : "dark:text-gray-300"}`}>
                        {item.pendingOverrides}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}