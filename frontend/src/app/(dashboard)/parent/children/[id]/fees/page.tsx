"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  CreditCard, 
  Calendar, 
  Download, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  FileText,
  Receipt,
  Banknote,
  Clock,
  TrendingUp,
  Wallet,
  Building,
  Smartphone
} from "lucide-react";
import { financeAPI } from "@/lib/api";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
  paidAmount: number;
  balance: number;
  category: string;
  term: string;
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  feeItemName: string;
  status: string;
}

interface FeeSummary {
  totalFees: number;
  totalPaid: number;
  totalBalance: number;
  nextDueDate: string | null;
}

interface ChildInfo {
  id: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
}

const ChildFeesPage = () => {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const schoolId = localStorage.getItem('schoolId');
        const academicYearId = localStorage.getItem('academicYearId');

        if (!schoolId || !academicYearId) {
          setFeeItems([]);
          setPayments([]);
          setSummary(null);
          setChild(null);
          return;
        }

        const response = await financeAPI.getStudentFees(childId, schoolId, academicYearId);
        const data = response.data;
        setFeeItems(data.feeItems || []);
        setPayments(data.payments || []);
        setSummary(data.summary || null);
        setChild(data.student || null);
      } catch (error) {
        console.error("Failed to fetch fees:", error);
        setFeeItems([]);
        setPayments([]);
        setSummary(null);
        setChild(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [childId]);

  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "PARTIAL":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "PENDING":
      case "OVERDUE":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Paid";
      case "PARTIAL":
        return "Partial";
      case "PENDING":
        return "Due";
      case "OVERDUE":
        return "Overdue";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/parent/children/${childId}`)}
                className="dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-[#e35336]">Fee Details</h1>
                {child && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {child.name} • {child.className} - Section {child.section}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Top Summary Section - Three Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Fees</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(summary?.totalFees || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(summary?.totalPaid || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Balance</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(summary?.totalBalance || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Section - Fee Breakdown Table and Payment Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fee Breakdown Table */}
            <Card className="lg:col-span-2 shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Fee Breakdown
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Current term fees and payment status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100 dark:border-slate-700">
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Fee Type</TableHead>
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Term</TableHead>
                        <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Amount</TableHead>
                        <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Paid</TableHead>
                        <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Balance</TableHead>
                        <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.map((item) => (
                        <TableRow key={item.id} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                          <TableCell className="py-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-400">{item.term}</TableCell>
                          <TableCell className="py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(item.paidAmount)}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.balance)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(item.status)}`}>
                              {getStatusText(item.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Right Side Panel - Payment Summary Card */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Next Due Date */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Next Due Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {summary?.nextDueDate ? formatDate(summary.nextDueDate) : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Payment Methods</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Card Payment</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Building className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Bank Transfer</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Mobile Money</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <Button
                    className="w-full"
                    style={{ backgroundColor: "#1E3A8A" }}
                  >
                    Pay Now
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section - Payment History Timeline */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Payment History
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Recent payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {payments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className={`flex items-start gap-4 py-4 ${
                      index !== payments.length - 1
                        ? "border-b border-gray-100 dark:border-slate-700"
                        : ""
                    }`}
                  >
                    <div className="relative flex flex-col items-center">
                      <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {index !== payments.length - 1 && (
                        <div className="w-px h-full absolute top-10 bg-gray-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.feeItemName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Invoice: {payment.receiptNumber} • {payment.paymentMethod}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount)}
                          </p>
                          <Button variant="ghost" size="sm" className="dark:hover:bg-slate-800">
                            <Receipt className="w-4 h-4 mr-1" />
                            <span className="text-xs">Receipt</span>
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDate(payment.paidAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChildFeesPage;
