"use client";

import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, Receipt, Calendar, Clock, Wallet } from "lucide-react";
import api from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

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

interface ChildFees {
  total: number;
  paid: number;
  balance: number;
  paidPercentage: number;
  nextDueDate: string | null;
  breakdown: FeeGroup[];
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
  QUARTER: "Quarter",
  SEMESTER: "Semester",
  TERM: "Term",
  MONTH: "Month",
  YEAR: "Full Year",
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
    QUARTER: 4,
    SEMESTER: 2,
    TERM: 3,
    MONTH: 12,
    YEAR: 1,
  };
  return counts[curriculumType] || 3;
};

const ParentFeesPage = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const FeesSkeleton = () => (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await api.get("/parents/me/children");
        if (response.status === 200) {
          const childrenData = response.data.children || response.data || [];
          const childrenWithFees = childrenData.map((child: any) => ({
            ...child,
            name: child.name || "Unknown",
            className: child.className || child.student?.className || "N/A",
            section: child.section || child.student?.section || "N/A",
            fees: child.fees || {
              total: 0,
              paid: 0,
              balance: 0,
              paidPercentage: 0,
              nextDueDate: null,
              breakdown: [],
            },
          }));
          setChildren(childrenWithFees);
        }
      } catch (error) {
        console.error("Failed to fetch children:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchChildren();
  }, []);

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string, balance: number) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "PARTIAL":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return balance > 0 ? (
          <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Unpaid</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
        );
    }
  };

  const getCleanFeeType = (feeType: string) => {
    return feeType.replace(/_ANNUAL$/, "").replace(/_/g, " ");
  };

  if (loading || initialLoad) {
    return <FeesSkeleton />;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e35336]">Fee Information</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View annual tuition fees split by curriculum periods</p>
        </div>

        {children.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="py-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Children Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                No children are linked to your account.
              </p>
            </CardContent>
          </Card>
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
              };
              const rawCurriculum = child.curriculumType || "TERM";
              const curriculumType = normalizeCurriculumType(rawCurriculum);
              console.log('curriculumType:', rawCurriculum, '->', curriculumType);
              const periodTitles = getPeriodTitles(curriculumType);
              const periodLabel = PARENT_LABELS[curriculumType] || "Term";

              return (
                <Card key={child.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-slate-900 dark:text-white">{child.name}</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                          Grade {child.className} - Section {child.section}
                        </CardDescription>
                      </div>
                      <Badge variant={fees.balance > 0 ? "destructive" : "default"} className="text-sm">
                        {fees.balance > 0 ? "Outstanding" : "Fully Paid"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Annual Total</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(fees.total)}</p>
                      </div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatCurrency(fees.paid)}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatCurrency(fees.balance)}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {fees.paidPercentage}%
                        </p>
                      </div>
                    </div>

                    <Progress value={fees.paidPercentage} className="h-2" />

                    {fees.breakdown.length > 0 ? (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Annual Tuition - {periodTitles.length} {periodLabel}s
                          </span>
                        </div>

                        <div className="space-y-4">
                          {fees.breakdown.map((group, groupIdx) => (
                            <div key={groupIdx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Wallet className="w-4 h-4 text-slate-500" />
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {getCleanFeeType(group.feeType)} - Annual ({formatCurrency(group.totalAmount)})
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    ({formatCurrency(group.amountPerPeriod)}/{periodLabel})
                                  </span>
                                </div>
                                {getStatusBadge(group.status, group.balanceAmount)}
                              </div>

                              <div className="p-3 bg-white dark:bg-slate-800">
                                <div className={`grid gap-3 ${
                                  periodTitles.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                                  periodTitles.length === 3 ? "grid-cols-3" :
                                  periodTitles.length === 2 ? "grid-cols-2" :
                                  periodTitles.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4"
                                }`}>
                                  {periodTitles.map((title, periodIdx) => {
                                    const periodData = group.periods.find((p: any, i: number) => {
                                      const pNum = parseInt(p.termName?.replace(/\D/g, '') || '') || (i + 1);
                                      return pNum === periodIdx + 1;
                                    }) || null;
                                    const periodAmount = group.amountPerPeriod || 0;
                                    const paid = periodData?.paid || 0;
                                    const balance = periodAmount - paid;
                                    const hasPayment = paid > 0;
                                    const isFullPaid = balance <= 0 && paid > 0;
                                    
                                    return (
                                      <div
                                        key={periodIdx}
                                        className="relative p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                      >
                                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                          {title}
                                        </div>
                                        
                                        <div className="text-base font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(periodAmount)}
                                        </div>
                                        
                                        {isFullPaid ? (
                                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            Paid
                                          </div>
                                        ) : hasPayment && !isFullPaid ? (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Paid: {formatCurrency(paid)} | Due: {formatCurrency(balance)}
                                          </div>
                                        ) : balance > 0 ? (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Due: {formatCurrency(balance)}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Due
                                          </div>
                                        )}
                                        
                                        <Progress
                                          value={periodAmount > 0 ? (paid / periodAmount) * 100 : 0}
                                          className="h-1.5 mt-2"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Total Paid: {formatCurrency(group.paidAmount)}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Balance: {formatCurrency(group.balanceAmount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                        <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-300">
                          No tuition fees generated yet.
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          The school will generate annual tuition fees split by {periodLabel}s.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentFeesPage;