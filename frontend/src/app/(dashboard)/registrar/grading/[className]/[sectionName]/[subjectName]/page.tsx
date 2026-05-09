"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { gradingAPI } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Download } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function GradeDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [grades, setGrades] = useState<GradeSubmission[]>([]);
  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [subjectName, setSubjectName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }

    if (user?.role !== "REGISTRAR" && (user?.role !== "ADMIN" && user?.role !== "IT_MANAGER")) {
      router.push("/");
      return;
    }

    fetchGrades();
  }, [user, authLoading, router, params]);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const classParam = params.className as string;
      const sectionParam = params.sectionName as string;
      const subjectParam = params.subjectName as string;

      setClassName(decodeURIComponent(classParam));
      setSectionName(decodeURIComponent(sectionParam));
      setSubjectName(decodeURIComponent(subjectParam));

      const res = await gradingAPI.getGradesForReview({
        academicYear: "",
        status: "ALL",
      });

      const rows = Array.isArray(res.data) ? res.data : (res.data.data || []);

      const filtered = rows.filter((row: any) => {
        const rowClassName = row.class?.name || "";
        const rowSectionName = row.section?.name || "";
        const rowSubjectName = row.subject?.name || "";
        return (
          rowClassName === decodeURIComponent(classParam) &&
          rowSectionName === decodeURIComponent(sectionParam) &&
          rowSubjectName === decodeURIComponent(subjectParam)
        );
      });

      const mapped = filtered.map((row: any) => ({
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

      setGrades(mapped);
    } catch (error) {
      console.error("Error fetching grades:", error);
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (gradeId: string) => {
    setProcessing(true);
    try {
      await gradingAPI.reviewGrade(gradeId, { status: "APPROVED" });
      toast.success("Grade approved successfully");
      fetchGrades();
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
      await gradingAPI.reviewGrade(gradeId, {
        status: "REJECTED",
        registrarComment: comment,
      });
      toast.success("Grade rejected and returned to teacher");
      fetchGrades();
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
      case "A":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "B":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "C":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "D":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "F":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "SUBMITTED":
        return <Badge variant="secondary">Submitted</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {className} {sectionName} - {subjectName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {grades.length} student{grades.length !== 1 ? 's' : ''} • Teacher: {grades[0]?.teacherName || "Not Assigned"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grade Details</CardTitle>
              <CardDescription>
                View and review all student grades for this subject
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800">
                  <TableHead className="font-semibold py-3 px-4 w-[200px]">Student</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[80px]">CA (30%)</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[80px]">Mid (20%)</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[80px]">Final (50%)</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[80px]">Total</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[60px]">Grade</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[100px]">Status</TableHead>
                  <TableHead className="font-semibold text-center py-3 px-4 w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium py-3 px-4 w-[200px]">
                      {grade.studentName}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[80px]">
                      {grade.caScore ?? "-"}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[80px]">
                      {grade.midScore ?? "-"}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[80px]">
                      {grade.finalScore ?? "-"}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[80px] font-semibold">
                      {grade.totalScore ?? "-"}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[60px]">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getGradeColor(grade.gradeLetter)}`}>
                        {grade.gradeLetter || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[100px]">
                      {getStatusBadge(grade.status)}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4 w-[100px]">
                      {grade.status === "SUBMITTED" && (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(grade.id)}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(grade.id)}
                            disabled={processing}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
