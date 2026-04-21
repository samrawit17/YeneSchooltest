'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, DollarSign, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hrAPI, academicYearsAPI } from '@/lib/api';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

interface PayrollItem {
  id: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  overtime: number;
  tax: number;
  netSalary: number;
}

interface Payroll {
  id: string;
  academicYear: string;
  month: number;
  year: number;
  status: string;
  totalAmount: number;
  paymentDate?: string;
  createdAt: string;
  payrollItems: PayrollItem[];
}

interface PaginatedResponse {
  data: Payroll[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahisas', 'Ter', 'Yekatit',
  'Megabit', 'Miazia', 'Gnbot', 'Sene', 'Hamle', 'Nehase'
];

const getMonthOptions = (calendarType: string) => {
  if (calendarType === 'ETHIOPIAN') {
    return ETHIOPIAN_MONTHS.map((label, idx) => ({ value: idx + 1, label }));
  }
  return MONTHS.map((label, idx) => ({ value: idx + 1, label }));
};

const getYearOptions = (calendarType: string) => {
  const currentYear = new Date().getFullYear();
  const ethioYear = currentYear - 7;
  if (calendarType === 'ETHIOPIAN') {
    return [ethioYear - 1, ethioYear, ethioYear + 1];
  }
  return [currentYear - 1, currentYear, currentYear + 1];
};

const MONTHS_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function PayrollPage() {
  const router = useRouter();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; calendarType?: string }[]>([]);
  const [calendarType, setCalendarType] = useState<'GREGORIAN' | 'ETHIOPIAN'>('GREGORIAN');
  const [formData, setFormData] = useState({
    academicYear: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paymentDate: '',
  });

  useEffect(() => {
    fetchPayrolls();
  }, [pagination.page]);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await hrAPI.getPayrolls({
        page: pagination.page,
        limit: pagination.limit,
      });
      const data: PaginatedResponse = response.data;
      setPayrolls(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.meta?.total || 0,
        totalPages: data.meta?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearsAPI.getAll({});
      const years = response.data.data || response.data || [];
      setAcademicYears(years);
      if (years.length > 0) {
        setFormData(prev => ({ ...prev, academicYear: years[0].name }));
        // Set calendar type from the first academic year
        if (years[0].calendarType) {
          setCalendarType(years[0].calendarType as 'GREGORIAN' | 'ETHIOPIAN');
        }
      }
    } catch (error) {
      console.error('Failed to fetch academic years:', error);
    }
  };

  const handleOpenCreateDialog = async () => {
    await fetchAcademicYears();
    setShowCreateDialog(true);
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.academicYear) {
      toast.error('Please select an academic year');
      return;
    }
    try {
      setCreating(true);
      await hrAPI.createPayroll({
        academicYear: formData.academicYear,
        month: formData.month,
        year: formData.year,
        paymentDate: formData.paymentDate || undefined,
      });
      toast.success('Payroll created successfully');
      setShowCreateDialog(false);
      fetchPayrolls();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create payroll');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'SUBMITTED': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><DollarSign className="h-3 w-3 mr-1" />Calculated</Badge>;
      case 'PENDING_PAYMENT': return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"><Clock className="h-3 w-3 mr-1" />Pending Payment</Badge>;
      case 'PROCESSED': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><DollarSign className="h-3 w-3 mr-1" />Ready for Payment</Badge>;
      case 'PAID': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'CANCELLED': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getActionButtons = (payroll: Payroll) => {
    switch (payroll.status) {
      case 'DRAFT':
        return (
          <Button size="sm" onClick={() => router.push(`/hr/payroll/${payroll.id}/calculate`)}>
            Calculate
          </Button>
        );
      case 'SUBMITTED':
        return (
          <Button size="sm" onClick={() => router.push(`/hr/payroll/${payroll.id}/submit`)}>
            Submit to Finance
          </Button>
        );
      case 'PENDING_PAYMENT':
      case 'PROCESSED':
        return (
          <span className="text-sm text-gray-500">Waiting for Finance to process</span>
        );
      case 'PAID':
        return (
          <span className="text-sm text-green-600">Completed</span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleMarkAsPaid = async (payrollId: string) => {
    try {
      await hrAPI.markPayrollPaid(payrollId);
      fetchPayrolls();
    } catch (error) {
      console.error('Failed to mark payroll as paid:', error);
    }
  };

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Payroll</h1>
          <p className="text-gray-500 mt-1">Manage employee salary payments</p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Payroll
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No payroll records found. Create a new payroll to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Period</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Academic Year</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Total Amount</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Employees</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Payment Date</TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => (
                  <TableRow key={payroll.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="font-medium px-4 py-3">
                      {MONTHS[payroll.month - 1]} {payroll.year}
                    </TableCell>
                    <TableCell className="px-4 py-3">{payroll.academicYear}</TableCell>
                    <TableCell className="font-medium px-4 py-3">
                      {formatCurrency(payroll.totalAmount)}
                    </TableCell>
                    <TableCell className="px-4 py-3">{payroll.payrollItems?.length || 0}</TableCell>
                    <TableCell className="px-4 py-3">{getStatusBadge(payroll.status)}</TableCell>
                    <TableCell className="px-4 py-3">{formatDate(payroll.paymentDate)}</TableCell>
                    <TableCell className="text-right px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {getActionButtons(payroll)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/hr/payroll/${payroll.id}`)}>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <Pagination
                page={pagination.page}
                setPage={(page) => setPagination(p => ({ ...p, page }))}
                totalPages={pagination.totalPages}
                className="flex-wrap"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payroll Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Create New Payroll
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePayroll} className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Calendar Type</Label>
              <span className={`px-2 py-1 rounded text-xs font-medium ${calendarType === 'ETHIOPIAN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                {calendarType === 'ETHIOPIAN' ? 'Ethiopian' : 'Gregorian'}
              </span>
            </div>

            <div>
              <Label htmlFor="academicYear">Academic Year</Label>
              <Select
                value={formData.academicYear}
                onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.name}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month">Month</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, month: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions(calendarType).map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getYearOptions(calendarType).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date (Optional)</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Payroll'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
