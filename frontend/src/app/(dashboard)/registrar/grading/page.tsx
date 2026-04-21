"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api, { gradingAPI, termsAPI } from "@/lib/api";
import { Filters, useFilters } from "@/components/filters/Filters";
import { toast } from "sonner";
import {
  Trophy,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface GradeSubmission {
  id: string;
  studentName: string;
  subjectName: string;
  className: string;
  sectionName: string;
  teacherName: string;
  caScore: number | null;
  midScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  gradeLetter: string | null;
  status: string;
}

export default function RegistrarGradingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [terms, setTerms] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<GradeSubmission[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  const {
    selectedYear,
    setSelectedYear,
    selectedTerm,
    setSelectedTerm,
    selectedGrade,
    setSelectedGrade,
    selectedSection,
    setSelectedSection,
    selectedStatus,
    setSelectedStatus,
  } = useFilters();
  
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  // Set default status
  useEffect(() => {
    setSelectedStatus("SUBMITTED");
  }, []);

  // Fetch academic years and terms on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }

    if (user?.role !== "REGISTRAR" && user?.role !== "ADMIN") {
      router.push("/");
      return;
    }

    setInitialLoad(false);
  }, [user, authLoading, router]);

  // Fetch terms when year changes
  useEffect(() => {
    if (selectedYear) {
      fetchTerms();
    } else {
      setTerms([]);
      setSelectedTerm("");
    }
  }, [selectedYear]);

  const fetchTerms = async () => {
    try {
      const termRes = await termsAPI.getAll({ academicYearId: selectedYear });
      const termData = Array.isArray(termRes.data) ? termRes.data : (termRes.data.data || []);
      setTerms(termData);
      if (termData.length > 0 && !selectedTerm) {
        setSelectedTerm(termData[0].id);
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  };

  // Fetch submissions when filters change
  useEffect(() => {
    if (selectedYear && selectedTerm) {
      fetchSubmissions();
    }
  }, [selectedYear, selectedTerm, selectedStatus, selectedGrade, selectedSection]);

  const fetchSubmissions = async () => {
    setFilterLoading(true);
    try {
      const params: any = {
        academicYear: selectedYear,
        termId: selectedTerm,
        status: selectedStatus,
      };

      if (selectedGrade) params.grade = selectedGrade;
      if (selectedSection) params.sectionId = selectedSection;

      const res = await gradingAPI.getGradesForReview(params);
      const rows = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const mapped = rows.map((row: any) => ({
        id: row.id,
        studentName: row.student?.name || "N/A",
        subjectName: row.subject?.name || "N/A",
        className: row.class?.name || "N/A",
        sectionName: row.section?.name || "N/A",
        teacherName: row.teacher?.name || "N/A",
        caScore: row.caScore,
        midScore: row.midScore,
        finalScore: row.finalScore,
        totalScore: row.totalScore,
        gradeLetter: row.gradeLetter,
        status: row.status,
      }));
      setSubmissions(mapped);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load grade submissions");
    } finally {
      setFilterLoading(false);
    }
  };

  const handleApprove = async (gradeId: string) => {
    setProcessing(true);
    try {
      await api.put(`/grading/registrar/grades/${gradeId}/review`, { status: "APPROVED" });
      toast.success("Grade approved successfully");
      fetchSubmissions();
    } catch (error) {
      console.error("Error approving grade:", error);
      toast.error("Failed to approve grade");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (gradeId: string) => {
    const comment = prompt("Please enter rejection reason:");
    if (!comment) return;
    
    setProcessing(true);
    try {
      await api.put(`/grading/registrar/grades/${gradeId}/review`, {
        status: "REJECTED",
        registrarComment: comment,
      });
      toast.success("Grade rejected and returned to teacher");
      fetchSubmissions();
    } catch (error) {
      console.error("Error rejecting grade:", error);
      toast.error("Failed to reject grade");
    } finally {
      setProcessing(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "";
    switch (grade) {
      case "A": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "B": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "C": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "D": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "F": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">Draft</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Submitted</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
      default:
        return null;
    }
  };

  // Skeleton loader for submissions
  const SubmissionsSkeleton = () => (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-4 w-px" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Loading states
  if (authLoading || initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          {/* Filters - handled by Filters component */}
          
          {/* Submissions Skeleton */}
          <SubmissionsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#e35336] flex items-center gap-2">
              
              Grade Review
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and approve submitted grades from teachers
            </p>
          </div>
        </div>

        {/* Filters - Compact */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 w-full">
            <Filters
              config={{
                academicYear: true,
                term: true,
                grade: true,
                section: true,
                status: true,
              }}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              selectedTerm={selectedTerm}
              onTermChange={setSelectedTerm}
              termOptions={terms}
              selectedGrade={selectedGrade}
              onGradeChange={(val) => { setSelectedGrade(val); if (!val) setSelectedSection(""); }}
              selectedSection={selectedSection}
              onSectionChange={setSelectedSection}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Submissions - Compact & Responsive */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Grade Submissions
              </CardTitle>
              {!filterLoading && (
                <span className="text-xs text-muted-foreground">
                  {submissions.length} result{submissions.length !== 1 ? 's' : ''}
                </span>
              )}
              {filterLoading && (
                <Skeleton className="h-3 w-20" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filterLoading ? (
              // Loading state for submissions
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <div className="flex gap-2 mb-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-3" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-3 w-8" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-4 w-px" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No submissions found
              </div>
            ) : (
              <div className="divide-y">
                {submissions.map((submission) => (
                  <div key={submission.id} className="p-4 hover:bg-muted/30 transition-colors">
                    {/* Main Row - Always Visible */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {submission.studentName}
                          </h3>
                          {getStatusBadge(submission.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{submission.subjectName}</span>
                          <span>•</span>
                          <span>{submission.className}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{submission.teacherName}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Total:</span>
                            <span className="text-sm font-semibold">
                              {submission.totalScore ?? "-"}
                            </span>
                          </div>
                          <div className="h-4 w-px bg-border" />
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getGradeColor(submission.gradeLetter)}`}>
                            {submission.gradeLetter || "No Grade"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {submission.status === "SUBMITTED" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReject(submission.id)}
                              disabled={processing}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only md:ml-1 text-xs">Reject</span>
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-2 bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(submission.id)}
                              disabled={processing}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only md:ml-1 text-xs">Approve</span>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setExpandedRow(expandedRow === submission.id ? null : submission.id)}
                        >
                          {expandedRow === submission.id ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Row - Shows Detailed Scores */}
                    {expandedRow === submission.id && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">CA Score</p>
                          <p className="font-medium">{submission.caScore ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Mid Score</p>
                          <p className="font-medium">{submission.midScore ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Final Score</p>
                          <p className="font-medium">{submission.finalScore ?? "-"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}