"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { academicYearsAPI, gradingAPI, reportCardsAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    } catch (error: any) {
      console.error("Error fetching grades:", error);
      if (error?.response?.status === 403) {
        setPaymentGate({
          blocked: true,
          message:
            error.response?.data?.message ||
            "Results are locked until the current term or semester fees are paid.",
        });
      }
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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <div className="px-4 py-6 md:px-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Published Results
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View published subject results for your children.
            </p>
          </div>
          <Button variant="outline" disabled size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download Report Card
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Child</label>
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Academic Year</label>
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">{periodLabel}</label>
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
          </div>
        </div>

        {paymentGate.blocked && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl py-6 text-center text-amber-800 dark:text-amber-300 text-sm">
            {paymentGate.message}
          </div>
        )}

        {selectedChild && !paymentGate.blocked && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Student</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{selectedChild.name}</p>
                <p className="text-sm text-slate-500">{selectedChild.studentCode}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Class</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {selectedChild.className} &middot; Section {selectedChild.section}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Average / GPA</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {overallAverage}% / {overallGradePoint}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Ranking</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {typeof rankSummary.rank === "number" ? `#${rankSummary.rank}` : "-"}
                </p>
                {rankSummary.termName && (
                  <p className="text-sm text-slate-500">{rankSummary.termName}</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Subjects / Highest</p>
                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {gradeRows.length} / {highestScore}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : paymentGate.blocked ? null : gradeRows.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-14 text-center text-slate-500">
            No published results found for the selected child and academic year.
          </div>
        ) : (
          <div className="space-y-5">
            {groupedByTerm.map((group) => (
              <div key={group.termName} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{group.termName}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Avg {group.average}%</Badge>
                    <Badge className="bg-[var(--brand-color,#e35336)] text-white text-xs">GPA {group.gradePoint}</Badge>
                  </div>
                </div>
                <div className="p-5">
                  {assessmentColumns.length === 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                      Assessment types are not available for this school yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-700">
                            <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Subject</th>
                            {assessmentColumns.map((column) => (
                              <th key={column.code} className="text-center pb-3 px-2">
                                <div className="inline-flex flex-col items-center gap-0.5">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {column.label}
                                  </span>
                                  {column.maxScore > 0 && (
                                    <span className="text-[10px] text-slate-400">/{column.maxScore}</span>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="text-center text-xs font-medium text-slate-500 pb-3 px-2">Total</th>
                            <th className="text-center text-xs font-medium text-slate-500 pb-3 px-2">Grade</th>
                            <th className="text-left text-xs font-medium text-slate-500 pb-3 pl-2">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr key={`${group.termName}-${row.subjectId}`} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                {row.subjectName}
                              </td>
                              {assessmentColumns.map((column) => {
                                const scores = row.assessments
                                  .filter((a) => String(a.type).toUpperCase() === column.code && typeof a.score === "number")
                                  .map((a) => a.score as number);
                                const value = scores.length > 0
                                  ? Math.round(scores.reduce((sum, s) => sum + s, 0) * 100) / 100
                                  : null;
                                return (
                                  <td key={column.code} className="text-center py-3 px-2 text-slate-700 dark:text-slate-300">
                                    {value ?? "-"}
                                  </td>
                                );
                              })}
                              <td className="text-center py-3 px-2 font-medium text-slate-900 dark:text-white">
                                {row.totalScore ?? "-"}
                              </td>
                              <td className="text-center py-3 px-2">
                                <span className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(row.gradeLetter)}`}>
                                  {row.gradeLetter || "-"}
                                </span>
                              </td>
                              <td className="py-3 pl-2 text-slate-500">{row.remark || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
