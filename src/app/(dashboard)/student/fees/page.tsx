'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { financeAPI } from '@/lib/api';
import { DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  feeType: string;
  totalFee: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING';
  updatedAt: string;
}

export default function StudentFeesPage() {
  const [user, setUser] = useState<any>(null);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYearId, setAcademicYearId] = useState<string>('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.schoolId) {
        loadStudentFees(parsed);
      }
    }
  }, []);

  const loadStudentFees = async (userData: any) => {
    try {
      // Get current academic year
      const ayResponse = await fetch(`/academic-years?schoolId=${userData.schoolId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const ayData = await ayResponse.json();
      
      if (ayData.success && ayData.data.length > 0) {
        const currentYear = ayData.data.find((y: any) => y.isActive) || ayData.data[0];
        setAcademicYearId(currentYear.id);
        
        // Get student fees
        const feesResponse = await financeAPI.listStudentFees({
          schoolId: userData.schoolId,
          academicYearId: currentYear.id,
          page: 1,
          limit: 50
        });
        
        if (feesResponse.success && feesResponse.data && feesResponse.data.data) {
          // Filter for current student
          const studentFees = feesResponse.data.data.filter(
            (f: any) => f.studentId === userData.id
          );
          setFees(studentFees);
        } else if (feesResponse.data && Array.isArray(feesResponse.data)) {
          // Handle case where data is directly in response.data
          const studentFees = feesResponse.data.filter(
            (f: any) => f.studentId === userData.id
          );
          setFees(studentFees);
        }
      }
    } catch (error) {
      console.error('Error loading student fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'PENDING':
        return <Badge className="bg-red-500">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate totals
  const totalFees = fees.reduce((sum, f) => sum + f.finalAmount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalBalance = fees.reduce((sum, f) => sum + f.remainingBalance, 0);
  const paidPercentage = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e35336]">My Fees</h1>
          <p className="text-gray-500 mt-1">View your fee status and payment history</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">Total Fees</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalFees)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">Amount Paid</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${totalBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${totalBalance > 0 ? 'bg-red-100' : 'bg-gray-200'}`}>
                  <AlertCircle className={`h-6 w-6 ${totalBalance > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${totalBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>Balance</p>
                  <p className={`text-2xl font-bold ${totalBalance > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Overall Payment Progress</span>
              <span className="font-medium">{paidPercentage}%</span>
            </div>
            <Progress value={paidPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Fee Details */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Fees Found</h3>
                <p className="text-gray-500 mt-2">
                  You don't have any fees assigned for this academic year.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{fee.feeType}</h4>
                        {getStatusBadge(fee.status)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Total: {formatCurrency(fee.finalAmount)} 
                        {fee.discount > 0 && <span className="text-green-600 ml-2">(Discount: {formatCurrency(fee.discount)})</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Paid: {formatCurrency(fee.paidAmount)}</p>
                      {fee.remainingBalance > 0 && (
                        <p className="text-red-600 text-sm">Balance: {formatCurrency(fee.remainingBalance)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        {totalBalance > 0 && (
          <Card className="mt-6 bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Payment Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have an outstanding balance of {formatCurrency(totalBalance)}. 
                    Please contact the finance office or your class teacher to make a payment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
