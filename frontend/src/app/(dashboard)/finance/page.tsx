'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Pagination from '@/components/Pagination';
import { FormattedDate } from '@/components/ui/FormattedDate';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { financeAPI, academicYearsAPI, studentsAPI, schoolSettingsAPI, termsAPI } from '@/lib/api';
import { getGradeNumbersFromSystem } from '@/lib/grade-system';
import {
  convertToEthiopian,
  formatDateByCalendarType,
  formatDateTimeByCalendarType,
} from '@/lib/calendar-utils';
import {
  formatBaseFeeTypeName,
  formatFinanceFeeItemLabel,
  getInstallmentMonthName as getCalendarInstallmentMonthName,
} from '@/lib/finance-labels';
import { 
  DollarSign, 
  CreditCard, 
  Plus, 
  Search, 
  Calendar,
  Users,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Filter,
  Wallet,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Settings
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslations } from '@/hooks/useTranslations';
import type { FinanceMessages } from '@/messages/registry';

// Types
interface AcademicYear {
  id: string;
  name: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface Term {
  id: string;
  name: string;
  academicYearId: string;
  order?: number;
  startDate?: string;
  endDate?: string;
}

interface DashboardStats {
  totalRevenue: number;
  collectedToday: number;
  outstandingBalance: number;
  totalStudentsFullyPaid: number;
  studentsPartialPayment: number;
  unpaidStudentsCount: number;
}

interface RevenueData {
  date: string;
  amount: number;
}

interface StudentFeeItem {
  id: string;
  name: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string;
  termId?: string | null;
  termName?: string | null;
  isYearWide?: boolean;
  category?: string;
}

interface StudentSearchResult {
  id: string;
  userId?: string;
  name?: string;
  studentCode?: string;
  className?: string;
  sectionName?: string;
  role?: string;
  user?: {
    name?: string;
    role?: string;
  };
}

interface StudentFeeLookup {
  student: StudentSearchResult;
  fees: StudentFeeItem[];
}

interface FeeBreakdown {
  tuition: number;
  registration: number;
  examFee: number;
  library: number;
  other: number;
}

interface Transaction {
  id: string;
  receiptNumber: string;
  paymentReference?: string;
  transactionReference?: string | null;
  studentId: string;
  studentName?: string;
  className?: string;
  grade?: string;
  section?: string;
  paymentMethod: string;
  amountPaid: number;
  recordedBy?: string;
  paymentDate: string;
  notes?: string | null;
  termId?: string | null;
  termName?: string | null;
  feeType?: string | null;
}

interface OutstandingFee {
  id?: string;
  studentId: string;
  studentName: string;
  grade?: string | null;
  section?: string | null;
  feeType: string;
  scopeLabel?: string | null;
  installmentIndex?: number | null;
  isYearWide?: boolean;
  total: number;
  paid: number;
  remaining: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'UNPAID';
}

const compressGradeNumbers = (grades: number[]) => {
  const sortedUnique = Array.from(new Set(grades)).sort((a, b) => a - b);
  if (sortedUnique.length === 0) return 'All Grades';

  const segments: string[] = [];
  let start = sortedUnique[0];
  let previous = sortedUnique[0];

  for (let index = 1; index < sortedUnique.length; index++) {
    const current = sortedUnique[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }

    segments.push(start === previous ? `Grade ${start}` : `Grades ${start}-${previous}`);
    start = current;
    previous = current;
  }

  segments.push(start === previous ? `Grade ${start}` : `Grades ${start}-${previous}`);
  return segments.join(', ');
};

type ChartView = 'daily' | 'weekly' | 'monthly';

const isStudentSearchResult = (candidate: StudentSearchResult) => {
  const normalizedRole = String(
    candidate.role ||
      candidate.user?.role ||
      '',
  ).toUpperCase();

  if (normalizedRole && normalizedRole !== 'STUDENT') {
    return false;
  }

  return Boolean(
    candidate.studentCode ||
      candidate.className ||
      candidate.sectionName,
  );
};

export default function FinanceDashboardPage() {
  // State
  const { user } = useAuth();
  const { formatDate: formatSchoolDate } = useAcademicYear();
  const { t } = useTranslations<FinanceMessages>('finance');
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [curriculumType, setCurriculumType] = useState<string>('TERM');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [chartView, setChartView] = useState<ChartView>('daily');
  
  // Dashboard data
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    collectedToday: 0,
    outstandingBalance: 0,
    totalStudentsFullyPaid: 0,
    studentsPartialPayment: 0,
    unpaidStudentsCount: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown>({
    tuition: 0,
    registration: 0,
    examFee: 0,
    library: 0,
    other: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [outstandingFees, setOutstandingFees] = useState<OutstandingFee[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [billingPolicy, setBillingPolicy] = useState<{
    dueDay: number;
    penalty: number;
  }>({ dueDay: 15, penalty: 0 });
  
  // Pagination & Search
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsSearch, setTransactionsSearch] = useState('');
  const [transactionsLimit] = useState(10);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [outstandingLimit] = useState(10);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [outstandingStatusFilter, setOutstandingStatusFilter] = useState<string>('all');
  
  // Dialogs
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [feeStructureOpen, setFeeStructureOpen] = useState(false);
  
  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    studentFeeId: '',
    termId: '',
    amountPaid: 0,
    paymentMethod: 'BANK_TRANSFER' as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
    transactionReference: '',
    notes: '',
  });
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const skipStudentSearch = useRef(false);
  const [selectedStudentFees, setSelectedStudentFees] = useState<StudentFeeLookup[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [gradeOptions, setGradeOptions] = useState<number[]>(() => getGradeNumbersFromSystem('1-12'));
  
  // Fee Structure Form State
  const [feeStructureForm, setFeeStructureForm] = useState({
    feeType: '',
    amount: 0,
    billingMode: 'single',
    gradeMode: 'all',
    grade: '',
    gradeFrom: '',
    gradeTo: '',
    termId: '',
    description: '',
  });
  const [isCreatingFeeStructure, setIsCreatingFeeStructure] = useState(false);
  const [feeCollectionMode, setFeeCollectionMode] = useState<{
    mode: string;
    modeLabel: string;
    installmentCount: number;
  } | null>(null);

  const openFeeStructureDialog = () => {
    setFeeStructureForm((current) => ({
      ...current,
      billingMode: 'single',
      gradeMode: 'all',
      grade: '',
      gradeFrom: '',
      gradeTo: '',
      termId:
        selectedTerm && selectedTerm !== 'all' && terms.some((term) => term.id === selectedTerm)
          ? selectedTerm
          : '',
    }));
    setFeeStructureOpen(true);
  };

  // Current user (mock - in real app get from auth)
  const currentUser = { name: 'Finance Manager', role: 'FINANCE' };

  // Load academic years after auth has restored the school context.
  useEffect(() => {
    const loadSetupData = async () => {
      if (!user?.schoolId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await academicYearsAPI.getAll({ schoolId: user.schoolId });
        const years = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        setAcademicYears(years);
        if (years.length > 0) {
          const activeYear = years.find((year: AcademicYear) => year.isActive) || years[0];
          setSelectedYear((current) =>
            current && years.some((year: AcademicYear) => year.id === current)
              ? current
              : activeYear.id,
          );
        } else {
          setSelectedYear('');
          setTerms([]);
          setSelectedTerm('');
        }
      } catch (error) {
        console.error('Error loading academic years:', error);
        setAcademicYears([]);
        setSelectedYear('');
        setTerms([]);
        setSelectedTerm('');
      toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    loadSetupData();
  }, [user?.schoolId]);

  useEffect(() => {
    const loadGradeOptions = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await schoolSettingsAPI.getAll(user.schoolId);
        setGradeOptions(getGradeNumbersFromSystem(response.data?.grade_system || '1-12'));
      } catch (error) {
        setGradeOptions(getGradeNumbersFromSystem('1-12'));
      }
    };
    loadGradeOptions();
  }, [user?.schoolId]);

  // Load curriculum info when academic year changes
  useEffect(() => {
    const loadCurriculumInfo = async () => {
      if (!selectedYear || !user?.schoolId) return;
      try {
        const [response, collectionModeResponse, settingsResponse, currentTermResponse] = await Promise.all([
          financeAPI.getCurriculumInfo(user.schoolId, selectedYear),
          financeAPI.getFeeCollectionMode(user.schoolId).catch(() => null),
          schoolSettingsAPI.getAll(user.schoolId).catch(() => null),
          termsAPI.getCurrent({ schoolId: user.schoolId }).catch(() => null),
        ]);
        
        if (settingsResponse?.data) {
          const dueDaySetting = settingsResponse.data.fee_payment_due_day;
          const penaltySetting = settingsResponse.data.fee_daily_penalty_amount;
          const dueDay = Number(dueDaySetting ?? 15);
          const penalty = Number(penaltySetting ?? 0);
          setBillingPolicy({
            dueDay: Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 ? dueDay : 15,
            penalty: Number.isFinite(penalty) && penalty >= 0 ? penalty : 0,
          });
        }

        const resolvedCurrentTerm = currentTermResponse?.data || null;
        setCurrentTerm(resolvedCurrentTerm);

        if (collectionModeResponse?.data?.data) {
          setFeeCollectionMode(collectionModeResponse.data.data);
        }
        if (response.data?.success) {
          setCurriculumType(response.data.curriculumType || 'TERM');
          const loadedTerms: Term[] = response.data.terms || [];
          setTerms(loadedTerms);

          setSelectedTerm((currentSelectedTerm) => {
            if (currentSelectedTerm && loadedTerms.some(term => term.id === currentSelectedTerm)) {
              return currentSelectedTerm;
            }

            const current =
              loadedTerms.find(term => term.id === resolvedCurrentTerm?.id) ||
              loadedTerms.find(term => {
                if (!term.startDate || !term.endDate) return false;
                const today = new Date();
                const start = new Date(term.startDate);
                const end = new Date(term.endDate);
                return today >= start && today <= end;
              });

            return current?.id || 'all';
          });
        }
      } catch (error) {
        console.error('Error loading curriculum info:', error);
        setTerms([]);
        setCurrentTerm(null);
        setSelectedTerm('all');
      }
    };
    loadCurriculumInfo();
  }, [selectedYear, user?.schoolId]);

  // Handle auto-updating dates when term changes
  useEffect(() => {
    if (selectedTerm && selectedTerm !== 'all') {
      const term = terms.find(t => t.id === selectedTerm);
      if (term?.startDate && term?.endDate) {
        setFromDate(new Date(term.startDate));
        setToDate(new Date(term.endDate));
      }
    } else if (selectedTerm === 'all') {
       setFromDate(undefined);
       setToDate(undefined);
    }
  }, [selectedTerm, terms]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!selectedYear) return;
    if (selectedTerm && selectedTerm !== 'all' && !terms.some((term) => term.id === selectedTerm)) {
      return;
    }
    
    setLoading(true);
    try {
      // Get date range from state or defaults
      const from = fromDate ? fromDate.toISOString().split('T')[0] : (selectedTerm === 'all' ? undefined : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
      const to = toDate ? toDate.toISOString().split('T')[0] : (selectedTerm === 'all' ? undefined : new Date().toISOString().split('T')[0]);

      // Fetch all data in parallel
      const schoolId = user?.schoolId;
      if (!schoolId) {
        toast.error(t.schoolIdNotFound);
        setLoading(false);
        return;
      }

      const termFilter = selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined;
      console.log('Fetching fee structures with:', { schoolId, selectedYear });
      
      const [dailyReport, outstandingResponse, feeStructuresResponse] = await Promise.all([
        financeAPI.getDailyReport({ 
          schoolId: schoolId, 
          academicYearId: selectedYear,
          termId: termFilter,
          from: from,
          to: to
        }),
        financeAPI.getOutstandingBalances(schoolId, selectedYear, termFilter),
        financeAPI.listFeeStructures(schoolId, selectedYear, termFilter).catch(e => {
          console.error('Error fetching fee structures:', e);
          return { data: [] };
        })
      ]);
      
      console.log('Fee structures raw response:', feeStructuresResponse);
      console.log('Daily report response:', dailyReport.data);
      console.log('Outstanding response:', outstandingResponse.data);

      // Process stats
      const report = dailyReport.data;
      console.log('Report stats:', {
        total: report.total,
        todayTotal: report.todayTotal,
        totalOutstanding: report.totalOutstanding,
        paidStudents: report.paidStudents,
        partialStudents: report.partialStudents,
        unpaidStudents: report.unpaidStudents
      });
      setStats({
        totalRevenue: report.total || 0,
        collectedToday: report.todayTotal || 0,
        outstandingBalance: report.totalOutstanding || 0,
        totalStudentsFullyPaid: report.paidStudents || 0,
        studentsPartialPayment: report.partialStudents || 0,
        unpaidStudentsCount: report.unpaidStudents || 0,
      });

      // Process revenue trend data
      if (report.dailyData) {
        setRevenueData(report.dailyData);
      }

      // Process fee structures
      const fsData = feeStructuresResponse?.data;
      console.log('Fee structures - raw fsData:', fsData, 'type:', typeof fsData);
      if (fsData && typeof fsData === 'object' && 'data' in fsData) {
        setFeeStructures((fsData as any).data || []);
      } else if (Array.isArray(fsData)) {
        setFeeStructures(fsData);
      }

      // Process fee breakdown
      if (report.feeBreakdown) {
        setFeeBreakdown(report.feeBreakdown);
      }

      // Process transactions
      if (report.payments) {
        setTransactions(report.payments);
        setTransactionsTotal(report.payments.length);
      }

      // Process outstanding fees
      console.log('Outstanding response:', outstandingResponse.data);
      if (outstandingResponse.data.rows) {
        setOutstandingFees(outstandingResponse.data.rows);
        setOutstandingTotal(outstandingResponse.data.rows.length);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(t.failedLoadYears);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedTerm, terms, fromDate, toDate, user?.schoolId]);

  // Load dashboard when filters or school context change
  useEffect(() => {
    const termReady =
      selectedTerm === 'all' ||
      !selectedTerm ||
      terms.length === 0 ||
      terms.some((term) => term.id === selectedTerm);

    if (selectedYear && user?.schoolId && termReady) {
      console.log('Loading dashboard data...');
      loadDashboardData();
    }
  }, [selectedYear, selectedTerm, terms, user?.schoolId, loadDashboardData, fromDate, toDate]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  const activeCalendarType = user?.calendarType || 'ETHIOPIAN';

  const getCalendarDateSlug = (date: Date) => {
    if (activeCalendarType === 'ETHIOPIAN') {
      const eth = convertToEthiopian(date);
      return `ec-${eth.year}-${String(eth.month).padStart(2, '0')}-${String(eth.day).padStart(2, '0')}`;
    }

    return `gc-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return formatDateByCalendarType(parsed, activeCalendarType);
  };

  const getBillingPeriodLabel = (mode?: string) => {
    const normalized = String(mode || '').toUpperCase();
    if (normalized === 'MONTHLY' || normalized === 'MONTH') return 'Billing Month';
    if (normalized === 'QUARTERLY' || normalized === 'QUARTER') return 'Billing Quarter';
    if (normalized === 'SEMESTER' || normalized === 'SEMESTERLY') return 'Billing Semester';
    return 'Billing Term';
  };

  // Format date time
  const formatDateTime = (dateString: string) => {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return formatDateTimeByCalendarType(parsed, activeCalendarType);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400"><MinusCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'UNPAID':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Unpaid</Badge>;
      default:
        return <Badge className="dark:bg-slate-700 dark:text-slate-300">{status}</Badge>;
    }
  };

  // Get payment method badge
  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Banknote className="w-3 h-3 mr-1" />Cash</Badge>;
      case 'BANK_TRANSFER':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700"><CreditCard className="w-3 h-3 mr-1" />Bank</Badge>;
      case 'CHEQUE':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><FileText className="w-3 h-3 mr-1" />Cheque</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(t =>
    (t.studentName || '').toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    (t.transactionReference || t.paymentReference || t.receiptNumber || '').toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    (t.termName || '').toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    (t.feeType || '').toLowerCase().includes(transactionsSearch.toLowerCase())
  );

  const paginatedTransactions = filteredTransactions.slice(
    (transactionsPage - 1) * transactionsLimit,
    transactionsPage * transactionsLimit
  );
  const transactionsTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsLimit));

  const chartRevenueData = (() => {
    if (chartView === 'daily') return revenueData;

    const grouped = new Map<string, number>();
    revenueData.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;

      let key = item.date;
      if (chartView === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (chartView === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      grouped.set(key, (grouped.get(key) || 0) + item.amount);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  })();

  const filteredOutstandingFees = outstandingFees.filter(fee => {
    if (outstandingStatusFilter !== 'all' && fee.status !== outstandingStatusFilter) return false;
    if (
      outstandingSearch &&
      !fee.studentName?.toLowerCase().includes(outstandingSearch.toLowerCase()) &&
      !fee.grade?.toLowerCase().includes(outstandingSearch.toLowerCase())
    ) return false;
    return true;
  });
  const paginatedOutstandingFees = filteredOutstandingFees.slice(
    (outstandingPage - 1) * outstandingLimit,
    outstandingPage * outstandingLimit,
  );
  const outstandingTotalPages = Math.max(1, Math.ceil(filteredOutstandingFees.length / outstandingLimit));
  const formatFeeStructureName = (feeType?: string | null) => {
    return formatBaseFeeTypeName(feeType);
  };

  const getInstallmentMonthName = (installmentNumber: number) => {
    const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);
    return getCalendarInstallmentMonthName(
      installmentNumber,
      selectedAcademicYear?.startDate,
      activeCalendarType as 'ETHIOPIAN' | 'GREGORIAN',
    );
  };

  const formatFeeItemDisplay = (feeType?: string | null, periodLabel?: string | null) => {
    const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);
    return formatFinanceFeeItemLabel(feeType, {
      academicYearStartDate: selectedAcademicYear?.startDate,
      calendarType: activeCalendarType as 'ETHIOPIAN' | 'GREGORIAN',
      periodLabel,
    });
  };

  const getInstallmentPeriodLabel = (installmentNumber: number) => {
    const mode = feeCollectionMode?.mode;

    if (mode === 'MONTHLY' || mode === 'MONTH') {
      return getInstallmentMonthName(installmentNumber);
    }

    if (mode === 'QUARTERLY' || mode === 'QUARTER') {
      return terms[installmentNumber - 1]?.name || `Quarter ${installmentNumber}`;
    }

    if (mode === 'SEMESTER' || mode === 'SEMESTERLY') {
      return terms[installmentNumber - 1]?.name || `Semester ${installmentNumber}`;
    }

    if (mode === 'TERM' || mode === 'TERMLY') {
      return terms[installmentNumber - 1]?.name || `Term ${installmentNumber}`;
    }

    if (mode === 'YEARLY' || mode === 'YEAR') {
      return 'Full Year';
    }

    return terms[installmentNumber - 1]?.name || `Installment ${installmentNumber}`;
  };

  const getInstallmentIndexFromFee = (fee: StudentFeeItem) => {
    const match = String(fee.name || '').match(/_INSTALLMENT_(\d+)$/i);
    return match ? Number(match[1]) : null;
  };

  const getSelectedTermInstallmentRange = (termId?: string) => {
    if (!termId || !feeCollectionMode) return null;

    const installmentCount = feeCollectionMode.installmentCount || terms.length || 1;
    if (installmentCount <= terms.length || installmentCount <= 1) return null;

    const term = terms.find((item) => item.id === termId);
    const academicYear = academicYears.find((year) => year.id === selectedYear);
    const academicYearStart = academicYear?.startDate ? new Date(academicYear.startDate) : null;
    const termStart = term?.startDate ? new Date(term.startDate) : null;
    const termEnd = term?.endDate ? new Date(term.endDate) : null;

    if (
      academicYearStart &&
      termStart &&
      !Number.isNaN(academicYearStart.getTime()) &&
      !Number.isNaN(termStart.getTime())
    ) {
      const monthDiff = (date: Date) =>
        (date.getFullYear() - academicYearStart.getFullYear()) * 12 +
        (date.getMonth() - academicYearStart.getMonth());

      const start = Math.max(1, Math.min(installmentCount, monthDiff(termStart) + 1));
      const end =
        termEnd && !Number.isNaN(termEnd.getTime())
          ? Math.max(start, Math.min(installmentCount, monthDiff(termEnd) + 1))
          : start;

      return { start, end };
    }

    if (term?.order && terms.length > 0) {
      return {
        start: Math.floor(((term.order - 1) * installmentCount) / terms.length) + 1,
        end: Math.floor((term.order * installmentCount) / terms.length),
      };
    }

    return null;
  };

  const isMonthlyBillingMode = feeCollectionMode?.mode === 'MONTHLY' || feeCollectionMode?.mode === 'MONTH';
  const selectedStudentData = selectedStudentFees.find(
    (entry) =>
      entry.student.userId === paymentForm.studentId ||
      entry.student.id === paymentForm.studentId,
  );
  const selectedPaymentTermId =
    paymentForm.termId ||
    (selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined);
  const selectedPaymentInstallmentRange = isMonthlyBillingMode
    ? getSelectedTermInstallmentRange(selectedPaymentTermId)
    : null;
  const paymentFeeOptions = (selectedStudentData?.fees || [])
    .filter((fee) => {
      if (!isMonthlyBillingMode && fee.balance <= 0) return false;
      if (!isMonthlyBillingMode) return true;

      const installmentIndex = getInstallmentIndexFromFee(fee);
      if (installmentIndex === null) return false;
      if (!selectedPaymentInstallmentRange) return true;

      return (
        installmentIndex >= selectedPaymentInstallmentRange.start &&
        installmentIndex <= selectedPaymentInstallmentRange.end
      );
    })
    .sort((a, b) => {
      const aIndex = getInstallmentIndexFromFee(a) || 0;
      const bIndex = getInstallmentIndexFromFee(b) || 0;
      return aIndex - bIndex;
    });
  const unpaidPaymentFeeOptions = paymentFeeOptions.filter((fee) => fee.balance > 0);
  const selectedFee =
    paymentFeeOptions.find((fee) => fee.id === selectedFeeId) ||
    unpaidPaymentFeeOptions[0] ||
    paymentFeeOptions[0] ||
    selectedStudentData?.fees.find((fee) => fee.id === selectedFeeId) ||
    selectedStudentData?.fees.find((fee) => fee.status !== 'PAID') ||
    selectedStudentData?.fees[0];
  const paymentTermIdForSubmit = selectedPaymentTermId || selectedFee?.termId;
  const selectedPaymentTermName =
    paymentTermIdForSubmit
      ? terms.find((term) => term.id === paymentTermIdForSubmit)?.name ||
        selectedFee?.termName ||
        null
      : selectedFee?.termName || null;

  const getTermMonthRangeLabel = (termId: string) => {
    const term = terms.find((t) => t.id === termId);
    if (!term || !term.startDate || !term.endDate) return null;

    const academicYear = academicYears.find((y) => y.id === selectedYear);
    const ayStart = academicYear?.startDate ? new Date(academicYear.startDate) : null;
    if (!ayStart) return term.name;

    const tStart = new Date(term.startDate);
    const tEnd = new Date(term.endDate);

    const monthDiff = (d: Date) =>
      (d.getFullYear() - ayStart.getFullYear()) * 12 + (d.getMonth() - ayStart.getMonth());

    const startIdx = monthDiff(tStart) + 1;
    const endIdx = monthDiff(tEnd) + 1;

    if (startIdx === endIdx) return getInstallmentMonthName(startIdx);
    return `${getInstallmentMonthName(startIdx)} - ${getInstallmentMonthName(endIdx)}`;
  };

  const choosePreferredPaymentFee = (fees: StudentFeeItem[], termId?: string) => {
    const unpaidFees = fees.filter((fee) => fee.balance > 0);
    if (unpaidFees.length === 0) return fees[0];

    if (termId) {
      const directTermFee = unpaidFees
        .filter((fee) => fee.termId === termId)
        .sort((a, b) => b.balance - a.balance)[0];
      if (directTermFee) return directTermFee;

      const installmentRange = getSelectedTermInstallmentRange(termId);
      if (installmentRange) {
        const rangedInstallmentFee = unpaidFees
          .filter((fee) => {
            const installmentIndex = getInstallmentIndexFromFee(fee);
            return (
              installmentIndex !== null &&
              installmentIndex >= installmentRange.start &&
              installmentIndex <= installmentRange.end
            );
          })
          .sort((a, b) => {
            const aIndex = getInstallmentIndexFromFee(a) || 0;
            const bIndex = getInstallmentIndexFromFee(b) || 0;
            return aIndex - bIndex;
          })[0];
        if (rangedInstallmentFee) return rangedInstallmentFee;
      }
    }

    const yearWideFee = unpaidFees
      .filter((fee) => fee.isYearWide)
      .sort((a, b) => b.balance - a.balance)[0];
    if (yearWideFee) return yearWideFee;

    return unpaidFees.sort((a, b) => b.balance - a.balance)[0];
  };

  const formatInstallmentLabel = (fee: {
    feeType?: string | null;
    termId?: string | null;
    termName?: string | null;
    description?: string | null;
  }) => {
    const match = String(fee.feeType || '').match(/_INSTALLMENT_(\d+)$/i);
    if (match) return getInstallmentPeriodLabel(Number(match[1]));

    const mode = feeCollectionMode?.mode;
    if ((mode === 'MONTHLY' || mode === 'MONTH') && fee.termId) {
      const rangeLabel = getTermMonthRangeLabel(fee.termId);
      if (rangeLabel) return rangeLabel;
    }

    if (fee.termName) return fee.termName;

    return fee.description || null;
  };

  const formatOutstandingScopeLabel = (fee: OutstandingFee) => {
    if (fee.installmentIndex != null) {
      return getInstallmentMonthName(fee.installmentIndex);
    }

    const scopeLabel = fee.scopeLabel;
    const label = scopeLabel || '';
    const monthMatch = label.match(/^Month\s+(\d+)$/i);
    if (monthMatch) return getInstallmentMonthName(Number(monthMatch[1]));
    return label || '-';
  };

  const outstandingFeesNote = (() => {
    const modeLabel = feeCollectionMode?.modeLabel || 'configured billing';
    if (selectedTerm && selectedTerm !== 'all') {
      return `This view is filtered by the selected curriculum period. Annual fees are shown as a ${modeLabel.toLowerCase()} share; generated installments keep their own billing period.`;
    }
    return `Outstanding balances follow the school's ${modeLabel.toLowerCase()} billing method.`;
  })();

  const displayFeeStructures = (() => {
    const grouped = new Map<
      string,
      {
        id: string;
        feeType: string;
        amount: number;
        description?: string | null;
        termName?: string | null;
        grades: number[];
        allGrades: boolean;
      }
    >();

    feeStructures.forEach((fee) => {
      const key = [
        fee.feeType || '',
        String(fee.amount ?? ''),
        fee.term?.id || fee.termId || 'year',
        fee.description || '',
      ].join('|');

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: fee.id,
          feeType: fee.feeType,
          amount: fee.amount,
          description: fee.description,
          termName: fee.term?.name || null,
          grades: [],
          allGrades: fee.grade == null,
        });
      }

      const current = grouped.get(key)!;
      if (fee.grade == null) {
        current.allGrades = true;
      } else {
        current.grades.push(Number(fee.grade));
      }
    });

    return Array.from(grouped.values()).map((fee) => ({
      ...fee,
      gradeLabel: fee.allGrades ? 'All Grades' : compressGradeNumbers(fee.grades),
    }));
  })();

  // Handle Record Payment
  const handleRecordPayment = async () => {
    if (!paymentForm.studentId || !paymentForm.amountPaid) {
      toast.error(t.studentAmountRequired);
      return;
    }
    if (!paymentTermIdForSubmit) {
      toast.error(t.selectTermError);
      return;
    }
    if (isMonthlyBillingMode && (!selectedFeeId || unpaidPaymentFeeOptions.length === 0 || (selectedFee?.balance || 0) <= 0)) {
      toast.error('Select the unpaid month to pay');
      return;
    }
    
    // Find the fee ID - use selected one or let backend find it
    const feeId = selectedFee?.id || selectedFeeId;
    console.log('Recording payment - studentId:', paymentForm.studentId, 'feeId:', feeId);
    
    setIsRecordingPayment(true);
    try {
      await financeAPI.recordPayment({
        schoolId: user?.schoolId || '',
        studentFeeId: feeId,
        studentId: paymentForm.studentId,
        termId: paymentTermIdForSubmit,
        amountPaid: paymentForm.amountPaid,
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        notes: paymentForm.notes,
      });
      toast.success(t.paymentRecorded);
      setRecordPaymentOpen(false);
      setPaymentForm({
        studentId: '',
        studentFeeId: '',
        termId: '',
        amountPaid: 0,
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: '',
        notes: '',
      });
      setSelectedFeeId('');
      setSelectedStudentFees([]);
      loadDashboardData();
    } catch (error: any) {
      console.error('Record payment error:', error);
      toast.error(error.response?.data?.message || t.failedRecordPayment);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleSendPeriodReminders = async () => {
    if (!user?.schoolId || !selectedTerm || selectedTerm === 'all') {
      toast.error(t.selectTermReminder);
      return;
    }

    setIsSendingReminders(true);
    try {
      const response = await financeAPI.sendPeriodFeeReminders({
        schoolId: user.schoolId,
        termId: selectedTerm,
      });
      toast.success('Reminder is sent to all parents');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t.failedReminders);
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleReversePayment = async (tx: Transaction) => {
    if (!user?.schoolId) return;
    const schoolId = user.schoolId;

    toast.warning(t.reverseConfirm, {
      description: `Reverse payment ${tx.transactionReference || tx.paymentReference || tx.receiptNumber || tx.id} for ${formatCurrency(tx.amountPaid)}?`,
      duration: 10000,
      cancel: {
        label: t.cancel,
        onClick: () => undefined,
      },
      action: {
        label: t.reversed,
        onClick: async () => {
          setReversingPaymentId(tx.id);
          try {
            await financeAPI.reversePayment(tx.id, {
              schoolId,
              reason: 'Reversed from finance dashboard',
            });
            toast.success(t.paymentReversed);
            loadDashboardData();
          } catch (error: any) {
            toast.error(error.response?.data?.message || t.failedReverse);
          } finally {
            setReversingPaymentId(null);
          }
        },
      },
    });
  };

  const refreshSelectedStudentFeesForTerm = async (termId: string) => {
    if (!paymentForm.studentId || !user?.schoolId) return;
    const studentData = selectedStudentFees.find(
      (entry) =>
        entry.student.userId === paymentForm.studentId ||
        entry.student.id === paymentForm.studentId,
    );
    if (!studentData) return;

    try {
      const feeRes = await financeAPI.getStudentFees(
        paymentForm.studentId,
        user.schoolId,
        selectedYear,
      );
      const fees = Array.isArray(feeRes?.data?.feeItems) ? feeRes.data.feeItems : [];
      const nextFee = choosePreferredPaymentFee(fees, termId);
      setSelectedStudentFees((current) =>
        current.map((entry) =>
          entry.student.userId === paymentForm.studentId ||
          entry.student.id === paymentForm.studentId
            ? { ...entry, fees }
            : entry,
        ),
      );
      setSelectedFeeId(nextFee?.id || '');
      setPaymentForm((current) => ({
        ...current,
        termId,
        amountPaid: nextFee?.balance || 0,
      }));
    } catch (error) {
      console.error('Failed to refresh selected student fees:', error);
      toast.error(t.failedLoadFees);
    }
  };

// Search students for payment (auto-search as you type)
  const handleSearchStudents = useCallback(async (searchTerm: string) => {
    console.log('Searching for:', searchTerm, 'schoolId:', user?.schoolId);
    
    if (!searchTerm.trim() || !user?.schoolId || searchTerm.length < 2) {
      setStudentResults([]);
      setSelectedStudentFees([]);
      return;
    }
    
    setIsSearchingStudents(true);
    try {
      const response = await studentsAPI.getAll({ 
        search: searchTerm.trim(),
        limit: '20'
      });
      console.log('Student search response:', response);
      const rawStudents: StudentSearchResult[] = response.data?.data || response.data?.rows || [];
      const students = rawStudents.filter(isStudentSearchResult);
      console.log('Found students:', students);
      setStudentResults(students);
      
      // Get their fees inline
      const feesWithStudents: StudentFeeLookup[] = [];
      for (const s of students) {
        const sid = s.userId || s.id;
        try {
          const feeRes = await financeAPI.getStudentFees(
            sid,
            user.schoolId,
            selectedYear,
          );
          const fees = Array.isArray(feeRes?.data?.feeItems) ? feeRes.data.feeItems : [];
          feesWithStudents.push({ student: s, fees });
        } catch (e) {
          feesWithStudents.push({ student: s, fees: [] });
        }
      }
      console.log('Fees with students:', feesWithStudents);
      setSelectedStudentFees(feesWithStudents);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setIsSearchingStudents(false);
    }
  }, [selectedTerm, selectedYear, user?.schoolId]);

  // Auto-search when typing
  useEffect(() => {
    if (skipStudentSearch.current) {
      skipStudentSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      handleSearchStudents(studentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch, handleSearchStudents]);

// Handle Create Fee Structure
  const handleCreateFeeStructure = async () => {
    console.log('DEBUG: user:', user, 'years:', academicYears, 'selectedYear:', selectedYear);
    
    // Get year - try selectedYear first, then first academic year, then ''
    let yearId = selectedYear;
    if (!yearId && academicYears.length > 0) {
      yearId = academicYears[0].id;
    }
    console.log('Using yearId:', yearId);
    
    if (!user?.schoolId) {
      toast.error(t.feeStructuresError);
      return;
    }
    if (!yearId) {
      toast.error(t.noAcademicYear);
      return;
    }
    
    if (!feeStructureForm.feeType || feeStructureForm.feeType.trim() === '') {
      toast.error(t.selectFeeType);
      return;
    }
    
    if (!feeStructureForm.amount || feeStructureForm.amount <= 0) {
      toast.error(t.validAmount);
      return;
    }

    let targetGrades: number[] = [];
    if (feeStructureForm.gradeMode === 'single') {
      const parsedGrade = parseInt(feeStructureForm.grade, 10);
      if (!gradeOptions.includes(parsedGrade)) {
        toast.error(t.validGrade);
        return;
      }
      targetGrades = [parsedGrade];
    } else if (feeStructureForm.gradeMode === 'range') {
      const fromGrade = parseInt(feeStructureForm.gradeFrom, 10);
      const toGrade = parseInt(feeStructureForm.gradeTo, 10);
      if (!gradeOptions.includes(fromGrade) || !gradeOptions.includes(toGrade) || fromGrade > toGrade) {
        toast.error(t.validGradeRange);
        return;
      }
      targetGrades = Array.from({ length: toGrade - fromGrade + 1 }, (_, index) => fromGrade + index);
    }

    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error(t.schoolIdNotFound);
      return;
    }

setIsCreatingFeeStructure(true);
    try {
      console.log('Creating fee structure - school:', schoolId, 'year:', yearId);
      if (feeStructureForm.billingMode === 'installments') {
        const basePayload = {
          schoolId,
          academicYearId: yearId,
          feeType: feeStructureForm.feeType,
          annualAmount: feeStructureForm.amount,
          description: feeStructureForm.description,
        };

        if (targetGrades.length === 0) {
          await financeAPI.generateInstallmentFees(basePayload);
        } else {
          await Promise.all(
            targetGrades.map((grade) =>
              financeAPI.generateInstallmentFees({
                ...basePayload,
                grade,
              }),
            ),
          );
        }

        toast.success(
          targetGrades.length > 1
            ? t.installmentsCreated.replace('{from}', targetGrades[0].toString()).replace('{to}', targetGrades[targetGrades.length - 1].toString())
            : t.installmentsCreatedSingle.replace('{count}', (feeCollectionMode?.installmentCount || terms.length || 1).toString()),
        );
        setFeeStructureOpen(false);
        setFeeStructureForm({
          feeType: '',
          amount: 0,
          billingMode: 'single',
          gradeMode: 'all',
          grade: '',
          gradeFrom: '',
          gradeTo: '',
          termId: '',
          description: '',
        });
        loadDashboardData();
        return;
      }

      const basePayload = {
          schoolId: schoolId,
        academicYearId: yearId,
          termId: feeStructureForm.termId || undefined,
          feeType: feeStructureForm.feeType,
          amount: feeStructureForm.amount,
          description: feeStructureForm.description,
        };

      if (targetGrades.length === 0) {
        await financeAPI.createFeeStructure(basePayload);
      } else {
        await Promise.all(
          targetGrades.map((grade) =>
            financeAPI.createFeeStructure({
              ...basePayload,
              grade,
            }),
          ),
        );
      }

      toast.success(
        targetGrades.length > 1
          ? t.feeStructuresCreated.replace('{from}', targetGrades[0].toString()).replace('{to}', targetGrades[targetGrades.length - 1].toString())
          : t.feeStructureCreated,
      );
      setFeeStructureOpen(false);
      setFeeStructureForm({
        feeType: '',
        amount: 0,
        billingMode: 'single',
        gradeMode: 'all',
        grade: '',
        gradeFrom: '',
        gradeTo: '',
        termId: '',
        description: '',
      });
      loadDashboardData();
    } catch (error: any) {
      console.error('Create fee structure error:', error);
      toast.error(error.response?.data?.message || t.failedCreateStructure);
    } finally {
      setIsCreatingFeeStructure(false);
    }
  };

  // Calculate chart max value
  const chartMaxValue = Math.max(...chartRevenueData.map(d => d.amount), 1);
  const selectedTermDetails = terms.find((term) => term.id === selectedTerm) || currentTerm;
  const pendingBalanceCount = outstandingFees.filter((fee) =>
    ['PENDING', 'UNPAID', 'PARTIAL'].includes(String(fee.status).toUpperCase()) && fee.remaining > 0,
  ).length;
  const billingStatus = (() => {
    if (!selectedYear) return 'Academic year setup needed';
    if (terms.length === 0) return 'No billing periods configured';
    if (pendingBalanceCount > 0) return 'Collections need follow-up';
    return 'No pending balances';
  })();
  const billingStatusTone =
    !selectedYear || terms.length === 0
      ? 'border-l-slate-400 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
      : pendingBalanceCount > 0
        ? 'border-l-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
        : 'border-l-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400';
  const formatDueDay = (day: number) => {
    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
          ? 'nd'
          : day % 10 === 3 && day !== 13
            ? 'rd'
            : 'th';
    return `${day}${suffix} of month`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Academic Year Selector */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px] bg-white dark:bg-slate-700 text-xs">
                <SelectValue placeholder={t.academicYear} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Term Selector */}
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[100px] bg-white dark:bg-slate-700 text-xs">
                <SelectValue placeholder={curriculumType === 'SEMESTER' ? t.semester : curriculumType === 'QUARTER' ? t.quarter : t.term} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{curriculumType === 'SEMESTER' ? t.allSemesters : curriculumType === 'QUARTER' ? t.allQuarters : t.allTerms}</SelectItem>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <CalendarDatePicker 
                value={fromDate} 
                onChange={setFromDate} 
                className="w-[140px] h-8 text-[10px]" 
                placeholder="From Date"
              />
              <span className="text-slate-400 text-xs">-</span>
              <CalendarDatePicker 
                value={toDate} 
                onChange={setToDate} 
                className="w-[140px] h-8 text-[10px]" 
                placeholder="To Date"
              />
            </div>

            <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="whitespace-nowrap text-xs h-8 ml-2"
                disabled={isSendingReminders || !selectedTerm || selectedTerm === 'all'}
                onClick={handleSendPeriodReminders}
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                Reminders
              </Button>
            </div>

            <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

            <Button 
              size="sm"
              className="bg-[var(--brand-color,#e35336)] hover:opacity-90 whitespace-nowrap text-xs h-8 shadow-sm"
              onClick={() => setRecordPaymentOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t.recordPayment}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Billing Health Check Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`border-l-4 shadow-sm ${billingStatusTone.split(' ')[0]}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2 rounded-full ${billingStatusTone.split(' ').slice(1).join(' ')}`}>
                {pendingBalanceCount > 0 || !selectedYear || terms.length === 0 ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500">Billing Status</p>
                <p className="text-sm font-semibold">{billingStatus}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-blue-50 rounded-full text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Active Term</p>
                <p className="text-sm font-semibold">{selectedTermDetails?.name || 'No active term'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-amber-50 rounded-full text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending Actions</p>
                <p className="text-sm font-semibold">{pendingBalanceCount} Unpaid Balances</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 shadow-sm md:col-span-3">
            <CardContent className="p-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-50 rounded-full text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Billing Policy</p>
                  <div className="flex items-center gap-4 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Due Day:</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {formatDueDay(billingPolicy.dueDay)}
                      </span>
                    </div>
                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-600" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Daily Penalty:</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(billingPolicy.penalty)}</span>
                    </div>
                  </div>
                </div>
               </div>
               <div className="text-[10px] text-slate-400 italic">
                 Managed via School Settings
               </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardContent className="p-5">
              <div className="relative z-10">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">{t.totalRevenue}</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</h3>
                <div className="flex items-center mt-4 text-blue-100 text-xs">
                  <Activity className="w-3.5 h-3.5 mr-1" />
                  <span>Overall Collection</span>
                </div>
              </div>
              <DollarSign className="absolute -right-2 -bottom-2 w-24 h-24 text-white/10" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-5">
              <div className="relative z-10">
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">{t.collectedToday}</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.collectedToday)}</h3>
                <div className="flex items-center mt-4 text-emerald-100 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  <span>Daily Velocity</span>
                </div>
              </div>
              <TrendingUp className="absolute -right-2 -bottom-2 w-24 h-24 text-white/10" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-rose-500 to-rose-600 text-white">
            <CardContent className="p-5">
              <div className="relative z-10">
                <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">{t.outstandingBalance}</p>
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.outstandingBalance)}</h3>
                <div className="flex items-center mt-4 text-rose-100 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Outstanding Dues</span>
                </div>
              </div>
              <FileText className="absolute -right-2 -bottom-2 w-24 h-24 text-white/10" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <CardContent className="p-5">
              <div className="relative z-10">
                <p className="text-slate-300 text-xs font-medium uppercase tracking-wider">Efficiency Rate</p>
                <h3 className="text-2xl font-bold mt-1">
                  {Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstandingBalance || 1)) * 100)}%
                </h3>
                <div className="flex items-center mt-4 text-slate-300 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Target Fulfillment</span>
                </div>
              </div>
              <BarChart3 className="absolute -right-2 -bottom-2 w-24 h-24 text-white/10" />
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Revenue Trend</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Daily collection performance for the selected period</p>
              </div>
              <Select value={chartView} onValueChange={(v: any) => setChartView(v)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartRevenueData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10} 
                      tickFormatter={(d) => formatDate(d)} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `Brr ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Fee Composition</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Revenue breakdown by fee type</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { name: 'Tuition', value: feeBreakdown.tuition },
                      { name: 'Reg', value: feeBreakdown.registration },
                      { name: 'Exam', value: feeBreakdown.examFee },
                      { name: 'Other', value: feeBreakdown.other + feeBreakdown.library }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} hide />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {[0,1,2,3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#6366f1'][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-medium text-slate-600">Tuition</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-slate-600">Registration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-medium text-slate-600">Exam Fees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-medium text-slate-600">Other</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Structures Section */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 mb-6 max-h-96 overflow-y-auto">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t.feeStructuresTitle}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!user?.schoolId) {
                    toast.error('School ID not found');
                    return;
                  }
                  try {
                    await financeAPI.clearFeeStructures(user.schoolId, selectedYear);
                    setFeeStructures([]);
                    toast.success('Fee structures cleared');
                  } catch (e: any) {
                    toast.error(e.response?.data?.message || e.message || 'Failed to clear fee structures');
                  }
                  }}>
                    {t.clear}
                  </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!selectedYear || !user?.schoolId) {
                    toast.error('Select academic year first');
                    return;
                  }
                  try {
                    console.log('Generating fees with:', { schoolId: user.schoolId, academicYearId: selectedYear });
                    const result = await financeAPI.generateStudentFees({
                      schoolId: user.schoolId,
                      academicYearId: selectedYear,
                      termId: selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined,
                    });
                    console.log('Generate result:', result);
                    toast.success(result.data?.created ? `${t.feesCreated} ${result.data.created}` : t.noFeesCreated);
                    loadDashboardData();
                  } catch (e: any) {
                    console.error('Generate error:', e);
                    toast.error(e.response?.data?.message || e.message || t.failedGenerateFees);
                  }
                }}>
                  {t.generateStudentFees}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <p className="text-sm">{t.loading}</p>
              </div>
            ) : displayFeeStructures.length > 0 ? (
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[30%] text-left">{t.feeType}</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[25%] text-left">{t.grade}</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[25%] text-left">{getBillingPeriodLabel(feeCollectionMode?.mode)}</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[20%] text-right">{t.amount}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayFeeStructures.map((fee) => (
                    <TableRow key={fee.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white py-3 px-4 w-[30%] text-left">
                        <div>{formatFeeItemDisplay(fee.feeType, formatInstallmentLabel(fee))}</div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-gray-300 py-3 px-4 w-[25%] text-left">{fee.gradeLabel}</TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-gray-300 py-3 px-4 w-[25%] text-left">
                        {formatInstallmentLabel(fee) || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300 py-3 px-4 w-[20%] text-right">{formatCurrency(fee.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <FileText className="w-8 h-8 mb-2" />
                <p className="text-sm">{t.noFeeStructures}</p>
                <p className="text-xs mt-1">{t.addFeeStructureHint}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tables Section */}
        <div className="space-y-6">
          {/* Recent Transactions */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold dark:text-white">{t.recentTransactions}</CardTitle>
                <div className="relative w-[600px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder={t.search}
                    className="pl-9 h-8 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={transactionsSearch}
                    onChange={(e) => setTransactionsSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Payment Reference</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.student}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.class}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.section}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.termSemester}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.fee}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.method}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.amount}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">{t.date}</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 text-right">{t.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">
                          {tx.transactionReference || tx.paymentReference || tx.receiptNumber || '-'}
                        </TableCell>
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{tx.studentName}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.className || tx.grade || '-'}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.section || '-'}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.termName || 'Unassigned'}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{formatFeeItemDisplay(tx.feeType, tx.termName)}</TableCell>
                        <TableCell className="text-xs py-3 px-4">{getPaymentMethodBadge(tx.paymentMethod)}</TableCell>
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{formatCurrency(tx.amountPaid)}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-gray-400 py-3 px-4">{formatDate(tx.paymentDate)}</TableCell>
                        <TableCell className="text-xs py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={reversingPaymentId === tx.id}
                            onClick={() => handleReversePayment(tx)}
                          >
                            {reversingPaymentId === tx.id ? t.reversing : t.reverse}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={10} className="text-center text-slate-500 py-8 dark:text-gray-400">
                        {t.noTransactions}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-500">
                  {filteredTransactions.length > 0
                    ? `Showing ${(transactionsPage - 1) * transactionsLimit + 1} to ${Math.min(transactionsPage * transactionsLimit, filteredTransactions.length)} of ${filteredTransactions.length}`
                    : 'No transactions to paginate'}
                </div>
                <Pagination
                  page={transactionsPage}
                  setPage={setTransactionsPage}
                  totalPages={transactionsTotalPages}
                />
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Fees */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold dark:text-white">{t.outstandingFees}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                    {outstandingFeesNote}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
                  <Input
                    placeholder={t.searchStudent}
                    value={outstandingSearch}
                    onChange={(e) => setOutstandingSearch(e.target.value)}
                    className="h-8 w-full min-w-0 flex-1 text-xs"
                  />
                  <div className="-mx-1 max-w-full overflow-x-auto overflow-y-hidden px-1">
                    <div className="inline-flex h-auto w-max min-w-full flex-nowrap bg-transparent p-0 shadow-none border-0 lg:min-w-0">
                    {['all', 'PAID', 'PARTIAL', 'UNPAID'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setOutstandingStatusFilter(status)}
                        className={`shrink-0 flex-1 border-b-2 px-3 py-1.5 text-xs font-semibold transition-all rounded-none lg:flex-none md:px-4 md:text-sm ${
                          outstandingStatusFilter === status
                            ? 'border-[var(--brand-color,#e35336)] bg-transparent text-[var(--brand-color,#e35336)] shadow-none'
                            : 'border-transparent bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        {status === 'all' ? t.allTerms.split(' ')[0] : status === 'PAID' ? t.paid : status === 'PARTIAL' ? t.partial : t.unpaid}
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-[400px] overflow-y-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[25%] text-left">{t.student}</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-left">{t.grade}</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-left">{t.feePeriod}</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">{t.total}</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">{t.paid}</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">{t.balance}</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-center">{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOutstandingFees.length > 0 ? (
                        paginatedOutstandingFees.map((fee) => (
                          <TableRow key={fee.id} className={`border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${fee.status === 'UNPAID' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <TableCell className="text-xs font-medium dark:text-white py-3 px-4 w-[25%] text-left">{fee.studentName}</TableCell>
                            <TableCell className="text-xs dark:text-gray-300 py-3 px-4 w-[15%] text-left">{fee.grade ? `${fee.grade}${fee.section ? ` - ${fee.section}` : ''}` : '-'}</TableCell>
                            <TableCell className="py-3 px-4 w-[15%] text-left">
                              <div className="text-xs dark:text-gray-300">{formatOutstandingScopeLabel(fee)}</div>
                              {fee.isYearWide && (
                                <div className="text-[10px] text-slate-500 dark:text-gray-400">{t.derivedFromAnnual}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs dark:text-white py-3 px-4 w-[15%] text-right">{formatCurrency(fee.total || 0)}</TableCell>
                            <TableCell className="text-xs text-green-600 dark:text-green-400 py-3 px-4 w-[15%] text-right">{formatCurrency(fee.paid || 0)}</TableCell>
                            <TableCell className="text-xs font-medium text-red-600 dark:text-red-400 py-3 px-4 w-[15%] text-right">{formatCurrency(fee.remaining || 0)}</TableCell>
                            <TableCell className="text-xs py-3 px-4 w-[15%] text-center">{getStatusBadge(fee.status)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-500 py-8 dark:text-gray-400">
                            {outstandingSearch ? 'No matching fees found' : 'No outstanding fees'}
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </div>
              {filteredOutstandingFees.length > 0 && (
                <div className="flex items-center justify-between py-3 px-4 border-t dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-gray-400">
                    Showing {((outstandingPage - 1) * outstandingLimit) + 1} to {Math.min(outstandingPage * outstandingLimit, filteredOutstandingFees.length)} of {filteredOutstandingFees.length}
                  </div>
                  <Pagination
                    page={outstandingPage}
                    setPage={setOutstandingPage}
                    totalPages={outstandingTotalPages}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Student Search - auto-searches as you type */}
            <div className="space-y-2">
              <Label>Search Student (type at least 2 chars)</Label>
              <div className="relative">
                <Input 
                  placeholder="Type name or student ID..." 
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setPaymentForm({...paymentForm, studentId: '', termId: ''});
                  }}
                />
              
                {/* Student Results - floating */}
                {studentResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {studentResults.map((student) => (
                    <div 
                      key={student.userId || student.id}
	                      className={`p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${paymentForm.studentId === (student.userId || student.id) ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
	                      onClick={() => {
                        const selectedStudentId = student.userId || student.id;
                        const studentFeeData = selectedStudentFees.find(
                          (entry) =>
                            entry.student.userId === selectedStudentId ||
                            entry.student.id === selectedStudentId,
                        );
                        const nextFee = choosePreferredPaymentFee(
                          studentFeeData?.fees || [],
                          selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined,
                        );
	                        setPaymentForm({
	                          ...paymentForm,
	                          studentId: selectedStudentId,
	                          termId:
	                            selectedTerm && selectedTerm !== 'all'
	                              ? selectedTerm
	                              : '',
                          amountPaid: nextFee?.balance || 0,
	                        });
	                        setStudentSearch(student.user?.name || student.name || 'Unknown');
	                        setStudentResults([]);
	                        setSelectedFeeId(nextFee?.id || '');
	                        skipStudentSearch.current = true;
	                      }}
                    >
                      <p className="font-medium">{student.user?.name || student.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">ID: {student.studentCode || student.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

            {terms.length > 0 && (
              <div className="space-y-2">
                <Label>{isMonthlyBillingMode ? 'Current Term / Quarter' : 'Term / Semester Paid'}</Label>
                <Select
                  value={paymentTermIdForSubmit || paymentForm.termId}
                  onValueChange={(value) => {
                    setSelectedFeeId('');
                    setPaymentForm({ ...paymentForm, termId: value });
                    refreshSelectedStudentFeesForTerm(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentFeeOptions.length > 0 && (
              <div className="space-y-2">
                <Label>{isMonthlyBillingMode ? 'Billing Month Paid' : 'Fee Item'}</Label>
                <Select
                  value={selectedFeeId}
                  onValueChange={(value) => {
                    setSelectedFeeId(value);
                    const fee = selectedStudentData?.fees.find((item) => item.id === value);
                    if (!fee) return;
                    setPaymentForm((current) => ({
                      ...current,
                      amountPaid: fee.balance || 0,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee item" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentFeeOptions.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id} disabled={isMonthlyBillingMode && fee.balance <= 0}>
                        <span className={isMonthlyBillingMode && fee.balance <= 0 ? 'line-through opacity-60' : ''}>
                          {formatFeeItemDisplay(fee.name, isMonthlyBillingMode ? null : fee.termName)} • {isMonthlyBillingMode ? selectedPaymentTermName || 'Selected period' : fee.termName || 'Whole Academic Year'} • {fee.balance <= 0 ? 'Paid' : `${formatCurrency(fee.balance)} remaining`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isMonthlyBillingMode && paymentForm.studentId && paymentTermIdForSubmit && paymentFeeOptions.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                No monthly installments found for {selectedPaymentTermName || 'the selected period'}.
              </div>
            )}


            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount Paid</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={paymentForm.amountPaid || ''}
                onChange={(e) => setPaymentForm({...paymentForm, amountPaid: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm({...paymentForm, paymentMethod: value as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Transaction Reference */}
            <div className="space-y-2">
              <Label>Bank Transaction Reference</Label>
              <Input 
                placeholder="eg. TRANS-123456"
                value={paymentForm.transactionReference}
                onChange={(e) => setPaymentForm({...paymentForm, transactionReference: e.target.value})}
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input 
                placeholder="Optional notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleRecordPayment}
              disabled={isRecordingPayment}
            >
              {isRecordingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Fee Structure Dialog */}
      <Dialog open={feeStructureOpen} onOpenChange={setFeeStructureOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Fee Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Create a single fee or split one annual amount into {feeCollectionMode?.modeLabel || 'school period'} installments.
            </div>
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select 
                value={feeStructureForm.feeType}
                onValueChange={(value) => setFeeStructureForm({...feeStructureForm, feeType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TUITION">Tuition</SelectItem>
                  <SelectItem value="REGISTRATION">Registration</SelectItem>
                  <SelectItem value="EXAM">Exam Fee</SelectItem>
                  <SelectItem value="LIBRARY">Library</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billing Mode</Label>
              <Select
                value={feeStructureForm.billingMode}
                onValueChange={(value) =>
                  setFeeStructureForm({
                    ...feeStructureForm,
                    billingMode: value,
                    termId: value === 'installments' ? '' : feeStructureForm.termId,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select billing mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single fee</SelectItem>
                  <SelectItem value="installments">
                    Annual amount split into {feeCollectionMode?.installmentCount || terms.length || 1} installments
                  </SelectItem>
                </SelectContent>
              </Select>
              {feeStructureForm.billingMode === 'installments' && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The amount below is the annual amount. It will be split across {feeCollectionMode?.modeLabel || 'configured'} periods.
                </p>
              )}
            </div>
            {feeStructureForm.billingMode !== 'installments' && (
            <div className="space-y-2">
              <Label>{curriculumType === 'SEMESTER' ? 'Semester Scope' : curriculumType === 'QUARTER' ? 'Quarter Scope' : 'Term Scope'}</Label>
              <Select
                value={feeStructureForm.termId || 'year'}
                onValueChange={(value) =>
                  setFeeStructureForm({
                    ...feeStructureForm,
                    termId: value === 'year' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${curriculumType === 'SEMESTER' ? 'semester' : curriculumType === 'QUARTER' ? 'quarter' : 'term'} scope`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Whole Academic Year</SelectItem>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            <div className="space-y-2">
              <Label>Grade Scope</Label>
              <Select 
                value={feeStructureForm.gradeMode}
                onValueChange={(value) =>
                  setFeeStructureForm({
                    ...feeStructureForm,
                    gradeMode: value,
                    grade: '',
                    gradeFrom: '',
                    gradeTo: '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="single">Single Grade</SelectItem>
                  <SelectItem value="range">Grade Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {feeStructureForm.gradeMode === 'single' && (
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select
                  value={feeStructureForm.grade}
                  onValueChange={(value) => setFeeStructureForm({ ...feeStructureForm, grade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map(g => (
                      <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {feeStructureForm.gradeMode === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From Grade</Label>
                  <Select
                    value={feeStructureForm.gradeFrom}
                    onValueChange={(value) => setFeeStructureForm({ ...feeStructureForm, gradeFrom: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Grade</Label>
                  <Select
                    value={feeStructureForm.gradeTo}
                    onValueChange={(value) => setFeeStructureForm({ ...feeStructureForm, gradeTo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{feeStructureForm.billingMode === 'installments' ? 'Annual Amount (ETB)' : 'Amount (ETB)'}</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={feeStructureForm.amount || ''}
                onChange={(e) => setFeeStructureForm({...feeStructureForm, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Optional description"
                value={feeStructureForm.description}
                onChange={(e) => setFeeStructureForm({...feeStructureForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeStructureOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleCreateFeeStructure}
              disabled={isCreatingFeeStructure}
            >
              {isCreatingFeeStructure ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
