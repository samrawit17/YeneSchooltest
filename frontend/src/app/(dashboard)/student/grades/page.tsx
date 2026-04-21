"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
      ).map(t => JSON.parse(t));
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
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            My Grades & Results
          </h1>
          <p className="text-muted-foreground">
            View your academic performance, grades and results
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Report Card
        </Button>
      </div>

      {/* GPA Overview - Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall GPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getGPAColor(overallGPA)}`}>
              {overallGPA.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of 4.0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {averageScore}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {highestScore}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best subject
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subjects Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {grades.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grades by Term */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : grades.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No grades found for the selected criteria
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByTerm).map(([termName, termGrades]) => (
          <Card key={termName}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{termName}</CardTitle>
                <CardDescription>
                  Term Average: {calculateTermAverage(termGrades)}%
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg">
                {calculateTermAverage(termGrades)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {termGrades.map(grade => (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${getGradeColor(grade.gradeLetter)}`}>
                        {grade.gradeLetter || "-"}
                      </div>
                      <div>
                        <h3 className="font-medium">{grade.subject.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {grade.class.name} - {grade.section.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">CA</p>
                        <p className="font-medium">{grade.caScore ?? "-"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Mid</p>
                        <p className="font-medium">{grade.midScore ?? "-"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Final</p>
                        <p className="font-medium">{grade.finalScore ?? "-"}</p>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-lg">{grade.totalScore ?? "-"}</p>
                      </div>
                      {grade.remark && (
                        <div className="text-center min-w-[120px]">
                          <p className="text-xs text-muted-foreground">Remark</p>
                          <p className="font-medium text-sm italic">"{grade.remark}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Grade Scale Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grade Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-3 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-800">A</div>
              <div className="text-sm text-green-700">90-100</div>
              <div className="text-xs text-green-600">4.0 GPA</div>
            </div>
            <div className="text-center p-3 bg-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-800">B</div>
              <div className="text-sm text-blue-700">80-89</div>
              <div className="text-xs text-blue-600">3.5 GPA</div>
            </div>
            <div className="text-center p-3 bg-yellow-100 rounded-lg">
              <div className="text-2xl font-bold text-yellow-800">C</div>
              <div className="text-sm text-yellow-700">70-79</div>
              <div className="text-xs text-yellow-600">3.0 GPA</div>
            </div>
            <div className="text-center p-3 bg-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-800">D</div>
              <div className="text-sm text-orange-700">60-69</div>
              <div className="text-xs text-orange-600">2.5 GPA</div>
            </div>
            <div className="text-center p-3 bg-red-100 rounded-lg">
              <div className="text-2xl font-bold text-red-800">F</div>
              <div className="text-sm text-red-700">0-59</div>
              <div className="text-xs text-red-600">0.0 GPA</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
