"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { academicYearsAPI, financeAPI, schoolSettingsAPI } from "@/lib/api";
import { gradingAPI } from "@/lib/api/assessment";
import { parentDashboardAPI } from "@/lib/api/parent";
import { reportCardsAPI } from "@/lib/api/reporting";
import { resolveAssetUrl } from "@/lib/asset-url";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toEthiopianDate, toGregorianDate } from "@/utils/date";
import { useSchoolFeatureSetting } from "@/hooks/useSchoolFeatureSetting";
import {
  User,
  Calendar,
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  Award,
  Trophy,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Recharts for charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Types
interface Child {
  id: string;
  userId?: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
  relation: string;
  attendance: string;
  presentDays: number;
  totalDays: number;
  upcomingExams: number;
  recentAbsences: { date: string; reason: string | null }[];
  latestGrade: string;
  overallGrade: string;
  feeBalance: number;
  totalPaid: number;
  totalDue: number;
  totalDiscount: number;
  discountPercent?: number;
  discountLabel?: string | null;
  feePeriods?: FeePeriodSummary[];
  curriculumType?: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  reportCard: {
    status: string;
    percentage: number | null;
    publishedAt: string | null;
  } | null;
  grades: {
    subject: string;
    currentGrade: string;
    average: string;
    status: string;
  }[];
  attendanceTrend: {
    week: string;
    percentage: number;
  }[];
}

interface FeePeriodSummary {
  id: string;
  name: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  discount: number;
  discountPercent?: number;
  discountLabel?: string | null;
}

interface TopRankChild {
  childName: string;
  reportCardId: string;
  childId: string;
  rank: number;
  term: string;
  percentage: number | null;
  grade: string | null;
  canViewResults: boolean;
  blockedReason?: string;
}

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

const formatBirr = (amount: number) => `Brr ${Math.round(amount).toLocaleString()}`;

const getInstallmentNumber = (feeType?: string | null) => {
  const match = String(feeType || "").match(/_INSTALLMENT_(\d+)$/i);
  return match ? Number(match[1]) : null;
};

const buildFeePeriodSummary = (
  feeData: any,
  calendarType: "ETHIOPIAN" | "GREGORIAN" = "ETHIOPIAN",
  currentTerm?: any,
  academicYear?: any
): FeePeriodSummary[] => {
  const terms = Array.isArray(feeData?.terms) ? feeData.terms : [];
  const feeItems = Array.isArray(feeData?.feeItems) ? feeData.feeItems : [];
  const payments = Array.isArray(feeData?.payments) ? feeData.payments : [];

  const ETHIOPIAN_MONTH_NAMES = [
    'Meskerem', 'Tikemet', 'Hidar', 'Tahsas', 'Ter', 'Yekatit',
    'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
  ];

  const GREGORIAN_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthTitles = (period: any) => {
    if (!period?.startDate || !period?.endDate) {
      if (calendarType === "ETHIOPIAN") {
        return ETHIOPIAN_MONTH_NAMES.slice(0, 12);
      } else {
        const months: string[] = [];
        for (let i = 0; i < 12; i++) {
          months.push(GREGORIAN_MONTH_NAMES[(8 + i) % 12]);
        }
        return months;
      }
    }

    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      if (calendarType === "ETHIOPIAN") {
        return ETHIOPIAN_MONTH_NAMES.slice(0, 12);
      } else {
        const months: string[] = [];
        for (let i = 0; i < 12; i++) {
          months.push(GREGORIAN_MONTH_NAMES[(8 + i) % 12]);
        }
        return months;
      }
    }

    const titles: string[] = [];

    if (calendarType === "ETHIOPIAN") {
      const startEth = toEthiopianDate(startDate);
      const endEth = toEthiopianDate(endDate);
      
      let currentMonth = startEth.month;
      let currentYear = startEth.year;
      const endMonth = endEth.month;
      const endYear = endEth.year;

      while (
        currentYear < endYear || 
        (currentYear === endYear && currentMonth <= endMonth)
      ) {
        titles.push(ETHIOPIAN_MONTH_NAMES[currentMonth - 1]);
        currentMonth++;
        if (currentMonth > 13) {
          currentMonth = 1;
          currentYear++;
        }
        if (titles.length >= 12) break;
      }
    } else {
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const targetEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (current <= targetEnd && titles.length < 12) {
        titles.push(GREGORIAN_MONTH_NAMES[current.getMonth()]);
        current.setMonth(current.getMonth() + 1);
      }
    }

    return titles.length ? titles : (calendarType === "ETHIOPIAN" ? ETHIOPIAN_MONTH_NAMES.slice(0, 12) : GREGORIAN_MONTH_NAMES);
  };

  const allYearMonths = getMonthTitles(academicYear);
  const currentTermMonths = getMonthTitles(currentTerm);

  const billingMode = String(feeData?.curriculumType || "").toUpperCase();
  const isMonthly = billingMode === "MONTHLY" || billingMode === "MONTH";

  const periodTitles = isMonthly
    ? currentTermMonths
    : terms.length > 0
    ? terms
        .filter((t: any) => !currentTerm || String(t.id || t.termId || t.name) === String(currentTerm.id))
        .map((term: any) => String(term.name || term.period || "Period"))
    : currentTermMonths;

  if (periodTitles.length === 0) {
    return [];
  }

  return periodTitles.map((termName: string, index: number) => {
    const term = terms.find((t: any) => String(t.id || t.termId || t.name) === String(currentTerm?.id)) || terms[index];
    const termId = term ? String(term.id || term.termId || termName) : termName;
    let totalDue = 0;
    let discount = 0;
    let discountPercent = 0;
    let discountLabel: string | null = null;

    for (const item of feeItems) {
      const amount = Number(item.finalAmount ?? item.amount) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const itemInstallmentNumber = getInstallmentNumber(item.name || item.category);

      let isMatch = false;
      if (isMonthly && itemInstallmentNumber) {
        const monthForInstallment = allYearMonths[itemInstallmentNumber - 1];
        if (monthForInstallment === termName) {
          isMatch = true;
        }
      } else if (!isMonthly && (item.termId === termId || item.termName === termName)) {
        isMatch = true;
      } else if (item.isYearWide && !itemInstallmentNumber) {
        totalDue += amount / periodTitles.length;
        discount += itemDiscount / periodTitles.length;
      }

      if (isMatch) {
        totalDue += amount;
        discount += itemDiscount;
      }

      if ((isMatch || item.isYearWide) && itemDiscount > 0) {
        discountPercent = Number(item.discountPercent) || discountPercent;
        discountLabel = item.discountLabel || discountLabel;
      }
    }

    const totalPaid = payments
      .filter((payment: any) => {
        const paymentInstallmentNumber = getInstallmentNumber(payment.feeItemName);

        if (isMonthly && paymentInstallmentNumber) {
          const monthForInstallment = allYearMonths[paymentInstallmentNumber - 1];
          return monthForInstallment === termName;
        } else {
          return payment.termId === termId || payment.termName === termName;
        }
      })
      .reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);

    return {
      id: `${termId}-${termName}-${index}`,
      name: termName,
      totalDue: Math.round(totalDue * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balance: Math.max(0, Math.round((totalDue - totalPaid) * 100) / 100),
      discount: Math.round(discount * 100) / 100,
      discountPercent,
      discountLabel,
    };
  });
};

interface AcademicYear {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

interface DashboardData {
  stats: {
    totalChildren: number;
    children: Child[];
    averageAttendance: string;
    totalUpcomingExams: number;
  };
  recentNotices: {
    id: string;
    title: string;
    type: string;
    date: string;
    description?: string;
  }[];
  recentActivity: {
    id: string;
    type: string;
    message: string;
    date: string;
    icon: string;
  }[];
}

// Skeleton component for initial load
const ParentDashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-16 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <Skeleton className="h-5 w-28 mb-4" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <Skeleton className="h-5 w-24 mb-4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label, translation }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {translation.percentAttendance.replace("{value}", String(payload[0].value))}
        </p>
      </div>
    );
  }
  return null;
};

// Helper functions for grade calculations
const calculateAverage = (grades: SubjectGrade[]) => {
  const totalScores = grades.filter(g => g.totalScore !== null).map(g => g.totalScore!);
  if (totalScores.length === 0) return 0;
  return Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 100) / 100;
};

const calculateGPA = (grades: SubjectGrade[]) => {
  const avg = calculateAverage(grades);
  if (avg >= 90) return "4.0";
  if (avg >= 80) return "3.5";
  if (avg >= 70) return "3.0";
  if (avg >= 60) return "2.5";
  return "0.0";
};

const getGPAColor = (gpa: number) => {
  if (gpa >= 3.5) return "text-green-600";
  if (gpa >= 3.0) return "text-blue-600";
  if (gpa >= 2.5) return "text-yellow-600";
  if (gpa >= 2.0) return "text-orange-600";
  return "text-red-600";
};

const getGradeStatus = (avg: number): { text: string; color: string } => {
  if (avg >= 90) return { text: "Excellent", color: "text-green-600" };
  if (avg >= 80) return { text: "Very Good", color: "text-blue-600" };
  if (avg >= 70) return { text: "Good", color: "text-yellow-600" };
  if (avg >= 60) return { text: "Pass", color: "text-orange-600" };
  return { text: "Needs Improvement", color: "text-red-600" };
};

const clampProgress = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const parsePercentValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getSubjectProgressRows = (
  grades: SubjectGrade[],
  fallbackGrades: Child["grades"] = [],
) => {
  if (grades.length > 0) {
    const rowsBySubject = new Map<string, { id: string; subject: string; progress: number }>();

    grades.forEach((grade, index) => {
      const progress = parsePercentValue((grade as any).totalScore)
        ?? parsePercentValue((grade as any).average)
        ?? parsePercentValue((grade as any).percentage)
        ?? 0;
      const subjectName =
        grade.subject?.name ||
        (grade as any).subjectName ||
        (typeof (grade as any).subject === "string" ? (grade as any).subject : "Subject");
      const subjectCode = (grade as any).subject?.code || (grade as any).subjectCode;
      const subjectId = (grade as any).subjectId || (grade as any).subject?.id || subjectCode || subjectName;
      const subjectKey = String(subjectId).trim().toLowerCase();
      const subjectLabel = subjectCode ? `${subjectName} (${subjectCode})` : subjectName;

      const existing = rowsBySubject.get(subjectKey);
      const row = {
        id: grade.id || `${subjectName}-${index}`,
        subject: subjectLabel,
        progress: clampProgress(progress),
      };

      if (!existing || row.progress > existing.progress) {
        rowsBySubject.set(subjectKey, row);
      }
    });

    return Array.from(rowsBySubject.values()).sort((a, b) =>
      a.subject.localeCompare(b.subject),
    );
  }

  return fallbackGrades.map((grade, index) => ({
    id: `${grade.subject}-${index}`,
    subject: grade.subject,
    progress: clampProgress(parsePercentValue(grade.average) ?? 0),
  }));
};

const ParentDashboard = () => {
  const { t } = useTranslations<any>("parent");
  const translateStatus = (statusText: string) => {
    const map: Record<string, string> = {
      "Excellent": t.statuses.excellent,
      "Very Good": t.statuses.veryGood,
      "Good": t.statuses.good,
      "Pass": t.statuses.pass,
      "Needs Improvement": t.statuses.needsImprovement,
    };
    return map[statusText] || statusText;
  };
  const { currentTerm, displayTermName, periodLabel, formatDate, schoolCalendarType } = useAcademicYear();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [feeDeadlineDay, setFeeDeadlineDay] = useState(15);
  const [dailyPenaltyAmount, setDailyPenaltyAmount] = useState(0);
  
  // Grade-related state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [childGrades, setChildGrades] = useState<Record<string, SubjectGrade[]>>({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const [topRankChild, setTopRankChild] = useState<TopRankChild | null>(null);
  const [showRankCongrats, setShowRankCongrats] = useState(false);
  const [gradeAccessByChild, setGradeAccessByChild] = useState<Record<string, { canView: boolean; reason?: string }>>({});
  const {
    enabled: parentGradesEnabled,
    isLoading: parentGradesSettingLoading,
  } = useSchoolFeatureSetting("PARENT_VIEW_GRADES");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await parentDashboardAPI.getGeneralDashboard();
        const data = response.data;

        // Fetch academic years
        let years: AcademicYear[] = [];
        let activeYearId = "";
        
        try {
          const yearsRes = await academicYearsAPI.getAll();
          years = Array.isArray(yearsRes.data) ? yearsRes.data : (yearsRes.data?.data || []);
          setAcademicYears(years);
        } catch (yearError) {
          console.warn("Could not fetch academic years:", yearError);
        }
        
        // Try to get active academic year
        try {
          const activeYearRes = await academicYearsAPI.getActive();
          const activeYear = activeYearRes.data?.data || activeYearRes.data;
          if (activeYear?.id) {
            activeYearId = activeYear.id;
            if (years.length === 0) {
              years = [{ id: activeYear.id, name: activeYear.name }];
              setAcademicYears(years);
            }
          }
        } catch (activeError) {
          console.warn("Could not fetch active academic year:", activeError);
        }
        
        if (years.length > 0 && !activeYearId) {
          activeYearId = years[0].id;
        }
        setSelectedYear(activeYearId);
        const activeYearName =
          years.find((year: any) => year.id === activeYearId)?.name || "";
        const dashboardSchoolId =
          data?.metadata?.schoolId ||
          (data.stats?.children || []).find((child: Child) => (child as any).schoolId)?.schoolId;

        if (dashboardSchoolId) {
          try {
            const settingsRes = await schoolSettingsAPI.getAll(dashboardSchoolId);
            const settings = settingsRes.data || {};
            const deadlineDay = Number(settings.fee_payment_due_day ?? 15);
            const penaltyAmount = Number(settings.fee_daily_penalty_amount ?? 0);
            setFeeDeadlineDay(
              Number.isFinite(deadlineDay)
                ? Math.min(31, Math.max(1, Math.floor(deadlineDay)))
                : 15,
            );
            setDailyPenaltyAmount(
              Number.isFinite(penaltyAmount) && penaltyAmount >= 0 ? penaltyAmount : 0,
            );
          } catch (settingsError) {
            console.warn("Could not fetch fee penalty settings:", settingsError);
          }
        }

        const enhancedChildren = await Promise.all(
          (data.stats?.children || []).map(async (child: Child) => {
            const schoolId = (child as any).schoolId || data?.metadata?.schoolId;
            const academicYearId = (child as any).academicYearId || data?.metadata?.academicYear || activeYearId;

            // Pull fee summary only when required identifiers are available
            // and never inject dummy/random fallback values.
            let feeBalance = 0;
            let totalPaid = 0;
            let totalDue = 0;
            let totalDiscount = 0;
            let discountPercent = 0;
            let discountLabel: string | null = null;
            let curriculumType: string | undefined;
            let feePeriods: FeePeriodSummary[] = [];
          
            if (schoolId && academicYearId) {
              try {
                const feeResponse = await financeAPI.getStudentFees(child.id, schoolId, academicYearId);
                const feeData = feeResponse.data;
                curriculumType = feeData?.curriculumType;
                if (feeData.summary) {
                  feeBalance = feeData.summary.totalBalance || 0;
                  totalPaid = feeData.summary.totalPaid || 0;
                  totalDue = feeData.summary.totalFees || 0;
                }
                const feeItems = Array.isArray(feeData?.feeItems) ? feeData.feeItems : [];
                totalDiscount = feeItems.reduce((sum: number, item: any) => sum + (Number(item.discount) || 0), 0);
                const discountedItem = feeItems.find((item: any) => Number(item.discount) > 0);
                discountPercent = Number(discountedItem?.discountPercent) || 0;
                discountLabel = discountedItem?.discountLabel || null;
                const childAcademicYear = years.find((year: any) => year.id === academicYearId);
                feePeriods = buildFeePeriodSummary(feeData, schoolCalendarType, currentTerm, childAcademicYear);
              } catch (feeError) {
                console.error("Could not fetch fee data for child:", child.id, feeError);
              }
            }
          
            return {
              ...child,
              overallGrade: child.overallGrade || child.latestGrade || "N/A",
              photoUrl: child.photoUrl || child.avatarUrl || null,
              feeBalance,
              totalPaid,
              totalDue,
              totalDiscount,
              discountPercent,
              discountLabel,
              feePeriods,
              curriculumType,
              grades: Array.isArray(child.grades) ? child.grades : [],
              attendanceTrend: Array.isArray(child.attendanceTrend)
                ? child.attendanceTrend
                : [],
            };
          }),
        );

        // Fetch grades for all children only when parent grade viewing is enabled.
        const gradesMap: Record<string, SubjectGrade[]> = {};
        const gradeAccessMap: Record<string, { canView: boolean; reason?: string }> = {};
        let topRankCandidate: TopRankChild | null = null;
        if (parentGradesEnabled) {
          setGradesLoading(true);
          for (const child of enhancedChildren) {
            const childId = child.userId || child.id;
            if (activeYearId && childId) {
              try {
                const clearanceRes = await gradingAPI.verifyFinancialClearance({
                  studentId: childId,
                  academicYear: activeYearId,
                  ...(currentTerm?.id ? { termId: currentTerm.id } : {}),
                  checkOverdueOnly: false,
                });
                const isCleared = clearanceRes.data?.isCleared !== false;
                const blockedReason =
                  clearanceRes.data?.message ||
                  t.resultsLockedDesc;
                gradeAccessMap[childId] = {
                  canView: isCleared,
                  reason: isCleared ? undefined : blockedReason,
                };

                if (!isCleared) {
                  gradesMap[childId] = [];
                  continue;
                }

                const gradesRes = await reportCardsAPI.getPublishedForParent(childId, {
                  ...(activeYearName ? { academicYear: activeYearName } : {}),
                });
                const publishedCards = Array.isArray(gradesRes.data) ? gradesRes.data : [];
                const latestPublishedCard = publishedCards.sort((a, b) =>
                  new Date(b.publishedAt || b.updatedAt).getTime() -
                  new Date(a.publishedAt || a.updatedAt).getTime(),
                )[0];
                if (
                  !topRankCandidate &&
                  typeof latestPublishedCard?.rankInClass === "number" &&
                  latestPublishedCard.rankInClass >= 1 &&
                  latestPublishedCard.rankInClass <= 3
                ) {
                  const storageKey = `parent-rank-congrats:${latestPublishedCard.id}:${latestPublishedCard.rankInClass}`;
                  if (typeof window !== "undefined" && !window.localStorage.getItem(storageKey)) {
                    topRankCandidate = {
                      childName: child.name,
                      reportCardId: latestPublishedCard.id,
                      childId,
                      rank: latestPublishedCard.rankInClass,
                      term: latestPublishedCard.term,
                      percentage: latestPublishedCard.percentage,
                      grade: latestPublishedCard.overallGrade,
                      canViewResults: true,
                    };
                  }
                }
                const gradesData = Array.isArray(latestPublishedCard?.gradeDetails)
                  ? latestPublishedCard.gradeDetails
                  : [];
                gradesMap[childId] = gradesData as unknown as SubjectGrade[];
              } catch (gradeError) {
                console.error("Could not fetch grades for child:", childId, gradeError);
                gradeAccessMap[childId] = {
                  canView: false,
                  reason: t.clearanceFailed,
                };
                gradesMap[childId] = [];
              }
            }
          }
          setGradesLoading(false);
        }
        setGradeAccessByChild(gradeAccessMap);
        setChildGrades(gradesMap);
        if (parentGradesEnabled && topRankCandidate) {
          setTopRankChild(topRankCandidate);
          setShowRankCongrats(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              `parent-rank-congrats:${topRankCandidate.reportCardId}:${topRankCandidate.rank}`,
              "shown",
            );
          }
        }

        const normalizedData = {
          ...data,
          stats: {
            ...data.stats,
            children: enhancedChildren,
          },
          recentNotices: Array.isArray(data.recentNotices) ? data.recentNotices : [],
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
        };

        setDashboardData(normalizedData);
        if (normalizedData.stats?.children?.length > 0) {
          setSelectedChild(normalizedData.stats.children[0]);
        }
      } catch (error: any) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    if (parentGradesSettingLoading) return;
    fetchDashboard();
  }, [parentGradesEnabled, parentGradesSettingLoading, currentTerm?.id]);

  const closeRankCongrats = () => {
    if (topRankChild && typeof window !== "undefined") {
      window.localStorage.setItem(
        `parent-rank-congrats:${topRankChild.reportCardId}:${topRankChild.rank}`,
        "dismissed",
      );
    }
    setShowRankCongrats(false);
  };

  if (loading || initialLoad) {
    return <ParentDashboardSkeleton />;
  }

  const children = dashboardData?.stats?.children || [];

  // Calculate stats for the selected child
  const attendancePercentage = selectedChild
    ? parseFloat(selectedChild.attendance)
    : 0;
  
  // Get grades for selected child
  const selectedChildId = selectedChild?.userId || selectedChild?.id;
  const selectedChildGradeAccess = selectedChildId
    ? gradeAccessByChild[selectedChildId]
    : undefined;
  const canSelectedChildViewGrades =
    parentGradesEnabled && selectedChildGradeAccess?.canView !== false;
  const gradesLockedForPayment =
    parentGradesEnabled && selectedChildGradeAccess?.canView === false;
  const grades = selectedChildId ? childGrades[selectedChildId] || [] : [];
  const averageScore = calculateAverage(grades);
  const gpa = calculateGPA(grades);
  const gradeStatus = getGradeStatus(averageScore);
  const hasGrades = grades.length > 0;
  const gradeOverviewRows = getSubjectProgressRows(grades, selectedChild?.grades || []);
  const hasGradeOverview = gradeOverviewRows.length > 0;
  
  const overallGrade = hasGrades ? gpa : (selectedChild?.overallGrade || "N/A");
  const feeBalance = selectedChild?.feeBalance || 0;
  const totalDiscount = selectedChild?.totalDiscount || 0;
  const discountPercent = selectedChild?.discountPercent || 0;
  const discountLabel = selectedChild?.discountLabel || "Family discount";
  const upcomingExams = selectedChild?.upcomingExams || 0;
  const selectedChildPhotoSrc = resolveAssetUrl(selectedChild?.photoUrl || selectedChild?.avatarUrl);
  const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);

  const buildDueDateFromPeriodStart = (periodStart: Date) => {
    if (Number.isNaN(periodStart.getTime())) return null;

    if (schoolCalendarType === "ETHIOPIAN") {
      const etPeriodStart = toEthiopianDate(periodStart);
      let etDay = Math.min(feeDeadlineDay, 30);
      while (etDay > 0) {
        try {
          return new Date(
            toGregorianDate({
              year: etPeriodStart.year,
              month: etPeriodStart.month,
              day: etDay,
            }).setHours(23, 59, 59, 999),
          );
        } catch {
          etDay -= 1;
        }
      }

      return new Date(
        toGregorianDate({
          year: etPeriodStart.year,
          month: etPeriodStart.month,
          day: 1,
        }).setHours(23, 59, 59, 999),
      );
    }

    const lastDayOfMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
    return new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      Math.min(feeDeadlineDay, lastDayOfMonth),
      23,
      59,
      59,
      999,
    );
  };

  const getMonthlyDueDateFromRange = (
    periodTitle: string,
    range?: { startDate?: string; endDate?: string } | null,
  ) => {
    if (!range?.startDate) return null;
    const startDate = new Date(range.startDate);
    if (Number.isNaN(startDate.getTime())) return null;
    const endDate = range.endDate ? new Date(range.endDate) : null;

    for (let index = 0; index < 12; index++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + index);
      if (endDate && monthDate > endDate) break;
      const label = formatDate(monthDate).replace(/\s+\d{1,2},/, "");
      if (label === periodTitle || label.startsWith(`${periodTitle} `)) {
        return buildDueDateFromPeriodStart(monthDate);
      }
    }

    return null;
  };

  const getMonthlyDueDate = (periodTitle: string) =>
    getMonthlyDueDateFromRange(periodTitle, currentTerm) ||
    getMonthlyDueDateFromRange(periodTitle, selectedAcademicYear);

  const getPeriodPenalty = (periodTitle: string, balance: number) => {
    if (balance <= 0 || dailyPenaltyAmount <= 0) {
      return { daysLate: 0, penalty: 0 };
    }

    const billingMode = String(selectedChild?.curriculumType || "").toUpperCase();
    const normalizedMode = billingMode === "MONTH" ? "MONTHLY" : billingMode;
    let dueDate: Date | null = null;

    if (normalizedMode === "MONTHLY") {
      dueDate = getMonthlyDueDate(periodTitle);
    } else if (currentTerm?.startDate && currentTerm.name === periodTitle) {
      dueDate = buildDueDateFromPeriodStart(new Date(currentTerm.startDate));
    }

    if (!dueDate) return { daysLate: 0, penalty: 0 };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDayStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const daysLate = Math.max(
      0,
      Math.floor((todayStart.getTime() - dueDayStart.getTime()) / (24 * 60 * 60 * 1000)),
    );

    return {
      daysLate,
      penalty: Math.round(daysLate * dailyPenaltyAmount * 100) / 100,
    };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Dialog open={showRankCongrats} onOpenChange={(open) => {
        if (!open) closeRankCongrats();
        else setShowRankCongrats(true);
      }}>
        <DialogContent className="max-w-md border-[rgba(var(--brand-color-rgb),0.22)] bg-white text-center dark:border-[rgba(var(--brand-color-rgb),0.3)] dark:bg-slate-900" customCloseButton={false}>
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
              <Trophy className="h-9 w-9" />
            </div>
            <DialogTitle className="text-2xl text-slate-900 dark:text-white">
              {t.congratulations}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-300">
              {t.ranked.replace("{name}", topRankChild?.childName || t.yourChild).replace("{rank}", String(topRankChild?.rank)).replace("{term}", topRankChild?.term || t.latestResult)}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.06)] p-4 dark:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-[rgba(var(--brand-color-rgb),0.12)]">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t.overallResult}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {topRankChild?.percentage ?? "-"}%
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--brand-color,#e35336)]">
              {topRankChild?.grade || t.publishedResult}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={closeRankCongrats} className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90">
              {t.continue}
            </Button>
            {parentGradesEnabled && (
              <Button
                variant="outline"
                disabled={!topRankChild?.canViewResults}
                onClick={() => {
                  if (!topRankChild?.canViewResults) return;
                  closeRankCongrats();
                  router.push("/parent/grades");
                }}
              >
                {topRankChild?.canViewResults ? t.viewResults : t.resultsLocked}
              </Button>
            )}
          </DialogFooter>
          {topRankChild?.blockedReason ? (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              {topRankChild.blockedReason}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t.description}
            </p>
          </div>
          {displayTermName ? (
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
              {displayTermName}
            </div>
          ) : null}
        </div>

        {/* Student Selector + Profile */}
        <div className="flex flex-col md:flex-row gap-4">
          {children.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors min-w-[220px]"
              >
                <Avatar className="w-9 h-9">
                  {selectedChildPhotoSrc ? (
                    <img src={selectedChildPhotoSrc} alt={selectedChild?.name || t.selectStudent} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <AvatarFallback className="text-sm bg-[var(--brand-color,#e35336)] text-white">
                      {selectedChild?.name?.charAt(0) || "S"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedChild?.name || t.selectStudent}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedChild?.className} &middot; {selectedChild?.section}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {studentDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  {children.map((child) => (
                    (() => {
                      const childPhotoSrc = resolveAssetUrl(child.photoUrl || child.avatarUrl);
                      return (
                    <button
                      key={child.id}
                      onClick={() => {
                        setSelectedChild(child);
                        setStudentDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        selectedChild?.id === child.id
                          ? "bg-[rgba(var(--brand-color-rgb),0.08)]"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Avatar className="w-9 h-9">
                        {childPhotoSrc ? (
                          <img src={childPhotoSrc} alt={child.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <AvatarFallback className="text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                            {child.name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {child.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {child.className} &middot; {child.section}
                        </p>
                      </div>
                    </button>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedChild && (
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  {selectedChildPhotoSrc ? (
                    <img src={selectedChildPhotoSrc} alt={selectedChild.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <AvatarFallback className="text-base bg-[var(--brand-color,#e35336)] text-white">
                      {selectedChild.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {selectedChild.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t.grade} {selectedChild.className} &middot; {t.section} {selectedChild.section}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-400">{t.studentCode}</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {selectedChild.studentCode}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.attendance}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{attendancePercentage}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">+2.5%</span>
                  <span className="text-xs text-slate-400">{t.thisTerm}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.gpa}</p>
                {gradesLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400 mt-1.5" />
                ) : gradesLockedForPayment ? (
                  <>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">Not paid</p>
                    <span className="text-xs text-amber-600 dark:text-amber-400">Results locked</span>
                  </>
                ) : hasGrades ? (
                  <>
                    <p className={`text-2xl font-bold mt-1.5 ${getGPAColor(parseFloat(gpa))}`}>{gpa}</p>
                    <span className={`text-xs ${gradeStatus.color}`}>{translateStatus(gradeStatus.text)}</span>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-400 mt-1.5">{t.nA}</p>
                    <span className="text-xs text-slate-400">{t.noGrades}</span>
                  </>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.avgScore}</p>
                {gradesLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400 mt-1.5" />
                ) : gradesLockedForPayment ? (
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">Not paid</p>
                ) : hasGrades ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{averageScore}%</p>
                ) : (
                  <p className="text-2xl font-bold text-slate-400 mt-1.5">{t.nA}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{t.outOf100}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.totalOutstandingBalance}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {feeBalance.toLocaleString()} Br
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {feeBalance > 0 ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">{t.unpaidNeedsPayment}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{t.allFeesPaid}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 max-w-[14rem] text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {t.totalOutstandingHelp}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Chart + Notices + Fees */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.attendanceTrend}</h3>
            <p className="text-xs text-slate-500 mb-4">{t.thisTerm}</p>
            {selectedChild?.attendanceTrend && (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={selectedChild.attendanceTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} className="dark:stroke-slate-700" />
                  <XAxis dataKey="week" axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} dy={8} />
                  <YAxis axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} tickMargin={8} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip translation={t} />} />
                  <Line type="monotone" dataKey="percentage" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#3B82F6" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t.recentNotices}</h3>
              <div className="space-y-3">
                {dashboardData?.recentNotices?.length ? (
                  dashboardData.recentNotices.map((notice) => (
                    <div key={notice.id} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        notice.type === "assignment" ? "bg-blue-50 dark:bg-blue-900/40" :
                        notice.type === "meeting" ? "bg-purple-50 dark:bg-purple-900/40" :
                        "bg-amber-50 dark:bg-amber-900/40"
                      }`}>
                        <Bell className={`w-4 h-4 ${
                          notice.type === "assignment" ? "text-blue-600 dark:text-blue-400" :
                          notice.type === "meeting" ? "text-purple-600 dark:text-purple-400" :
                          "text-amber-600 dark:text-amber-400"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{notice.title}</p>
                        {notice.description && (
                          <p className="text-xs text-slate-500 truncate">{notice.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(notice.date)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">{t.noRecentNotices}</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t.currentPeriodFeeSummary}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {t.currentPeriodFeeSummaryHelp}
                </p>
              </div>
              <div className="space-y-3">
                {selectedChild?.feePeriods?.length ? (
                  selectedChild.feePeriods.map((period, index) => {
                    const periodPenalty = getPeriodPenalty(period.name, period.balance);
                    const amountDueNow = period.balance + periodPenalty.penalty;
                    return (
                      <div key={`${period.id}-${index}`} className="border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{period.name}</span>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {t.dueNow}
                            </p>
                            <span className={`text-sm font-bold ${amountDueNow > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {formatBirr(amountDueNow)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{t.paidLabel} <strong className="text-slate-700 dark:text-slate-300">{formatBirr(period.totalPaid)}</strong></span>
                          <span>{t.feeAmountLabel} <strong className="text-slate-700 dark:text-slate-300">{formatBirr(period.totalDue)}</strong></span>
                          <span>{t.remainingLabel} <strong className="text-slate-700 dark:text-slate-300">{formatBirr(period.balance)}</strong></span>
                          {periodPenalty.penalty > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              Penalty <strong>{formatBirr(periodPenalty.penalty)}</strong> ({periodPenalty.daysLate} days)
                            </span>
                          )}
                        </div>
                        {periodPenalty.penalty > 0 && (
                          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                            Overdue: {formatBirr(period.balance)} balance + {formatBirr(periodPenalty.penalty)} penalty
                          </p>
                        )}
                        {period.discount > 0 && (
                          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {period.discountLabel || "Family discount"}
                            {period.discountPercent ? ` (${period.discountPercent}%)` : ""}: -{formatBirr(period.discount)}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{t.balance}</span>
                    <span className={`text-lg font-bold ${(selectedChild?.feeBalance || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatBirr(selectedChild?.feeBalance || 0)}
                    </span>
                  </div>
                )}
              </div>
              {totalDiscount > 0 && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {discountLabel}{discountPercent ? ` (${discountPercent}%)` : ""} applied: -{formatBirr(totalDiscount)}
                </p>
              )}
              {(selectedChild?.totalDue || 0) > 0 && (
                <Button className="w-full mt-4 bg-blue-900 hover:bg-blue-800 text-white">
                  {t.payNow}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Grades Overview */}
        {parentGradesEnabled && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{t.gradesOverview}</h3>
                <p className="text-xs text-slate-500">{t.currentTermPerformance}</p>
              </div>
              {hasGradeOverview && (
                <Badge variant="outline" className="text-xs">{t.subjects.replace("{count}", String(gradeOverviewRows.length))}</Badge>
              )}
            </div>
            {gradesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : hasGradeOverview ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left text-xs font-medium text-slate-500 pb-3">{t.subject}</th>
                      <th className="w-56 text-left text-xs font-medium text-slate-500 pb-3">{t.progress}</th>
                      <th className="text-left text-xs font-medium text-slate-500 pb-3">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeOverviewRows.map((row) => {
                      const status = getGradeStatus(row.progress).text;
                      return (
                        <tr key={row.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                          <td className="py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{row.subject}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 sm:w-36 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${row.progress}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.progress}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className={`text-xs ${
                              status === "Excellent" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" :
                              status === "Good" || status === "Very Good" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" :
                              "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            }`}>{translateStatus(status)}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500">{t.noGradesYet}</p>
                {canSelectedChildViewGrades ? (
                  <Button variant="link" asChild className="mt-2">
                    <a href="/parent/grades">{t.viewGrades}</a>
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {selectedChildGradeAccess?.reason || t.gradesLocked}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t.recentActivity}</h3>
          <div className="space-y-1">
            {dashboardData?.recentActivity?.length ? (
              dashboardData.recentActivity.map((activity, index) => (
                <div key={activity.id} className={`flex items-start gap-4 py-3 ${
                  index < dashboardData.recentActivity.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""
                }`}>
                  <div className="relative flex flex-col items-center">
                    <div className={`p-1.5 rounded-full ${
                      activity.type === "payment" ? "bg-emerald-50 dark:bg-emerald-900/40" :
                      activity.type === "grade" ? "bg-blue-50 dark:bg-blue-900/40" :
                      activity.type === "attendance" ? "bg-purple-50 dark:bg-purple-900/40" :
                      "bg-amber-50 dark:bg-amber-900/40"
                    }`}>
                      {activity.type === "payment" && <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      {activity.type === "grade" && <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      {activity.type === "attendance" && <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                      {activity.type === "notice" && <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    {index < dashboardData.recentActivity.length - 1 && (
                      <div className="w-px h-full absolute top-8 bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-4">{t.noRecentActivity}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ParentDashboard;
