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
import { academicYearsAPI, gradingAPI, termsAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";

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
  continuousAssessment: number | null;
  examScore: number | null;
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

const ChildResultsPage = () => {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [results, setResults] = useState<TermResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [terms, setTerms] = useState<TermOption[]>([]);

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

        const termsRes = await termsAPI.getAll({ academicYearId: activeYear.id });
        const termRows = Array.isArray(termsRes.data) ? termsRes.data : (termsRes.data?.data || []);
        setTerms(termRows.map((term: any) => ({ id: term.id, name: term.name })));

        const gradeRes = await gradingAPI.getChildGrades(
          selectedChild?.studentId || selectedChild?.userId || childId,
          {
          academicYear: activeYear.id,
          ...(selectedTerm !== "all" ? { termId: selectedTerm } : {}),
          },
        );
        const gradeRows = Array.isArray(gradeRes.data)
          ? gradeRes.data
          : Array.isArray(gradeRes.data?.grades)
            ? gradeRes.data.grades
            : [];

        const subjectRows: SubjectResult[] = gradeRows.map((grade: any) => ({
          id: grade.id,
          subjectName: grade.subject?.name || "N/A",
          subjectCode: grade.subject?.code || grade.subject?.name?.slice(0, 4)?.toUpperCase() || "SUBJ",
          teacherName: grade.teacher?.name || "N/A",
          continuousAssessment: grade.caScore,
          examScore: grade.finalScore,
          totalScore: grade.totalScore,
          grade: grade.gradeLetter,
          remarks: grade.remark,
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
            gpa: gradeRes.data?.summary?.gpa || gpa,
            rank: gradeRes.data?.summary?.rank || 0,
            totalSubjects: subjectRows.length,
            overallPerformance,
            average: gradeRes.data?.summary?.average || average,
          },
        });
      } catch (error) {
        console.error("Failed to fetch results:", error);
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

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
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
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
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
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
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
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/parent/children/${childId}`)}
                className="dark:border-slate-700 dark:hover:bg-slate-800"
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
                className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
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
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

          {/* Results Table and Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Results Table */}
            <Card className="lg:col-span-2 shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {results?.termName} - {results?.academicYear}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Subject-wise performance details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100 dark:border-slate-700">
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Subject</TableHead>
                        <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">CA</TableHead>
                        <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Exam</TableHead>
                        <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Total</TableHead>
                        <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Grade</TableHead>
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Teacher Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results?.results.map((subject) => (
                        <TableRow key={subject.id} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                          <TableCell className="py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{subject.subjectName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{subject.teacherName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`text-sm font-medium ${getStatusColor(subject.continuousAssessment)}`}>
                              {subject.continuousAssessment !== null ? subject.continuousAssessment : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`text-sm font-medium ${getStatusColor(subject.examScore)}`}>
                              {subject.examScore !== null ? subject.examScore : "-"}
                            </span>
                          </TableCell>
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
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                    <PolarGrid stroke="#E2E8F0" className="dark:stroke-slate-700" />
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
          </div>

          {/* Grading Scale */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
