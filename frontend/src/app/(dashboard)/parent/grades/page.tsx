"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api, { academicYearsAPI, gradingAPI } from "@/lib/api";
import { BookOpen, Loader2, Award, Download, Star, Target, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

interface AcademicYear {
  id: string;
  name: string;
}

interface Child {
  id: string;
  profileId?: string;
  userId?: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
}

interface PeriodGrades {
  period: string;
  periodIndex: number;
  grades: SubjectGrade[];
  average: number;
  gpa: string;
  rank: number | null;
  totalStudents: number;
  hasGrades: boolean;
}

const CURRICULUM_PERIODS: Record<string, string[]> = {
  QUARTER: ["Q1", "Q2", "Q3", "Q4"],
  SEMESTER: ["Semester 1", "Semester 2"],
  TERM: ["Term 1", "Term 2", "Term 3"],
  MONTHLY: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"],
  YEARLY: ["Full Year"],
};

const normalizeCurriculumType = (type: string | undefined): string => {
  const map: Record<string, string> = {
    QUARTER: "QUARTER",
    SEMESTER: "SEMESTER",
    TERM: "TERM",
    MONTH: "MONTHLY",
    YEAR: "YEARLY",
  };
  return map[type || ""] || type || "TERM";
};

export default function ParentGradesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [grades, setGrades] = useState<SubjectGrade[]>([]);
  const [curriculumType, setCurriculumType] = useState<string>("TERM");
  
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchInitialData = useCallback(async () => {
    try {
      const [childrenResult, yearsResult] = await Promise.allSettled([
        api.get("/parents/me/children"),
        academicYearsAPI.getAll(),
      ]);

      if (childrenResult.status === "fulfilled") {
        const childrenData = childrenResult.value?.data?.children || [];
        const normalizedChildren = Array.isArray(childrenData)
          ? childrenData.map((child: any) => ({
              id: child.studentId || child.id,
              profileId: child.studentId || child.id,
              userId: child.student?.userId || child.student?.id || child.userId,
              name: child.name || child.student?.user?.name || "Unknown",
              studentCode: child.student?.studentCode || child.studentCode || "",
              className: child.className || child.student?.className || "N/A",
              section: child.section || child.student?.section || "N/A",
            }))
          : [];
        setChildren(normalizedChildren);

        if (normalizedChildren.length > 0) {
          const firstChild = normalizedChildren[0];
          setSelectedChildId(firstChild.profileId || firstChild.userId || firstChild.id);
        }
      }

      let years: AcademicYear[] = [];
      if (yearsResult.status === "fulfilled") {
        years = Array.isArray(yearsResult.value.data)
          ? yearsResult.value.data
          : (yearsResult.value.data?.data || []);
        setAcademicYears(years);
      }

      try {
        const activeYearRes = await academicYearsAPI.getActive();
        const activeYear = activeYearRes.data?.data || activeYearRes.data;

        if (activeYear?.id) {
          setSelectedYear(activeYear.id);
          if (years.length === 0) {
            setAcademicYears([{ id: activeYear.id, name: activeYear.name }]);
          }
        } else if (years.length > 0) {
          setSelectedYear(years[0].id);
        }
      } catch (error) {
        if (years.length > 0) setSelectedYear(years[0].id);
      }

      // Get curriculum type from school settings
      try {
        const schoolSettings = await api.get(`/schools/${user?.schoolId}/settings`);
        const cType = schoolSettings.data?.curriculum_type || "TERM";
        setCurriculumType(normalizeCurriculumType(cType));
      } catch (error) {
        console.log("Using default curriculum type");
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setInitialLoad(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }

    if (user?.role !== "PARENT") {
      router.push("/");
      return;
    }

    fetchInitialData();
  }, [user, authLoading, router, fetchInitialData]);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gradingAPI.getChildGrades(selectedChildId, {
        academicYear: selectedYear,
      });
      
      const data = res.data;
      const gradeRows = Array.isArray(data)
        ? data
        : Array.isArray(data?.grades)
          ? data.grades
          : [];

      if (gradeRows.length > 0 || data?.grades) {
        setGrades(gradeRows as SubjectGrade[]);
        
        // Set curriculum type from API
        if (data.curriculumType) {
          setCurriculumType(normalizeCurriculumType(data.curriculumType));
        }
        
        // Calculate period ranking from the API data
        if (data.periods && data.periods.length > 0) {
          const periodStudentAverages = data.periods
            .filter((p: any) => p.average > 0)
            .map((p: any, idx: number) => ({ periodIndex: idx, average: p.average }))
            .sort((a: any, b: any) => b.average - a.average);
          
          data.periods = data.periods.map((p: any, idx: number) => ({
            ...p,
            rank: periodStudentAverages.findIndex((a: any) => a.periodIndex === idx) + 1 || null,
            totalStudents: periodStudentAverages.length,
          }));
        }
      } else {
        setGrades([]);
      }
    } catch (error) {
      console.error("Error fetching grades:", error);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChildId, selectedYear]);

  useEffect(() => {
    if (selectedChildId && selectedYear) {
      fetchGrades();
    }
  }, [fetchGrades, selectedChildId, selectedYear]);

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    switch (grade) {
      case "A": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "B": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "C": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "D": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "F": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const calculateAverage = (gradeList: SubjectGrade[]) => {
    const totalScores = gradeList.filter(g => g.totalScore !== null).map(g => g.totalScore!);
    if (totalScores.length === 0) return 0;
    return Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100;
  };

  const calculateGPA = (avg: number) => {
    if (avg >= 90) return "4.0";
    if (avg >= 80) return "3.5";
    if (avg >= 70) return "3.0";
    if (avg >= 60) return "2.5";
    return "0.0";
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-green-600 dark:text-green-400";
    if (gpa >= 3.0) return "text-blue-600 dark:text-blue-400";
    if (gpa >= 2.5) return "text-yellow-600 dark:text-yellow-400";
    if (gpa >= 2.0) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const groupedByTerm = grades.reduce((acc, grade) => {
    const termName = grade.term.name;
    if (!acc[termName]) acc[termName] = [];
    acc[termName].push(grade);
    return acc;
  }, {} as Record<string, SubjectGrade[]>);

  // Group by curriculum period
  const periodTitles = CURRICULUM_PERIODS[curriculumType] || CURRICULUM_PERIODS["TERM"];
  
  const getPeriodGrades = (): PeriodGrades[] => {
    // First, collect all student averages for ranking
    const allStudentAverages = new Map<string, number>();
    
    // Calculate period averages for each student
    const periodStudentAverages = periodTitles.map(period => {
      const periodIndex = periodTitles.indexOf(period);
      const periodGrades = grades.filter((_, idx) => {
        const termNum = idx + 1;
        const periodNum = periodIndex + 1;
        const map: Record<string, number> = { QUARTER: 4, SEMESTER: 2, TERM: 3, MONTHLY: 12, YEARLY: 1 };
        const count = map[curriculumType] || 3;
        const perPeriod = Math.ceil(grades.length / count);
        const startIdx = periodIndex * perPeriod;
        const endIdx = startIdx + perPeriod;
        return idx >= startIdx && idx < endIdx;
      });
      return periodGrades;
    });

    // Simple ranking based on average
    const averages = periodStudentAverages
      .map((pg, idx) => ({
        periodIndex: idx,
        average: calculateAverage(pg),
      }))
      .filter(p => p.average > 0)
      .sort((a, b) => b.average - a.average);

    return periodTitles.map((period, periodIndex) => {
      const periodGrades = grades.filter((g, idx) => {
        const map: Record<string, number> = { QUARTER: 4, SEMESTER: 2, TERM: 3, MONTHLY: 12, YEARLY: 1 };
        const count = map[curriculumType] || 3;
        const perPeriod = Math.ceil(grades.length / count);
        const startIdx = periodIndex * perPeriod;
        const endIdx = startIdx + perPeriod;
        return idx >= startIdx && idx < endIdx;
      });

      const avg = calculateAverage(periodGrades);
      const gpa = calculateGPA(avg);
      
      // Calculate rank
      const rank = averages.findIndex(a => a.periodIndex === periodIndex) + 1;
      const totalWithGrades = averages.length;

      return {
        period,
        periodIndex,
        grades: periodGrades,
        average: avg,
        gpa,
        rank: rank > 0 ? rank : null,
        totalStudents: totalWithGrades,
        hasGrades: periodGrades.length > 0,
      };
    });
  };

  const periodGrades = getPeriodGrades();

  const overallAverage = calculateAverage(grades);
  const overallGPA = calculateGPA(overallAverage);
  const scores = grades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const selectedChild = children.find(
    (c) => (c.profileId || c.userId || c.id) === selectedChildId,
  );

  if (authLoading || initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <BookOpen className="h-6 w-6" />
            My Children's Grades & Results
          </h1>
          <p className="text-muted-foreground text-slate-500 dark:text-slate-400">
            View your children's academic performance by {curriculumType} period
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Report Card
        </Button>
      </div>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Child</label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="bg-white dark:bg-slate-700">
                  <SelectValue placeholder="Select Child" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  {children.map(child => (
                    <SelectItem
                      key={child.profileId || child.id}
                      value={child.profileId || child.userId || child.id}
                    >
                      {child.name} - {child.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-white dark:bg-slate-700">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {grades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">GPA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${getGPAColor(parseFloat(overallGPA))}`}>
                {overallGPA}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Out of 4.0</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">
                {overallAverage}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Highest</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                {highestScore}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">
                {grades.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : grades.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-10 text-center text-slate-500 dark:text-slate-400">
            No grades found for the selected criteria
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Grade Breakdown by {curriculumType} Period
            </span>
          </div>

          <div className={`grid gap-4 ${
            periodTitles.length === 4 ? "grid-cols-2 md:grid-cols-4" :
            periodTitles.length === 3 ? "grid-cols-1 md:grid-cols-3" :
            periodTitles.length === 2 ? "grid-cols-2" : "grid-cols-3 md:grid-cols-6"
          }`}>
            {periodGrades.map((pg, idx) => (
              <Card 
                key={idx} 
                className={` border-2 ${
                  pg.hasGrades 
                    ? pg.average >= 90 
                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                      : pg.average >= 70
                      ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                      : "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                      {pg.period}
                    </CardTitle>
                    {pg.hasGrades ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {pg.hasGrades ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {pg.average}%
                          </div>
                          <div className={`text-xs font-medium ${getGPAColor(parseFloat(pg.gpa))}`}>
                            GPA {pg.gpa}
                          </div>
                        </div>
                        {pg.rank && pg.totalStudents > 0 && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              #{pg.rank}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              of {pg.totalStudents}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        {pg.grades.length} subject{pg.grades.length !== 1 ? 's' : ''}
                      </div>
                      <Progress 
                        value={(parseFloat(pg.gpa) / 4) * 100} 
                        className="h-1.5" 
                      />
                      {pg.rank && (
                        <div className="mt-2 text-xs text-center">
                          {pg.rank === 1 ? (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              🏆 1st Place
                            </Badge>
                          ) : pg.rank <= 3 ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Top 3
                            </Badge>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              Rank {pg.rank} of {pg.totalStudents}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No grades yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {grades.length > 0 && (
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white">Subject Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {grades.map(grade => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${getGradeColor(grade.gradeLetter)}`}>
                      {grade.gradeLetter || "-"}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">{grade.subject.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {grade.class.name} - {grade.section.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">CA</p>
                      <p className="font-medium text-slate-900 dark:text-white">{grade.caScore ?? "-"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Mid</p>
                      <p className="font-medium text-slate-900 dark:text-white">{grade.midScore ?? "-"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Final</p>
                      <p className="font-medium text-slate-900 dark:text-white">{grade.finalScore ?? "-"}</p>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                      <p className="font-bold text-lg text-slate-900 dark:text-white">{grade.totalScore ?? "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900 dark:text-white">Grade Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 md:gap-4">
            <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <div className="text-2xl font-bold text-green-800 dark:text-green-300">A</div>
              <div className="text-sm text-green-700 dark:text-green-400">90-100</div>
              <div className="text-xs text-green-600 dark:text-green-500">4.0</div>
            </div>
            <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">B</div>
              <div className="text-sm text-blue-700 dark:text-blue-400">80-89</div>
              <div className="text-xs text-blue-600 dark:text-blue-500">3.5</div>
            </div>
            <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">C</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">70-79</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-500">3.0</div>
            </div>
            <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">D</div>
              <div className="text-sm text-orange-700 dark:text-orange-400">60-69</div>
              <div className="text-xs text-orange-600 dark:text-orange-500">2.5</div>
            </div>
            <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <div className="text-2xl font-bold text-red-800 dark:text-red-300">F</div>
              <div className="text-sm text-red-700 dark:text-red-400">0-59</div>
              <div className="text-xs text-red-600 dark:text-red-500">0.0</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
