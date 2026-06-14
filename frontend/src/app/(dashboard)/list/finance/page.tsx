"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { financeAPI, academicYearsAPI, classesAPI, schoolSettingsAPI } from '@/lib/api';
import { formatDateByCalendarType, formatDateTimeByCalendarType } from '@/lib/calendar-utils';
import {
  formatBaseFeeTypeName,
  formatFinanceFeeItemLabel,
  getInstallmentIndexFromFeeType,
  getInstallmentMonthName as getCalendarInstallmentMonthName,
} from '@/lib/finance-labels';
import { getGradeRangeFromSystem } from '@/lib/grade-system';
import { hasPermission, useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';
import Pagination from '@/components/Pagination';
import TableSearch from '@/components/TableSearch';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
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
  scopeLabel?: string | null;
  installmentIndex?: number | null;
  totalFee: number;
  discount: number;
  discountPercent?: number;
  discountLabel?: string | null;
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
  termName?: string | null;
  feeType?: string | null;
}

interface PaymentFeeOption {
  id: string;
  name: string;
  balance: number;
  amount?: number;
  status?: string;
  termId?: string | null;
  termName?: string | null;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate?: string;
}

interface Term {
  id: string;
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
}

interface CurriculumInfo {
  curriculumType: string;
  terms: Term[];
  termCount: number;
}

interface DiscountPolicy {
  id: string;
  name: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  isActive: boolean;
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

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDateInputValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function FinanceListPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('fee-structures');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  // Data states
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [curriculumType, setCurriculumType] = useState<string>('TERM');
  const [feeCollectionMode, setFeeCollectionMode] = useState<string>('TERM');
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const activeCalendarType = user?.calendarType || 'ETHIOPIAN';
  const [allowedGradeRange, setAllowedGradeRange] = useState(() => getGradeRangeFromSystem('1-12'));
  const allowedGrades = useMemo(
    () => {
      const start = Math.max(1, allowedGradeRange.min);
      return Array.from({ length: allowedGradeRange.max - start + 1 }, (_, index) => start + index);
    },
    [allowedGradeRange],
  );
  const availableGradeRanges = GRADE_RANGES.filter(
    (range) => range.from >= allowedGradeRange.min && range.to <= allowedGradeRange.max,
  );
  const canReadFeeStructures = hasPermission(user, 'finance:fee_structure:read');
  const canCreateFeeStructures = hasPermission(user, 'finance:fee_structure:create');
  const canDeleteFeeStructures = hasPermission(user, 'finance:fee_structure:delete');
  const canReadStudentFees = hasPermission(user, 'finance:student_fees:read');
  const canGenerateStudentFees = hasPermission(user, 'finance:student_fees:generate');
  const canReadFinanceReports = hasPermission(user, 'finance:reports:read');
  const canRecordPayments = user?.role === 'FINANCE' && hasPermission(user, 'finance:payments:record');
  const canOpenFinancePage = canReadFeeStructures || canReadStudentFees || canReadFinanceReports;
  
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
  const [feeStructuresPage, setFeeStructuresPage] = useState(1);
  const FEE_STRUCTURES_PAGE_SIZE = 15;
  const [paymentsPage, setPaymentsPage] = useState(1);
  const PAYMENTS_PAGE_SIZE = 15;
  
  // Dialogs
  const [feeStructureDialogOpen, setFeeStructureDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [monthlyPaymentFees, setMonthlyPaymentFees] = useState<PaymentFeeOption[]>([]);
  const [selectedPaymentFeeId, setSelectedPaymentFeeId] = useState('');
  const [paymentFeeOptionsLoading, setPaymentFeeOptionsLoading] = useState(false);
  const isMonthlyBilling = feeCollectionMode === 'MONTHLY' || feeCollectionMode === 'MONTH';
  const showBillingPeriodFilter = activeTab === 'fee-structures' || activeTab === 'student-fees';
  const showGradeFilter = activeTab === 'fee-structures' || activeTab === 'student-fees';
  const showStatusFilter = activeTab === 'student-fees';
  const searchPlaceholder =
    activeTab === 'fee-structures'
      ? isMonthlyBilling
        ? 'Search fee, month...'
        : 'Search fee, period...'
      : activeTab === 'payments'
        ? 'Search receipt, student...'
        : 'Search student...';
  
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

  const filteredFeeStructures = useMemo(() => {
    const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);
    const getStructureInstallmentIndex = (feeType?: string | null) => {
      const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
      return match ? Number(match[1]) : null;
    };
    const getStructureInstallmentPeriod = (installmentNumber: number) => {
      if (isMonthlyBilling) {
        return getCalendarInstallmentMonthName(
          installmentNumber,
          selectedAcademicYear?.startDate,
          activeCalendarType as 'ETHIOPIAN' | 'GREGORIAN',
        );
      }

      const periodName = terms[installmentNumber - 1]?.name;
      if (periodName) return periodName;
      if (feeCollectionMode === 'QUARTERLY' || feeCollectionMode === 'QUARTER') {
        return `Quarter ${installmentNumber}`;
      }
      if (feeCollectionMode === 'SEMESTERLY' || feeCollectionMode === 'SEMESTER') {
        return `Semester ${installmentNumber}`;
      }
      if (feeCollectionMode === 'TERMLY' || feeCollectionMode === 'TERM') {
        return `Term ${installmentNumber}`;
      }
      return `Installment ${installmentNumber}`;
    };
    const getSelectedTermInstallmentRange = () => {
      if (!isMonthlyBilling || selectedTerm === 'all') return null;
      const term = terms.find((item) => item.id === selectedTerm);
      if (!term) {
        return null;
      }

      if (term.order) {
        return {
          start: (term.order - 1) * 2 + 1,
          end: term.order * 2,
        };
      }

      if (term.startDate && term.endDate && selectedAcademicYear?.startDate) {
        const academicYearStart = new Date(selectedAcademicYear.startDate);
        const termStart = new Date(term.startDate);
        const termEnd = new Date(term.endDate);
        const hasValidDates =
          !Number.isNaN(academicYearStart.getTime()) &&
          !Number.isNaN(termStart.getTime()) &&
          !Number.isNaN(termEnd.getTime());

        if (hasValidDates) {
          const monthDiff = (date: Date) =>
            (date.getFullYear() - academicYearStart.getFullYear()) * 12 +
            (date.getMonth() - academicYearStart.getMonth());
          return {
            start: Math.max(1, monthDiff(termStart) + 1),
            end: Math.min(installmentCount || 12, Math.max(monthDiff(termEnd) + 1, monthDiff(termStart) + 1)),
          };
        }
      }

      const totalInstallments = installmentCount || 12;
      const orderedTerms = terms
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const termIndex = orderedTerms.findIndex((item) => item.id === term.id);
      if (termIndex === -1 || orderedTerms.length === 0) return null;

      const installmentsPerTerm = Math.ceil(totalInstallments / orderedTerms.length);
      const start = termIndex * installmentsPerTerm + 1;
      return {
        start,
        end: Math.min(totalInstallments, start + installmentsPerTerm - 1),
      };
    };
    const termInstallmentRange = getSelectedTermInstallmentRange();
    const q = searchTerm.trim().toLowerCase();

    return generatedFeeStructures.filter((fs) =>
      {
        if (selectedGrade !== 'all' && fs.grade !== Number(selectedGrade)) {
          return false;
        }

        if (selectedTerm !== 'all') {
          const installmentIndex = getStructureInstallmentIndex(fs.feeType);
          const matchesSelectedTerm =
            fs.termId === selectedTerm ||
            (termInstallmentRange &&
              installmentIndex !== null &&
              installmentIndex >= termInstallmentRange.start &&
              installmentIndex <= termInstallmentRange.end);

          if (!matchesSelectedTerm) return false;
        }

        if (!q) return true;

        const installmentIndex = getStructureInstallmentIndex(fs.feeType);
        const periodLabel =
          installmentIndex !== null
            ? getStructureInstallmentPeriod(installmentIndex)
            : fs.term?.name || fs.description || '';
        const displayFeeType = formatFinanceFeeItemLabel(fs.feeType, {
          academicYearStartDate: selectedAcademicYear?.startDate,
          calendarType: activeCalendarType as 'ETHIOPIAN' | 'GREGORIAN',
          periodLabel,
        });

        return [fs.feeType, displayFeeType, fs.description, periodLabel, fs.grade?.toString(), fs.isActive ? 'active' : 'inactive']
        .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q));
      }
    );
  }, [
    activeCalendarType,
    academicYears,
    generatedFeeStructures,
    installmentCount,
    isMonthlyBilling,
    searchTerm,
    selectedGrade,
    selectedTerm,
    selectedYear,
    terms,
  ]);

  const filteredStudentFees = useMemo(() => {
    if (!searchTerm) return studentFees;
    const q = searchTerm.toLowerCase();
    return studentFees.filter((sf) =>
      [sf.studentName, sf.grade?.toString(), sf.feeType, sf.status]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [studentFees, searchTerm]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments;
    const q = searchTerm.toLowerCase();
    return payments.filter((p) =>
      [p.studentName, p.receiptNumber, p.paymentMethod, p.grade?.toString()]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [payments, searchTerm]);

  const paginatedFeeStructures = useMemo(() => {
    const start = (feeStructuresPage - 1) * FEE_STRUCTURES_PAGE_SIZE;
    return filteredFeeStructures.slice(start, start + FEE_STRUCTURES_PAGE_SIZE);
  }, [filteredFeeStructures, feeStructuresPage]);

  const feeStructuresTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredFeeStructures.length / FEE_STRUCTURES_PAGE_SIZE)),
    [filteredFeeStructures],
  );

  const paginatedPayments = useMemo(() => {
    const start = (paymentsPage - 1) * PAYMENTS_PAGE_SIZE;
    return filteredPayments.slice(start, start + PAYMENTS_PAGE_SIZE);
  }, [filteredPayments, paymentsPage]);

  const paymentsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredPayments.length / PAYMENTS_PAGE_SIZE)),
    [filteredPayments],
  );

  // Load academic years
  useEffect(() => {
    const loadAcademicYears = async () => {
      if (!user?.schoolId || !canOpenFinancePage) return;
      try {
        const response = await academicYearsAPI.getAll({ schoolId: user.schoolId });
        const years = response.data;
        setAcademicYears(years);
        // Set the first academic year as default (prefer active one)
        if (years.length > 0) {
          const activeYear = years.find((y: any) => y.isActive) || years[0];
          setSelectedYear(activeYear.id);
        }
      } catch (error) {
        console.error('Error loading academic years:', error);
        setLoadError('Failed to load academic years');
      }
    };
    loadAcademicYears();
  }, [canOpenFinancePage, user?.schoolId]);

  // Load curriculum info when academic year changes
  useEffect(() => {
    const loadCurriculumInfo = async () => {
      if (!selectedYear || !user?.schoolId || !canReadFeeStructures) return;
      try {
        const response = await financeAPI.getCurriculumInfo(user.schoolId, selectedYear);
        if (response.data?.success) {
          setCurriculumType(response.data.curriculumType || 'TERM');
          setTerms(response.data.terms || []);
        }
      } catch (error) {
        console.error('Error loading curriculum info:', error);
        setLoadError('Failed to load finance curriculum settings');
        setTerms([]);
      }
    };
    
    // Load fee collection mode
    const loadFeeCollectionMode = async () => {
      if (!user?.schoolId || !canReadFeeStructures) return;
      try {
        const response = await financeAPI.getFeeCollectionMode(user.schoolId);
        if (response.data?.success) {
          setFeeCollectionMode(response.data.mode || 'TERM');
          setInstallmentCount(response.data.installmentCount || 3);
        }
      } catch (error) {
        console.error('Error loading fee collection mode:', error);
        setLoadError('Failed to load fee collection mode');
      }
    };
    
    loadCurriculumInfo();
    loadFeeCollectionMode();
    // Reset term filter when year changes
    setSelectedTerm('all');
  }, [canReadFeeStructures, selectedYear, user?.schoolId]);

  useEffect(() => {
    const loadGradeRange = async () => {
      if (!user?.schoolId || !canOpenFinancePage) return;
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
  }, [canOpenFinancePage, user?.schoolId]);

  const fetchDiscountPolicies = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const response = await financeAPI.listDiscountPolicies(user.schoolId);
      setDiscountPolicies(response.data || []);
    } catch (error) {
      console.error('Failed to fetch discount policies:', error);
    }
  }, [user?.schoolId]);

  const loadAllData = useCallback(async () => {
    if (!canOpenFinancePage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      if (activeTab === 'fee-structures') {
        if (!canReadFeeStructures) { setLoading(false); return; }
        const schoolId = user?.schoolId;
        if (!schoolId) {
          toast.error('School ID not found. Please log in again.');
          setLoading(false);
          return;
        }
        const response = await financeAPI.listFeeStructures(schoolId, selectedYear);
        setFeeStructures((response.data?.data || []).filter((structure: FeeStructure) => structure.isActive));
      } else if (activeTab === 'student-fees') {
        if (!canReadStudentFees) { setLoading(false); return; }
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
          search: searchTerm.trim() || undefined,
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
        if (!canReadFinanceReports) { setLoading(false); return; }
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
      setLoadError('Failed to load finance data');
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, canOpenFinancePage, canReadFeeStructures, canReadFinanceReports, canReadStudentFees, currentPage, pageSize, searchTerm, selectedGrade, selectedStatus, selectedTerm, selectedYear, user?.schoolId]);

  useEffect(() => {
    if (!selectedYear || !user?.schoolId) return;
    loadAllData();
  }, [loadAllData, selectedYear, user?.schoolId]);

  useEffect(() => {
    setCurrentPage(1);
    setFeeStructuresPage(1);
    setPaymentsPage(1);
  }, [activeTab, selectedYear, selectedTerm, searchTerm, selectedGrade, selectedStatus]);

  useEffect(() => {
    if (authLoading) return;
    const tabAllowed =
      (activeTab === 'fee-structures' && canReadFeeStructures) ||
      (activeTab === 'student-fees' && canReadStudentFees) ||
      (activeTab === 'payments' && canReadFinanceReports);
    if (tabAllowed) return;
    if (canReadFeeStructures) setActiveTab('fee-structures');
    else if (canReadStudentFees) setActiveTab('student-fees');
    else if (canReadFinanceReports) setActiveTab('payments');
  }, [activeTab, authLoading, canReadFeeStructures, canReadFinanceReports, canReadStudentFees]);

  // Create fee structure
  const handleCreateFeeStructure = async () => {
    if (!canCreateFeeStructures) {
      toast.error('You do not have permission to create fee structures');
      return;
    }
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
      loadAllData();
    } catch (error) {
      toast.error('Failed to create fee structure');
    }
  };

  const deleteFeeStructure = async (id: string, schoolId: string) => {
    try {
      await financeAPI.deleteFeeStructure(id, schoolId);
      toast.success('Fee structure deleted successfully');
      loadAllData();
    } catch (error) {
      toast.error('Failed to delete fee structure');
    }
  };

  // Delete fee structure
  const handleDeleteFeeStructure = (id: string) => {
    if (!canDeleteFeeStructures) {
      toast.error('You do not have permission to delete fee structures');
      return;
    }
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
    paymentDate: toLocalDateInputValue(new Date()),
    notes: '',
  });

  const selectedPaymentFee = isMonthlyBilling
    ? monthlyPaymentFees.find((fee) => fee.id === selectedPaymentFeeId) || null
    : null;
  const paymentTargetFee = selectedPaymentFee || selectedFee;

  const loadMonthlyPaymentFees = async (fee: StudentFee) => {
    if (!user?.schoolId || !selectedYear) return;
    setPaymentFeeOptionsLoading(true);
    try {
      const response = await financeAPI.getStudentFees(fee.studentId, user.schoolId, selectedYear);
      const feeItems: PaymentFeeOption[] = Array.isArray(response.data?.feeItems) ? response.data.feeItems : [];
      const monthlyFees = feeItems
        .filter((item) => getInstallmentIndexFromFeeType(item.name) !== null)
        .sort((a, b) => (getInstallmentIndexFromFeeType(a.name) || 0) - (getInstallmentIndexFromFeeType(b.name) || 0));
      setMonthlyPaymentFees(monthlyFees);
      const preferredFee =
        monthlyFees.find((item) => item.id === fee.id) ||
        monthlyFees.find((item) => item.balance > 0) ||
        monthlyFees[0];
      setSelectedPaymentFeeId(preferredFee?.id || '');
      setPaymentFormData((current) => ({
        ...current,
        amountPaid: preferredFee?.balance ? String(preferredFee.balance) : current.amountPaid,
      }));
    } catch (error) {
      console.error('Failed to load monthly payment fees:', error);
      toast.error('Failed to load billing months');
      setMonthlyPaymentFees([]);
      setSelectedPaymentFeeId('');
    } finally {
      setPaymentFeeOptionsLoading(false);
    }
  };

  const openRecordPaymentDialog = (fee: StudentFee) => {
    setSelectedFee(fee);
    setPaymentFormData((current) => ({
      ...current,
      amountPaid: fee.remainingBalance ? String(fee.remainingBalance) : current.amountPaid,
    }));
    setPaymentDialogOpen(true);
    if (isMonthlyBilling) {
      loadMonthlyPaymentFees(fee);
    } else {
      setMonthlyPaymentFees([]);
      setSelectedPaymentFeeId('');
    }
  };

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!canRecordPayments) {
      toast.error('Only finance users can record payments');
      return;
    }
    if (!selectedFee || !paymentTargetFee || !paymentFormData.amountPaid) {
      toast.error('Please enter payment amount');
      return;
    }

    if (isMonthlyBilling && !selectedPaymentFeeId) {
      toast.error('Please select the billing month');
      return;
    }

    const amount = parseFloat(paymentFormData.amountPaid);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const remainingBalance = isMonthlyBilling && selectedPaymentFee
      ? selectedPaymentFee.balance
      : selectedFee.remainingBalance;

    if (amount > remainingBalance) {
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
        studentFeeId: paymentTargetFee.id,
        studentId: selectedFee.studentId,
        amountPaid: amount,
        paymentMethod: paymentFormData.paymentMethod,
        transactionReference: paymentFormData.transactionReference || undefined,
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes || undefined,
      });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setMonthlyPaymentFees([]);
      setSelectedPaymentFeeId('');
      setPaymentFormData({
        amountPaid: '',
        paymentMethod: 'CASH',
        transactionReference: '',
        paymentDate: toLocalDateInputValue(new Date()),
        notes: '',
      });
      loadAllData(); // Refresh the data
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error?.response?.data?.message || 'Failed to record payment');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ET');
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'PENDING':
      case 'UNPAID':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"><AlertCircle className="w-3 h-3 mr-1" />Unpaid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handler for generating installments
  const handleGenerateInstallments = async () => {
    if (!canCreateFeeStructures) {
      toast.error('You do not have permission to generate fee structures');
      return;
    }
    const schoolId = user?.schoolId;
    if (!schoolId || !selectedYear) {
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

      const responses = await Promise.all(
        gradeSpecificBaseStructures.map((baseStructure) =>
          financeAPI.generateInstallmentFees({
            schoolId,
            academicYearId: selectedYear,
            feeType: 'TUITION',
            annualAmount: Number(baseStructure.amount || 0),
            grade: baseStructure.grade || undefined,
            description: baseStructure.description || undefined,
          }),
        ),
      );
      const created = responses.reduce((sum, response) => sum + Number(response.data?.created || 0), 0);
      toast.success(
        created > 0
          ? `Generated ${created} period-specific fee structures`
          : `Fee structures reconciled for ${grades.length} grades`,
      );
      loadAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate installments');
    }
  };

  const clearFeeStructures = async (schoolId: string) => {
    try {
      await financeAPI.clearFeeStructures(schoolId, selectedYear);
      toast.success('Fee structures cleared');
      loadAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to clear fee structures');
    }
  };

  const handleClearFeeStructures = () => {
    if (!canDeleteFeeStructures) {
      toast.error('You do not have permission to clear fee structures');
      return;
    }
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
    if (!canGenerateStudentFees) {
      toast.error('You do not have permission to generate student fees');
      return;
    }
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
      loadAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate student fees');
    }
  };

  const normalizeBillingMode = (mode: string) => String(mode || '').toUpperCase();

  // Get mode label
  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      MONTHLY: 'Monthly billing',
      QUARTERLY: 'Quarterly billing',
      QUARTER: 'Quarterly billing',
      SEMESTERLY: 'Semester billing',
      SEMESTER: 'Semester billing',
      TERMLY: 'Term billing',
      TERM: 'Term billing',
      YEARLY: 'Full Year',
    };
    const normalizedMode = normalizeBillingMode(mode);
    return labels[normalizedMode] || mode;
  };

  const getFeeStructureHelpText = (mode: string) => {
    const normalizedMode = normalizeBillingMode(mode);
    if (normalizedMode === 'MONTHLY' || normalizedMode === 'MONTH') {
      return 'Create the yearly fee amount first, then Auto-Generate monthly fee rows.';
    }
    if (normalizedMode === 'QUARTERLY' || normalizedMode === 'QUARTER') {
      return 'Create the yearly fee amount first, then Auto-Generate one fee row for each quarter.';
    }
    if (normalizedMode === 'SEMESTERLY' || normalizedMode === 'SEMESTER') {
      return 'Create the yearly fee amount first, then Auto-Generate one fee row for each semester.';
    }
    if (normalizedMode === 'TERMLY' || normalizedMode === 'TERM') {
      return 'Create the yearly fee amount first, then Auto-Generate one fee row for each academic term.';
    }
    return 'Create the yearly fee amount first, then Auto-Generate the configured billing rows.';
  };

  const getBillingPeriodLabel = (mode: string) => {
    const labels: Record<string, string> = {
      MONTHLY: 'Billing Month',
      QUARTERLY: 'Billing Quarter',
      QUARTER: 'Billing Quarter',
      SEMESTERLY: 'Billing Semester',
      SEMESTER: 'Billing Semester',
      TERMLY: 'Billing Term',
      TERM: 'Billing Term',
      YEARLY: 'Billing Period',
    };
    const normalizedMode = normalizeBillingMode(mode);
    return labels[normalizedMode] || 'Billing Period';
  };

  const getInstallmentMonthName = (installmentNumber: number) => {
    const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);
    return getCalendarInstallmentMonthName(
      installmentNumber,
      selectedAcademicYear?.startDate,
      activeCalendarType as 'ETHIOPIAN' | 'GREGORIAN',
    );
  };

  const getInstallmentPeriodName = (installmentNumber: number) => {
    if (isMonthlyBilling) return getInstallmentMonthName(installmentNumber);

    const periodName = terms[installmentNumber - 1]?.name;
    if (periodName) return periodName;
    if (feeCollectionMode === 'QUARTERLY' || feeCollectionMode === 'QUARTER') {
      return `Quarter ${installmentNumber}`;
    }
    if (feeCollectionMode === 'SEMESTERLY' || feeCollectionMode === 'SEMESTER') {
      return `Semester ${installmentNumber}`;
    }
    if (feeCollectionMode === 'TERMLY' || feeCollectionMode === 'TERM') {
      return `Term ${installmentNumber}`;
    }
    return `Installment ${installmentNumber}`;
  };

  const formatFeeTypeDisplay = (feeType?: string | null, periodLabel?: string | null) => {
    const selectedAcademicYear = academicYears.find((year) => year.id === selectedYear);
    return formatFinanceFeeItemLabel(feeType, {
      academicYearStartDate: selectedAcademicYear?.startDate,
      calendarType: activeCalendarType as 'ETHIOPIAN' | 'GREGORIAN',
      periodLabel,
    });
  };

  const getStudentFeeGradeLabel = (fee: StudentFee) => {
    const grade = String(fee.grade || '').trim();
    const section = String(fee.section || '').trim();
    if (grade && section) return `${grade} - ${section}`;
    if (grade) return grade;
    if (section) return section;
    return '-';
  };

  const getStudentFeePeriodLabel = (fee: StudentFee) => {
    if (fee.scopeLabel) return fee.scopeLabel;
    if (fee.installmentIndex != null) return getInstallmentPeriodName(fee.installmentIndex);
    return fee.termName || '-';
  };

  const formatPaymentPaidMonth = (payment: PaymentRecord) => {
    const installmentIndex = getInstallmentIndexFromFeeType(payment.feeType);
    if (isMonthlyBilling && installmentIndex !== null) {
      return getInstallmentMonthName(installmentIndex);
    }
    return payment.termName || (installmentIndex !== null ? getInstallmentPeriodName(installmentIndex) : '-');
  };

  const exportPaymentsCsv = () => {
    const rows = [
      ['Receipt #', 'Student Name', 'Grade', 'Paid Period', 'Payment Method', 'Amount', 'Recorded By', 'Date', 'Notes'],
      ...payments.map((payment) => [
        payment.receiptNumber,
        payment.studentName,
        `${payment.grade} - ${payment.section}`,
        formatPaymentPaidMonth(payment),
        payment.paymentMethod,
        payment.amountPaid,
        payment.recordedBy,
        formatDate(payment.paymentDate),
        payment.notes || '-',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payment-history-${toLocalDateInputValue(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getTermMonthRangeLabel = (termId: string) => {
    const term = terms.find((t) => t.id === termId);
    if (!term || !term.startDate || !term.endDate) return null;
    if (!isMonthlyBilling) return term.name;

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
    const feeTypeInstallmentMatch = fs.feeType.match(/_INSTALLMENT_(\d+)$/i);
    if (feeTypeInstallmentMatch?.[1]) {
      return getInstallmentPeriodName(Number(feeTypeInstallmentMatch[1]));
    }
    const installmentMatch = fs.description?.match(/\bfor\s+(.+)$/i);
    if (installmentMatch?.[1]) return installmentMatch[1];
    if (fs.semester) return `Semester ${fs.semester}`;
    return 'Whole Academic Year';
  };

  const formatFeeStructureDescription = (fs: FeeStructure, periodLabel: string) => {
    if (!fs.description) return '-';
    return fs.description
      .replace(/^([A-Z_]+)\s+installment\s+for\s+.+$/i, `${formatBaseFeeTypeName(fs.feeType)} installment for ${periodLabel}`)
      .replace(/\bMonth\s+\d+\b/i, periodLabel);
  };

  if (authLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading finance...</div>;
  }

  if (!canOpenFinancePage) {
    return <AccessDenied type="403" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      {/* Header */}
      <div className="px-6 py-4 dark:bg-[#1A1A1A]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Management</h1>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                {feeCollectionMode} BILLING MODE
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <div className="bg-white dark:bg-[#1A1A1A] rounded-lg shadow-sm border border-gray-200 dark:border-[#2A2A2A] p-3 sm:p-4 mb-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
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

              {showBillingPeriodFilter && terms.length > 0 && (
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isMonthlyBilling ? 'Billing Period' : `${curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {isMonthlyBilling ? 'All Billing Periods' : `All ${curriculumType === 'SEMESTER' ? 'Semesters' : curriculumType === 'QUARTER' ? 'Quarters' : 'Terms'}`}
                    </SelectItem>
                    {terms.map(term => (
                      <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                <TableSearch
                  search={searchTerm}
                  setSearch={setSearchTerm}
                  placeholder={searchPlaceholder}
                  className="w-full"
                />
              </div>

              {showGradeFilter && (
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {allowedGrades.map(g => (
                      <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {showStatusFilter && (
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
              )}

              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setSelectedTerm('all');
                setSelectedGrade('all');
                setSelectedStatus('all');
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {loadError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {loadError}
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto border-b border-gray-200 dark:border-[#2A2A2A]">
            <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
              <TabsTrigger
                value="fee-structures"
                disabled={!canReadFeeStructures}
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >Fee Structures</TabsTrigger>
              <TabsTrigger
                value="student-fees"
                disabled={!canReadStudentFees}
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >Student Fees</TabsTrigger>
              <TabsTrigger
                value="payments"
                disabled={!canReadFinanceReports}
                className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
              >Payment History</TabsTrigger>
            </TabsList>
          </div>

          {loading ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-40" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 border-b">
                    <div className="grid grid-cols-7 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-4 w-full" />)}
                    </div>
                  </div>
                  {[1, 2, 3, 4, 5].map(row => (
                    <div key={row} className="p-4 border-b">
                      <div className="grid grid-cols-7 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-4 w-full" />)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Fee Structures Tab */}
              <TabsContent value="fee-structures">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Fee Structures</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Billing cycle: <span className="font-medium">{getModeLabel(feeCollectionMode)}</span> - {getFeeStructureHelpText(feeCollectionMode)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDeleteFeeStructures && (
                          <Button
                            variant="outline"
                            onClick={handleClearFeeStructures}
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                          </Button>
                        )}
                        {canCreateFeeStructures && (
                          <Button variant="outline" onClick={handleGenerateInstallments} className="border-green-600 text-green-700 hover:bg-green-50">
                            <Plus className="w-4 h-4 mr-2" />
                            Auto-Generate / Reconcile {installmentCount}x
                          </Button>
                        )}
                        {canCreateFeeStructures && (
                          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                            setFormData({ feeType: 'TUITION', grade: availableGradeRanges[0]?.value || '', amount: '', termId: '', semester: '', description: '', isActive: true });
                            setFeeStructureDialogOpen(true);
                          }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Fee Structure
                          </Button>
                        )}
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
                        {filteredFeeStructures.length > 0 ? (
                          paginatedFeeStructures.map(fs => {
                            const period = getFeeStructurePeriod(fs);
                            return (
                              <TableRow key={fs.id}>
                                <TableCell className="font-medium">{formatFeeTypeDisplay(fs.feeType, period)}</TableCell>
                                <TableCell>{fs.grade ? `Grade ${fs.grade}` : 'All Grades'}</TableCell>
                                <TableCell>{period}</TableCell>
                                <TableCell>{formatCurrency(fs.amount)}</TableCell>
                                <TableCell>{formatFeeStructureDescription(fs, period)}</TableCell>
                                <TableCell>
                                  <Badge variant={fs.isActive ? 'default' : 'secondary'}>
                                    {fs.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {canDeleteFeeStructures && (
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteFeeStructure(fs.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              {searchTerm || selectedGrade !== 'all' || selectedTerm !== 'all'
                                ? 'No fee structures match the selected filters.'
                                : 'No generated fee structures found. Add the base fee structure, then run Auto-Generate.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {filteredFeeStructures.length > FEE_STRUCTURES_PAGE_SIZE && (
                      <div className="border-t border-gray-100 dark:border-[#2A2A2A] px-4 py-3 flex justify-end">
                        <Pagination page={feeStructuresPage} setPage={setFeeStructuresPage} totalPages={feeStructuresTotalPages} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Student Fees Tab */}
              <TabsContent value="student-fees">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Student Fees</CardTitle>
                    <div className="flex items-center gap-2">
                      {canGenerateStudentFees && (
                        <Button variant="outline" onClick={handleGenerateStudentFees}>
                          <Users className="w-4 h-4 mr-2" />
                          Generate Student Fees
                        </Button>
                      )}
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
                          <TableHead className="whitespace-nowrap">{getBillingPeriodLabel(feeCollectionMode)}</TableHead>
                          <TableHead className="whitespace-nowrap">Fee Type</TableHead>
                          <TableHead className="whitespace-nowrap">Total Fee</TableHead>
                          <TableHead className="whitespace-nowrap">Discount</TableHead>
                          <TableHead className="whitespace-nowrap">Final Fee</TableHead>
                          <TableHead className="whitespace-nowrap">Paid</TableHead>
                          <TableHead className="whitespace-nowrap">Balance</TableHead>
                          <TableHead className="whitespace-nowrap">Due Date</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudentFees.length > 0 ? (
                          filteredStudentFees.map(sf => (
                            <TableRow key={sf.id}>
                              <TableCell className="font-medium">
  <span className="inline-flex items-center gap-1.5">
    {sf.studentName}
    {sf.discount > 0 && (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">
        {sf.discountPercent}%
      </Badge>
    )}
  </span>
</TableCell>
                              <TableCell>{getStudentFeeGradeLabel(sf)}</TableCell>
                              <TableCell>{getStudentFeePeriodLabel(sf)}</TableCell>
                              <TableCell>{formatFeeTypeDisplay(sf.feeType, getStudentFeePeriodLabel(sf))}</TableCell>
                              <TableCell>{formatCurrency((sf as any).totalAmount || sf.finalAmount)}</TableCell>
                               <TableCell>
  {sf.discount > 0 ? (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">
        {sf.discountPercent}%
      </Badge>
      <span className="text-blue-600">-{formatCurrency(sf.discount)}</span>
    </span>
  ) : formatCurrency(0)}
</TableCell>
                              <TableCell className="font-medium">{formatCurrency(sf.finalAmount)}</TableCell>
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
                            <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                              {searchTerm || selectedGrade !== 'all' || selectedStatus !== 'all' || selectedTerm !== 'all'
                                ? 'No student fees match the selected filters.'
                                : 'No student fees found'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {filteredStudentFees.length > 0 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                          Showing 1 to {filteredStudentFees.length} of {filteredStudentFees.length}
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
                    <Button variant="outline" onClick={exportPaymentsCsv} disabled={payments.length === 0}>
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
                          <TableHead>Paid Period</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Recorded By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length > 0 ? (
                          paginatedPayments.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.receiptNumber}</TableCell>
                              <TableCell>{p.studentName}</TableCell>
                              <TableCell>{p.grade} - {p.section}</TableCell>
                              <TableCell>{formatPaymentPaidMonth(p)}</TableCell>
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
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No payments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {filteredPayments.length > PAYMENTS_PAGE_SIZE && (
                      <div className="border-t border-gray-100 dark:border-[#2A2A2A] px-4 py-3 flex justify-end">
                        <Pagination page={paymentsPage} setPage={setPaymentsPage} totalPages={paymentsTotalPages} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
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
                    <Label className="text-gray-500">Student Name</Label>
                    <p className="font-medium">{selectedFee.studentName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Grade & Section</Label>
                    <p className="font-medium">{selectedFee.grade} - {selectedFee.section}</p>
                  </div>
                  {selectedFee.termName && (
                    <div>
                      <Label className="text-gray-500">{curriculumType === 'SEMESTER' ? 'Semester' : curriculumType === 'QUARTER' ? 'Quarter' : 'Term'}</Label>
                      <p className="font-medium">{selectedFee.termName}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500">Fee Type</Label>
                    <p className="font-medium">{formatFeeTypeDisplay(selectedFee.feeType, selectedFee.termName)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedFee.status)}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">Total Fee</Label>
                    <p className="font-medium">{formatCurrency(selectedFee.totalFee)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Discount</Label>
                    <p className="font-medium">{formatCurrency(selectedFee.discount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Final Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedFee.finalAmount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Paid Amount</Label>
                    <p className="font-medium text-green-600">{formatCurrency(selectedFee.paidAmount)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-500">Remaining Balance</Label>
                    <p className="font-medium text-red-600 text-lg">{formatCurrency(selectedFee.remainingBalance)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDetailsDialogOpen(false)}>Close</Button>
              {canRecordPayments && (
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  if (!selectedFee) return;
                  setViewDetailsDialogOpen(false);
                  openRecordPaymentDialog(selectedFee);
                }}>
                  Record Payment
                </Button>
              )}
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
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Student:</span>
                    <span className="font-medium">{selectedFee.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isMonthlyBilling ? 'Billing Month:' : 'Fee Type:'}</span>
                    <span className="font-medium">
                      {selectedPaymentFee
                        ? formatFeeTypeDisplay(selectedPaymentFee.name, null)
                        : formatFeeTypeDisplay(selectedFee.feeType, isMonthlyBilling ? null : selectedFee.termName)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remaining Balance:</span>
                    <span className="font-medium text-red-600">{formatCurrency(selectedPaymentFee?.balance ?? selectedFee.remainingBalance)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {isMonthlyBilling && (
                    <div>
                      <Label>Billing Month *</Label>
                      <Select
                        value={selectedPaymentFeeId}
                        onValueChange={(value) => {
                          setSelectedPaymentFeeId(value);
                          const fee = monthlyPaymentFees.find((item) => item.id === value);
                          setPaymentFormData({
                            ...paymentFormData,
                            amountPaid: fee?.balance ? String(fee.balance) : '',
                          });
                        }}
                        disabled={paymentFeeOptionsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={paymentFeeOptionsLoading ? 'Loading months...' : 'Select billing month'} />
                        </SelectTrigger>
                        <SelectContent>
                          {monthlyPaymentFees.map((fee) => (
                            <SelectItem key={fee.id} value={fee.id} disabled={fee.balance <= 0}>
                              {formatFeeTypeDisplay(fee.name, null)} - {formatCurrency(fee.balance)} remaining
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="amountPaid">Amount to Pay *</Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      placeholder="Enter amount"
                      value={paymentFormData.amountPaid}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amountPaid: e.target.value })}
                      max={selectedPaymentFee?.balance ?? selectedFee.remainingBalance}
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
                    <CalendarDatePicker
                      value={parseLocalDateInputValue(paymentFormData.paymentDate)}
                      onChange={(date) =>
                        setPaymentFormData({
                          ...paymentFormData,
                          paymentDate: date ? toLocalDateInputValue(date) : '',
                        })
                      }
                      placeholder="Select payment date"
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
