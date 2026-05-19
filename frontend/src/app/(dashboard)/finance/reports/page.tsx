"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { financeAPI, academicYearsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { Download, DollarSign, Receipt, TriangleAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { convertToEthiopian, formatDateByCalendarType } from "@/lib/calendar-utils";

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

export default function FinanceReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
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
      const [summaryResponse, paymentsResponse, outstandingResponse] = await Promise.all([
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
      ]);

      const summaryData = summaryResponse.data || {};
      const allPayments: PaymentRow[] = paymentsResponse.data?.payments || [];
      const paymentRows: PaymentRow[] = allPayments;
      const outstanding: OutstandingRow[] = outstandingResponse.data?.rows || [];
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
        payment.receiptNumber,
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
        ["Receipt", "Student", "Class", "Section", "Amount Paid", "Method", "Date", "Recorded By", "Fee Period"],
        ...displayedPayments.map((payment) => [
          payment.receiptNumber,
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

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden p-4 md:p-6">
      <div className="w-full">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">
                Finance Reports
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Lean reports for summary, payments, and outstanding balances.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[220px]">
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

              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-full sm:w-[220px]">
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

              <CalendarDatePicker
                value={fromDate}
                onChange={setFromDate}
                placeholder="From date"
                className="w-full sm:w-[220px]"
              />

              <CalendarDatePicker
                value={toDate}
                onChange={setToDate}
                placeholder="To date"
                className="w-full sm:w-[220px]"
              />

              <Button onClick={handleExport} className="bg-[var(--brand-color,#e35336)] text-white hover:opacity-90">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Expected</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-lg font-semibold">{formatCurrency(summary.totalExpected)}</div>
                <DollarSign className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Collected</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-lg font-semibold text-emerald-600">{formatCurrency(summary.totalCollected)}</div>
                <Receipt className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-lg font-semibold text-rose-600">{formatCurrency(summary.totalOutstanding)}</div>
                <TriangleAlert className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Students Paid</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-lg font-semibold">{summary.totalStudentsPaid}</div>
                <Users className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Partial or Unpaid</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-lg font-semibold">{summary.totalStudentsPartialOrUnpaid}</div>
                <TriangleAlert className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full min-w-0 max-w-full">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0 md:grid md:w-full md:grid-cols-3">
              <TabsTrigger
                value="summary"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <span>Payments</span>
              </TabsTrigger>
              <TabsTrigger
                value="outstanding"
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >
                <span>Outstanding</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="mt-6 min-w-0 max-w-full">
            <Card>
              <CardHeader>
                <CardTitle>Collection Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500">Total expected billing for the selected period</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(summary.totalExpected)}</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500">Total collected</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalCollected)}</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500">Outstanding balance</p>
                  <p className="mt-2 text-2xl font-bold text-rose-600">{formatCurrency(summary.totalOutstanding)}</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-500">Payment coverage</p>
                  <p className="mt-2 text-2xl font-bold">
                    {summary.totalStudentsPaid} paid / {summary.totalStudentsPartialOrUnpaid} partial or unpaid
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6 min-w-0 max-w-full">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Payment Report</CardTitle>
                <Input
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder="Search payments"
                  className="w-full sm:w-[280px]"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Fee Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-slate-500">
                            No payments found for the selected filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.receiptNumber}</TableCell>
                            <TableCell>{payment.studentName || "N/A"}</TableCell>
                            <TableCell>{payment.grade || "N/A"}</TableCell>
                            <TableCell>{formatCurrency(payment.amountPaid)}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell><FormattedDate date={payment.paymentDate} /></TableCell>
                            <TableCell>{payment.recordedBy || "N/A"}</TableCell>
                            <TableCell>{payment.displayPaymentPeriod}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outstanding" className="mt-6 min-w-0 max-w-full">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Outstanding Report</CardTitle>
                <Input
                  value={outstandingSearch}
                  onChange={(event) => setOutstandingSearch(event.target.value)}
                  placeholder="Search outstanding balances"
                  className="w-full sm:w-[280px]"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Fee Period</TableHead>
                        <TableHead>Total Bill</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOutstanding.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-500">
                            No outstanding balances found for the selected filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOutstanding.map((row) => (
                          <TableRow key={`${row.studentId}-${row.feeType}-${row.displayScopeLabel || "all"}`}>
                            <TableCell className="font-medium">{row.studentName}</TableCell>
                            <TableCell>{row.grade || "N/A"}{row.section ? ` - ${row.section}` : ""}</TableCell>
                            <TableCell>{row.displayScopeLabel}</TableCell>
                            <TableCell>{formatCurrency(row.total)}</TableCell>
                            <TableCell>{formatCurrency(row.paid)}</TableCell>
                            <TableCell className="text-rose-600">{formatCurrency(row.remaining)}</TableCell>
                            <TableCell>
                              <Badge variant={row.status === "PAID" ? "default" : "secondary"}>
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
        </Tabs>
      </div>
    </div>
  );
}
