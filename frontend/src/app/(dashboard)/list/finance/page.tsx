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
    grade: 'all',
    amount: '',
    termId: '',
    semester: '',
    description: '',
    isActive: true,
  });

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
        setFeeStructures(response.data?.data || []);
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
    if (!formData.feeType || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await financeAPI.createFeeStructure({
        schoolId: schoolId,
        feeType: formData.feeType,
        academicYearId: selectedYear,
        termId: formData.termId && formData.termId !== 'all' ? formData.termId : undefined,
        grade: formData.grade && formData.grade !== 'all' ? parseInt(formData.grade) : undefined,
        amount: parseFloat(formData.amount),
        semester: formData.semester ? parseInt(formData.semester) : undefined,
        description: formData.description || undefined,
      });
      toast.success('Fee structure created successfully');
      setFeeStructureDialogOpen(false);
      setFormData({ feeType: '', grade: 'all', amount: '', termId: '', semester: '', description: '', isActive: true });
      loadData();
    } catch (error) {
      toast.error('Failed to create fee structure');
    }
  };

  // Delete fee structure
  const handleDeleteFeeStructure = async (id: string) => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }
    if (!confirm('Are you sure you want to delete this fee structure?')) return;
    try {
      await financeAPI.deleteFeeStructure(id, schoolId);
      toast.success('Fee structure deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete fee structure');
    }
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
    console.log('Recording payment...', selectedFee, paymentFormData);
    
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
    console.log('School ID:', schoolId);
    
    if (!schoolId) {
      toast.error('School ID not found. Please log in again.');
      return;
    }

    try {
      console.log('Calling API with:', {
        schoolId,
        studentFeeId: selectedFee.id,
        studentId: selectedFee.studentId,
        amountPaid: amount,
        paymentMethod: paymentFormData.paymentMethod,
        transactionReference: paymentFormData.transactionReference || undefined,
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes || undefined,
      });
      
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
      const response = await financeAPI.generateInstallmentFees({
        schoolId: user.schoolId,
        academicYearId: selectedYear,
        feeType: 'TUITION',
      });
      if (response.data?.success) {
        toast.success(response.data.message || 'Installments generated successfully');
        loadData();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate installments');
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

  const getFeeStructurePeriod = (fs: FeeStructure) => {
    if (fs.term?.name) return fs.term.name;
    const installmentMatch = fs.description?.match(/\bfor\s+(.+)$/i);
    if (installmentMatch?.[1]) return installmentMatch[1];
    if (fs.semester) return `Semester ${fs.semester}`;
    return 'Whole Academic Year';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">Finance Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage fee structures, student fees, and payments</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
                <DollarSign className="w-3 h-3 mr-1" />
                {getModeLabel(feeCollectionMode)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Filters */}
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
                    <Button variant="outline" onClick={handleGenerateInstallments} className="border-green-600 text-green-700 hover:bg-green-50">
                      <Plus className="w-4 h-4 mr-2" />
                      Auto-Generate / Reconcile {installmentCount}x
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                      setFormData({ feeType: 'TUITION', grade: 'all', amount: '', termId: '', semester: '', description: '', isActive: true });
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
                    {feeStructures.length > 0 ? (
                      feeStructures.map(fs => (
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
                          No fee structures found
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
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
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
                    {FEE_TYPES.map(ft => (
                      <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={formData.grade} onValueChange={(v) => setFormData({...formData, grade: v})}>
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
