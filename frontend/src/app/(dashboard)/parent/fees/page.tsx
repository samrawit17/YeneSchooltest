"use client";

import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, Receipt, Calendar, Clock, Wallet, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { parentsAPI } from "@/lib/api/people";
import { financeAPI } from "@/lib/api/finance";
import { schoolSettingsAPI } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcademicYear, useAcademicYear } from "@/context/AcademicYearContext";
import { toEthiopianDate, toGregorianDate } from "@/utils/date";
import { useTranslations } from "@/hooks/useTranslations";
import type { ParentFeesMessages } from "@/messages/registry";

interface PeriodItem {
  feeId: string;
  feeType: string;
  amount: number;
  discount: number;
  discountPercent: number;
  discountLabel: string | null;
  finalAmount: number;
  paid: number;
  balance: number;
  status: string;
  termId: string | null;
  termName: string;
  isYearWide?: boolean;
}

interface FeeGroup {
  feeType: string;
  periodLabel: string;
  periodCount: number;
  amountPerPeriod: number;
  periods: PeriodItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
}

interface PaymentHistoryItem {
  id: string;
  receiptNumber: string;
  feeItemName: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  termId: string | null;
  termName: string | null;
  isYearWide?: boolean;
}

interface PeriodPaymentHistoryItem extends PaymentHistoryItem {
  displayAmount: number;
  displayPeriod: string;
}

interface ChildFees {
  total: number;
  paid: number;
  balance: number;
  paidPercentage: number;
  nextDueDate: string | null;
  breakdown: FeeGroup[];
  payments: PaymentHistoryItem[];
}

interface Child {
  id: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
  schoolId?: string;
  fees?: ChildFees;
  curriculumType?: string;
  periodCount?: number;
  periodLabels?: string[];
}

const PARENT_LABELS: Record<string, string> = {
  MONTHLY: "Month",
  QUARTERLY: "Quarter",
  SEMESTER: "Semester",
  TERM: "Term",
  YEARLY: "Full Year",
};

const PARENT_LABEL_PLURALS: Record<string, string> = {
  MONTHLY: "Months",
  QUARTERLY: "Quarters",
  SEMESTER: "Semesters",
  TERM: "Terms",
  YEARLY: "Full Year",
};

const normalizeCurriculumType = (type: string): string => {
  const map: Record<string, string> = {
    QUARTER: "QUARTERLY",
    SEMESTER: "SEMESTER",
    TERM: "TERM",
    MONTH: "MONTHLY",
    YEAR: "YEARLY",
  };
  return map[type] || type;
};

const getPeriodTitles = (curriculumType: string): string[] => {
  const normalized = normalizeCurriculumType(curriculumType);
  const count = getPeriodCount(normalized);
  const titles: Record<string, string[]> = {
    MONTHLY: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
    QUARTERLY: Array.from({ length: 4 }, (_, i) => `Q${i + 1}`),
    SEMESTER: Array.from({ length: 2 }, (_, i) => `Semester ${i + 1}`),
    TERM: Array.from({ length: 3 }, (_, i) => `Term ${i + 1}`),
    YEARLY: ["Full Year"],
  };
  return titles[normalized] || Array.from({ length: count }, (_, i) => `${normalized} ${i + 1}`);
};

const getInstallmentPeriodTitles = (
  curriculumType: string,
  academicYear?: AcademicYear,
  formatDate?: (date: Date | string) => string,
  periodRange?: { startDate?: string; endDate?: string } | null,
): string[] => {
  const normalized = normalizeCurriculumType(curriculumType);

  if (normalized !== "MONTHLY") {
    return getPeriodTitles(normalized);
  }

  const startDate = academicYear?.startDate ? new Date(academicYear.startDate) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return getPeriodTitles(normalized);
  }

  const rangeStart = periodRange?.startDate ? new Date(periodRange.startDate) : null;
  const rangeEnd = periodRange?.endDate ? new Date(periodRange.endDate) : null;
  const firstMonth =
    rangeStart && !Number.isNaN(rangeStart.getTime())
      ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
      : new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth =
    rangeEnd && !Number.isNaN(rangeEnd.getTime())
      ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1)
      : new Date(startDate.getFullYear(), startDate.getMonth() + 11, 1);

  const titles: string[] = [];
  const cursor = new Date(firstMonth);
  while (cursor <= lastMonth && titles.length < 12) {
    const monthDate = new Date(cursor);
    const formatted = formatDate ? formatDate(monthDate) : monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    titles.push(formatted.replace(/\s+\d{1,2},/, ""));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return titles.length ? titles : getPeriodTitles(normalized);
};

const getPeriodCount = (curriculumType: string): number => {
  const counts: Record<string, number> = {
    MONTHLY: 12,
    QUARTERLY: 4,
    SEMESTER: 2,
    TERM: 3,
    YEARLY: 1,
  };
  return counts[curriculumType] || 3;
};

const cleanFeeTypeName = (feeType: string) => {
  return feeType.replace(/_INSTALLMENT_\d+$/i, "").replace(/_ANNUAL$/, "").replace(/_/g, " ");
};

const getChildPeriodTitles = (
  child: Child | null,
  fallbackCurriculumType: string,
  academicYear: AcademicYear | undefined,
  formatDate: (date: Date | string) => string,
) => {
  const billingMode = normalizeCurriculumType(
    child?.curriculumType || fallbackCurriculumType || "TERM",
  );
  return child?.periodLabels?.length
    ? child.periodLabels
    : getInstallmentPeriodTitles(billingMode, academicYear, formatDate);
};

const getInstallmentNumber = (feeType?: string | null) => {
  const match = String(feeType || "").match(/_INSTALLMENT_(\d+)$/i);
  return match ? Number(match[1]) : null;
};

const getMonthPeriodFromPaymentDate = (
  paidAt: string,
  periodTitles: string[],
  formatDate: (date: Date | string) => string,
) => {
  const monthLabel = formatDate(paidAt).replace(/\s+\d{1,2},/, "");
  return periodTitles.find((title) => title === monthLabel) || null;
};

const getPaymentPeriodKey = (
  payment: { termName?: string | null; paidAt?: string; paymentDate?: string },
  periodTitles: string[],
  formatDate: (date: Date | string) => string,
) => {
  const paidAt = payment.paidAt || payment.paymentDate;
  const monthBasedPeriod = paidAt
    ? getMonthPeriodFromPaymentDate(paidAt, periodTitles, formatDate)
    : null;

  if (monthBasedPeriod && (!payment.termName || !periodTitles.includes(payment.termName))) {
    return monthBasedPeriod;
  }

  return payment.termName || monthBasedPeriod || "";
};

const getPaidAmountForSelectedPeriod = (
  payments: PaymentHistoryItem[],
  feeType: string,
  selectedPeriod: string,
  periodTitles: string[],
  formatDate: (date: Date | string) => string,
) =>
  payments
    .filter((payment) => cleanFeeTypeName(payment.feeItemName || "") === cleanFeeTypeName(feeType))
    .filter(
      (payment) =>
        getPaymentPeriodKey(
          { termName: payment.termName, paidAt: payment.paidAt },
          periodTitles,
          formatDate,
        ) === selectedPeriod,
    )
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

const getCurrentPeriodTitle = (
  billingMode: string,
  periodTitles: string[],
  formatDate: (date: Date | string) => string,
  currentTermName?: string | null,
) => {
  if (periodTitles.length === 0) return null;

  if (billingMode === "MONTHLY") {
    const monthLabel = formatDate(new Date()).replace(/\s+\d{1,2},/, "");
    return (
      periodTitles.find((title) => title === monthLabel) ||
      periodTitles.find((title) => title.toLowerCase() === monthLabel.toLowerCase()) ||
      periodTitles[0]
    );
  }

  if (currentTermName) {
    return (
      periodTitles.find((title) => title === currentTermName) ||
      periodTitles.find((title) => title.toLowerCase().includes(currentTermName.toLowerCase())) ||
      periodTitles[0]
    );
  }

  return periodTitles[0];
};

const buildPeriodPaymentHistory = (
  payments: PaymentHistoryItem[],
  breakdown: FeeGroup[],
  periodTitles: string[],
  formatDate: (date: Date | string) => string,
  preferredPeriod?: string,
): PeriodPaymentHistoryItem[] => {
  const yearWidePaymentsByFee = new Map<string, PaymentHistoryItem[]>();
  const rows: PeriodPaymentHistoryItem[] = [];

  payments.forEach((payment) => {
    if (payment.isYearWide) {
      const key = payment.feeItemName || "TUITION";
      yearWidePaymentsByFee.set(key, [
        ...(yearWidePaymentsByFee.get(key) || []),
        payment,
      ]);
      return;
    }

    const monthBasedPeriod = getMonthPeriodFromPaymentDate(
      payment.paidAt,
      periodTitles,
      formatDate,
    );
    const displayPeriod =
      monthBasedPeriod && (!payment.termName || !periodTitles.includes(payment.termName))
        ? monthBasedPeriod
        : payment.termName || monthBasedPeriod || "Current Period";

    rows.push({
      ...payment,
      displayAmount: payment.amount,
      displayPeriod,
    });
  });

  breakdown.forEach((group) => {
    const feeName = cleanFeeTypeName(group.feeType);
    const yearWidePayments = (yearWidePaymentsByFee.get(feeName) || [])
      .slice()
      .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

    if (yearWidePayments.length === 0) return;

    const orderedPeriodTitles = preferredPeriod
      ? [
          preferredPeriod,
          ...periodTitles.filter((title) => title !== preferredPeriod),
        ]
      : periodTitles;

    const periods = orderedPeriodTitles.map((title) => {
      const period = group.periods.find((item) => item.termName === title);
      return {
        title,
        remaining: period?.finalAmount || group.amountPerPeriod || 0,
      };
    });

    yearWidePayments.forEach((payment) => {
      let remainingPayment = payment.amount;
      for (const period of periods) {
        if (remainingPayment <= 0) break;
        if (period.remaining <= 0) continue;

        const allocated = Math.min(period.remaining, remainingPayment);
        period.remaining -= allocated;
        remainingPayment -= allocated;

        rows.push({
          ...payment,
          id: `${payment.id}-${period.title}`,
          displayAmount: allocated,
          displayPeriod: period.title,
        });
      }
    });
  });

  return rows.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
};

const ParentFeesPage = () => {
  const { currentAcademicYear, currentTerm, getAllAcademicYears, curriculumType, periodLabel, formatDate, schoolCalendarType } = useAcademicYear();
  const { t } = useTranslations<ParentFeesMessages>("parentFees");
  const [children, setChildren] = useState<Child[]>([]);
  const [feeDeadlineDay, setFeeDeadlineDay] = useState(15);
  const [dailyPenaltyAmount, setDailyPenaltyAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [periodTouched, setPeriodTouched] = useState(false);

  const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear) || currentAcademicYear || undefined;
  const periodTitles = getInstallmentPeriodTitles(
    normalizeCurriculumType(curriculumType || "SEMESTER"),
    selectedAcademicYear,
    formatDate,
  );
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0] || null;
  const selectedChildBillingMode = normalizeCurriculumType(selectedChild?.curriculumType || curriculumType || "SEMESTER");
  const systemPeriodLabel = PARENT_LABELS[selectedChildBillingMode] || periodLabel;
  const systemPeriodLabelPlural = PARENT_LABEL_PLURALS[selectedChildBillingMode] || `${systemPeriodLabel}s`;

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const FeesSkeleton = () => (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childrenRes = await parentsAPI.getChildren();
        if (childrenRes.status === 200) {
          const childrenData = childrenRes.data.children || childrenRes.data || [];
          const years = await getAllAcademicYears();
          setAcademicYears(years);
          const effectiveYearId = selectedYear || currentAcademicYear?.id || years[0]?.id || "";
          if (effectiveYearId) setSelectedYear(effectiveYearId);
          const firstSchoolId =
            childrenData[0]?.schoolId || childrenData[0]?.student?.schoolId || "";
          if (firstSchoolId) {
            try {
              const settingsResponse = await schoolSettingsAPI.getAll(firstSchoolId);
              const settings = settingsResponse.data || {};
              const deadlineDay = Number(settings.fee_payment_due_day ?? 15);
              const penaltyAmount = Number(settings.fee_daily_penalty_amount ?? 0);
              setFeeDeadlineDay(Number.isInteger(deadlineDay) && deadlineDay >= 1 ? deadlineDay : 15);
              setDailyPenaltyAmount(Number.isFinite(penaltyAmount) && penaltyAmount >= 0 ? penaltyAmount : 0);
            } catch (error) {
              console.error("Failed to fetch fee penalty settings:", error);
              setFeeDeadlineDay(15);
              setDailyPenaltyAmount(0);
            }
          }

          const childrenWithFees = await Promise.all(childrenData.map(async (child: any) => {
            const childId =
              child.student?.id ||
              child.student?.userId ||
              child.studentId ||
              child.id;
            const schoolId = child.schoolId || child.student?.schoolId || "";

            let curriculumInfo: any = null;
            let feeSummary: any = null;

            if (childId && schoolId && effectiveYearId) {
              try {
                const feesRes = await financeAPI.getStudentFees(
                  childId,
                  schoolId,
                  effectiveYearId,
                  undefined,
                  { skipAuthErrorRedirect: true },
                );
                feeSummary = feesRes.data;
                curriculumInfo = {
                  curriculumType: feesRes.data?.curriculumType,
                  terms: feesRes.data?.terms || [],
                };
              } catch (error) {
                console.error("Failed to fetch child fee summary:", error);
              }
            }

            const childCurriculumType = normalizeCurriculumType(curriculumInfo?.curriculumType || currentAcademicYear?.curriculumType || curriculumType || "TERM");
            const selectedAcademicYearForChild =
              years.find((year) => year.id === effectiveYearId) ||
              currentAcademicYear ||
              undefined;
            const childPeriodTitles = (childCurriculumType !== "MONTHLY" && curriculumInfo?.terms?.length
              ? curriculumInfo.terms.map((term: any) => term.name)
              : getInstallmentPeriodTitles(childCurriculumType, selectedAcademicYearForChild, formatDate));
            const childPeriodCount = getPeriodCount(childCurriculumType);
            const feeItems = Array.isArray(feeSummary?.feeItems) ? feeSummary.feeItems : [];
            const paymentItems = Array.isArray(feeSummary?.payments) ? feeSummary.payments : [];

            const groupedFees = new Map<string, FeeGroup>();
            feeItems.forEach((fee: any) => {
              const installmentNumber = getInstallmentNumber(fee.name);
              const installmentPeriodTitle =
                installmentNumber && childPeriodTitles[installmentNumber - 1]
                  ? childPeriodTitles[installmentNumber - 1]
                  : fee.termName || fee.termId || "Current Period";
              const shouldSplitAcrossPeriods = fee.isYearWide && !installmentNumber;
              const groupKey = `${cleanFeeTypeName(fee.name)}|${shouldSplitAcrossPeriods ? "year" : installmentPeriodTitle}`;
              if (!groupedFees.has(groupKey)) {
                groupedFees.set(groupKey, {
                  feeType: cleanFeeTypeName(fee.name),
                  periodLabel: PARENT_LABELS[childCurriculumType] || "Term",
                  periodCount: shouldSplitAcrossPeriods ? childPeriodCount : 1,
                  amountPerPeriod: shouldSplitAcrossPeriods
                    ? Math.round(((fee.finalAmount || fee.amount || 0) / Math.max(childPeriodCount, 1)) * 100) / 100
                    : (fee.finalAmount || fee.amount || 0),
                  periods: [],
                  totalAmount: 0,
                  paidAmount: 0,
                  balanceAmount: 0,
                  status: "PENDING",
                });
              }

              const group = groupedFees.get(groupKey)!;

              if (shouldSplitAcrossPeriods) {
                const periodPayments = new Map<string, number>();
                const normalizedFeeName = cleanFeeTypeName(fee.name);
                paymentItems
                  .filter(
                    (payment: any) =>
                      cleanFeeTypeName(payment.feeItemName || "") === normalizedFeeName,
                  )
                  .forEach((payment: any) => {
                    const key = getPaymentPeriodKey(payment, childPeriodTitles, formatDate);
                    if (!key) return;
                    periodPayments.set(key, (periodPayments.get(key) || 0) + (payment.amount || 0));
                  });
                let remainingPaid = periodPayments.size === 0 ? fee.paidAmount || 0 : 0;
                childPeriodTitles.forEach((title: string, index: number) => {
                  const termPaid = periodPayments.get(title);
                  const paid = termPaid != null
                    ? Math.max(0, Math.min(group.amountPerPeriod, termPaid))
                    : Math.max(0, Math.min(group.amountPerPeriod, remainingPaid));
                  if (termPaid == null) {
                    remainingPaid = Math.max(0, remainingPaid - group.amountPerPeriod);
                  }
                  const balance = Math.max(0, group.amountPerPeriod - paid);
                  const status = balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
                  group.periods.push({
                    feeId: `${fee.id}-${index}`,
                    feeType: fee.name,
                    amount: Math.round(((fee.amount || 0) / Math.max(childPeriodCount, 1)) * 100) / 100,
                    discount: Math.round(((fee.discount || 0) / Math.max(childPeriodCount, 1)) * 100) / 100,
                    discountPercent: Number(fee.discountPercent) || 0,
                    discountLabel: fee.discountLabel || null,
                    finalAmount: group.amountPerPeriod,
                    paid,
                    balance,
                    status,
                    termId: null,
                    termName: title,
                    isYearWide: true,
                  });
                });
              } else {
                group.periods.push({
                  feeId: fee.id,
                  feeType: cleanFeeTypeName(fee.name),
                  amount: fee.amount || 0,
                  discount: fee.discount || 0,
                  discountPercent: Number(fee.discountPercent) || 0,
                  discountLabel: fee.discountLabel || null,
                  finalAmount: fee.finalAmount || fee.amount || 0,
                  paid: fee.paidAmount || 0,
                  balance: fee.balance || 0,
                  status: fee.status || "PENDING",
                  termId: fee.termId || null,
                  termName: installmentPeriodTitle,
                  isYearWide: false,
                });
              }
            });

            const breakdown = Array.from(groupedFees.values()).map((group) => {
              const totalAmount = group.periods.reduce((sum, period) => sum + period.finalAmount, 0);
              const paidAmount = group.periods.reduce((sum, period) => sum + period.paid, 0);
              const balanceAmount = group.periods.reduce((sum, period) => sum + period.balance, 0);
              const status = balanceAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING";
              return {
                ...group,
                totalAmount,
                paidAmount,
                balanceAmount,
                status,
              };
            });

            const total = breakdown.reduce((sum, group) => sum + group.totalAmount, 0);
            const paid = breakdown.reduce((sum, group) => sum + group.paidAmount, 0);
            const balance = breakdown.reduce((sum, group) => sum + group.balanceAmount, 0);
            const paidPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;
            const payments = paymentItems;

            return {
              ...child,
              id: childId,
              name: child.name || child.student?.name || "Unknown",
              className: child.className || child.student?.className || "N/A",
              section: child.section || child.student?.section || "N/A",
              schoolId,
              curriculumType: childCurriculumType,
              periodCount: childPeriodCount,
              periodLabels: childPeriodTitles,
              fees: {
                total,
                paid,
                balance,
                paidPercentage,
                nextDueDate: feeSummary?.summary?.nextDueDate || null,
                breakdown,
                payments,
              },
            };
          }));
          setChildren(childrenWithFees);
          setSelectedChildId((current) => {
            if (current && childrenWithFees.some((child) => child.id === current)) {
              return current;
            }
            return childrenWithFees[0]?.id || "";
          });
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchData();
  }, [getAllAcademicYears, currentAcademicYear, currentTerm, curriculumType, selectedYear, formatDate]);

  useEffect(() => {
    if (periodTouched) {
      return;
    }

    const currentChild = children.find((child) => child.id === selectedChildId) || children[0] || null;
    if (!currentChild) {
      return;
    }

    const billingMode = normalizeCurriculumType(currentChild.curriculumType || curriculumType || "TERM");
    const periodTitles = getChildPeriodTitles(
      currentChild,
      curriculumType || "TERM",
      selectedAcademicYear,
      formatDate,
    );
    const currentPeriod = getCurrentPeriodTitle(
      billingMode,
      periodTitles,
      formatDate,
      currentTerm?.name,
    );

    if (currentPeriod && selectedPeriod !== currentPeriod) {
      setSelectedPeriod(currentPeriod);
    }
  }, [
    children,
    selectedChildId,
    selectedAcademicYear,
    curriculumType,
    currentTerm?.name,
    formatDate,
    periodTouched,
    selectedPeriod,
  ]);

  useEffect(() => {
    const currentChild = children.find((child) => child.id === selectedChildId) || children[0] || null;
    if (!currentChild || selectedPeriod === "all") {
      return;
    }

    const availablePeriods = getChildPeriodTitles(
      currentChild,
      curriculumType || "TERM",
      selectedAcademicYear,
      formatDate,
    );

    if (availablePeriods.includes(selectedPeriod)) {
      return;
    }

    const billingMode = normalizeCurriculumType(currentChild.curriculumType || curriculumType || "TERM");
    const currentPeriod = getCurrentPeriodTitle(
      billingMode,
      availablePeriods,
      formatDate,
      currentTerm?.name,
    );

    setSelectedPeriod(currentPeriod || "all");
    setPeriodTouched(false);
  }, [
    children,
    selectedChildId,
    selectedPeriod,
    selectedAcademicYear,
    curriculumType,
    currentTerm?.name,
    formatDate,
  ]);

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString()}`;
  };

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

  const getMonthlyDueDate = (periodTitle: string, academicYear?: AcademicYear) => {
    if (!academicYear?.startDate) return null;
    const startDate = new Date(academicYear.startDate);
    if (Number.isNaN(startDate.getTime())) return null;

    for (let index = 0; index < 12; index++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + index);
      const label = formatDate(monthDate).replace(/\s+\d{1,2},/, "");
      if (label === periodTitle) {
        return buildDueDateFromPeriodStart(monthDate);
      }
    }

    return null;
  };

  const getPeriodPenalty = (periodTitle: string, balance: number, billingMode: string) => {
    if (balance <= 0 || dailyPenaltyAmount <= 0) {
      return { daysLate: 0, penalty: 0, dueDate: null as Date | null };
    }

    const normalizedMode = normalizeCurriculumType(billingMode);
    let dueDate: Date | null = null;

    if (normalizedMode === "MONTHLY") {
      dueDate = getMonthlyDueDate(periodTitle, selectedAcademicYear);
    } else if (currentTerm?.startDate && currentTerm.name === periodTitle) {
      dueDate = buildDueDateFromPeriodStart(new Date(currentTerm.startDate));
    }

    if (!dueDate) return { daysLate: 0, penalty: 0, dueDate: null as Date | null };

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
      dueDate,
    };
  };

  const getStatusBadge = (status: string, balance: number) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "PARTIAL":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-0"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return balance > 0 ? (
          <Badge variant="destructive" className="border-0"><AlertCircle className="w-3 h-3 mr-1" />Unpaid</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
        );
    }
  };

  const getCleanFeeType = cleanFeeTypeName;

  if (loading || initialLoad) {
    return <FeesSkeleton />;
  }

  const activePeriodText =
    selectedPeriod === "all"
      ? t.allPeriods.replace("{period}s", `${systemPeriodLabelPlural}`)
      : selectedPeriod || currentTerm?.name || `Current ${systemPeriodLabel}`;
  const visibleChildren = selectedChild ? [selectedChild] : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <div className="px-4 py-6 md:px-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={selectedChildId}
              onValueChange={(value) => {
                setSelectedChildId(value);
                setPeriodTouched(false);
              }}
            >
              <SelectTrigger className="h-9 w-full bg-white text-sm dark:bg-slate-800 sm:w-64">
                <SelectValue placeholder={t.selectChild} />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name} · {child.className}{child.section ? ` ${child.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)]">
              {activePeriodText}
            </div>
          </div>
        </div>

        {children.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.noChildren}</h3>
            <p className="text-sm text-slate-500 mt-1">{t.noChildrenDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {visibleChildren.map((child) => {
              const fees = child.fees || {
                total: 0,
                paid: 0,
                balance: 0,
                paidPercentage: 0,
                nextDueDate: null,
                breakdown: [],
                payments: [],
              };
              const rawCurriculum = child.curriculumType || "TERM";
              const curriculumType = normalizeCurriculumType(rawCurriculum);
              const periodTitles = child.periodLabels?.length
                ? child.periodLabels
                : getInstallmentPeriodTitles(
                    curriculumType,
                    selectedAcademicYear,
                    formatDate,
                  );
              const periodLabel = PARENT_LABELS[curriculumType] || "Term";
              const visibleBreakdown = fees.breakdown.map((group) => {
                if (selectedPeriod === "all") {
                  return group;
                }

                let selectedPeriods = group.periods
                  .filter((period) => period.termName === selectedPeriod)
                  .map((period) => {
                    const paidFromHistory = getPaidAmountForSelectedPeriod(
                      fees.payments || [],
                      group.feeType,
                      selectedPeriod,
                      periodTitles,
                      formatDate,
                    );

                    if (paidFromHistory > (period.paid || 0)) {
                      const paid = Math.max(0, Math.min(period.finalAmount || 0, paidFromHistory));
                      const balance = Math.max(0, (period.finalAmount || 0) - paid);

                      return {
                        ...period,
                        paid,
                        balance,
                        status: balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
                      };
                    }

                    if (!period.isYearWide) {
                      return period;
                    }

                    return period;
                  });

                if (selectedPeriods.length === 0) {
                  const paidForSelectedPeriod = getPaidAmountForSelectedPeriod(
                    fees.payments || [],
                    group.feeType,
                    selectedPeriod,
                    periodTitles,
                    formatDate,
                  );
                  const broadPeriod = group.periods[0];

                  if (broadPeriod?.isYearWide && paidForSelectedPeriod > 0) {
                    const totalAmount = broadPeriod.finalAmount || group.totalAmount || 0;
                    const paid = Math.max(0, Math.min(totalAmount, paidForSelectedPeriod));
                    const balance = Math.max(0, totalAmount - paid);

                    selectedPeriods = [
                      {
                        ...broadPeriod,
                        termName: selectedPeriod,
                        paid,
                        balance,
                        status: balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
                      },
                    ];
                  }
                }

                const totalAmount = selectedPeriods.reduce((sum, period) => sum + period.finalAmount, 0);
                const paidAmount = selectedPeriods.reduce((sum, period) => sum + period.paid, 0);
                const balanceAmount = selectedPeriods.reduce((sum, period) => sum + period.balance, 0);

                return {
                  ...group,
                  periods: selectedPeriods,
                  totalAmount,
                  paidAmount,
                  balanceAmount,
                  status: balanceAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING",
                };
              }).filter((group) => group.periods.length > 0);
              const visibleTotals = visibleBreakdown.reduce(
                (acc, group) => {
                  const groupTotal = group.periods.reduce((sum, period) => sum + period.finalAmount, 0);
                  const groupPaid = group.periods.reduce((sum, period) => sum + period.paid, 0);
                  const groupBalance = group.periods.reduce((sum, period) => sum + period.balance, 0);
                  const groupPenalty = group.periods.reduce((sum, period) => {
                    const penalty = getPeriodPenalty(period.termName, period.balance, curriculumType).penalty;
                    return sum + penalty;
                  }, 0);
                  acc.total += groupTotal;
                  acc.paid += groupPaid;
                  acc.balance += groupBalance;
                  acc.penalty += groupPenalty;
                  return acc;
                },
                { total: 0, paid: 0, balance: 0, penalty: 0 }
              );
              const totalDueWithPenalty = visibleTotals.balance + visibleTotals.penalty;
              const visiblePaidPercentage = visibleTotals.total > 0 ? Math.round((visibleTotals.paid / visibleTotals.total) * 100) : 0;
              const periodPaymentHistory = buildPeriodPaymentHistory(
                fees.payments || [],
                fees.breakdown,
                periodTitles,
                formatDate,
                selectedPeriod === "all" ? undefined : selectedPeriod,
              );
              const visiblePaymentHistory = selectedPeriod === "all"
                ? periodPaymentHistory
                : periodPaymentHistory.filter((payment) => payment.displayPeriod === selectedPeriod);

              return (
                <div key={child.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{child.name}</h3>
                      <p className="text-sm text-slate-500">Grade {child.className} &middot; Section {child.section}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                          value={selectedYear}
                          onValueChange={(value) => {
                            setSelectedYear(value);
                            setPeriodTouched(false);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue placeholder={t.year} />
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((year) => (
                              <SelectItem key={year.id} value={year.id} className="text-xs">{year.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={selectedPeriod}
                          onValueChange={(value) => {
                            setPeriodTouched(true);
                            setSelectedPeriod(value);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue placeholder={systemPeriodLabel} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">{t.allPeriods.replace("{period}s", `${systemPeriodLabelPlural}`)}</SelectItem>
                            {periodTitles.map((title, i) => (
                              <SelectItem key={i} value={title} className="text-xs">{title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          visibleTotals.balance > 0
                            ? "bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)]"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}>
                          {visibleTotals.balance > 0 ? t.outstanding : t.fullyPaid}
                        </span>
                      </div>
                    </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.total}</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white mt-1">{formatCurrency(visibleTotals.total)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.paid}</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400 mt-1">{formatCurrency(visibleTotals.paid)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.balance}</p>
                        <p className="font-bold text-lg mt-1" style={{ color: visibleTotals.balance > 0 ? 'var(--brand-color, #e35336)' : 'var(--brand-color, #e35336)' }}>
                          {formatCurrency(visibleTotals.balance)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.penalty}</p>
                        <p className="font-bold text-lg text-red-600 dark:text-red-400 mt-1">{formatCurrency(visibleTotals.penalty)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.totalDue}</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white mt-1">{formatCurrency(totalDueWithPenalty)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                        <span>{t.paymentProgress}</span>
                        <span>{visiblePaidPercentage}%</span>
                      </div>
                      <Progress
                        value={visiblePaidPercentage}
                        className="h-2.5 bg-slate-100 dark:bg-slate-700"
                        style={{ '--progress-background': 'var(--brand-color, #e35336)' } as React.CSSProperties}
                      />
                    </div>

                    {visibleBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {visibleBreakdown.map((group, groupIdx) => {
                          const groupKey = `${child.id}-${groupIdx}`;
                          const isExpanded = expandedGroups[groupKey] ?? true;

                          return (
                            <div key={groupIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                                    style={{ backgroundColor: `rgba(var(--brand-color-rgb, 227, 83, 54), 0.1)` }}
                                  >
                                    <DollarSign className="w-4 h-4" style={{ color: 'var(--brand-color, #e35336)' }} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                      {getCleanFeeType(group.feeType)}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {formatCurrency(group.amountPerPeriod)} {t.perPeriod.replace("{period}", periodLabel)}
                                      {group.periods[0]?.isYearWide ? ` · ${t.splitAcross.replace("{count}", String(periodTitles.length)).replace("{period}s", `${periodLabel}s`)}` : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {getStatusBadge(group.status, group.balanceAmount)}
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>
                              </button>

                              {isExpanded && (
                                <>
                                  <div className="p-4 bg-white dark:bg-slate-900">
                                    <div className={`grid gap-3 ${
                                      periodTitles.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                                      periodTitles.length === 3 ? "grid-cols-1 sm:grid-cols-3" :
                                      periodTitles.length === 2 ? "grid-cols-2" :
                                      periodTitles.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4"
                                    }`}>
                                      {(selectedPeriod === "all" ? periodTitles : [selectedPeriod]).map((title, periodIdx) => {
                                        const periodData = group.periods.find((p: any) => p.termName === title) || null;
                                        const periodAmount = periodData?.finalAmount || group.amountPerPeriod || 0;
                                        const paid = periodData?.paid || 0;
                                        const balance = periodAmount - paid;
                                        const hasPayment = paid > 0;
                                        const isFullPaid = balance <= 0 && paid > 0;
                                        const periodPenalty = getPeriodPenalty(title, balance, curriculumType);

                                        return (
                                          <div
                                            key={periodIdx}
                                            className={`relative p-3.5 rounded-xl border transition-colors ${
                                              isFullPaid
                                                ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                            }`}
                                          >
                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                              {title}
                                            </div>

                                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                                              {formatCurrency(periodAmount)}
                                            </div>
                                            {periodData?.discount ? (
                                              <div className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">
                                                  {periodData.discountPercent ? `${periodData.discountPercent}%` : "Discount"}
                                                </Badge>
                                                {periodData.discountLabel || "Family discount"} -{formatCurrency(periodData.discount)}
                                              </div>
                                            ) : null}

                                            <div className="mt-2">
                                              {isFullPaid ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                                  <CheckCircle className="w-3 h-3" />
                                                  {t.fullyPaid}
                                                </span>
                                              ) : hasPayment && !isFullPaid ? (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                  {t.paid} {formatCurrency(paid)} &middot; {t.due} {formatCurrency(balance)}
                                                </span>
                                              ) : balance > 0 ? (
                                                <span className="inline-flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                  <span className="font-medium text-red-600 dark:text-red-400">{t.unpaid}</span>
                                                  <span>{t.due} {formatCurrency(balance)}</span>
                                                  {periodPenalty.penalty > 0 && (
                                                    <span className="font-medium text-red-600 dark:text-red-400">
                                                      {t.penalty} {formatCurrency(periodPenalty.penalty)} ({periodPenalty.daysLate} {t.days})
                                                    </span>
                                                  )}
                                                </span>
                                              ) : (
                                                <span className="text-xs text-slate-400">{t.noPayment}</span>
                                              )}
                                            </div>

                                            <Progress
                                              value={periodAmount > 0 ? (paid / periodAmount) * 100 : 0}
                                              className="h-1.5 mt-3 bg-slate-100 dark:bg-slate-700"
                                              style={{ '--progress-background': isFullPaid ? '#22c55e' : 'var(--brand-color, #e35336)' } as React.CSSProperties}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {t.totalPaidLabel}: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(group.paidAmount)}</span>
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {t.balance}: <span className="font-semibold" style={{ color: group.balanceAmount > 0 ? 'var(--brand-color, #e35336)' : undefined }}>
                                        {formatCurrency(group.balanceAmount)}
                                      </span>
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                          <Receipt className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.noFees}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {t.noFeesDesc.replace("{period}s", `${periodLabel}s`)}
                        </p>
                      </div>
                    )}

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.paymentHistory}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedPeriod === "all"
                              ? t.allPeriods.replace("{period}s", `${periodLabel}s`)
                              : selectedPeriod}
                          </p>
                        </div>
                        <Receipt className="w-4 h-4 text-slate-400" />
                      </div>

                      {visiblePaymentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="px-4 py-3 font-semibold">{t.receipt}</th>
                                <th className="px-4 py-3 font-semibold">{periodLabel}</th>
                                <th className="px-4 py-3 font-semibold">{t.fee}</th>
                                <th className="px-4 py-3 font-semibold">{t.method}</th>
                                <th className="px-4 py-3 font-semibold text-right">{t.amount}</th>
                                <th className="px-4 py-3 font-semibold">{t.date}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                              {visiblePaymentHistory.map((payment) => (
                                <tr key={payment.id} className="text-slate-700 dark:text-slate-200">
                                  <td className="px-4 py-3 font-mono text-xs">
                                    {payment.receiptNumber || "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className="border-slate-200 dark:border-slate-600">
                                      {payment.displayPeriod}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">{cleanFeeTypeName(payment.feeItemName)}</td>
                                  <td className="px-4 py-3">{payment.paymentMethod?.replace(/_/g, " ") || "-"}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                                    {formatCurrency(payment.displayAmount)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {payment.paidAt ? formatDate(payment.paidAt) : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center bg-white dark:bg-slate-900">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                              {t.noPayments.replace("{period}", selectedPeriod === "all" ? t.academicYear : periodLabel.toLowerCase())}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {t.noPaymentsDesc}
                            </p>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentFeesPage;
