"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { academicYearsAPI, gradingAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  Loader2,
  Download,
  Target,
  Star,
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
import { Progress } from "@/components/ui/progress";

// Types
interface SubjectGrade {
  id: string;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  section: { id: string; name: string };
  term: { id: string; name: string };
  caScore: number | null;
  midScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  gradeLetter: string | null;
  gradePoint: number | null;
  remark: string | null;
  isLocked?: boolean;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
}

export default function StudentGradesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { setItems } = useBreadcrumb();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [grades, setGrades] = useState<SubjectGrade[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }

    if (user?.role !== "STUDENT") {
      router.push("/");
      return;
    }

    fetchInitialData();
  }, [user, authLoading, router]);

  const fetchInitialData = async () => {
    try {
      // Students don't have permission to list all academic years.
      // They can fetch the active academic year.
      const activeYearRes = await academicYearsAPI.getActive();
      const activeYear = activeYearRes.data?.data || activeYearRes.data;

      if (activeYear?.id) {
        setAcademicYears([{ id: activeYear.id, name: activeYear.name }]);
        setSelectedYear(activeYear.id);
      } else {
        setAcademicYears([]);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (authLoading || initialLoad) return;
    fetchGrades();
  }, [selectedYear, selectedTerm, authLoading, initialLoad]);

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/student", isCurrent: false },
      { label: "My Grades", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const params: { academicYear?: string; termId?: string } = {};
      if (selectedYear !== "all") params.academicYear = selectedYear;
      if (selectedTerm !== "all") params.termId = selectedTerm;

      const res = await gradingAPI.getStudentGrades(params);
      const rows = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setGrades(rows as SubjectGrade[]);

      // Extract unique terms for filter
      const uniqueTerms = Array.from(
        new Set(rows.map((g: SubjectGrade) => JSON.stringify(g.term)))
      ).map((termJson) => JSON.parse(termJson as string));
      setTerms(uniqueTerms);
    } catch (error) {
      console.error("Error fetching grades:", error);
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "";
    switch (grade) {
      case "A": return "bg-green-100 text-green-800";
      case "B": return "bg-blue-100 text-blue-800";
      case "C": return "bg-yellow-100 text-yellow-800";
      case "D": return "bg-orange-100 text-orange-800";
      case "F": return "bg-red-100 text-red-800";
      default: return "";
    }
  };

  const calculateTermAverage = (termGrades: SubjectGrade[]) => {
    const totalScores = termGrades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
    if (totalScores.length === 0) return 0;
    return Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100;
  };

  const calculateOverallGPA = () => {
    const totalScores = grades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
    if (totalScores.length === 0) return 0;
    const average = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
    
    // Convert average to GPA (0-4 scale)
    if (average >= 90) return 4.0;
    if (average >= 80) return 3.5;
    if (average >= 70) return 3.0;
    if (average >= 60) return 2.5;
    return 0.0;
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-green-600";
    if (gpa >= 3.0) return "text-blue-600";
    if (gpa >= 2.5) return "text-yellow-600";
    if (gpa >= 2.0) return "text-orange-600";
    return "text-red-600";
  };

  const groupedByTerm = grades.reduce((acc, grade) => {
    const termName = grade.term.name;
    if (!acc[termName]) acc[termName] = [];
    acc[termName].push(grade);
    return acc;
  }, {} as Record<string, SubjectGrade[]>);

  if (authLoading || initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overallGPA = calculateOverallGPA();
  const scores = grades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-4 md:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              My Grades & Results
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View your academic performance, grades and results
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Report Card
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
          {[
            { label: "Overall GPA", value: overallGPA.toFixed(1), suffix: "/ 4.0", color: getGPAColor(overallGPA) },
            { label: "Average Score", value: `${averageScore}%`, suffix: "Percentage", color: "text-slate-900 dark:text-white" },
            { label: "Highest Score", value: `${highestScore}%`, suffix: "Best subject", color: "text-green-600" },
            { label: "Subjects", value: grades.length, suffix: "This year", color: "text-slate-900 dark:text-white" },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-4 md:p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
              <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.suffix}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-56">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map(year => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grades by Term */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : grades.length === 0 ? (
          <div className="text-center py-20 text-sm text-slate-400 dark:text-slate-500">
            No grades found for the selected criteria
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByTerm).map(([termName, termGrades]) => (
              <div key={termName}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{termName}</h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Term Average: <span className="font-semibold text-slate-900 dark:text-white">{calculateTermAverage(termGrades)}%</span>
                  </span>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CA</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mid</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Final</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grade</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {termGrades.map(grade => (
                        <tr key={grade.id} className="bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900 dark:text-white">{grade.subject.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{grade.class.name} - {grade.section.name}</p>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{grade.caScore ?? "-"}</td>
                          <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{grade.midScore ?? "-"}</td>
                          <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{grade.finalScore ?? "-"}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{grade.totalScore ?? "-"}</td>
                          <td className="py-3 px-4 text-center">
                            {grade.gradeLetter ? (
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getGradeColor(grade.gradeLetter)}`}>
                                {grade.gradeLetter}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 italic">{grade.remark ? `"${grade.remark}"` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
