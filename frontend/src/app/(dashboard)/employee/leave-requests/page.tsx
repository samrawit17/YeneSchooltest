'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { MoreVertical, Calendar, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { hrAPI } from '@/lib/api/hr';
import Pagination from '@/components/Pagination';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  contactDuringLeave?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface LeaveBalance {
  annual: number;
  sick: number;
  casual: number;
  used: {
    annual: number;
    sick: number;
    casual: number;
  };
  available: {
    annual: number;
    sick: number;
    casual: number;
  };
}

interface LeaveBalanceResponse {
  annual: number;
  sick: number;
  casual: number;
  used: {
    annual: number;
    sick: number;
    casual: number;
  };
  available: {
    annual: number;
    sick: number;
    casual: number;
  };
}

interface PaginatedResponse {
  data: LeaveRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Annual Leave', description: `Available: 12 days` },
  { value: 'SICK', label: 'Sick Leave', description: `Available: 10 days` },
  { value: 'CASUAL', label: 'Casual Leave', description: `Available: 5 days` },
  { value: 'UNPAID', label: 'Unpaid Leave', description: `No limit` },
];

export default function EmployeeLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    contactDuringLeave: '',
  });

  useEffect(() => {
    fetchMyRequests();
    fetchBalance();
  }, [pagination.page]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await hrAPI.getMyLeaveRequests({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
      });
      const data: PaginatedResponse = response.data;
      setRequests(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
      }));
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await hrAPI.getMyLeaveBalance();
      setBalance(response.data);
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await hrAPI.createLeaveRequest(formData);
      toast.success('Leave request submitted successfully');
      setShowForm(false);
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        contactDuringLeave: '',
      });
      fetchMyRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await hrAPI.cancelLeaveRequest(requestId);
      toast.success('Request cancelled');
      fetchMyRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to cancel request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    return LEAVE_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Leave Requests</h1>
          <p className="text-gray-500 mt-1">Submit and manage your leave requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Leave Balance */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Annual Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {balance.available.annual} / {balance.annual}
              </div>
              <p className="text-xs text-gray-500">{balance.used.annual} used</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {balance.available.sick} / {balance.sick}
              </div>
              <p className="text-xs text-gray-500">{balance.used.sick} used</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Casual Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {balance.available.casual} / {balance.casual}
              </div>
              <p className="text-xs text-gray-500">{balance.used.casual} used</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Type *</Label>
                  <Select
                    value={formData.leaveType}
                    onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contact During Leave</Label>
                  <Input
                    value={formData.contactDuringLeave}
                    onChange={(e) => setFormData({ ...formData, contactDuringLeave: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for leave request..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle>My Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No leave requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Type</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Dates</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Days</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Reason</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Status</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Date</TableHead>
                    <TableHead className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell className="px-4 py-3">
                        {getLeaveTypeLabel(request.leaveType)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">{request.totalDays}</TableCell>
                      <TableCell className="px-4 py-3">{request.reason}</TableCell>
                      <TableCell className="px-4 py-3">{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {request.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(request.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
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
    </div>
  );
}
