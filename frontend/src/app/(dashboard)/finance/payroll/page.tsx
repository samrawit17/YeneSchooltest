"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAPI } from "@/lib/api";
import { hasPermission, useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  convertToEthiopian,
  formatDateByCalendarType,
  getLocalizedEthiopianMonthName,
  type CalendarType,
} from "@/lib/calendar-utils";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type PayrollStatus = "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";
type EntryStatus = "PENDING" | "APPROVED" | "PAID" | "HELD";

interface StaffSalary {
  id: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  bankName?: string | null;
  bankAccount?: string | null;
  tinNumber?: string | null;
  isActive: boolean;
  notes?: string | null;
}

interface PayrollStaff {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  employeeId?: string | null;
  designation?: string | null;
  department?: string | null;
  salary?: StaffSalary | null;
}

interface PayrollRun {
  id: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  periodCalendarType?: CalendarType | null;
  status: PayrollStatus;
  grossAmount: number;
  deductionsAmount: number;
  netAmount: number;
  entryCount: number;
  paymentDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

interface PayrollEntry {
  id: string;
  staffUserId: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  tax: number;
  grossPay: number;
  netPay: number;
  status: EntryStatus;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  staffUser: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    teacherProfile?: {
      employeeId?: string | null;
      designation?: string | null;
      department?: { name: string } | null;
    } | null;
    financeProfile?: {
      employeeId?: string | null;
      department?: { name: string } | null;
    } | null;
  };
}

interface PayrollRunDetail extends PayrollRun {
  entries: PayrollEntry[];
}

const statusTone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  PENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  HELD: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function PayrollPage() {
  const { user, isLoading: authLoading } = useAuth();
  const schoolId = user?.schoolId || "";
  const canReadPayroll = hasPermission(user, "finance:payroll:read");
  const activeCalendarType: CalendarType = user?.calendarType === "GREGORIAN" ? "GREGORIAN" : "ETHIOPIAN";
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [staff, setStaff] = useState<PayrollStaff[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedRun, setSelectedRun] = useState<PayrollRunDetail | null>(null);
  const [search, setSearch] = useState("");
  const [salaryMonthDate, setSalaryMonthDate] = useState<Date>(now);
  const [paymentDate, setPaymentDate] = useState<Date>(now);
  const [salaryForm, setSalaryForm] = useState({
    staffUserId: "",
    baseSalary: "",
    allowances: "0",
    deductions: "0",
    bankName: "",
    bankAccount: "",
    tinNumber: "",
    notes: "",
  });
  const [runForm, setRunForm] = useState({
    title: "",
    notes: "",
  });

  const loadPayroll = useCallback(async () => {
    if (!schoolId || !canReadPayroll) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const [staffRes, runsRes] = await Promise.all([
        financeAPI.getPayrollStaff(schoolId),
        financeAPI.getPayrollRuns({ schoolId }),
      ]);
      const nextStaff = staffRes.data?.data || [];
      const nextRuns = runsRes.data?.runs || [];
      setStaff(nextStaff);
      setRuns(nextRuns);
      if (nextRuns.length === 0) {
        setSelectedRunId("");
      } else if (!selectedRunId || !nextRuns.some((run: PayrollRun) => run.id === selectedRunId)) {
        setSelectedRunId(nextRuns[0].id);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load payroll";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [canReadPayroll, schoolId, selectedRunId]);

  const loadRunDetail = useCallback(async () => {
    if (!schoolId || !canReadPayroll || !selectedRunId) {
      setSelectedRun(null);
      return;
    }
    try {
      const response = await financeAPI.getPayrollRun(selectedRunId, schoolId);
      setSelectedRun(response.data?.data || null);
    } catch {
      setSelectedRun(null);
      toast.error("Failed to load payroll run");
    }
  }, [canReadPayroll, schoolId, selectedRunId]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    loadRunDetail();
  }, [loadRunDetail]);

  const selectedStaff = useMemo(
    () => staff.find((item) => item.id === salaryForm.staffUserId),
    [salaryForm.staffUserId, staff],
  );

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter((item) =>
      [item.name, item.email, item.role, item.employeeId, item.department]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [search, staff]);

  const activeSalaryCount = staff.filter((item) => item.salary?.isActive).length;
  const currentNet = runs.find((run) => run.status !== "CANCELLED")?.netAmount || 0;
  const monthKey = (date: Date) => {
    if (activeCalendarType === "ETHIOPIAN") {
      const ethiopian = convertToEthiopian(date);
      return `${ethiopian.year}-${ethiopian.month}`;
    }
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  };
  const currentMonthKey = monthKey(now);
  const paidThisMonth = runs
    .filter((run) => {
      if (run.status !== "PAID") return false;
      const paidDate = run.paymentDate || run.paidAt;
      if (!paidDate) return false;
      const date = new Date(paidDate);
      return monthKey(date) === currentMonthKey;
    })
    .reduce((total, run) => total + Number(run.netAmount || 0), 0);

  const getPayrollPeriodPayload = (date: Date) => {
    if (activeCalendarType === "ETHIOPIAN") {
      const ethiopian = convertToEthiopian(date);
      return { periodMonth: ethiopian.month, periodYear: ethiopian.year };
    }

    return { periodMonth: date.getMonth() + 1, periodYear: date.getFullYear() };
  };

  const formatPayrollPeriod = (run: Pick<PayrollRun, "periodMonth" | "periodYear" | "periodCalendarType">) => {
    if (run.periodCalendarType === "ETHIOPIAN") {
      return `${getLocalizedEthiopianMonthName(run.periodMonth)} ${run.periodYear} E.C.`;
    }

    return new Date(run.periodYear, run.periodMonth - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatPayrollDate = (date?: string | null) =>
    date ? formatDateByCalendarType(date, activeCalendarType) : "-";

  const getRunTitle = (run: Pick<PayrollRun, "title" | "periodMonth" | "periodYear" | "periodCalendarType">) => {
    const generatedTitlePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s+Payroll$/;
    if (!run.title || (run.periodCalendarType === "ETHIOPIAN" && generatedTitlePattern.test(run.title))) {
      return `${formatPayrollPeriod(run)} Payroll`;
    }
    return run.title;
  };

  const fillSalaryForm = (staffId: string) => {
    const item = staff.find((row) => row.id === staffId);
    const salary = item?.salary;
    setSalaryForm({
      staffUserId: staffId,
      baseSalary: salary?.baseSalary ? String(salary.baseSalary) : "",
      allowances: salary?.allowances ? String(salary.allowances) : "0",
      deductions: salary?.deductions ? String(salary.deductions) : "0",
      bankName: salary?.bankName || "",
      bankAccount: salary?.bankAccount || "",
      tinNumber: salary?.tinNumber || "",
      notes: salary?.notes || "",
    });
  };

  const saveSalary = async () => {
    if (!schoolId || !salaryForm.staffUserId || !salaryForm.baseSalary) {
      toast.error("Select staff and enter base salary");
      return;
    }
    const baseSalary = Number(salaryForm.baseSalary);
    const allowances = Number(salaryForm.allowances || 0);
    const deductions = Number(salaryForm.deductions || 0);
    if (![baseSalary, allowances, deductions].every(Number.isFinite) || baseSalary <= 0 || allowances < 0 || deductions < 0) {
      toast.error("Salary amounts must be valid non-negative numbers");
      return;
    }
    setSaving(true);
    try {
      await financeAPI.upsertPayrollSalary({
        schoolId,
        staffUserId: salaryForm.staffUserId,
        baseSalary,
        allowances,
        deductions,
        bankName: salaryForm.bankName || undefined,
        bankAccount: salaryForm.bankAccount || undefined,
        tinNumber: salaryForm.tinNumber || undefined,
        notes: salaryForm.notes || undefined,
        isActive: true,
      });
      toast.success("Salary saved");
      await loadPayroll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save salary");
    } finally {
      setSaving(false);
    }
  };

  const createRun = async () => {
    if (!schoolId) return;
    const period = getPayrollPeriodPayload(salaryMonthDate);
    setSaving(true);
    try {
      const response = await financeAPI.createPayrollRun({
        schoolId,
        ...period,
        paymentDate: paymentDate.toISOString(),
        title: runForm.title || undefined,
        notes: runForm.notes || undefined,
      });
      const run = response.data?.data;
      toast.success("Payroll run created");
      await loadPayroll();
      if (run?.id) setSelectedRunId(run.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create payroll run");
    } finally {
      setSaving(false);
    }
  };

  const updateRunStatus = async (status: PayrollStatus) => {
    if (!schoolId || !selectedRunId) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof financeAPI.updatePayrollRunStatus>[1] = {
        schoolId,
        status,
      };
      if (status === "PAID") payload.paymentDate = paymentDate.toISOString();
      await financeAPI.updatePayrollRunStatus(selectedRunId, payload);
      toast.success(`Payroll marked ${status.toLowerCase()}`);
      await Promise.all([loadPayroll(), loadRunDetail()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update payroll");
    } finally {
      setSaving(false);
    }
  };

  const updateEntryStatus = async (entryId: string, status: EntryStatus) => {
    if (!schoolId) return;
    setSaving(true);
    try {
      await financeAPI.updatePayrollEntryStatus(entryId, { schoolId, status });
      toast.success(`Entry marked ${status.toLowerCase()}`);
      await Promise.all([loadPayroll(), loadRunDetail()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  const exportSelectedRun = () => {
    if (!selectedRun?.entries?.length) {
      toast.error("No payroll entries to export");
      return;
    }
    downloadCsv(`payroll-${selectedRun.periodYear}-${selectedRun.periodMonth}.csv`, selectedRun.entries.map((entry) => ({
      staff: entry.staffUser.name,
      role: entry.staffUser.role,
      baseSalary: entry.baseSalary,
      allowances: entry.allowances,
      deductions: entry.deductions,
      grossPay: entry.grossPay,
      netPay: entry.netPay,
      status: entry.status,
      transactionReference: entry.transactionReference || "",
    })));
  };

  const canApproveRun = selectedRun?.status === "DRAFT";
  const canMarkRunPaid = selectedRun?.status === "APPROVED";
  const canHoldEntries = selectedRun?.status === "DRAFT" || selectedRun?.status === "APPROVED";
  const canPayEntries = selectedRun?.status === "APPROVED";

  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!canReadPayroll) {
    return <AccessDenied type="403" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">Manage staff salaries and monthly payroll runs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSelectedRun} disabled={!selectedRun}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={createRun} disabled={saving || activeSalaryCount === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Run
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Active Salaries
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeSalaryCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{runs.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Banknote className="h-4 w-4 text-amber-600" />
              Current Payroll Net
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{money(currentNet)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{money(paidThisMonth)}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
            <TabsTrigger
              value="runs"
              className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
            >
              Runs
            </TabsTrigger>
            <TabsTrigger
              value="salaries"
              className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
            >
              Salaries
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Monthly Run</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Label>Salary Month</Label>
                <CalendarDatePicker
                  value={salaryMonthDate}
                  onChange={(date) => {
                    if (date) setSalaryMonthDate(date);
                  }}
                  placeholder="Select salary month"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Payment Date</Label>
                <CalendarDatePicker
                  value={paymentDate}
                  onChange={(date) => {
                    if (date) setPaymentDate(date);
                  }}
                  placeholder="Select payment date"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Title</Label>
                <Input value={runForm.title} placeholder="Optional" onChange={(event) => setRunForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Input value={runForm.notes} placeholder="Optional" onChange={(event) => setRunForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payroll Runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {runs.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No payroll runs yet. Create a salary setup first, then create the monthly run.
                  </div>
                ) : runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${selectedRunId === run.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{getRunTitle(run)}</span>
                      <Badge className={statusTone[run.status]}>{run.status}</Badge>
                    </div>
                      <div className="mt-1 text-sm text-muted-foreground">{formatPayrollPeriod(run)} · {run.entryCount} entries · {money(run.netAmount)}</div>
                      {run.paymentDate ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Payment date: {formatPayrollDate(run.paymentDate)}
                        </div>
                      ) : null}
                    </button>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">{selectedRun ? getRunTitle(selectedRun) : "Payroll Details"}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateRunStatus("APPROVED")} disabled={!canApproveRun || saving}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" onClick={() => updateRunStatus("PAID")} disabled={!canMarkRunPaid || saving}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Paid
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedRun ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Gross</div><div className="font-semibold">{money(selectedRun.grossAmount)}</div></div>
                      <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Deductions</div><div className="font-semibold">{money(selectedRun.deductionsAmount)}</div></div>
                      <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Net</div><div className="font-semibold">{money(selectedRun.netAmount)}</div></div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Payment Date</div>
                        <div className="font-semibold">{formatPayrollDate(selectedRun.paymentDate)}</div>
                      </div>
                      <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Salary Month</div><div className="font-semibold">{formatPayrollPeriod(selectedRun)}</div></div>
                      <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Status</div><Badge className={statusTone[selectedRun.status]}>{selectedRun.status}</Badge></div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead>Gross</TableHead>
                            <TableHead>Deductions</TableHead>
                            <TableHead>Net</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRun.entries.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                No payroll entries were generated for this run.
                              </TableCell>
                            </TableRow>
                          ) : selectedRun.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <div className="font-medium">{entry.staffUser.name}</div>
                                <div className="text-xs text-muted-foreground">{entry.staffUser.role}</div>
                              </TableCell>
                              <TableCell>{money(entry.grossPay)}</TableCell>
                              <TableCell>{money(entry.deductions + entry.tax)}</TableCell>
                              <TableCell>{money(entry.netPay)}</TableCell>
                              <TableCell><Badge className={statusTone[entry.status]}>{entry.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => updateEntryStatus(entry.id, "HELD")} disabled={saving || !canHoldEntries || entry.status === "PAID" || entry.status === "HELD"}>Hold</Button>
                                  <Button size="sm" onClick={() => updateEntryStatus(entry.id, "PAID")} disabled={saving || !canPayEntries || entry.status === "PAID" || entry.status === "HELD"}>Paid</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a payroll run to view details.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="salaries" className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salary Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Staff</Label>
                <Select value={salaryForm.staffUserId} onValueChange={fillSalaryForm}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Base Salary</Label>
                  <Input type="number" min="0" step="0.01" value={salaryForm.baseSalary} onChange={(event) => setSalaryForm((prev) => ({ ...prev, baseSalary: event.target.value }))} />
                </div>
                <div>
                  <Label>Allowances</Label>
                  <Input type="number" min="0" step="0.01" value={salaryForm.allowances} onChange={(event) => setSalaryForm((prev) => ({ ...prev, allowances: event.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Deductions</Label>
                  <Input type="number" min="0" step="0.01" value={salaryForm.deductions} onChange={(event) => setSalaryForm((prev) => ({ ...prev, deductions: event.target.value }))} />
                </div>
                <div>
                  <Label>TIN</Label>
                  <Input value={salaryForm.tinNumber} onChange={(event) => setSalaryForm((prev) => ({ ...prev, tinNumber: event.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={salaryForm.bankName} onChange={(event) => setSalaryForm((prev) => ({ ...prev, bankName: event.target.value }))} />
              </div>
              <div>
                <Label>Bank Account</Label>
                <Input value={salaryForm.bankAccount} onChange={(event) => setSalaryForm((prev) => ({ ...prev, bankAccount: event.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={salaryForm.notes} onChange={(event) => setSalaryForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
              {selectedStaff && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  {selectedStaff.department || "No department"} · {selectedStaff.designation || selectedStaff.role}
                </div>
              )}
              <Button className="w-full" onClick={saveSalary} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Salary
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Staff Payroll Setup</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Net Setup</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        {staff.length === 0 ? "No eligible payroll staff found for this school." : "No staff match this search."}
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.map((item) => {
                    const netSetup = (item.salary?.baseSalary || 0) + (item.salary?.allowances || 0) - (item.salary?.deductions || 0);
                    return (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => fillSalaryForm(item.id)}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.employeeId || item.email || "No employee ID"}</div>
                        </TableCell>
                        <TableCell>{item.role}</TableCell>
                        <TableCell>{item.department || "-"}</TableCell>
                        <TableCell>{item.salary ? money(item.salary.baseSalary) : "-"}</TableCell>
                        <TableCell>{item.salary ? money(netSetup) : "-"}</TableCell>
                        <TableCell>
                          {item.salary?.isActive ? <Badge className={statusTone.PAID}>ACTIVE</Badge> : <Badge variant="secondary">NOT SET</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
