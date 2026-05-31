"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { financeAPI, academicYearsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormattedDate } from "@/components/ui/FormattedDate";
import {
  Download, DollarSign, FileText, TriangleAlert, Users, Send, History, Clock,
  TrendingUp, Search, Filter, ChevronDown, BarChart3, PieChart,
  CheckCircle2, XCircle, AlertTriangle, Wallet, ArrowUpRight,
  Banknote, CreditCard, Calendar, MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { convertToEthiopian, formatDateByCalendarType } from "@/lib/calendar-utils";
import {
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";

interface AcademicYear {
  id: string;
  name: string;
  startDate?: string;
  isActive?: boolean;
}

interface Term {
  id: string;
  name: string;
  order?: number;
}

interface PaymentRow {
  id: string;
  receiptNumber: string;
  paymentReference?: string;
  transactionReference?: string | null;
  studentName?: string;
  grade?: string | null;
  section?: string | null;
  feeType?: string | null;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  recordedBy?: string | null;
  termId?: string | null;
  termName?: string | null;
}

interface OutstandingRow {
  studentId: string;
  studentName: string;
  grade?: string | null;
  section?: string | null;
  feeType: string;
  scopeLabel?: string | null;
  installmentIndex?: number | null;
  total: number;
  paid: number;
  remaining: number;
  status: "PAID" | "PARTIAL" | "PENDING" | "UNPAID";
}

type PayrollRunStatus = "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";

interface PayrollRunRow {
  id: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  status: PayrollRunStatus;
  grossAmount: number;
  deductionsAmount: number;
  netAmount: number;
  entryCount: number;
  paymentDate?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
}

interface SummaryState {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  totalStudentsPaid: number;
  totalStudentsPartialOrUnpaid: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(value || 0);

const toDateInputValue = (date?: Date) => {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCalendarDateSlug = (date: Date, calendarType?: string) => {
  if (calendarType === "ETHIOPIAN") {
    const eth = convertToEthiopian(date);
    return `ec-${eth.year}-${String(eth.month).padStart(2, "0")}-${String(eth.day).padStart(2, "0")}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `gc-${year}-${month}-${day}`;
};

const getOutstandingPeriodLabel = (
  row: OutstandingRow,
  academicYearStartDate?: string,
  calendarType: "ETHIOPIAN" | "GREGORIAN" = "ETHIOPIAN",
) => {
  if (row.installmentIndex == null || !academicYearStartDate) {
    return row.scopeLabel || "Whole Academic Year";
  }

  const periodDate = new Date(academicYearStartDate);
  if (Number.isNaN(periodDate.getTime())) {
    return row.scopeLabel || "Whole Academic Year";
  }

  periodDate.setMonth(periodDate.getMonth() + row.installmentIndex - 1);

  if (calendarType === "GREGORIAN") {
    return periodDate.toLocaleDateString("en-US", { month: "long" });
  }

  return convertToEthiopian(periodDate).monthName || row.scopeLabel || "Whole Academic Year";
};

const getInstallmentIndexFromFeeType = (feeType?: string | null) => {
  const match = String(feeType || "").match(/_INSTALLMENT_(\d+)$/i);
  return match ? Number(match[1]) : null;
};

const getPaymentPeriodLabel = (
  payment: PaymentRow,
  academicYearStartDate?: string,
  calendarType: "ETHIOPIAN" | "GREGORIAN" = "ETHIOPIAN",
) => {
  const installmentIndex = getInstallmentIndexFromFeeType(payment.feeType);
  if (installmentIndex == null || !academicYearStartDate) {
    return payment.termName || "Whole Academic Year";
  }

  const periodDate = new Date(academicYearStartDate);
  if (Number.isNaN(periodDate.getTime())) {
    return payment.termName || "Whole Academic Year";
  }

  periodDate.setMonth(periodDate.getMonth() + installmentIndex - 1);

  if (calendarType === "GREGORIAN") {
    return periodDate.toLocaleDateString("en-US", { month: "long" });
  }

  return convertToEthiopian(periodDate).monthName || payment.termName || "Whole Academic Year";
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const statusBadgeClasses: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  UNPAID: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  PENDING: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  OVERDUE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
};

const methodBadgeClasses: Record<string, string> = {
  CASH: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  BANK_TRANSFER: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  CHEQUE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
};

const CHART_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export default function FinanceReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedOverdueRows, setSelectedOverdueRows] = useState<string[]>([]);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [paymentSearch, setPaymentSearch] = useState("");
  const [outstandingSearch, setOutstandingSearch] = useState("");
  const [summary, setSummary] = useState<SummaryState>({
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalStudentsPaid: 0,
    totalStudentsPartialOrUnpaid: 0,
  });
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [outstandingRows, setOutstandingRows] = useState<OutstandingRow[]>([]);
  const [overdueRows, setOverdueRows] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunRow[]>([]);

  useEffect(() => {
    const loadYears = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await academicYearsAPI.getAll();
        const years = response.data || [];
        setAcademicYears(years);
        const activeYear = years.find((year: AcademicYear) => year.isActive) || years[0];
        if (activeYear) {
          setSelectedYear(activeYear.id);
        }
      } catch (error) {
        console.error("Failed to load academic years", error);
        toast.error("Failed to load finance report filters");
      }
    };

    loadYears();
  }, [user?.schoolId]);

  const loadAuditLogs = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const response = await financeAPI.getAuditLogs(
        user.schoolId,
        undefined,
        undefined,
        100,
        toDateInputValue(fromDate),
        toDateInputValue(toDate),
      );
      setAuditLogs(response.data?.data || []);
    } catch (e) {
      console.error('Failed to load audit logs');
    }
  }, [fromDate, toDate, user?.schoolId]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
    if (activeTab === 'overdue') {
      const loadOverdue = async () => {
        if (!user?.schoolId || !selectedYear) return;
        try {
          const termId = selectedTerm !== "all" ? selectedTerm : undefined;
          const response = await financeAPI.getOverdueReport(user.schoolId, selectedYear, termId);
          const overdueData = response.data;
          setOverdueRows(Array.isArray(overdueData) ? overdueData : overdueData?.rows || []);
        } catch (e) {
          console.error("Failed to load overdue report");
          setOverdueRows([]);
        }
      };
      loadOverdue();
    }
  }, [activeTab, loadAuditLogs, user?.schoolId, selectedYear, selectedTerm]);

  useEffect(() => {
    const loadTerms = async () => {
      if (!user?.schoolId || !selectedYear) return;
      try {
        const response = await financeAPI.getCurriculumInfo(user.schoolId, selectedYear);
        setTerms(response.data?.terms || []);
      } catch (error) {
        console.error("Failed to load terms", error);
        setTerms([]);
      }
    };

    loadTerms();
  }, [selectedYear, user?.schoolId]);

  const loadReports = useCallback(async () => {
    if (!user?.schoolId || !selectedYear) return;

    setLoading(true);
    try {
      const termId = selectedTerm !== "all" ? selectedTerm : undefined;
      const [summaryResponse, paymentsResponse, outstandingResponse, payrollResponse] = await Promise.all([
        financeAPI.getDailyReport({
          schoolId: user.schoolId,
          academicYearId: selectedYear,
          termId,
          from: toDateInputValue(fromDate),
          to: toDateInputValue(toDate),
        }),
        financeAPI.getAllPayments({ schoolId: user.schoolId }),
        financeAPI.getOutstandingBalances(
          user.schoolId,
          selectedYear,
          termId,
          user.calendarType,
        ),
        financeAPI.getPayrollRuns({ schoolId: user.schoolId }),
      ]);

      const summaryData = summaryResponse.data || {};
      const allPayments: PaymentRow[] = paymentsResponse.data?.payments || [];
      const paymentRows: PaymentRow[] = allPayments;
      const outstanding: OutstandingRow[] = outstandingResponse.data?.rows || [];
      const payroll: PayrollRunRow[] = payrollResponse.data?.runs || [];
      const paidStudents = Number(summaryData.paidStudents || 0);
      const partialStudents = Number(summaryData.partialStudents || 0);
      const unpaidStudents = Number(summaryData.unpaidStudents || 0);
      const totalOutstanding = Number(outstandingResponse.data?.totalOutstanding || summaryData.totalOutstanding || 0);
      const totalCollected = Number(summaryData.total || 0);

      setSummary({
        totalExpected: totalCollected + totalOutstanding,
        totalCollected,
        totalOutstanding,
        totalStudentsPaid: paidStudents,
        totalStudentsPartialOrUnpaid: partialStudents + unpaidStudents,
      });
      setPayments(
        paymentRows.filter((payment) =>
          !termId || payment.termId === termId || !payment.termId,
        ),
      );
      setOutstandingRows(outstanding);
      setPayrollRuns(payroll);
    } catch (error) {
      console.error("Failed to load finance reports", error);
      toast.error("Failed to load finance reports");
    } finally {
      setLoading(false);
    }
  }, [fromDate, selectedTerm, selectedYear, toDate, user?.calendarType, user?.schoolId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const dateFilteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const paymentDate = new Date(payment.paymentDate);
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (paymentDate < start) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (paymentDate > end) return false;
      }
      return true;
    });
  }, [fromDate, payments, toDate]);

  const filteredPayments = useMemo(() => {
    const search = paymentSearch.trim().toLowerCase();
    if (!search) return dateFilteredPayments;
    return dateFilteredPayments.filter((payment) =>
      [
        payment.transactionReference,
        payment.paymentReference || payment.receiptNumber,
        payment.studentName,
        payment.grade,
        payment.section,
        payment.feeType,
        payment.paymentMethod,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [dateFilteredPayments, paymentSearch]);

  const selectedAcademicYear = useMemo(
    () => academicYears.find((year) => year.id === selectedYear),
    [academicYears, selectedYear],
  );

  const displayedOutstanding = useMemo(() => {
    const calendarType = user?.calendarType || "ETHIOPIAN";
    return outstandingRows.map((row) => ({
      ...row,
      displayScopeLabel: getOutstandingPeriodLabel(
        row,
        selectedAcademicYear?.startDate,
        calendarType,
      ),
    }));
  }, [outstandingRows, selectedAcademicYear?.startDate, user?.calendarType]);

  const displayedPayments = useMemo(() => {
    const calendarType = user?.calendarType || "ETHIOPIAN";
    return filteredPayments.map((payment) => ({
      ...payment,
      displayPaymentDate: formatDateByCalendarType(payment.paymentDate, calendarType),
      displayPaymentPeriod: getPaymentPeriodLabel(
        payment,
        selectedAcademicYear?.startDate,
        calendarType,
      ),
    }));
  }, [filteredPayments, selectedAcademicYear?.startDate, user?.calendarType]);

  const filteredOutstanding = useMemo(() => {
    const search = outstandingSearch.trim().toLowerCase();
    if (!search) return displayedOutstanding;
    return displayedOutstanding.filter((row) =>
      [
        row.studentName,
        row.grade,
        row.section,
        row.feeType,
        row.displayScopeLabel,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [displayedOutstanding, outstandingSearch]);

  const displayedPayrollRuns = useMemo(() => {
    const calendarType = user?.calendarType || "ETHIOPIAN";
    const start = fromDate ? new Date(fromDate) : undefined;
    const end = toDate ? new Date(toDate) : undefined;
    start?.setHours(0, 0, 0, 0);
    end?.setHours(23, 59, 59, 999);

    return payrollRuns
      .filter((run) => {
        const reportDate = run.paymentDate || run.paidAt || run.createdAt;
        if (!reportDate) return !start && !end;
        const parsedDate = new Date(reportDate);
        if (Number.isNaN(parsedDate.getTime())) return false;
        if (start && parsedDate < start) return false;
        if (end && parsedDate > end) return false;
        return true;
      })
      .map((run) => ({
        ...run,
        displaySalaryMonth: new Date(run.periodYear, run.periodMonth - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        displayPaymentDate: run.paymentDate ? formatDateByCalendarType(run.paymentDate, calendarType) : "Not scheduled",
        displayPaidAt: run.paidAt ? formatDateByCalendarType(run.paidAt, calendarType) : "Not paid",
      }));
  }, [fromDate, payrollRuns, toDate, user?.calendarType]);

  const payrollReport = useMemo(() => {
    return displayedPayrollRuns.reduce(
      (totals, run) => {
        if (run.status !== "CANCELLED") {
          totals.totalGross += Number(run.grossAmount || 0);
          totals.totalDeductions += Number(run.deductionsAmount || 0);
          totals.totalNet += Number(run.netAmount || 0);
          totals.staffEntries += Number(run.entryCount || 0);
        }
        if (run.status === "PAID") {
          totals.paidNet += Number(run.netAmount || 0);
          totals.paidRuns += 1;
        }
        if (run.status === "APPROVED") {
          totals.pendingNet += Number(run.netAmount || 0);
          totals.pendingRuns += 1;
        }
        if (run.status === "DRAFT") {
          totals.draftRuns += 1;
        }
        return totals;
      },
      {
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        paidNet: 0,
        pendingNet: 0,
        staffEntries: 0,
        paidRuns: 0,
        pendingRuns: 0,
        draftRuns: 0,
      },
    );
  }, [displayedPayrollRuns]);

  const handleExport = () => {
    const calendarType = user?.calendarType || "ETHIOPIAN";
    const dateSuffix = fromDate || toDate
      ? `${fromDate ? getCalendarDateSlug(fromDate, calendarType) : "start"}_to_${toDate ? getCalendarDateSlug(toDate, calendarType) : "latest"}`
      : getCalendarDateSlug(new Date(), calendarType);
    if (activeTab === "summary") {
      downloadCsv(`finance-summary-${dateSuffix}.csv`, [
        ["Metric", "Value"],
        ["Total Expected", summary.totalExpected],
        ["Total Collected", summary.totalCollected],
        ["Total Outstanding", summary.totalOutstanding],
        ["Students Paid", summary.totalStudentsPaid],
        ["Students Partial or Unpaid", summary.totalStudentsPartialOrUnpaid],
      ]);
      return;
    }

    if (activeTab === "payments") {
      downloadCsv(`finance-payments-${dateSuffix}.csv`, [
        ["Bank Reference", "Payment Reference", "Student", "Class", "Section", "Amount Paid", "Method", "Date", "Recorded By", "Fee Period"],
        ...displayedPayments.map((payment) => [
          payment.transactionReference || "N/A",
          payment.paymentReference || payment.receiptNumber,
          payment.studentName || "N/A",
          payment.grade || "N/A",
          payment.section || "N/A",
          payment.amountPaid,
          payment.paymentMethod,
          payment.displayPaymentDate,
          payment.recordedBy || "N/A",
          payment.displayPaymentPeriod,
        ]),
      ]);
      return;
    }

    if (activeTab === "payroll") {
      downloadCsv(`finance-payroll-${dateSuffix}.csv`, [
        ["Title", "Salary Month", "Payment Date", "Paid At", "Gross", "Deductions", "Net", "Staff Entries", "Status"],
        ...displayedPayrollRuns.map((run) => [
          run.title,
          run.displaySalaryMonth,
          run.displayPaymentDate,
          run.displayPaidAt,
          run.grossAmount,
          run.deductionsAmount,
          run.netAmount,
          run.entryCount,
          run.status,
        ]),
      ]);
      return;
    }

    downloadCsv(`finance-outstanding-${dateSuffix}.csv`, [
      ["Student", "Class", "Section", "Fee Type", "Fee Period", "Total Bill", "Amount Paid", "Balance", "Status"],
      ...filteredOutstanding.map((row) => [
        row.studentName,
        row.grade || "N/A",
        row.section || "N/A",
        row.feeType,
        row.displayScopeLabel,
        row.total,
        row.paid,
        row.remaining,
        row.status,
      ]),
    ]);
  };

  const pieData = useMemo(() => [
    { name: "Collected", value: summary.totalCollected },
    { name: "Outstanding", value: summary.totalOutstanding },
  ], [summary]);

  const allSelected = useMemo(() =>
    overdueRows.filter(r => r.remaining > 0).length > 0 &&
    selectedOverdueRows.length === overdueRows.filter(r => r.remaining > 0).length,
  [overdueRows, selectedOverdueRows]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900/80">
      <div className="w-full p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-2">
            <FileText className="h-3.5 w-3.5" />
            <span>Finance / Reports</span>
          </div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Finance Reports
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Summary, payments, outstanding balances, overdue fees, and audit history.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="mb-6 border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/80">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Academic Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Academic year" />
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

              <div className="flex-1 min-w-[140px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fee Period</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Fee period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Whole academic year</SelectItem>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">From</label>
                <CalendarDatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="From date"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">To</label>
                <CalendarDatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="To date"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleExport}
                  className="h-9 bg-[var(--brand-color,#e35336)] text-white shadow-sm hover:opacity-90"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => { setFromDate(undefined); setToDate(undefined); }}
                >
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        {loading ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="overflow-hidden border-slate-200/70 dark:border-slate-700/50">
                <CardContent className="p-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-7 w-32" />
                  <Skeleton className="mt-4 h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <CardContent className="p-5">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Expected</p>
                <h3 className="text-xl font-bold mt-1">{formatCurrency(summary.totalExpected)}</h3>
                <div className="flex items-center mt-4 text-blue-100/80 text-[11px]">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Projected revenue</span>
                </div>
              </CardContent>
              <DollarSign className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10" />
            </Card>

            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-5">
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Collected</p>
                <h3 className="text-xl font-bold mt-1">{formatCurrency(summary.totalCollected)}</h3>
                <div className="flex items-center mt-4 text-emerald-100/80 text-[11px]">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  <span>Revenue received</span>
                </div>
              </CardContent>
              <FileText className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10" />
            </Card>

            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-rose-500 to-rose-600 text-white">
              <CardContent className="p-5">
                <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">Total Outstanding</p>
                <h3 className="text-xl font-bold mt-1">{formatCurrency(summary.totalOutstanding)}</h3>
                <div className="flex items-center mt-4 text-rose-100/80 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Pending collection</span>
                </div>
              </CardContent>
              <TriangleAlert className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10" />
            </Card>

            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-violet-500 to-violet-600 text-white">
              <CardContent className="p-5">
                <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">Students Paid</p>
                <h3 className="text-xl font-bold mt-1">{summary.totalStudentsPaid}</h3>
                <div className="flex items-center mt-4 text-violet-100/80 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Fully cleared</span>
                </div>
              </CardContent>
              <Users className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10" />
            </Card>

            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-5">
                <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Partial or Unpaid</p>
                <h3 className="text-xl font-bold mt-1">{summary.totalStudentsPartialOrUnpaid}</h3>
                <div className="flex items-center mt-4 text-orange-100/80 text-[11px]">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Needs follow-up</span>
                </div>
              </CardContent>
              <Users className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10" />
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-800">
            <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
              <TabsTrigger
                value="summary"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Payments</span>
              </TabsTrigger>
              <TabsTrigger
                value="outstanding"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <TriangleAlert className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Outstanding</span>
              </TabsTrigger>
              <TabsTrigger
                value="overdue"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Overdue</span>
              </TabsTrigger>
              <TabsTrigger
                value="payroll"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Payroll</span>
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Audit Logs</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3 border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Collection Overview</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Selected period billing and collection coverage</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Expected</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.totalExpected)}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/50">
                        <div className="h-full w-full rounded-full bg-blue-500" />
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Collected</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(summary.totalCollected)}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900/50">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${summary.totalExpected > 0 ? (summary.totalCollected / summary.totalExpected) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg bg-rose-50 p-4 dark:bg-rose-950/30">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">{formatCurrency(summary.totalOutstanding)}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rose-200 dark:bg-rose-900/50">
                        <div
                          className="h-full rounded-full bg-rose-500"
                          style={{ width: `${summary.totalExpected > 0 ? (summary.totalOutstanding / summary.totalExpected) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Payment Coverage</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Students with complete payments vs outstanding</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="h-[180px] w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: "Paid", value: Math.max(summary.totalStudentsPaid, 1) },
                              { name: "Partial/Unpaid", value: Math.max(summary.totalStudentsPartialOrUnpaid, 1) },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Paid</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{summary.totalStudentsPaid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/30">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <div>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Partial/Unpaid</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{summary.totalStudentsPartialOrUnpaid}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-5 border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Collection Breakdown</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Revenue composition for the selected period</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center sm:justify-start">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
                      <div className="h-[200px] w-[200px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
                              formatter={(value: number) => [formatCurrency(value)]}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {pieData.map((item, index) => (
                          <div key={item.name} className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index] }} />
                            <div>
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.name}</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</p>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-slate-400" />
                            <div>
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Collection Rate</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {summary.totalExpected > 0
                                  ? `${((summary.totalCollected / summary.totalExpected) * 100).toFixed(1)}%`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-6">
            <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
              <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Payment Report</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{displayedPayments.length} payments in view</p>
                </div>
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={paymentSearch}
                    onChange={(event) => setPaymentSearch(event.target.value)}
                    placeholder="Search payments..."
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/40">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Payment Reference</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Student</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Class</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Amount</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Method</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Date</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Recorded By</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Fee Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <FileText className="h-8 w-8 opacity-40" />
                              <p className="text-sm font-medium">No payments found</p>
                              <p className="text-xs">Try adjusting your search or filter criteria</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedPayments.map((payment) => (
                          <TableRow key={payment.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/40">
                            <TableCell className="py-3 px-4">
                              <span className="font-mono text-xs font-medium text-slate-900 dark:text-white">
                                {payment.transactionReference || payment.paymentReference || payment.receiptNumber}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{payment.studentName || "N/A"}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{payment.grade || "N/A"}{payment.section ? ` - ${payment.section}` : ""}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">{formatCurrency(payment.amountPaid)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium ${methodBadgeClasses[payment.paymentMethod] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"}`}
                              >
                                {payment.paymentMethod === "CASH" && <Banknote className="mr-1 h-3 w-3" />}
                                {payment.paymentMethod === "BANK_TRANSFER" && <CreditCard className="mr-1 h-3 w-3" />}
                                {payment.paymentMethod === "CHEQUE" && <FileText className="mr-1 h-3 w-3" />}
                                {payment.paymentMethod.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                <FormattedDate date={payment.paymentDate} />
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{payment.recordedBy || "N/A"}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge variant="outline" className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
                                {payment.displayPaymentPeriod}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outstanding Tab */}
          <TabsContent value="outstanding" className="mt-6">
            <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
              <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Outstanding Report</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{filteredOutstanding.length} balances in view</p>
                </div>
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={outstandingSearch}
                    onChange={(event) => setOutstandingSearch(event.target.value)}
                    placeholder="Search outstanding balances..."
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/40">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Student</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Class</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Fee Period</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Total Bill</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Amount Paid</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Balance</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOutstanding.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <CheckCircle2 className="h-8 w-8 opacity-40" />
                              <p className="text-sm font-medium">No outstanding balances</p>
                              <p className="text-xs">All fees have been cleared for the selected period</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOutstanding.map((row) => (
                          <TableRow
                            key={`${row.studentId}-${row.feeType}-${row.displayScopeLabel || "all"}`}
                            className={`border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/40 ${
                              row.status === "UNPAID" ? "bg-red-50/50 dark:bg-red-950/20" : ""
                            } ${row.status === "PARTIAL" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                          >
                            <TableCell className="py-3 px-4">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{row.studentName}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{row.grade || "N/A"}{row.section ? ` - ${row.section}` : ""}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge variant="outline" className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
                                {row.displayScopeLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{formatCurrency(row.total)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(row.paid)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className={`text-xs font-bold ${
                                row.remaining > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {formatCurrency(row.remaining)}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold ${statusBadgeClasses[row.status] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"}`}
                              >
                                {row.status === "PAID" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {row.status === "PARTIAL" && <AlertTriangle className="mr-1 h-3 w-3" />}
                                {row.status === "UNPAID" && <XCircle className="mr-1 h-3 w-3" />}
                                {row.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-6">
            <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
              <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Overdue Command Center</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage aged dues and send proactive reminders</p>
                </div>
                <Button
                  size="sm"
                  className="h-9 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm hover:from-orange-600 hover:to-orange-700"
                  disabled={selectedOverdueRows.length === 0 || sendingReminders}
                  onClick={() => {
                    setSendingReminders(true);
                    toast.success(`Sent ${selectedOverdueRows.length} reminders successfully!`);
                    setTimeout(() => {
                      setSendingReminders(false);
                      setSelectedOverdueRows([]);
                    }, 1000);
                  }}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {sendingReminders ? "Sending..." : `Send Reminders (${selectedOverdueRows.length})`}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/40">
                        <TableHead className="w-12 py-3 px-4">
                          <Checkbox
                            checked={overdueRows.filter(r => r.remaining > 0).length > 0 && allSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOverdueRows(overdueRows.filter(r => r.remaining > 0).map(r => r.studentId));
                              } else {
                                setSelectedOverdueRows([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Student</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Fee Type</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Amount</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Remaining</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-center">Days Overdue</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Penalty</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueRows.filter(r => r.remaining > 0).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <CheckCircle2 className="h-8 w-8 opacity-40" />
                              <p className="text-sm font-medium">No overdue fees</p>
                              <p className="text-xs">All payments are up to date for the current selection</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        overdueRows.filter(r => r.remaining > 0).map((row, idx) => (
                          <TableRow
                            key={`${row.studentId}-${idx}`}
                            className={`border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/40 ${
                              selectedOverdueRows.includes(row.studentId) ? "bg-orange-50/50 dark:bg-orange-950/20" : ""
                            }`}
                          >
                            <TableCell className="py-3 px-4">
                              <Checkbox
                                checked={selectedOverdueRows.includes(row.studentId)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOverdueRows(prev => [...prev, row.studentId]);
                                  } else {
                                    setSelectedOverdueRows(prev => prev.filter(id => id !== row.studentId));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{row.studentName}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{row.feeType}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{formatCurrency(row.total)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(row.remaining)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold ${
                                  row.daysOverdue > 30
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                                    : row.daysOverdue > 14
                                      ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                                }`}
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                {row.daysOverdue}d
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {formatCurrency(row.penaltyAccumulated || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge className="bg-red-100 text-red-700 border-none text-[11px] font-semibold dark:bg-red-950/40 dark:text-red-400">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Overdue
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="mt-6">
            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paid Payroll</p>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(payrollReport.paidNet)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{payrollReport.paidRuns} paid runs in selected dates</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Approved Pending</p>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(payrollReport.pendingNet)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{payrollReport.pendingRuns} approved runs awaiting payment</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payroll Net</p>
                    <Wallet className="h-4 w-4 text-rose-500" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(payrollReport.totalNet)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{payrollReport.staffEntries} staff entries across visible runs</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">After Paid Payroll</p>
                    <ArrowUpRight className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.totalCollected - payrollReport.paidNet)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Collected revenue minus paid salary outflow</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
              <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Payroll Report</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {displayedPayrollRuns.length} salary runs in view. Payroll is reported as a finance outflow.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Gross {formatCurrency(payrollReport.totalGross)} - Deductions {formatCurrency(payrollReport.totalDeductions)}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/40">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Run</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Salary Month</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4">Payment Date</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Gross</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Deductions</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-right">Net</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-center">Staff</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 px-4 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedPayrollRuns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <Wallet className="h-8 w-8 opacity-40" />
                              <p className="text-sm font-medium">No payroll runs found</p>
                              <p className="text-xs">Create payroll runs from Finance / Payroll, or adjust the report dates</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedPayrollRuns.map((run) => (
                          <TableRow key={run.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/40">
                            <TableCell className="py-3 px-4">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{run.title || "Payroll Run"}</span>
                              <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{run.displayPaidAt}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{run.displaySalaryMonth}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{run.displayPaymentDate}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{formatCurrency(run.grossAmount)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{formatCurrency(run.deductionsAmount)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{formatCurrency(run.netAmount)}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge variant="outline" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                <Users className="mr-1 h-3 w-3" />
                                {run.entryCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold ${statusBadgeClasses[run.status] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"}`}
                              >
                                {run.status === "PAID" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {run.status === "APPROVED" && <Clock className="mr-1 h-3 w-3" />}
                                {run.status === "DRAFT" && <FileText className="mr-1 h-3 w-3" />}
                                {run.status === "CANCELLED" && <XCircle className="mr-1 h-3 w-3" />}
                                {run.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="mt-6">
            <Card className="border-slate-200/70 shadow-sm dark:border-slate-700/50">
              <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                  <History className="h-5 w-5 text-slate-400" />
                  Financial Audit Trail
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sequential log of all financial modifications and reversals for the selected calendar dates
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <History className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No audit logs recorded</p>
                    <p className="text-xs mt-1">Financial activities will appear here as they occur</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                      >
                        <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          log.action === "REVERSED"
                            ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}>
                          {log.action === "REVERSED" ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Wallet className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {(log.entityType || "").replace(/_/g, " ")} <span className={`font-normal ${
                                log.action === "REVERSED" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}>{log.action}</span>
                            </p>
                            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                              {formatDateByCalendarType(log.createdAt, user?.calendarType || "ETHIOPIAN")}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {log.details || "Financial transaction entry"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              <Users className="mr-1 h-3 w-3" />
                              {log.performedBy || "System"}
                            </Badge>
                            {log.amount && (
                              <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                <DollarSign className="mr-1 h-3 w-3" />
                                {formatCurrency(log.amount)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
