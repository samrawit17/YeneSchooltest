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
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, CheckCircle, XCircle, Calendar, Search, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { hrAPI } from '@/lib/api';
import Pagination from '@/components/Pagination';
import TableSearch from '@/components/TableSearch';

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
  employee: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
  approvedBy?: {
    name: string;
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
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
];

export default function HrLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    leaveType: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; requestId: string; reason: string }>({
    open: false,
    requestId: '',
    reason: '',
  });

  useEffect(() => {
    fetchRequests();
  }, [pagination.page, filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await hrAPI.getLeaveRequests({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || undefined,
        leaveType: filters.leaveType || undefined,
        search: filters.search || undefined,
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

  const handleApprove = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await hrAPI.approveLeaveRequest(requestId);
      toast.success('Leave request approved');
      fetchRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.reason) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(rejectDialog.requestId);
      await hrAPI.rejectLeaveRequest(rejectDialog.requestId, rejectDialog.reason);
      toast.success('Leave request rejected');
      setRejectDialog({ open: false, requestId: '', reason: '' });
      fetchRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
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

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'ANNUAL':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Annual</Badge>;
      case 'SICK':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Sick</Badge>;
      case 'CASUAL':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Casual</Badge>;
      case 'UNPAID':
        return <Badge variant="outline">Unpaid</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
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
          <p className="text-gray-500 mt-1">Manage employee leave requests</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select
                value={filters.leaveType}
                onValueChange={(value) => setFilters({ ...filters, leaveType: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <TableSearch
                search={filters.search}
                setSearch={(search) => setFilters({ ...filters, search })}
                placeholder="Search employee..."
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchRequests}>Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests ({pagination.total})</CardTitle>
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
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Employee</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Leave Type</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Dates</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Days</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Status</TableHead>
                    <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Requested</TableHead>
                    <TableHead className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell className="px-4 py-3">
                        <div>
                          <p className="font-medium">{request.employee.name}</p>
                          <p className="text-sm text-gray-500">{request.employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {getLeaveTypeBadge(request.leaveType)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">{request.totalDays}</TableCell>
                      <TableCell className="px-4 py-3">
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {request.status === 'PENDING' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={actionLoading === request.id}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleApprove(request.id)}
                                disabled={actionLoading === request.id}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setRejectDialog({ open: true, requestId: request.id, reason: '' })}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {request.approvedBy ? `By ${request.approvedBy.name}` : '-'}
                          </span>
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

      {/* Reject Dialog */}
      {rejectDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Reject Leave Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rejection Reason *</Label>
                <Input
                  value={rejectDialog.reason}
                  onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectDialog({ open: false, requestId: '', reason: '' })}>
                  Cancel
                </Button>
                <Button onClick={handleReject} disabled={actionLoading === rejectDialog.requestId}>
                  {actionLoading === rejectDialog.requestId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Reject'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}