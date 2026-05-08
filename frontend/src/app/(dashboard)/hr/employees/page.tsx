'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Search, Mail, Phone, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hrAPI } from '@/lib/api/hr';
import Pagination from '@/components/Pagination';
import TableSearch from '@/components/TableSearch';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  hrProfile?: {
    employeeId: string;
    designation?: string;
    department?: {
      name: string;
    };
    joiningDate?: string;
  };
}

interface PaginatedResponse {
  data: Employee[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, [pagination.page, search]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await hrAPI.getEmployees({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });
      const data: PaginatedResponse = response.data;
      setEmployees(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
      }));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'TEACHER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ADMIN': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'HR': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'FINANCE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'REGISTRAR': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Employees</h1>
          <p className="text-gray-500 mt-1">Manage your school staff</p>
        </div>
        <Button onClick={() => router.push('/hr/employees/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Employees</CardTitle>
            <div className="flex items-center gap-2">
              <TableSearch
                search={search}
                setSearch={setSearch}
                placeholder="Search employees..."
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Employee</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">ID</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Role</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Department</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Join Date</TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">{employee.username || employee.hrProfile?.employeeId || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">{employee.hrProfile?.department?.name || employee.hrProfile?.designation || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(employee.hrProfile?.joiningDate)}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/hr/employees/${employee.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/hr/employees/${employee.id}/edit`)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
