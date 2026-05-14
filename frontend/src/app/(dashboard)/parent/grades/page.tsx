"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { academicYearsAPI, gradingAPI, reportCardsAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";
import { BookOpen, Download, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AcademicYear {
  id: string;
  name: string;
}

interface TermOption {
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

interface GradeRow {
  subjectId: string;
  termName: string;
  subjectName: string;
  subjectCode?: string;
  assessments: Array<{
    assessmentSubjectId: string;
    title: string;
    type: string;
    maxScore: number;
    score: number | null;
    status: string;
  }>;
  totalScore: number | null;
  gradeLetter: string | null;
  remark: string | null;
}

interface GradingComponent {
  code: string;
  name: string;
  percentage: number;
}

interface PaymentGate {
  blocked: boolean;
  message: string;
}

interface RankSummary {
  rank: number | null;
  termName: string | null;
}

const gradeBadgeClass = (grade: string | null) => {
  switch (grade) {
    case "A":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "B":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "C":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "D":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "F":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
};

const calculateAverage = (rows: GradeRow[]) => {
  const scores = rows
    .map((row) => row.totalScore)
    .filter((score): score is number => typeof score === "number");
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) / 100;
};

const calculateGradePoint = (average: number) => {
  if (average >= 90) return "4.0";
  if (average >= 80) return "3.5";
  if (average >= 70) return "3.0";
  if (average >= 60) return "2.5";
  return "0.0";
};

export default function ParentGradesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [periodLabel, setPeriodLabel] = useState("Curriculum Period");
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [rankSummary, setRankSummary] = useState<RankSummary>({ rank: null, termName: null });
  const [gradingComponents, setGradingComponents] = useState<GradingComponent[]>([]);
  const [paymentGate, setPaymentGate] = useState<PaymentGate>({ blocked: false, message: "" });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchInitialData = useCallback(async () => {
    try {
      const [childrenResult, yearsResult] = await Promise.allSettled([
        parentDashboardAPI.getChildren(),
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
      } catch {
        if (years.length > 0) setSelectedYear(years[0].id);
      }

      try {
        const gradingComponentsRes = await gradingAPI.getParentGradingComponents();
        const gradingComponentsData = Array.isArray(gradingComponentsRes.data)
          ? gradingComponentsRes.data
          : gradingComponentsRes.data?.data || [];
        setGradingComponents(gradingComponentsData);
      } catch {
        setGradingComponents([]);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setInitialLoad(false);
    }
  }, []);

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
  }, [authLoading, fetchInitialData, router, user]);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const response = await gradingAPI.getChildGrades(selectedChildId, {
        academicYear: selectedYear,
      });
      const periods = Array.isArray(response.data?.periods) ? response.data.periods : [];
      const curriculumType = String(response.data?.curriculumType || "").toUpperCase();
      setPeriodLabel(
        curriculumType.includes("SEMESTER")
          ? "Semester"
          : curriculumType.includes("TERM")
            ? "Term"
            : "Curriculum Period",
      );
      const nextTerms: TermOption[] = periods.map((period: any) => ({
        id: period.termId || period.period,
        name: period.period || period.termName || "Unnamed Period",
      }));
      setTerms(nextTerms);
      const effectiveSelectedTerm =
        selectedTerm !== "all" && nextTerms.some((term) => term.id === selectedTerm)
          ? selectedTerm
          : response.data?.currentPeriodTermId || nextTerms[0]?.id || "all";
      setSelectedTerm(effectiveSelectedTerm);
      const visiblePeriods =
        effectiveSelectedTerm === "all"
          ? periods
          : periods.filter(
              (period: any) =>
                (period.termId || period.period || period.termName || "") === effectiveSelectedTerm,
            );

      const clearanceTermId =
        effectiveSelectedTerm === "all" ? response.data?.currentPeriodTermId || undefined : effectiveSelectedTerm;
      if (clearanceTermId) {
        const clearanceRes = await gradingAPI.verifyFinancialClearance({
          studentId: selectedChildId,
          academicYear: selectedYear,
          termId: clearanceTermId,
          checkOverdueOnly: false,
        });
        const clearance = clearanceRes.data;
        if (!clearance?.isCleared) {
          const blockedTermName =
            nextTerms.find((term) => term.id === clearanceTermId)?.name || periodLabel;
          setPaymentGate({
            blocked: true,
            message: `Results are locked until the ${blockedTermName} fees are paid.`,
          });
          setGradeRows([]);
          setRankSummary({ rank: null, termName: null });
          return;
        }
      }

      setPaymentGate({ blocked: false, message: "" });
      const selectedChild = children.find(
        (child) => (child.profileId || child.userId || child.id) === selectedChildId,
      );
      const selectedYearName =
        academicYears.find((year) => year.id === selectedYear)?.name || selectedYear;
      const selectedTermName =
        effectiveSelectedTerm !== "all"
          ? nextTerms.find((term) => term.id === effectiveSelectedTerm)?.name || effectiveSelectedTerm
          : undefined;

      try {
        const publishedCardsRes = await reportCardsAPI.getPublishedForParent(
          selectedChild?.userId || selectedChildId,
          {
            academicYear: selectedYearName,
            ...(selectedTermName ? { term: selectedTermName } : {}),
          },
        );
        const publishedCards = Array.isArray(publishedCardsRes.data)
          ? publishedCardsRes.data
          : [];
        const latestPublishedCard = publishedCards.sort(
          (a, b) =>
            new Date(b.publishedAt || b.updatedAt).getTime() -
            new Date(a.publishedAt || a.updatedAt).getTime(),
        )[0];

        setRankSummary({
          rank:
            typeof latestPublishedCard?.rankInClass === "number"
              ? latestPublishedCard.rankInClass
              : null,
          termName: latestPublishedCard?.term || selectedTermName || null,
        });
      } catch (rankError) {
        console.error("Error fetching published report card rank:", rankError);
        setRankSummary({ rank: null, termName: null });
      }

      const rows: GradeRow[] = visiblePeriods.flatMap((period: any) =>
        (Array.isArray(period.grades) ? period.grades : []).map((grade: any) => ({
          subjectId: grade.subjectId,
          termName: grade.term?.name || period.period || "Published",
          subjectName: grade.subject?.name || "N/A",
          subjectCode: grade.subject?.code || undefined,
          assessments: Array.isArray(grade.gradeScores)
            ? grade.gradeScores.map((item: any, index: number) => ({
                assessmentSubjectId: item.id || `${grade.id}-${index}`,
                title: item.component?.name || item.component?.code || "Assessment",
                type: item.component?.code || "",
                maxScore: Number(item.maxScore) || 0,
                score: typeof item.score === "number" ? item.score : null,
                status: grade.status || "SUBMITTED",
              }))
            : [],
          totalScore: typeof grade.totalScore === "number" ? grade.totalScore : null,
          gradeLetter: grade.gradeLetter ?? null,
          remark: grade.status || null,
        }),
      ));
      setGradeRows(rows);
    } catch (error) {
      console.error("Error fetching grades:", error);
      setGradeRows([]);
      setRankSummary({ rank: null, termName: null });
    } finally {
      setLoading(false);
    }
  }, [academicYears, children, selectedChildId, selectedTerm, selectedYear]);

  useEffect(() => {
    if (selectedChildId && selectedYear) {
      fetchGrades();
    }
  }, [fetchGrades, selectedChildId, selectedYear]);

  const selectedChild = useMemo(
    () => children.find((child) => (child.profileId || child.userId || child.id) === selectedChildId),
    [children, selectedChildId],
  );

  const assessmentColumns = useMemo(() => {
    const preferredOrder = ["ATTENDANCE", "WORKSHEET", "QUIZ", "TEST", "MID", "FINAL"];
    return gradingComponents
      .map((component) => ({
        code: String(component.code).toUpperCase(),
        label: component.name,
        maxScore: Number(component.percentage) || 0,
      }))
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.code);
        const bIndex = preferredOrder.indexOf(b.code);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [gradingComponents]);

  const groupedByTerm = useMemo(() => {
    const groups = new Map<string, GradeRow[]>();
    for (const row of gradeRows) {
      const bucket = groups.get(row.termName) ?? [];
      bucket.push(row);
      groups.set(row.termName, bucket);
    }
    return Array.from(groups.entries()).map(([termName, rows]) => {
      const average = calculateAverage(rows);
      return {
        termName,
        rows,
        average,
        gradePoint: calculateGradePoint(average),
      };
    });
  }, [gradeRows]);

  const overallAverage = calculateAverage(gradeRows);
  const overallGradePoint = calculateGradePoint(overallAverage);
  const highestScore = gradeRows.reduce((highest, row) => {
    const score = row.totalScore ?? 0;
    return score > highest ? score : highest;
  }, 0);

  if (authLoading || initialLoad) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <BookOpen className="h-6 w-6 text-[var(--brand-color,#e35336)]" />
              Published Results
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View published subject results in a simple table layout.
            </p>
          </div>
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Download Report Card
          </Button>
        </div>

        <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Child
              </label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
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
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Academic Year
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {periodLabel}
              </label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {paymentGate.blocked && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="py-6 text-center text-amber-800 dark:text-amber-300">
              {paymentGate.message}
            </CardContent>
          </Card>
        )}

        {selectedChild && (
          <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedChild.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedChild.studentCode}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {selectedChild.className} - Section {selectedChild.section}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Average / GPA</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {overallAverage}% / {overallGradePoint}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Ranking</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {typeof rankSummary.rank === "number" ? `#${rankSummary.rank}` : "-"}
                </p>
                {rankSummary.termName && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{rankSummary.termName}</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Subjects / Highest</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {gradeRows.length} / {highestScore}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
          </div>
        ) : paymentGate.blocked ? null : gradeRows.length === 0 ? (
          <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="py-14 text-center text-slate-500 dark:text-slate-400">
              No published results found for the selected child and academic year.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedByTerm.map((group) => (
              <Card
                key={group.termName}
                className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="text-lg text-slate-900 dark:text-white">
                      {group.termName}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Average {group.average}%</Badge>
                      <Badge className="bg-[var(--brand-color,#e35336)] text-white hover:bg-[var(--brand-color,#e35336)]">
                        GPA {group.gradePoint}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {assessmentColumns.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                      Assessment types are not available for this school yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            {assessmentColumns.map((column) => (
                              <TableHead key={column.code} className="text-center">
                                <div className="inline-flex min-w-[88px] flex-col items-center gap-1 rounded-md bg-slate-50 px-2 py-2 dark:bg-slate-800/80">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {column.label}
                                  </span>
                                  {column.maxScore > 0 && (
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
                                      Max {column.maxScore}
                                    </span>
                                  )}
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead>Remark</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.rows.map((row) => (
                            <TableRow key={`${group.termName}-${row.subjectId}`}>
                              <TableCell className="font-medium text-slate-900 dark:text-white">
                                {row.subjectName}
                              </TableCell>
                              {assessmentColumns.map((column) => {
                                const scores = row.assessments
                                  .filter(
                                    (assessment) =>
                                      String(assessment.type).toUpperCase() === column.code &&
                                      typeof assessment.score === "number",
                                  )
                                  .map((assessment) => assessment.score as number);
                                const value =
                                  scores.length > 0
                                    ? Math.round(scores.reduce((sum, score) => sum + score, 0) * 100) / 100
                                    : null;
                                return (
                                  <TableCell key={column.code} className="text-center">
                                    {value ?? "-"}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center font-medium">
                                {row.totalScore ?? "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`inline-flex min-w-10 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${gradeBadgeClass(row.gradeLetter)}`}
                                >
                                  {row.gradeLetter || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-500 dark:text-slate-400">
                                {row.remark || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
