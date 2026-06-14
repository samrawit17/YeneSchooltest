"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft,
  Download,
  Award,
  Users,
  BookOpen,
  TrendingUp,
  FileText
} from "lucide-react";
import { academicYearsAPI, gradingAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";
import { reportCardsAPI } from "@/lib/api/reporting";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Recharts for radar chart
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface SubjectResult {
  id: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  assessments: Array<{
    assessmentSubjectId: string;
    title: string;
    maxScore: number;
    score: number | null;
  }>;
  totalScore: number | null;
  grade: string | null;
  remarks: string | null;
}

interface TermResult {
  termName: string;
  academicYear: string;
  results: SubjectResult[];
  summary: {
    gpa: number;
    rank: number;
    totalSubjects: number;
    overallPerformance: string;
    average: number;
  };
}

interface ChildInfo {
  id: string;
  profileId?: string;
  userId?: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
}

interface TermOption {
  id: string;
  name: string;
}

interface PaymentGate {
  blocked: boolean;
  message: string;
}

const ChildResultsPage = () => {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [results, setResults] = useState<TermResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [paymentGate, setPaymentGate] = useState<PaymentGate>({ blocked: false, message: "" });

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const [childrenRes, activeYearRes] = await Promise.all([
          parentDashboardAPI.getChildren(),
          academicYearsAPI.getActive(),
        ]);

        const children = childrenRes.data?.children || [];
        const selectedChild = children.find(
          (item: any) =>
            item.studentId === childId ||
            item.id === childId ||
            item.student?.id === childId ||
            item.userId === childId ||
            item.student?.userId === childId,
        );
        if (selectedChild) {
          setChild({
            id: selectedChild.studentId || selectedChild.id,
            profileId: selectedChild.studentId || selectedChild.id,
            userId: selectedChild.student?.userId || selectedChild.student?.id || selectedChild.userId,
            name: selectedChild.name || selectedChild.student?.user?.name || "Unknown",
            studentCode: selectedChild.student?.studentCode || selectedChild.studentCode || "N/A",
            className: selectedChild.className || selectedChild.student?.className || "N/A",
            section: selectedChild.section || selectedChild.student?.section || "N/A",
          });
        }

        const activeYear = activeYearRes.data?.data || activeYearRes.data;
        if (!activeYear?.id) {
          setResults(null);
          return;
        }

        const gradesRes = await gradingAPI.getChildGrades(
          selectedChild?.studentId || selectedChild?.userId || childId,
          { academicYear: activeYear.id },
        );
        const periods = Array.isArray(gradesRes.data?.periods) ? gradesRes.data.periods : [];
        const termRows = periods.map((period: any) => ({
          id: period.termId || period.period,
          name: period.period || "Unnamed Period",
        }));
        setTerms(termRows);
        const effectiveSelectedTerm =
          selectedTerm !== "all" && termRows.some((term: any) => term.id === selectedTerm)
            ? selectedTerm
            : gradesRes.data?.currentPeriodTermId || termRows[0]?.id || "all";
        if (effectiveSelectedTerm !== selectedTerm) {
          setSelectedTerm(effectiveSelectedTerm);
        }

        const clearanceTermId =
          effectiveSelectedTerm === "all"
            ? gradesRes.data?.currentPeriodTermId || undefined
            : effectiveSelectedTerm;
        if (clearanceTermId) {
          const clearanceRes = await gradingAPI.verifyFinancialClearance({
            studentId: selectedChild?.studentId || selectedChild?.userId || childId,
            academicYear: activeYear.id,
            termId: clearanceTermId,
            checkOverdueOnly: false,
          });
          if (!clearanceRes.data?.isCleared) {
            const blockedTermName =
              termRows.find((term: any) => term.id === clearanceTermId)?.name || "current period";
            setPaymentGate({
              blocked: true,
              message: `Results are locked until the ${blockedTermName} fees are paid.`,
            });
            setResults(null);
            return;
          }
        }
        setPaymentGate({ blocked: false, message: "" });

        const publishedCardsRes = await reportCardsAPI.getPublishedForParent(
          selectedChild?.studentId || selectedChild?.userId || childId,
          {
            ...(activeYear?.name ? { academicYear: activeYear.name } : {}),
            ...(selectedTerm !== "all"
              ? { term: termRows.find((term: any) => term.id === selectedTerm)?.name || selectedTerm }
              : {}),
          },
        );
        const publishedCards = Array.isArray(publishedCardsRes.data)
          ? publishedCardsRes.data
          : [];
        const latestPublishedCard = publishedCards.sort((a, b) =>
          new Date(b.publishedAt || b.updatedAt).getTime() -
          new Date(a.publishedAt || a.updatedAt).getTime(),
        )[0];

        const details = Array.isArray(latestPublishedCard?.gradeDetails)
          ? latestPublishedCard.gradeDetails
          : [];

        const subjectRows: SubjectResult[] = details.map((grade: any, index: number) => ({
          id: grade.subjectId || `subject-${index}`,
          subjectName: grade.subjectName || "N/A",
          subjectCode: grade.subjectCode || grade.subjectName?.slice(0, 4)?.toUpperCase() || "SUBJ",
          teacherName: "N/A",
          assessments: Array.isArray(grade.assessmentBreakdown)
            ? grade.assessmentBreakdown.map((assessment: any, assessmentIndex: number) => ({
                assessmentSubjectId:
                  assessment.assessmentSubjectId || `${grade.subjectId || index}-${assessmentIndex}`,
                title: assessment.title || assessment.type || "Assessment",
                maxScore: Number(assessment.maxScore) || 0,
                score: typeof assessment.score === "number" ? assessment.score : null,
              }))
            : [],
          totalScore: grade.totalScore,
          grade: grade.gradeLetter,
          remarks: grade.status || null,
        }));

        const scoreRows = subjectRows
          .map((row) => row.totalScore)
          .filter((score): score is number => score !== null);
        const average = scoreRows.length
          ? Math.round((scoreRows.reduce((sum, value) => sum + value, 0) / scoreRows.length) * 100) / 100
          : 0;
        const gpa = average >= 90 ? 4.0 : average >= 80 ? 3.5 : average >= 70 ? 3.0 : average >= 60 ? 2.5 : 0;
        const overallPerformance = average >= 85 ? "Excellent" : average >= 70 ? "Good" : "Needs Improvement";

        setResults({
          termName:
            selectedTerm === "all"
              ? "All Terms"
              : (termRows.find((term: any) => term.id === selectedTerm)?.name || "Selected Term"),
          academicYear: activeYear.name,
          results: subjectRows,
          summary: {
            gpa,
            rank: latestPublishedCard?.rankInClass || 0,
            totalSubjects: subjectRows.length,
            overallPerformance,
            average: Number(latestPublishedCard?.percentage) || average,
          },
        });
      } catch (error: any) {
        console.error("Failed to fetch results:", error);
        if (error?.response?.status === 403) {
          setPaymentGate({
            blocked: true,
            message:
              error.response?.data?.message ||
              "Results are locked until the current term or semester fees are paid.",
          });
        }
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [childId, selectedTerm]);

  // Prepare radar chart data
  const radarData = results?.results.map((subject) => ({
    subject: subject.subjectCode,
    score: subject.totalScore || 0,
    fullMark: 100,
  })) || [];

  const assessmentColumns = Array.from(
    new Map(
      (results?.results || [])
        .flatMap((subject) => subject.assessments)
        .map((assessment) => [
          assessment.title,
          { title: assessment.title, maxScore: assessment.maxScore },
        ]),
    ).values(),
  );

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "bg-gray-100 text-gray-600 dark:bg-[#1A1A1A] dark:text-gray-400";
    const firstChar = grade.charAt(0);
    switch (firstChar) {
      case "A":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "B":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "C":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "D":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "F":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-[#1A1A1A] dark:text-gray-400";
    }
  };

  const getPerformanceBadge = (performance: string) => {
    switch (performance.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "good":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "needs improvement":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-400 border-gray-200 dark:border-[#2A2A2A]";
    }
  };

  const getStatusColor = (totalScore: number | null) => {
    if (totalScore === null) return "text-gray-400";
    if (totalScore >= 80) return "text-green-600 dark:text-green-400";
    if (totalScore >= 60) return "text-blue-600 dark:text-blue-400";
    if (totalScore >= 50) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/parent/children/${childId}`)}
                className="dark:border-[#2A2A2A] dark:hover:bg-[#1A1A1A]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-[#e35336]">Academic Results</h1>
                {child && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {child.name} • {child.className} - Section {child.section}
                  </p>
                )}
              </div>
            </div>
            
            {/* Term Selector */}
            <div className="flex items-center gap-3">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-[#2A2A2A] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
              >
                <option value="all">All Terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
              <Button
                style={{ backgroundColor: "#1E3A8A" }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Summary Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">GPA</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {results?.summary.gpa || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rank</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      #{results?.summary.rank || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Subjects</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {results?.summary.totalSubjects || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Overall Performance</p>
                    <Badge className={`mt-1 ${getPerformanceBadge(results?.summary.overallPerformance || "")}`}>
                      {results?.summary.overallPerformance || "N/A"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {paymentGate.blocked && (
            <Card className="shadow-sm border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardContent className="py-6 text-center text-amber-800 dark:text-amber-300">
                {paymentGate.message}
              </CardContent>
            </Card>
          )}

          {/* Results Table and Chart */}
          {!paymentGate.blocked && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Results Table */}
            <Card className="lg:col-span-2 shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {results?.termName} - {results?.academicYear}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Subject-wise performance details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentColumns.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                    This published report card does not yet contain the admin assessment breakdown. Regenerate and republish the report card to display the real assessment names here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-100 dark:border-[#2A2A2A]">
                          <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Subject</TableHead>
                          {assessmentColumns.map((column) => (
                            <TableHead key={column.title} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                              <div>{column.title}</div>
                              {column.maxScore > 0 && <div className="text-[10px]">/ {column.maxScore}</div>}
                            </TableHead>
                          ))}
                          <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Total</TableHead>
                          <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Grade</TableHead>
                          <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Teacher Remark</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results?.results.map((subject) => (
                          <TableRow key={subject.id} className="border-b border-gray-50 dark:border-[#2A2A2A]/50 last:border-0">
                            <TableCell className="py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{subject.subjectName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{subject.teacherName}</p>
                              </div>
                            </TableCell>
                            {assessmentColumns.map((column) => {
                              const assessment = subject.assessments.find((item) => item.title === column.title);
                              return (
                                <TableCell key={column.title} className="py-3 text-center">
                                  <span className={`text-sm font-medium ${getStatusColor(assessment?.score ?? null)}`}>
                                    {assessment?.score ?? "-"}
                                  </span>
                                </TableCell>
                              );
                            })}
                            <TableCell className="py-3 text-center">
                              <span className={`text-sm font-bold ${getStatusColor(subject.totalScore)}`}>
                                {subject.totalScore !== null ? subject.totalScore : "-"}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(subject.grade)}`}>
                                {subject.grade || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400">{subject.remarks || "-"}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Performance Chart
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Subject-wise analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E2E8F0" className="dark:stroke-[#2A2A2A]" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      className="dark:fill-gray-400"
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>}

          {/* Grading Scale */}
          <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Grading Scale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { grade: "A", range: "80-100%", desc: "Excellent" },
                  { grade: "B", range: "60-79%", desc: "Good" },
                  { grade: "C", range: "50-59%", desc: "Average" },
                  { grade: "D", range: "40-49%", desc: "Below Average" },
                  { grade: "F", range: "0-39%", desc: "Needs Improvement" },
                ].map((item) => (
                  <div key={item.grade} className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${getGradeColor(item.grade)}`}>
                      {item.grade}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.range}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChildResultsPage;
