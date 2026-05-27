"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { financeAPI, academicYearsAPI, classesAPI, schoolSettingsAPI } from '@/lib/api';
import { convertToEthiopian, formatDateByCalendarType, formatDateTimeByCalendarType } from '@/lib/calendar-utils';
import { getGradeRangeFromSystem } from '@/lib/grade-system';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import TableSearch from '@/components/TableSearch';
import { 
  DollarSign, 
  CreditCard, 
  FileText, 
  Plus, 
  Search, 
  Download,
  Edit,
  Trash2,
  Eye,
  Filter,
  Users,
  Banknote,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Types
interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId: string | null;
  grade: number | null;
  feeType: string;
  amount: number;
  semester: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  term?: { id: string; name: string; order: number };
}

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  feeType: string;
  totalFee: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING';
  dueDate: string;
  termName?: string | null;
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentId: string;
  grade: string;
  section: string;
  paymentMethod: string;
  amountPaid: number;
  recordedBy: string;
  paymentDate: string;
  notes: string | null;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
  order: number;
}

interface CurriculumInfo {
  curriculumType: string;
  terms: Term[];
  termCount: number;
}

const FEE_TYPES = [
  { value: 'TUITION', label: 'Tuition' },
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'EXAM', label: 'Exam Fee' },
  { value: 'LIBRARY', label: 'Library' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OTHER', label: 'Other' },
];

const ALL_FEE_TYPES_VALUE = 'ALL_CATEGORIES';

const GRADE_RANGES = [
  { value: '1-12', label: 'Grades 1-12', from: 1, to: 12 },
  { value: '1-10', label: 'Grades 1-10', from: 1, to: 10 },
  { value: '1-8', label: 'Grades 1-8', from: 1, to: 8 },
  { value: '1-5', label: 'Grades 1-5', from: 1, to: 5 },
  { value: '9-12', label: 'Grades 9-12', from: 9, to: 12 },
];

export default function FinanceListPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('fee-structures');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [curriculumType, setCurriculumType] = useState<string>('TERM');
  const [feeCollectionMode, setFeeCollectionMode] = useState<string>('TERM');
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const activeCalendarType = user?.calendarType || 'ETHIOPIAN';
  const [allowedGradeRange, setAllowedGradeRange] = useState(() => getGradeRangeFromSystem('1-12'));
  const availableGradeRanges = GRADE_RANGES.filter(
    (range) => range.from >= allowedGradeRange.min && range.to <= allowedGradeRange.max,
  );
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFeeType, setSelectedFeeType] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  
  // Dialogs
  const [feeStructureDialogOpen, setFeeStructureDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    feeType: '',
    grade: '1-12',
    amount: '',
    termId: '',
    semester: '',
    description: '',
    isActive: true,
  });

  const generatedFeeStructures = feeStructures.filter((structure) =>
    structure.feeType.includes('_INSTALLMENT_'),
  );

  // Load academic years
  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const response = await academicYearsAPI.getAll();
        const years = response.data;
        setAcademicYears(years);
        // Set the first academic year as default (prefer active one)
        if (years.length > 0) {
          const activeYear = years.find((y: any) => y.isActive) || years[0];
          setSelectedYear(activeYear.id);
        }
      } catch (error) {
        console.error('Error loading academic years:', error);
      }
    };
    loadAcademicYears();
  }, []);

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
    
    // Load fee collection mode
    const loadFeeCollectionMode = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await financeAPI.getFeeCollectionMode(user.schoolId);
        if (response.data?.success) {
          setFeeCollectionMode(response.data.mode || 'TERM');
          setInstallmentCount(response.data.installmentCount || 3);
        }
      } catch (error) {
        console.error('Error loading fee collection mode:', error);
      }
    };
    
    loadCurriculumInfo();
    loadFeeCollectionMode();
    // Reset term filter when year changes
    setSelectedTerm('all');
  }, [selectedYear, user?.schoolId]);

  useEffect(() => {
    const loadGradeRange = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await schoolSettingsAPI.getAll(user.schoolId);
        const range = getGradeRangeFromSystem(response.data?.grade_system || '1-12');
        setAllowedGradeRange(range);
        setFormData((current) => {
          const selectedRange = GRADE_RANGES.find((item) => item.value === current.grade);
          if (selectedRange && selectedRange.from >= range.min && selectedRange.to <= range.max) return current;
          const fallback = GRADE_RANGES.find((item) => item.from >= range.min && item.to <= range.max);
          return { ...current, grade: fallback?.value || '' };
        });
      } catch (error) {
        setAllowedGradeRange(getGradeRangeFromSystem('1-12'));
      }
    };
    loadGradeRange();
  }, [user?.schoolId]);

  // Load data based on active tab
  useEffect(() => {
    if (!selectedYear) return;
    loadData();
  }, [activeTab, selectedYear, selectedTerm, currentPage, searchTerm, selectedGrade, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'fee-structures') {
        const schoolId = user?.schoolId;
        if (!schoolId) {
          toast.error('School ID not found. Please log in again.');
          setLoading(false);
          return;
        }
        const termId = selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined;
        const response = await financeAPI.listFeeStructures(schoolId, selectedYear, termId);
        setFeeStructures((response.data?.data || []).filter((structure: FeeStructure) => structure.isActive));
      } else if (activeTab === 'student-fees') {
        const schoolId = user?.schoolId;
        if (!schoolId) {
          toast.error('School ID not found. Please log in again.');
          setLoading(false);
          return;
        }
        const termId = selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined;
        const response = await financeAPI.listStudentFees({
          schoolId: schoolId,
          academicYearId: selectedYear,
          termId,
          grade: selectedGrade && selectedGrade !== 'all' ? parseInt(selectedGrade) : undefined,
          status: selectedStatus && selectedStatus !== 'all' ? selectedStatus as 'PAID' | 'PARTIAL' | 'PENDING' : undefined,
          page: Number(currentPage),
          limit: Number(pageSize),
        });
        // Handle both wrapped and unwrapped response formats
        const responseData = response.data?.data || response.data || [];
        const totalCount = response.data?.total ?? response.data?.length ?? 0;
        setStudentFees(responseData);
        setTotalItems(totalCount);
        setTotalPages(Math.ceil(totalCount / pageSize));
      } else if (activeTab === 'payments') {
        const schoolId = user?.schoolId;
        if (!schoolId) {
          toast.error('School ID not found. Please log in again.');
          setLoading(false);
          return;
        }
        // Load all payments
        const response = await financeAPI.getAllPayments({
          schoolId: schoolId,
        });
        setPayments(response.data.payments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Create fee structure
  const handleCreateFeeStructure = async () => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }
    if (!selectedYear) {
      toast.error('Please select an academic year');
      return;
    }
    if (!formData.feeType || !formData.grade || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const selectedRange = GRADE_RANGES.find((range) => range.value === formData.grade);
    if (!selectedRange) {
      toast.error('Please select a grade range');
      return;
    }
    const feeTypesToCreate = formData.feeType === ALL_FEE_TYPES_VALUE
      ? FEE_TYPES.map((feeType) => feeType.value)
      : [formData.feeType];
    const gradesToCreate = Array.from(
      { length: selectedRange.to - selectedRange.from + 1 },
      (_, index) => selectedRange.from + index,
    );
    try {
      await Promise.all(
        feeTypesToCreate.flatMap((feeType) =>
          gradesToCreate.map((grade) =>
            financeAPI.createFeeStructure({
              schoolId: schoolId,
              feeType,
              academicYearId: selectedYear,
              termId: formData.termId && formData.termId !== 'all' ? formData.termId : undefined,
              grade,
              amount,
              semester: formData.semester ? parseInt(formData.semester) : undefined,
              description: formData.description || undefined,
            }),
          ),
        ),
      );
      toast.success(
        `Created ${feeTypesToCreate.length * gradesToCreate.length} fee structure${feeTypesToCreate.length * gradesToCreate.length === 1 ? '' : 's'}`,
      );
      setFeeStructureDialogOpen(false);
      setFormData({ feeType: '', grade: availableGradeRanges[0]?.value || '', amount: '', termId: '', semester: '', description: '', isActive: true });
      loadData();
    } catch (error) {
      toast.error('Failed to create fee structure');
    }
  };

  const deleteFeeStructure = async (id: string, schoolId: string) => {
    try {
      await financeAPI.deleteFeeStructure(id, schoolId);
      toast.success('Fee structure deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete fee structure');
    }
  };

  // Delete fee structure
  const handleDeleteFeeStructure = (id: string) => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }
    toast.warning('Delete this fee structure?', {
      description: 'This will remove the selected fee installment.',
      action: {
        label: 'Delete',
        onClick: () => deleteFeeStructure(id, schoolId),
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      duration: 10000,
    });
  };

  // View student fee details
  const handleViewDetails = (fee: StudentFee) => {
    setSelectedFee(fee);
    setViewDetailsDialogOpen(true);
  };

  // Record payment state
  const [paymentFormData, setPaymentFormData] = useState({
    amountPaid: '',
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!selectedFee || !paymentFormData.amountPaid) {
      toast.error('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentFormData.amountPaid);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > selectedFee.remainingBalance) {
      toast.error('Amount exceeds remaining balance');
      return;
    }

    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }

    try {
      await financeAPI.recordPayment({
        schoolId,
        studentFeeId: selectedFee.id,
        studentId: selectedFee.studentId,
        amountPaid: amount,
        paymentMethod: paymentFormData.paymentMethod,
        transactionReference: paymentFormData.transactionReference || undefined,
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes || undefined,
      });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentFormData({
        amountPaid: '',
        paymentMethod: 'CASH',
        transactionReference: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadData(); // Refresh the data
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error?.response?.data?.message || 'Failed to record payment');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ET');
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'PENDING':
      case 'UNPAID':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Unpaid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handler for generating installments
  const handleGenerateInstallments = async () => {
    if (!user?.schoolId || !selectedYear) {
      toast.error('Please select an academic year');
      return;
    }
    try {
      const gradeSpecificBaseStructures = feeStructures.filter((structure) =>
        structure.isActive &&
        structure.feeType === 'TUITION' &&
        !structure.feeType.includes('_INSTALLMENT_') &&
        structure.grade !== null &&
        structure.grade !== undefined,
      );
      const grades = Array.from(
        new Set(gradeSpecificBaseStructures.map((structure) => structure.grade).filter((grade): grade is number => typeof grade === 'number')),
      ).sort((a, b) => a - b);

      if (grades.length === 0) {
        toast.error('Create a grade-specific fee structure before auto-generating.');
        return;
      }

      const activeTuitionInstallments = feeStructures.filter((structure) =>
        structure.isActive &&
        structure.feeType.startsWith('TUITION_INSTALLMENT_'),
      );

      await Promise.all(
        activeTuitionInstallments.map((structure) =>
          financeAPI.updateFeeStructure(structure.id, user.schoolId, { isActive: false }),
        ),
      );

      const responses = await Promise.all(
        gradeSpecificBaseStructures.flatMap((baseStructure) => {
          const selectedTerms = baseStructure.termId
            ? terms.filter((term) => term.id === baseStructure.termId)
            : terms;
          const periods = selectedTerms.length > 0 ? selectedTerms : [{ id: undefined, name: 'Whole Academic Year', order: 1 }];
          const baseAmount = Number(baseStructure.amount || 0);
          const baseInstallmentAmount = Math.floor((baseAmount / periods.length) * 100) / 100;
          const remainder = Math.round((baseAmount - baseInstallmentAmount * periods.length) * 100) / 100;

          return periods.map((period, index) => {
            const amount = index === periods.length - 1
              ? Math.round((baseInstallmentAmount + remainder) * 100) / 100
              : baseInstallmentAmount;

            return financeAPI.createFeeStructure({
              schoolId: user.schoolId,
              academicYearId: selectedYear,
              termId: period.id,
              feeType: `TUITION_INSTALLMENT_${period.order || index + 1}`,
              amount,
              grade: baseStructure.grade || undefined,
              description: `TUITION installment for ${period.name}`,
            });
          });
        }),
      );
      const created = responses.length;
      toast.success(
        created > 0
          ? `Generated ${created} period-specific fee structures`
          : `Fee structures reconciled for ${grades.length} grades`,
      );
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate installments');
    }
  };

  const clearFeeStructures = async (schoolId: string) => {
    try {
      await financeAPI.clearFeeStructures(schoolId, selectedYear);
      toast.success('Fee structures cleared');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to clear fee structures');
    }
  };

  const handleClearFeeStructures = () => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }
    if (!selectedYear) {
      toast.error('Please select an academic year');
      return;
    }
    toast.warning('Clear all fee structures?', {
      description: 'This will delete all generated fee structures for the selected academic year.',
      action: {
        label: 'Clear',
        onClick: () => clearFeeStructures(schoolId),
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      duration: 10000,
    });
  };

  const handleGenerateStudentFees = async () => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }
    if (!selectedYear) {
      toast.error('Please select an academic year');
      return;
    }
    try {
      const response = await financeAPI.generateStudentFees({
        schoolId,
        academicYearId: selectedYear,
        termId: selectedTerm && selectedTerm !== 'all' ? selectedTerm : undefined,
        grade: selectedGrade && selectedGrade !== 'all' ? parseInt(selectedGrade) : undefined,
      });
      const created = Number(response.data?.created || 0);
      toast.success(created > 0 ? `Created ${created} student fees` : 'No new student fees to create');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate student fees');
    }
  };

  // Get mode label
  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMESTER: 'Semester',
      TERM: 'Term',
      YEARLY: 'Full Year',
    };
    return labels[mode] || mode;
  };

  const getBillingPeriodLabel = (mode: string) => {
    const labels: Record<string, string> = {
      MONTHLY: 'Billing Month',
      QUARTERLY: 'Billing Quarter',
      SEMESTER: 'Billing Semester',
      TERM: 'Billing Term',
      YEARLY: 'Billing Period',
    };
    return labels[mode] || 'Billing Period';
  };

  const getInstallmentMonthName = (installmentNumber: number) => {
    const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);
    const startDate = (selectedAcademicYear as any)?.startDate ? new Date((selectedAcademicYear as any).startDate) : null;

    if (!startDate || isNaN(startDate.getTime())) {
      return `Month ${installmentNumber}`;
    }

    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + installmentNumber - 1);
    
    return activeCalendarType === 'ETHIOPIAN'
      ? convertToEthiopian(monthDate).monthName
      : monthDate.toLocaleDateString('en-US', { month: 'long' });
  };

  const getTermMonthRangeLabel = (termId: string) => {
    const term = terms.find((t) => t.id === termId);
    if (!term || !term.startDate || !term.endDate) return null;

    const selectedAcademicYear = academicYears.find((y) => y.id === selectedYear);
    const ayStart = (selectedAcademicYear as any)?.startDate ? new Date((selectedAcademicYear as any).startDate) : null;
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

  const getFeeStructurePeriod = (fs: FeeStructure) => {
    if (fs.termId) {
      const rangeLabel = getTermMonthRangeLabel(fs.termId);
      if (rangeLabel) return rangeLabel;
    }
    if (fs.term?.name) return fs.term.name;
    if (feeCollectionMode === 'MONTHLY') {
      const installmentMatch = fs.feeType.match(/_INSTALLMENT_(\d+)$/i);
      if (installmentMatch?.[1]) {
        return getInstallmentMonthName(Number(installmentMatch[1]));
      }
    }
    const installmentMatch = fs.description?.match(/\bfor\s+(.+)$/i);
    if (installmentMatch?.[1]) return installmentMatch[1];
    if (fs.semester) return `Semester ${fs.semester}`;
    return 'Whole Academic Year';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Finance Management</h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {feeCollectionMode} BILLING MODE
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <DollarSign className="w-3 h-3 mr-1" />
                Active Year: {academicYears.find(y => y.id === selectedYear)?.name || '...'}
             </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {terms.length > 0 && (
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`${curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {curriculumType === 'SEMESTER' ? 'Semesters' : curriculumType === 'QUARTER' ? 'Quarters' : 'Terms'}</SelectItem>
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="col-span-2 sm:col-span-1">
              <TableSearch
                search={searchTerm}
                setSearch={setSearchTerm}
                placeholder="Search..."
                className="w-full"
              />
            </div>

            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                  <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PENDING">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setSelectedTerm('all');
              setSelectedGrade('all');
              setSelectedStatus('all');
            }}>
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="fee-structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="student-fees">Student Fees</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          {/* Fee Structures Tab */}
          <TabsContent value="fee-structures">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Fee Structures</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Mode: <span className="font-medium">{getModeLabel(feeCollectionMode)}</span> - Create annual fee first, then Auto-Generate
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClearFeeStructures}
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                    <Button variant="outline" onClick={handleGenerateInstallments} className="border-green-600 text-green-700 hover:bg-green-50">
                      <Plus className="w-4 h-4 mr-2" />
                      Auto-Generate / Reconcile {installmentCount}x
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                      setFormData({ feeType: 'TUITION', grade: availableGradeRanges[0]?.value || '', amount: '', termId: '', semester: '', description: '', isActive: true });
                      setFeeStructureDialogOpen(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Fee Structure
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Fee Type</TableHead>
                      <TableHead className="whitespace-nowrap">Grade</TableHead>
                      <TableHead className="whitespace-nowrap">{getBillingPeriodLabel(feeCollectionMode)}</TableHead>
                      <TableHead className="whitespace-nowrap">Amount (ETB)</TableHead>
                      <TableHead className="whitespace-nowrap">Description</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedFeeStructures.length > 0 ? (
                      generatedFeeStructures.map(fs => (
                        <TableRow key={fs.id}>
                          <TableCell className="font-medium">{fs.feeType}</TableCell>
                          <TableCell>{fs.grade ? `Grade ${fs.grade}` : 'All Grades'}</TableCell>
                          <TableCell>{getFeeStructurePeriod(fs)}</TableCell>
                          <TableCell>{formatCurrency(fs.amount)}</TableCell>
                          <TableCell>{fs.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={fs.isActive ? 'default' : 'secondary'}>
                              {fs.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteFeeStructure(fs.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No generated fee structures found. Add the base fee structure, then run Auto-Generate.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Fees Tab */}
          <TabsContent value="student-fees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Fees</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleGenerateStudentFees}>
                    <Users className="w-4 h-4 mr-2" />
                    Generate Student Fees
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Student Name</TableHead>
                      <TableHead className="whitespace-nowrap">Grade</TableHead>
                      <TableHead className="whitespace-nowrap">{curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}</TableHead>
                      <TableHead className="whitespace-nowrap">Fee Type</TableHead>
                      <TableHead className="whitespace-nowrap">Total Fee</TableHead>
                      <TableHead className="whitespace-nowrap">Paid</TableHead>
                      <TableHead className="whitespace-nowrap">Balance</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentFees.length > 0 ? (
                      studentFees.map(sf => (
                        <TableRow key={sf.id}>
                          <TableCell className="font-medium">{sf.studentName}</TableCell>
                          <TableCell>{sf.grade} - {sf.section}</TableCell>
                          <TableCell>{sf.termName || '-'}</TableCell>
                          <TableCell>{sf.feeType}</TableCell>
                          <TableCell>{formatCurrency(sf.finalAmount)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(sf.paidAmount)}</TableCell>
                          <TableCell className={sf.remainingBalance > 0 ? 'text-red-600 font-medium' : ''}>
                            {formatCurrency(sf.remainingBalance)}
                          </TableCell>
                          <TableCell>{sf.dueDate ? formatDate(sf.dueDate) : '-'}</TableCell>
                          <TableCell>{getStatusBadge(sf.status)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sf)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                          No student fees found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalItems > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-slate-500">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                    </div>
                    <Pagination
                      page={currentPage}
                      setPage={setCurrentPage}
                      totalPages={totalPages}
                      className="flex-wrap"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Recorded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length > 0 ? (
                      payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.receiptNumber}</TableCell>
                          <TableCell>{p.studentName}</TableCell>
                          <TableCell>{p.grade} - {p.section}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {p.paymentMethod === 'CASH' && <Banknote className="w-3 h-3 mr-1" />}
                              {p.paymentMethod === 'BANK_TRANSFER' && <CreditCard className="w-3 h-3 mr-1" />}
                              {p.paymentMethod === 'CHEQUE' && <Receipt className="w-3 h-3 mr-1" />}
                              {p.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(p.amountPaid)}
                          </TableCell>
                          <TableCell>{p.recordedBy}</TableCell>
                          <TableCell>{formatDate(p.paymentDate)}</TableCell>
                          <TableCell>{p.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          No payments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Fee Structure Dialog */}
        <Dialog open={feeStructureDialogOpen} onOpenChange={setFeeStructureDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fee Structure</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fee Type</Label>
                <Select value={formData.feeType} onValueChange={(v) => setFormData({...formData, feeType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FEE_TYPES_VALUE}>All Categories</SelectItem>
                    {FEE_TYPES.map(ft => (
                      <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade Range</Label>
                <Select value={formData.grade} onValueChange={(v) => setFormData({...formData, grade: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade range" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGradeRanges.map(range => (
                      <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (ETB)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}</Label>
                <Select value={formData.termId} onValueChange={(v) => setFormData({...formData, termId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {curriculumType === 'SEMESTER' ? 'Semesters' : curriculumType === 'QUARTER' ? 'Quarters' : 'Terms'}</SelectItem>
                    {terms.map(term => (
                      <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeeStructureDialogOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateFeeStructure}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Student Fee Details</DialogTitle>
            </DialogHeader>
            {selectedFee && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Student Name</Label>
                    <p className="font-medium">{selectedFee.studentName}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Grade & Section</Label>
                    <p className="font-medium">{selectedFee.grade} - {selectedFee.section}</p>
                  </div>
                  {selectedFee.termName && (
                    <div>
                      <Label className="text-slate-500">{curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}</Label>
                      <p className="font-medium">{selectedFee.termName}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-slate-500">Fee Type</Label>
                    <p className="font-medium">{selectedFee.feeType}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedFee.status)}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500">Total Fee</Label>
                    <p className="font-medium">{formatCurrency(selectedFee.totalFee)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Discount</Label>
                    <p className="font-medium">{formatCurrency(selectedFee.discount)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Final Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedFee.finalAmount)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Paid Amount</Label>
                    <p className="font-medium text-green-600">{formatCurrency(selectedFee.paidAmount)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-500">Remaining Balance</Label>
                    <p className="font-medium text-red-600 text-lg">{formatCurrency(selectedFee.remainingBalance)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDetailsDialogOpen(false)}>Close</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                setViewDetailsDialogOpen(false);
                setPaymentDialogOpen(true);
              }}>
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Recording Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {selectedFee && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student:</span>
                    <span className="font-medium">{selectedFee.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fee Type:</span>
                    <span className="font-medium">{selectedFee.feeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining Balance:</span>
                    <span className="font-medium text-red-600">{formatCurrency(selectedFee.remainingBalance)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="amountPaid">Amount to Pay *</Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      placeholder="Enter amount"
                      value={paymentFormData.amountPaid}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amountPaid: e.target.value })}
                      max={selectedFee.remainingBalance}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select
                      value={paymentFormData.paymentMethod}
                      onValueChange={(value: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE') => 
                        setPaymentFormData({ ...paymentFormData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="transactionReference">Transaction Reference</Label>
                    <Input
                      id="transactionReference"
                      placeholder="Enter transaction reference (optional)"
                      value={paymentFormData.transactionReference}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionReference: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentDate">Payment Date *</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      placeholder="Add notes (optional)"
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleRecordPayment}>
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
