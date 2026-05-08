'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { hrAPI } from '@/lib/api/hr';
import Pagination from '@/components/Pagination';

interface Attendance {
  id: string;
  date: string;
  status: string;
  remarks?: string;
  checkInTime?: string;
  checkOutTime?: string;
  employee: {
    name: string;
    hrProfile?: {
      employeeId: string;
      designation?: string;
    };
  };
}

interface PaginatedResponse {
  data: Attendance[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchAttendance();
  }, [pagination.page, filters]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await hrAPI.getAttendance({
        page: pagination.page,
        limit: pagination.limit,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status || undefined,
      });
      const data: PaginatedResponse = response.data;
      setAttendances(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
      }));
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Present</Badge>;
      case 'ABSENT': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'LATE': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />Late</Badge>;
      case 'HALF_DAY': return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Half Day</Badge>;
      case 'LEAVE': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Leave</Badge>;
      case 'HOLIDAY': return <Badge variant="outline">Holiday</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Employee Attendance</h1>
          <p className="text-gray-500 mt-1">Track and manage employee attendance</p>
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
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="LEAVE">Leave</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchAttendance}>Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Date</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Employee</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Employee ID</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Check In</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Check Out</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((attendance) => (
                  <TableRow key={attendance.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(attendance.date)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium px-4 py-3">
                      {attendance.employee.name}
                      <p className="text-xs text-gray-500">
                        {attendance.employee.hrProfile?.designation}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3">{attendance.employee.hrProfile?.employeeId || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3">{getStatusBadge(attendance.status)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(attendance.checkInTime)}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(attendance.checkOutTime)}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500">
                      {attendance.remarks || '-'}
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
    </div>
  );
}
