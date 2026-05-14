'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
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
import { financeAPI, academicYearsAPI, studentsAPI } from '@/lib/api';
import { 
  DollarSign, 
  CreditCard, 
  BarChart3, 
  Plus, 
  Search, 
  Download,
  Calendar,
  Receipt,
  Users,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Printer,
  Filter,
  Wallet,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface AcademicYear {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Term {
  id: string;
  name: string;
  academicYearId: string;
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
  user?: {
    name?: string;
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
  isYearWide?: boolean;
  total: number;
  paid: number;
  remaining: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'UNPAID';
}

const GRADE_OPTIONS = [1,2,3,4,5,6,7,8,9,10,11,12] as const;

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

export default function FinanceDashboardPage() {
  // State
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [curriculumType, setCurriculumType] = useState<string>('TERM');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
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
  
  // Fee Structure Form State
  const [feeStructureForm, setFeeStructureForm] = useState({
    feeType: '',
    amount: 0,
    gradeMode: 'all',
    grade: '',
    gradeFrom: '',
    gradeTo: '',
    termId: '',
    description: '',
  });
  const [isCreatingFeeStructure, setIsCreatingFeeStructure] = useState(false);

  const openFeeStructureDialog = () => {
    setFeeStructureForm((current) => ({
      ...current,
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

  // Export CSV
  const handleExportCSV = () => {
    const periodLabel =
      selectedTerm && selectedTerm !== 'all'
        ? terms.find((term) => term.id === selectedTerm)?.name || 'Selected period'
        : 'All periods';
    const headers = ['Student', 'Grade', 'Period', 'Total Fee', 'Paid', 'Balance', 'Status'];
    const rows = outstandingFees.map(fee => [
      fee.studentName || '',
      fee.grade ? `${fee.grade}${fee.section ? ' - ' + fee.section : ''}` : '',
      periodLabel,
      (fee.total || 0).toString(),
      (fee.paid || 0).toString(),
      (fee.remaining || 0).toString(),
      fee.status || ''
    ]);
    const transactionHeaders = [
      'Receipt',
      'Student',
      'Class',
      'Section',
      'Term/Semester',
      'Fee',
      'Method',
      'Amount',
      'Date',
    ];
    const transactionRows = transactions.map((tx) => [
      tx.receiptNumber || '',
      tx.studentName || '',
      tx.className || tx.grade || '',
      tx.section || '',
      tx.termName || 'Unassigned',
      tx.feeType || '',
      tx.paymentMethod || '',
      (tx.amountPaid || 0).toString(),
      tx.paymentDate || '',
    ]);

    const csvContent = [
      `Finance Summary (${periodLabel})`,
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
      '',
      'Payment Transactions',
      transactionHeaders.join(','),
      ...transactionRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Summary
  const handlePrintSummary = () => {
    const periodLabel =
      selectedTerm && selectedTerm !== 'all'
        ? terms.find((term) => term.id === selectedTerm)?.name || 'Selected period'
        : 'All periods';
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Finance Summary Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 10px; }
          h2 { font-size: 18px; margin: 20px 0 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .summary-item { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .summary-item label { display: block; font-size: 12px; color: #666; }
          .summary-item .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          .summary-item.green .value { color: #16a34a; }
          .summary-item.red .value { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Finance Summary Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <p>Period: ${periodLabel}</p>
        
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <label>Total Revenue (Collected)</label>
            <div class="value green">Brr ${stats.totalRevenue.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <label>Collected Today</label>
            <div class="value green">Brr ${stats.collectedToday.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <label>Outstanding Balance</label>
            <div class="value red">Brr ${stats.outstandingBalance.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <label>Fully Paid Students</label>
            <div class="value">${stats.totalStudentsFullyPaid}</div>
          </div>
          <div class="summary-item">
            <label>Partial Payment Students</label>
            <div class="value">${stats.studentsPartialPayment}</div>
          </div>
          <div class="summary-item">
            <label>Unpaid Students</label>
            <div class="value">${stats.unpaidStudentsCount}</div>
          </div>
        </div>

        <h2>Outstanding Fees</h2>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Grade</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${outstandingFees.slice(0, 50).map(fee => `
              <tr>
                <td>${fee.studentName || '-'}</td>
                <td>${fee.grade ? fee.grade + (fee.section ? ' - ' + fee.section : '') : '-'}</td>
                <td>Brr ${(fee.total || 0).toLocaleString()}</td>
                <td>Brr ${(fee.paid || 0).toLocaleString()}</td>
                <td>Brr ${(fee.remaining || 0).toLocaleString()}</td>
                <td>${fee.status || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Recent Payment Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Student</th>
              <th>Class</th>
              <th>Section</th>
              <th>Term/Semester</th>
              <th>Fee</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.slice(0, 50).map(tx => `
              <tr>
                <td>${tx.receiptNumber || '-'}</td>
                <td>${tx.studentName || '-'}</td>
                <td>${tx.className || tx.grade || '-'}</td>
                <td>${tx.section || '-'}</td>
                <td>${tx.termName || 'Unassigned'}</td>
                <td>${tx.feeType || '-'}</td>
                <td>${tx.paymentMethod || '-'}</td>
                <td>Brr ${(tx.amountPaid || 0).toLocaleString()}</td>
                <td>${formatDate(tx.paymentDate)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>School Management System - Finance Report</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };
  
  // Current user (mock - in real app get from auth)
  const currentUser = { name: 'Finance Manager', role: 'FINANCE' };

  // Load academic years and then dashboard data
  useEffect(() => {
    const loadSetupData = async () => {
      try {
        const response = await academicYearsAPI.getAll();
        console.log('Years loaded:', response.data);
        if (response.data.length > 0) {
          setAcademicYears(response.data);
          const activeYear = response.data.find((year: AcademicYear) => year.isActive);
          setSelectedYear((activeYear || response.data[0]).id);
        }
      } catch (error) {
        console.error('Error loading:', error);
      }
    };
    loadSetupData();
  }, []);

  // Load curriculum info when academic year changes
  useEffect(() => {
    const loadCurriculumInfo = async () => {
      if (!selectedYear || !user?.schoolId) return;
      try {
        const response = await financeAPI.getCurriculumInfo(user.schoolId, selectedYear);
        if (response.data?.success) {
          setCurriculumType(response.data.curriculumType || 'TERM');
          const loadedTerms: Term[] = response.data.terms || [];
          setTerms(loadedTerms);

          setSelectedTerm((currentSelectedTerm) => {
            if (currentSelectedTerm && loadedTerms.some(term => term.id === currentSelectedTerm)) {
              return currentSelectedTerm;
            }

            const today = new Date();
            const current = loadedTerms.find(term => {
              if (!term.startDate || !term.endDate) return false;
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
        setSelectedTerm('all');
      }
    };
    loadCurriculumInfo();
  }, [selectedTerm, selectedYear, user?.schoolId]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!selectedYear) return;
    if (selectedTerm && selectedTerm !== 'all' && !terms.some((term) => term.id === selectedTerm)) {
      return;
    }
    
    setLoading(true);
    try {
      // Get date range
      const today = new Date();
      let fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      let toDate: string = today.toISOString().split('T')[0];
      
      // If a specific term is selected, use its date range instead
      if (selectedTerm && selectedTerm !== 'all') {
        const selectedTermData = terms.find(t => t.id === selectedTerm);
        if (selectedTermData?.startDate && selectedTermData?.endDate) {
          fromDate = new Date(selectedTermData.startDate).toISOString().split('T')[0];
          toDate = new Date(selectedTermData.endDate).toISOString().split('T')[0];
        }
      }

      // Fetch all data in parallel
      const schoolId = user?.schoolId;
      if (!schoolId) {
        toast.error('School ID not found. Please log in again.');
        setLoading(false);
        return;
      }

      const termFilter = selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined;
      console.log('Fetching fee structures with:', { schoolId, selectedYear });
      
      const [dailyReport, outstandingResponse, feeStructuresResponse] = await Promise.all([
        financeAPI.getDailyReport({ 
          schoolId: schoolId, 
          from: fromDate, 
          to: toDate,
          termId: termFilter,
          academicYearId: selectedYear
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
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedTerm, terms, user?.schoolId]);

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
  }, [selectedYear, selectedTerm, terms, user?.schoolId, loadDashboardData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Receipt className="w-3 h-3 mr-1" />Cheque</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(t =>
    (t.studentName || '').toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    t.receiptNumber.toLowerCase().includes(transactionsSearch.toLowerCase()) ||
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
  const selectedStudentData = selectedStudentFees.find(
    (entry) =>
      entry.student.userId === paymentForm.studentId ||
      entry.student.id === paymentForm.studentId,
  );
  const selectedFee =
    selectedStudentData?.fees.find((fee) => fee.id === selectedFeeId) ||
    selectedStudentData?.fees.find((fee) => fee.status !== 'PAID') ||
    selectedStudentData?.fees[0];
  const selectedPaymentTermId =
    selectedFee?.termId ||
    paymentForm.termId ||
    (selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined);
  const selectedPaymentTermName =
    selectedPaymentTermId
      ? terms.find((term) => term.id === selectedPaymentTermId)?.name ||
        selectedFee?.termName ||
        null
      : selectedFee?.termName || null;

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
      toast.error('Student and amount are required');
      return;
    }
    if (!selectedPaymentTermId) {
      toast.error('Select the term or semester this payment is for');
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
        termId: selectedPaymentTermId,
        amountPaid: paymentForm.amountPaid,
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded successfully');
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
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleSendPeriodReminders = async () => {
    if (!user?.schoolId || !selectedTerm || selectedTerm === 'all') {
      toast.error('Select one term or semester before sending reminders');
      return;
    }

    setIsSendingReminders(true);
    try {
      const response = await financeAPI.sendPeriodFeeReminders({
        schoolId: user.schoolId,
        termId: selectedTerm,
      });
      const sent = response.data?.sent ?? 0;
      toast.success(`Fee reminders sent to ${sent} parent${sent === 1 ? '' : 's'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send fee reminders');
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleReversePayment = async (tx: Transaction) => {
    if (!user?.schoolId) return;

    toast.warning('Reverse payment?', {
      description: `Reverse payment ${tx.receiptNumber} for ${formatCurrency(tx.amountPaid)}? This will remove the receipt and recalculate the fee balance.`,
      duration: 10000,
      cancel: {
        label: 'Cancel',
        onClick: () => undefined,
      },
      action: {
        label: 'Reverse',
        onClick: async () => {
          setReversingPaymentId(tx.id);
          try {
            await financeAPI.reversePayment(tx.id, {
              schoolId: user.schoolId,
              reason: 'Reversed from finance dashboard',
            });
            toast.success('Payment reversed and balance recalculated');
            loadDashboardData();
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reverse payment');
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
        termId,
      );
      const fees = Array.isArray(feeRes?.data?.feeItems) ? feeRes.data.feeItems : [];
      setSelectedStudentFees((current) =>
        current.map((entry) =>
          entry.student.userId === paymentForm.studentId ||
          entry.student.id === paymentForm.studentId
            ? { ...entry, fees }
            : entry,
        ),
      );
      const nextFee = fees.find((fee: StudentFeeItem) => fee.status !== 'PAID') || fees[0];
      setSelectedFeeId(nextFee?.id || '');
      setPaymentForm((current) => ({
        ...current,
        termId,
        amountPaid: nextFee?.balance || 0,
      }));
    } catch (error) {
      console.error('Failed to refresh selected student fees:', error);
      toast.error('Failed to load fees for the selected term or semester');
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
      const students: StudentSearchResult[] = response.data?.data || response.data?.rows || [];
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
            selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined,
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
      toast.error('Session error. Please refresh');
      return;
    }
    if (!yearId) {
      toast.error('No academic year available');
      return;
    }
    
    if (!feeStructureForm.feeType || feeStructureForm.feeType.trim() === '') {
      toast.error('Please select a fee type');
      return;
    }
    
    if (!feeStructureForm.amount || feeStructureForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    let targetGrades: number[] = [];
    if (feeStructureForm.gradeMode === 'single') {
      const parsedGrade = parseInt(feeStructureForm.grade, 10);
      if (!parsedGrade || parsedGrade < 1 || parsedGrade > 12) {
        toast.error('Please select a valid grade');
        return;
      }
      targetGrades = [parsedGrade];
    } else if (feeStructureForm.gradeMode === 'range') {
      const fromGrade = parseInt(feeStructureForm.gradeFrom, 10);
      const toGrade = parseInt(feeStructureForm.gradeTo, 10);
      if (!fromGrade || !toGrade || fromGrade < 1 || toGrade > 12 || fromGrade > toGrade) {
        toast.error('Please select a valid grade range');
        return;
      }
      targetGrades = Array.from({ length: toGrade - fromGrade + 1 }, (_, index) => fromGrade + index);
    }

    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }

setIsCreatingFeeStructure(true);
    try {
      console.log('Creating fee structure - school:', schoolId, 'year:', yearId);
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
          ? `Fee structures created for Grades ${targetGrades[0]}-${targetGrades[targetGrades.length - 1]}`
          : 'Fee structure created successfully',
      );
      setFeeStructureOpen(false);
      setFeeStructureForm({
        feeType: '',
        amount: 0,
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
      toast.error(error.response?.data?.message || 'Failed to create fee structure');
    } finally {
      setIsCreatingFeeStructure(false);
    }
  };

  // Calculate chart max value
  const chartMaxValue = Math.max(...chartRevenueData.map(d => d.amount), 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finance Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monitor school fee collections and financial overview</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Academic Year Selector */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px] bg-white dark:bg-slate-700 text-xs">
                <SelectValue placeholder="Academic Year" />
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
                <SelectValue placeholder={curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {curriculumType === 'SEMESTER' ? 'Semesters' : curriculumType === 'QUARTER' ? 'Quarters' : 'Terms'}</SelectItem>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-5 w-px bg-slate-300 dark:bg-slate-600" />

            <Button 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap text-xs h-8"
              onClick={() => setRecordPaymentOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Record Payment
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="whitespace-nowrap text-xs h-8"
              onClick={openFeeStructureDialog}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Fee Structure
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="whitespace-nowrap text-xs h-8"
              disabled={isSendingReminders || !selectedTerm || selectedTerm === 'all'}
              onClick={handleSendPeriodReminders}
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {isSendingReminders ? 'Sending...' : 'Send Reminders'}
            </Button>
            <Button size="sm" variant="outline" className="whitespace-nowrap text-xs h-8" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {/* Total Revenue */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collected Today */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Collected Today</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {formatCurrency(stats.collectedToday)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Balance */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Balance</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {formatCurrency(stats.outstandingBalance)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fully Paid */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Fully Paid</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {stats.totalStudentsFullyPaid}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partial Payment */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Partial Payment</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {stats.studentsPartialPayment}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <MinusCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unpaid */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unpaid</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {stats.unpaidStudentsCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Structures Section */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Fee Structures</CardTitle>
              <div className="flex gap-2">
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
                    });
                    console.log('Generate result:', result);
                    toast.success(result.data?.created ? `Created ${result.data.created} fees!` : 'No fees created');
                    loadDashboardData();
                  } catch (e: any) {
                    console.error('Generate error:', e);
                    toast.error(e.response?.data?.message || e.message || 'Failed to generate fees');
                  }
                }}>
                  Generate Student Fees
                </Button>
                <Button size="sm" onClick={() => setFeeStructureOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Fee Structure
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <p className="text-sm">Loading...</p>
              </div>
            ) : displayFeeStructures.length > 0 ? (
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[40%] text-left">Fee Type</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[30%] text-left">Grade</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[30%] text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayFeeStructures.map((fee) => (
                    <TableRow key={fee.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white py-3 px-4 w-[40%] text-left">
                        <div>{fee.feeType}</div>
                        {fee.termName && (
                          <div className="text-xs font-normal text-slate-500 dark:text-gray-400">
                            {fee.termName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-gray-300 py-3 px-4 w-[30%] text-left">{fee.gradeLabel}</TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300 py-3 px-4 w-[30%] text-right">{formatCurrency(fee.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Receipt className="w-8 h-8 mb-2" />
                <p className="text-sm">No fee structures found</p>
                <p className="text-xs mt-1">Click "Add Fee Structure" to create one</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Trend Chart */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
                <Tabs value={chartView} onValueChange={(v) => setChartView(v as ChartView)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="daily" className="text-xs px-3">Daily</TabsTrigger>
                    <TabsTrigger value="weekly" className="text-xs px-3">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-end gap-2">
                {chartRevenueData.length > 0 ? (
                  chartRevenueData.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                        style={{ 
                          height: `${(item.amount / chartMaxValue) * 200}px`,
                          minHeight: item.amount > 0 ? '4px' : '0'
                        }}
                        title={`${formatDate(item.date)}: ${formatCurrency(item.amount)}`}
                      />
                      <FormattedDate
                        date={item.date}
                        className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate w-full text-center"
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fee Breakdown */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Collection Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Tuition', value: feeBreakdown.tuition, color: 'bg-blue-500' },
                  { label: 'Registration', value: feeBreakdown.registration, color: 'bg-green-500' },
                  { label: 'Exam Fee', value: feeBreakdown.examFee, color: 'bg-purple-500' },
                  { label: 'Library', value: feeBreakdown.library, color: 'bg-yellow-500' },
                  { label: 'Other', value: feeBreakdown.other, color: 'bg-slate-500' },
                ].map((item, index) => {
                  const total = feeBreakdown.tuition + feeBreakdown.registration + 
                    feeBreakdown.examFee + feeBreakdown.library + feeBreakdown.other;
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Section */}
        <div className="space-y-6">
          {/* Recent Transactions */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold dark:text-white">Recent Transactions</CardTitle>
                <div className="relative w-[600px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search..."
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
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Receipt #</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Student</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Class</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Section</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Term/Semester</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Fee</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Method</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Amount</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Date</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{tx.receiptNumber}</TableCell>
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{tx.studentName}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.className || tx.grade || '-'}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.section || '-'}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.termName || 'Unassigned'}</TableCell>
                        <TableCell className="text-xs py-3 px-4 dark:text-gray-300">{tx.feeType || '-'}</TableCell>
                        <TableCell className="text-xs py-3 px-4">{getPaymentMethodBadge(tx.paymentMethod)}</TableCell>
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{formatCurrency(tx.amountPaid)}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-gray-400 py-3 px-4">{formatDate(tx.paymentDate)}</TableCell>
                        <TableCell className="text-xs py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                            disabled={reversingPaymentId === tx.id}
                            onClick={() => handleReversePayment(tx)}
                          >
                            {reversingPaymentId === tx.id ? 'Reversing...' : 'Reverse'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-slate-500 py-8 dark:text-gray-400">
                        No transactions found
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold dark:text-white">Outstanding Fees</CardTitle>
                  {selectedTerm && selectedTerm !== 'all' && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                      Year-wide fees are split into the selected curriculum period share in this view.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search student..."
                    value={outstandingSearch}
                    onChange={(e) => setOutstandingSearch(e.target.value)}
                    className="h-8 w-96 text-xs"
                  />
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                    {['all', 'PAID', 'PARTIAL', 'UNPAID'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setOutstandingStatusFilter(status)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          outstandingStatusFilter === status
                            ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {status === 'all' ? 'All' : status === 'PAID' ? 'Paid' : status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-[400px] overflow-y-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[25%] text-left">Student</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-left">Grade</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-left">Scope</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">Total</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">Paid</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">Balance</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOutstandingFees.length > 0 ? (
                        paginatedOutstandingFees.map((fee) => (
                          <TableRow key={fee.id} className={`border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${fee.status === 'UNPAID' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <TableCell className="text-xs font-medium dark:text-white py-3 px-4 w-[25%] text-left">{fee.studentName}</TableCell>
                            <TableCell className="text-xs dark:text-gray-300 py-3 px-4 w-[15%] text-left">{fee.grade ? `${fee.grade}${fee.section ? ` - ${fee.section}` : ''}` : '-'}</TableCell>
                            <TableCell className="py-3 px-4 w-[15%] text-left">
                              <div className="text-xs dark:text-gray-300">{fee.scopeLabel || '-'}</div>
                              {fee.isYearWide && (
                                <div className="text-[10px] text-slate-500 dark:text-gray-400">Derived from annual fee</div>
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
                        const nextFee =
                          studentFeeData?.fees.find((fee) => fee.status !== 'PAID') ||
                          studentFeeData?.fees[0];
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
                <Label>Term / Semester Paid</Label>
                <Select
                  value={selectedPaymentTermId || paymentForm.termId}
                  onValueChange={(value) => {
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
              <Label>Transaction Reference (from bank receipt)</Label>
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
              Create this fee for the whole academic year or only for one {curriculumType === 'SEMESTER' ? 'semester' : curriculumType === 'QUARTER' ? 'quarter' : 'term'}.
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
                    {GRADE_OPTIONS.map(g => (
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
                      {GRADE_OPTIONS.map(g => (
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
                      {GRADE_OPTIONS.map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount (ETB)</Label>
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
