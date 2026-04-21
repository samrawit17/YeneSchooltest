'use client';

import { useEffect, useState, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
  grade?: string;
  section?: string;
  paymentMethod: string;
  amountPaid: number;
  recordedBy?: string;
  paymentDate: string;
  notes?: string | null;
}

interface OutstandingFee {
  id?: string;
  studentId: string;
  studentName: string;
  grade?: string | null;
  section?: string | null;
  feeType: string;
  total: number;
  paid: number;
  remaining: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'UNPAID';
}

type DateRange = 'today' | 'week' | 'month' | 'custom';
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
  const [dateRange, setDateRange] = useState<DateRange>('month');
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
  
  // Dialogs
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [feeStructureOpen, setFeeStructureOpen] = useState(false);
  
  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    studentFeeId: '',
    amountPaid: 0,
    paymentMethod: 'BANK_TRANSFER' as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
    transactionReference: '',
    notes: '',
  });
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudentFees, setSelectedStudentFees] = useState<any[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  
  // Fee Structure Form State
  const [feeStructureForm, setFeeStructureForm] = useState({
    feeType: '',
    amount: 0,
    grade: 'all',
    description: '',
  });
  const [isCreatingFeeStructure, setIsCreatingFeeStructure] = useState(false);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Student', 'Grade', 'Total Fee', 'Paid', 'Balance', 'Status'];
    const rows = outstandingFees.map(fee => [
      fee.studentName || '',
      fee.grade ? `${fee.grade}${fee.section ? ' - ' + fee.section : ''}` : '',
      (fee.total || 0).toString(),
      (fee.paid || 0).toString(),
      (fee.remaining || 0).toString(),
      fee.status || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
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
          setSelectedYear(response.data[0].id);
        }
      } catch (error) {
        console.error('Error loading:', error);
      }
    };
    loadSetupData();
  }, []);

  // Load dashboard when year or user changes
  useEffect(() => {
    if (selectedYear && user?.schoolId) {
      console.log('Loading dashboard data...');
      loadDashboardData();
    }
  }, [selectedYear, user?.schoolId]);

  // Load curriculum info when academic year changes
  useEffect(() => {
    const loadCurriculumInfo = async () => {
      if (!selectedYear || !user?.schoolId) return;
      try {
        const response = await financeAPI.getCurriculumInfo(user.schoolId, selectedYear);
        if (response.data?.success) {
          setCurriculumType(response.data.curriculumType || 'TERM');
          setTerms(response.data.terms || []);
        }
      } catch (error) {
        console.error('Error loading curriculum info:', error);
        setTerms([]);
      }
    };
    loadCurriculumInfo();
  }, [selectedYear, user?.schoolId]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!selectedYear) return;
    
    setLoading(true);
    try {
      // Get date range
      const today = new Date();
      let fromDate: string;
      let toDate: string = today.toISOString().split('T')[0];
      
      // If a specific term is selected, use its date range instead of dateRange selector
      if (selectedTerm && selectedTerm !== 'all') {
        const selectedTermData = terms.find(t => t.id === selectedTerm);
        if (selectedTermData?.startDate && selectedTermData?.endDate) {
          fromDate = new Date(selectedTermData.startDate).toISOString().split('T')[0];
          toDate = new Date(selectedTermData.endDate).toISOString().split('T')[0];
        }
      } else {
        switch (dateRange) {
          case 'today':
            fromDate = toDate;
            break;
          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - 7);
            fromDate = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            fromDate = monthStart.toISOString().split('T')[0];
            break;
          default:
            fromDate = toDate;
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
        financeAPI.listFeeStructures(schoolId, selectedYear).catch(e => {
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
  }, [selectedYear, selectedTerm, dateRange]);

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
    t.receiptNumber.toLowerCase().includes(transactionsSearch.toLowerCase())
  );

  const paginatedTransactions = filteredTransactions.slice(
    (transactionsPage - 1) * transactionsLimit,
    transactionsPage * transactionsLimit
  );

  // Handle Record Payment
  const handleRecordPayment = async () => {
    if (!paymentForm.studentId || !paymentForm.amountPaid) {
      toast.error('Student and amount are required');
      return;
    }
    
    // Find the fee ID - use selected one or let backend find it
    const feeId = selectedFeeId;
    console.log('Recording payment - studentId:', paymentForm.studentId, 'feeId:', feeId);
    
    setIsRecordingPayment(true);
    try {
      await financeAPI.recordPayment({
        schoolId: user?.schoolId || '',
        studentFeeId: feeId,
        studentId: paymentForm.studentId,
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

// Search students for payment (auto-search as you type)
  const handleSearchStudents = async (searchTerm: string) => {
    console.log('Searching for:', searchTerm, 'schoolId:', user?.schoolId);
    
    if (!searchTerm.trim() || !user?.schoolId || searchTerm.length < 2) {
      setStudentResults([]);
      return;
    }
    
    setIsSearchingStudents(true);
    try {
      const response = await studentsAPI.getAll({ 
        search: searchTerm.trim(),
        limit: '20'
      });
      console.log('Student search response:', response);
      const students = response.data?.data || response.data?.rows || [];
      console.log('Found students:', students);
setStudentResults(students);
      
      // Get their fees inline
      const feesWithStudents = [];
      for (const s of students) {
        const sid = s.userId || s.id;
        try {
          const feeRes = await financeAPI.getStudentFees(sid, user.schoolId, selectedYear);
          const fees = feeRes?.data?.data || feeRes?.data || [];
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
  };

  // Auto-search when typing
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchStudents(studentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

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

    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }

setIsCreatingFeeStructure(true);
    try {
      console.log('Creating fee structure - school:', schoolId, 'year:', yearId);
      await financeAPI.createFeeStructure({
        schoolId: schoolId,
        academicYearId: yearId,
          feeType: feeStructureForm.feeType,
          amount: feeStructureForm.amount,
          grade: feeStructureForm.grade && feeStructureForm.grade !== 'all' ? parseInt(feeStructureForm.grade) : undefined,
          description: feeStructureForm.description,
        });
      toast.success('Fee structure created successfully');
      setFeeStructureOpen(false);
      setFeeStructureForm({
        feeType: '',
        amount: 0,
        grade: 'all',
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
  const chartMaxValue = Math.max(...revenueData.map(d => d.amount), 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#e35336]">Finance Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monitor school fee collections and financial overview</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year Selector */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-slate-700">
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
              <SelectTrigger className="w-[150px] bg-white dark:bg-slate-700">
                <SelectValue placeholder={curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {curriculumType === 'SEMESTER' ? 'Semesters' : curriculumType === 'QUARTER' ? 'Quarters' : 'Terms'}</SelectItem>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Selector */}
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[150px] bg-white dark:bg-slate-700">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setRecordPaymentOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
          <Button 
            variant="outline"
            onClick={() => setFeeStructureOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Fee Structure
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handlePrintSummary}>
            <Printer className="w-4 h-4 mr-2" />
            Print Summary
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
            ) : feeStructures.length > 0 ? (
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[40%] text-left">Fee Type</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[30%] text-left">Grade</TableHead>
                    <TableHead className="text-sm font-semibold text-slate-500 dark:text-gray-300 py-3 px-4 w-[30%] text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.map((fee) => (
                    <TableRow key={fee.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-white py-3 px-4 w-[40%] text-left">{fee.feeType}</TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-gray-300 py-3 px-4 w-[30%] text-left">{fee.grade ? `Grade ${fee.grade}` : 'All Grades'}</TableCell>
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
                {revenueData.length > 0 ? (
                  revenueData.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                        style={{ 
                          height: `${(item.amount / chartMaxValue) * 200}px`,
                          minHeight: item.amount > 0 ? '4px' : '0'
                        }}
                        title={`${item.date}: ${formatCurrency(item.amount)}`}
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate w-full text-center">
                        {item.date}
                      </span>
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
                <div className="relative w-[200px]">
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
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Method</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Amount</TableHead>
                    <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{tx.receiptNumber}</TableCell>
                        <TableCell className="text-xs py-3 px-4">
                          <div>
                            <div className="font-medium dark:text-white">{tx.studentName}</div>
                            <div className="text-slate-500 dark:text-gray-400">{tx.grade} - {tx.section}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3 px-4">{getPaymentMethodBadge(tx.paymentMethod)}</TableCell>
                        <TableCell className="text-xs font-medium dark:text-white py-3 px-4">{formatCurrency(tx.amountPaid)}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-gray-400 py-3 px-4">{formatDate(tx.paymentDate)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8 dark:text-gray-400">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-500">
                  Showing {(transactionsPage - 1) * transactionsLimit + 1} to {Math.min(transactionsPage * transactionsLimit, transactionsTotal)} of {transactionsTotal}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                    disabled={transactionsPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTransactionsPage(p => p + 1)}
                    disabled={transactionsPage * transactionsLimit >= transactionsTotal}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Fees */}
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2 border-b dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold dark:text-white">Outstanding Fees</CardTitle>
                <Input
                  placeholder="Search student..."
                  value={outstandingSearch}
                  onChange={(e) => setOutstandingSearch(e.target.value)}
                  className="h-8 w-48 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-[400px] overflow-y-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[25%] text-left">Student</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-left">Grade</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">Total</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">Paid</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-right">Balance</TableHead>
                      <TableHead className="text-xs font-semibold dark:text-gray-300 py-3 px-4 w-[15%] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filtered = outstandingFees.filter(fee => 
                        !outstandingSearch || 
                        fee.studentName?.toLowerCase().includes(outstandingSearch.toLowerCase()) ||
                        fee.grade?.toLowerCase().includes(outstandingSearch.toLowerCase())
                      );
                      const startIdx = (outstandingPage - 1) * outstandingLimit;
                      const paginated = filtered.slice(startIdx, startIdx + outstandingLimit);
                      return paginated.length > 0 ? (
                        paginated.map((fee) => (
                          <TableRow key={fee.id} className={`border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${fee.status === 'UNPAID' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <TableCell className="text-xs font-medium dark:text-white py-3 px-4 w-[25%] text-left">{fee.studentName}</TableCell>
                            <TableCell className="text-xs dark:text-gray-300 py-3 px-4 w-[15%] text-left">{fee.grade ? `${fee.grade}${fee.section ? ` - ${fee.section}` : ''}` : '-'}</TableCell>
                            <TableCell className="text-xs dark:text-white py-3 px-4 w-[15%] text-right">{formatCurrency(fee.total || 0)}</TableCell>
                            <TableCell className="text-xs text-green-600 dark:text-green-400 py-3 px-4 w-[15%] text-right">{formatCurrency(fee.paid || 0)}</TableCell>
                            <TableCell className="text-xs font-medium text-red-600 dark:text-red-400 py-3 px-4 w-[15%] text-right">{formatCurrency(fee.remaining || 0)}</TableCell>
                            <TableCell className="text-xs py-3 px-4 w-[15%] text-center">{getStatusBadge(fee.status)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500 py-8 dark:text-gray-400">
                            {outstandingSearch ? 'No matching fees found' : 'No outstanding fees'}
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
              {outstandingFees.length > 10 && (
                <div className="flex items-center justify-between py-3 px-4 border-t dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-gray-400">
                    Showing {((outstandingPage - 1) * outstandingLimit) + 1} to {Math.min(outstandingPage * outstandingLimit, outstandingFees.length)} of {outstandingFees.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOutstandingPage(p => Math.max(1, p - 1))}
                      disabled={outstandingPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs dark:text-white">
                      Page {outstandingPage} of {Math.ceil(outstandingFees.length / outstandingLimit)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOutstandingPage(p => Math.min(Math.ceil(outstandingFees.length / outstandingLimit), p + 1))}
                      disabled={outstandingPage >= Math.ceil(outstandingFees.length / outstandingLimit)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Student Search - auto-searches as you type */}
            <div className="space-y-2">
              <Label>Search Student (type at least 2 chars)</Label>
              <Input 
                placeholder="Type name or student ID..." 
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            
            {/* Student Results */}
            {studentResults.length > 0 && (
              <div className="space-y-2">
                <Label>Select Student (showing {studentResults.length} results)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {studentResults.map((student) => (
                    <div 
                      key={student.userId || student.id}
                      className={`p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${paymentForm.studentId === (student.userId || student.id) ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                      onClick={() => {
                        setPaymentForm({...paymentForm, studentId: student.userId || student.id});
                        setSelectedFeeId('');
                      }}
                    >
                      <p className="font-medium">{student.user?.name || student.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">ID: {student.studentCode || student.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Selected Student Info & Fee Selection */}
            {paymentForm.studentId && selectedStudentFees.length > 0 && selectedStudentFees.some(s => s.student.userId === paymentForm.studentId || s.student.id === paymentForm.studentId) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Label>Select Fee to Pay</Label>
                {(() => {
                  const studentData = selectedStudentFees.find(s => s.student.userId === paymentForm.studentId || s.student.id === paymentForm.studentId);
                  if (!studentData) return <p className="text-sm">Select a student</p>;
                  const rawFees = studentData?.fees;
                  const feesArray = Array.isArray(rawFees) ? rawFees : (Array.isArray(rawFees?.data) ? rawFees.data : []);
                  const unpaidFees = feesArray.filter(f => f.status !== 'PAID');
                  if (unpaidFees.length === 0) {
                    return <p className="text-sm text-green-600">All fees paid! 🎉</p>;
                  }
                  return (
                    <div className="space-y-2 mt-2">
                      {unpaidFees.map(fee => (
                        <div 
                          key={fee.id}
                          className={`p-2 border rounded cursor-pointer ${selectedFeeId === fee.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                          onClick={() => {
                            setSelectedFeeId(fee.id);
                            setPaymentForm({...paymentForm, amountPaid: fee.amount - (fee.paid || 0)});
                          }}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{fee.feeType}</span>
                            <span>{formatCurrency(fee.amount - (fee.paid || 0))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Fee Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Label>Grade</Label>
              <Select 
                value={feeStructureForm.grade}
                onValueChange={(value) => setFeeStructureForm({...feeStructureForm, grade: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                    <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
