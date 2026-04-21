'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, DollarSign, CheckCircle, Clock, FileText, Download, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { financeAPI } from '@/lib/api';
import { toast } from 'sonner';

interface PayrollItem {
  id: string;
  employeeId: string;
  employee?: { name: string; phone?: string };
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  overtime: number;
  tax: number;
  netSalary: number;
  bankAccount?: string;
}

interface Payroll {
  id: string;
  academicYear: string;
  month: number;
  year: number;
  status: string;
  totalAmount: number;
  paymentDate?: string;
  paymentReference?: string;
  createdAt: string;
  submittedAt?: string;
  processedAt?: string;
  submittedBy?: { name: string };
  processedBy?: { name: string };
  payrollItems: PayrollItem[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FinancePayrollPage() {
  const router = useRouter();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await financeAPI.getPayrollsFinance({});
      if (response.data.success) {
        setPayrolls(response.data.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': 
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'SUBMITTED': 
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><DollarSign className="h-3 w-3 mr-1" />Ready for Review</Badge>;
      case 'PENDING_PAYMENT': 
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"><Clock className="h-3 w-3 mr-1" />Pending Payment</Badge>;
      case 'PROCESSED': 
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><CreditCard className="h-3 w-3 mr-1" />Ready to Pay</Badge>;
      case 'PAID': 
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'CANCELLED': 
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelled</Badge>;
      default: 
        return <Badge>{status}</Badge>;
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

  const handleProcessPayment = async (payrollId: string) => {
    try {
      setProcessing(true);
      await financeAPI.processPaymentToBank(payrollId);
      toast.success('Payment sent for processing');
      fetchPayrolls();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayroll) return;
    try {
      setProcessing(true);
      await financeAPI.markPayrollPaid(selectedPayroll.id, paymentReference || undefined);
      toast.success('Marked as paid successfully');
      setShowPaymentDialog(false);
      setSelectedPayroll(null);
      setPaymentReference('');
      fetchPayrolls();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentDialog = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setShowPaymentDialog(true);
  };

  const pendingPaymentPayrolls = payroll.filter(p => p.status === 'PENDING_PAYMENT' || p.status === 'PROCESSED');
  const paidPayrolls = payroll.filter(p => p.status === 'PAID');

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Payroll Management</h1>
          <p className="text-gray-500 mt-1">Process and manage employee salary payments</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/finance/payroll/reports')}>
          <FileText className="mr-2 h-4 w-4" />
          Reports
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Payment</p>
                <p className="text-2xl font-bold">{pendingPaymentPayrolls.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Paid This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(paidPayrolls.reduce((sum, p) => sum + p.totalAmount, 0))}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Employees Paid</p>
                <p className="text-2xl font-bold">
                  {paidPayrolls.reduce((sum, p) => sum + (p.payrollItems?.length || 0), 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No payroll records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Period</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Total Amount</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Employees</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Submitted By</TableHead>
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
                      <TableCell className="font-medium px-4 py-3">
                        {formatCurrency(payroll.totalAmount)}
                      </TableCell>
                      <TableCell className="px-4 py-3">{payroll.payrollItems?.length || 0}</TableCell>
                      <TableCell className="px-4 py-3">{payroll.submittedBy?.name || 'N/A'}</TableCell>
                      <TableCell className="px-4 py-3">{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell className="px-4 py-3">{formatDate(payroll.paymentDate)}</TableCell>
                      <TableCell className="text-right px-4 py-3">
                        {payroll.status === 'PENDING_PAYMENT' && (
                          <Button 
                            size="sm" 
                            className="mr-2"
                            onClick={() => handleProcessPayment(payroll.id)}
                            disabled={processing}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Process
                          </Button>
                        )}
                        {(payroll.status === 'PROCESSED' || payroll.status === 'PENDING_PAYMENT') && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => openPaymentDialog(payroll)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/finance/payroll/${payroll.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            {payroll.status === 'PAID' && payroll.paymentReference && (
                              <DropdownMenuItem>
                                Ref: {payroll.paymentReference}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {showPaymentDialog && selectedPayroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Mark as Paid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-medium">{MONTHS[selectedPayroll.month - 1]} {selectedPayroll.year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium text-lg">{formatCurrency(selectedPayroll.totalAmount)}</p>
              </div>
              <div>
                <Label htmlFor="paymentRef">Payment Reference (Optional)</Label>
                <Input
                  id="paymentRef"
                  placeholder="Bank transaction reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter bank transfer reference or check number
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleMarkAsPaid} disabled={processing}>
                  {processing ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}