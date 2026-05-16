"use client";

import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, Receipt, Calendar, Clock, Wallet, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { parentsAPI } from "@/lib/api/people";
import { financeAPI } from "@/lib/api/finance";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcademicYear, useAcademicYear } from "@/context/AcademicYearContext";

interface PeriodItem {
  feeId: string;
  feeType: string;
  amount: number;
  discount: number;
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
  return feeType.replace(/_ANNUAL$/, "").replace(/_/g, " ");
};

const buildPeriodPaymentHistory = (
  payments: PaymentHistoryItem[],
  breakdown: FeeGroup[],
  periodTitles: string[],
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

    rows.push({
      ...payment,
      displayAmount: payment.amount,
      displayPeriod: payment.termName || "Current Period",
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
  const { currentAcademicYear, currentTerm, getAllAcademicYears, curriculumType, periodLabel, periodLabelPlural } = useAcademicYear();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [periodTouched, setPeriodTouched] = useState(false);

  const periodTitles = getPeriodTitles(normalizeCurriculumType(curriculumType || "SEMESTER"));
  const systemPeriodLabel = PARENT_LABELS[normalizeCurriculumType(curriculumType || "SEMESTER")] || periodLabel;

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
                const feesRes = await financeAPI.getStudentFees(childId, schoolId, effectiveYearId);
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
            const childPeriodTitles = (curriculumInfo?.terms?.length
              ? curriculumInfo.terms.map((term: any) => term.name)
              : getPeriodTitles(childCurriculumType));
            const childPeriodCount = childPeriodTitles.length || getPeriodCount(childCurriculumType);
            const feeItems = Array.isArray(feeSummary?.feeItems) ? feeSummary.feeItems : [];
            const paymentItems = Array.isArray(feeSummary?.payments) ? feeSummary.payments : [];

            const groupedFees = new Map<string, FeeGroup>();
            feeItems.forEach((fee: any) => {
              const groupKey = `${fee.name}|${fee.isYearWide ? "year" : fee.termName || fee.termId || "single"}`;
              if (!groupedFees.has(groupKey)) {
                groupedFees.set(groupKey, {
                  feeType: fee.name,
                  periodLabel: PARENT_LABELS[childCurriculumType] || "Term",
                  periodCount: fee.isYearWide ? childPeriodCount : 1,
                  amountPerPeriod: fee.isYearWide
                    ? Math.round(((fee.amount || 0) / Math.max(childPeriodCount, 1)) * 100) / 100
                    : (fee.amount || 0),
                  periods: [],
                  totalAmount: 0,
                  paidAmount: 0,
                  balanceAmount: 0,
                  status: "PENDING",
                });
              }

              const group = groupedFees.get(groupKey)!;

              if (fee.isYearWide) {
                const periodPayments = new Map<string, number>();
                paymentItems
                  .filter((payment: any) => payment.isYearWide && payment.feeItemName === fee.name)
                  .forEach((payment: any) => {
                    const key = payment.termName || "";
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
                    amount: group.amountPerPeriod,
                    discount: 0,
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
                  feeType: fee.name,
                  amount: fee.amount || 0,
                  discount: 0,
                  finalAmount: fee.amount || 0,
                  paid: fee.paidAmount || 0,
                  balance: fee.balance || 0,
                  status: fee.status || "PENDING",
                  termId: fee.termId || null,
                  termName: fee.termName || "Current Period",
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
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchData();
  }, [getAllAcademicYears, currentAcademicYear, curriculumType, selectedYear]);

  // Set default period to current term
  useEffect(() => {
    if (periodTouched || !currentTerm?.name) {
      return;
    }

    const availablePeriods =
      children.find((child) => child.periodLabels?.length)?.periodLabels ||
      periodTitles;
    const match = availablePeriods.find((title) =>
      title.toLowerCase().includes(currentTerm.name.toLowerCase()),
    );

    if (match && selectedPeriod !== match) {
      setSelectedPeriod(match);
    }
  }, [children, currentTerm, periodTitles, periodTouched, selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString()}`;
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
      ? `All ${systemPeriodLabel}s`
      : selectedPeriod || currentTerm?.name || `Current ${systemPeriodLabel}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <div className="px-4 py-6 md:px-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Information</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View tuition fees split by curriculum periods</p>
          </div>
          <div className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)]">
            {activePeriodText}
          </div>
        </div>

        {children.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Children Found</h3>
            <p className="text-sm text-slate-500 mt-1">No children are linked to your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {children.map((child) => {
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
                : getPeriodTitles(curriculumType);
              const periodLabel = PARENT_LABELS[curriculumType] || "Term";
              const visibleBreakdown = fees.breakdown.map((group) => {
                if (selectedPeriod === "all") {
                  return group;
                }

                const selectedPeriods = group.periods
                  .filter((period) => period.termName === selectedPeriod)
                  .map((period) => {
                    if (!period.isYearWide) {
                      return period;
                    }

                    return period;
                  });

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
                  acc.total += groupTotal;
                  acc.paid += groupPaid;
                  acc.balance += groupBalance;
                  return acc;
                },
                { total: 0, paid: 0, balance: 0 }
              );
              const visiblePaidPercentage = visibleTotals.total > 0 ? Math.round((visibleTotals.paid / visibleTotals.total) * 100) : 0;
              const periodPaymentHistory = buildPeriodPaymentHistory(
                fees.payments || [],
                fees.breakdown,
                periodTitles,
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
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue placeholder="Year" />
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
                            <SelectItem value="all" className="text-xs">All {systemPeriodLabel}s</SelectItem>
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
                          {visibleTotals.balance > 0 ? "Outstanding" : "Fully Paid"}
                        </span>
                      </div>
                    </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white mt-1">{formatCurrency(visibleTotals.total)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400 mt-1">{formatCurrency(visibleTotals.paid)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Balance</p>
                        <p className="font-bold text-lg mt-1" style={{ color: visibleTotals.balance > 0 ? 'var(--brand-color, #e35336)' : 'var(--brand-color, #e35336)' }}>
                          {formatCurrency(visibleTotals.balance)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid %</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white mt-1">{visiblePaidPercentage}%</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                        <span>Payment Progress</span>
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
                                      {formatCurrency(group.amountPerPeriod)} / {periodLabel}
                                      {group.periods[0]?.isYearWide ? ` · split across ${periodTitles.length} ${periodLabel}s` : ""}
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

                                            <div className="mt-2">
                                              {isFullPaid ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                                  <CheckCircle className="w-3 h-3" />
                                                  Fully Paid
                                                </span>
                                              ) : hasPayment && !isFullPaid ? (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                  Paid {formatCurrency(paid)} &middot; Due {formatCurrency(balance)}
                                                </span>
                                              ) : balance > 0 ? (
                                                <span className="inline-flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                  <span className="font-medium text-red-600 dark:text-red-400">Unpaid</span>
                                                  <span>Due {formatCurrency(balance)}</span>
                                                </span>
                                              ) : (
                                                <span className="text-xs text-slate-400">No payment</span>
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
                                      Total Paid: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(group.paidAmount)}</span>
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      Balance: <span className="font-semibold" style={{ color: group.balanceAmount > 0 ? 'var(--brand-color, #e35336)' : undefined }}>
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
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No fees generated yet</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          The school will generate tuition fees split by {periodLabel}s.
                        </p>
                      </div>
                    )}

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Payment History</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedPeriod === "all"
                              ? `All ${periodLabel}s`
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
                                <th className="px-4 py-3 font-semibold">Receipt</th>
                                <th className="px-4 py-3 font-semibold">{periodLabel}</th>
                                <th className="px-4 py-3 font-semibold">Fee</th>
                                <th className="px-4 py-3 font-semibold">Method</th>
                                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                <th className="px-4 py-3 font-semibold">Date</th>
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
                                    {payment.paidAt
                                      ? new Date(payment.paidAt).toLocaleDateString()
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center bg-white dark:bg-slate-900">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            No payments found for this {selectedPeriod === "all" ? "academic year" : periodLabel.toLowerCase()}.
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Payments will appear here after finance records them.
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
