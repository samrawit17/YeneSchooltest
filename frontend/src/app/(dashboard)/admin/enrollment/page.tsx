'use client';

import { useState, useEffect } from 'react';
import { enrollmentAPI, academicYearsAPI, EnrollmentRequest, EnrollmentStats, EnrollmentCredentials } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Pagination from '@/components/Pagination';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Search,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  Calendar,
  User,
  Loader2,
  Send,
  RefreshCw,
  FileText,
  Check,
  Ban,
  ListFilter
} from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
  DOCUMENTS_PENDING: { color: 'bg-orange-100 text-orange-800', icon: <FileText className="w-4 h-4" />, label: 'Documents Pending' },
  APPROVED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" />, label: 'Approved' },
  REJECTED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: 'Rejected' },
  WAITLISTED: { color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="w-4 h-4" />, label: 'Waitlisted' },
  CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: <Ban className="w-4 h-4" />, label: 'Cancelled' },
};

export default function AdminEnrollmentPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EnrollmentStats | null>(null);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentRequest | null>(null);
  const [credentials, setCredentials] = useState<EnrollmentCredentials | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load academic years
  useEffect(() => {
    const loadYears = async () => {
      try {
        const response = await academicYearsAPI.getAll();
        setAcademicYears(response.data);
        const activeYear = response.data.find((y: AcademicYear) => y.isActive);
        if (activeYear) {
          setSelectedYear(activeYear.id);
        } else if (response.data.length > 0) {
          setSelectedYear(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load academic years:', error);
      }
    };
    loadYears();
  }, []);

  // Load data
  useEffect(() => {
    if (!selectedYear) return;
    loadData();
  }, [selectedYear, selectedStatus, selectedGrade, searchTerm, currentPage, user?.schoolId]);

  const loadData = async () => {
    if (!user?.schoolId) return;
    
    setLoading(true);
    try {
      const [statsRes, requestsRes] = await Promise.all([
        enrollmentAPI.getStats(user.schoolId, selectedYear),
        enrollmentAPI.listRequests({
          schoolId: user.schoolId,
          academicYearId: selectedYear,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          grade: selectedGrade !== 'all' ? parseInt(selectedGrade) : undefined,
          search: searchTerm || undefined,
          page: currentPage,
          limit: pageSize,
        }),
      ]);

      setStats(statsRes.data?.data || null);
      setRequests(requestsRes.data?.data || []);
      setTotalItems(requestsRes.data?.total || 0);
      setTotalPages(Math.ceil((requestsRes.data?.total || 0) / pageSize));
    } catch (error) {
      console.error('Failed to load enrollment data:', error);
      toast.error('Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: EnrollmentRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    try {
      const response = await enrollmentAPI.approveEnrollment(selectedRequest.id, user!.schoolId!);
      setCredentials(response.data?.data?.credentials || null);
      setCredentialsDialogOpen(true);
      setApproveDialogOpen(false);
      toast.success('Enrollment approved! Credentials generated.');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve enrollment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason) return;
    
    setActionLoading(true);
    try {
      await enrollmentAPI.rejectEnrollment(selectedRequest.id, user!.schoolId!, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      toast.success('Enrollment rejected');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject enrollment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaitlist = async (request: EnrollmentRequest) => {
    try {
      await enrollmentAPI.waitlistEnrollment(request.id, user!.schoolId!);
      toast.success('Student added to waitlist');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to waitlist enrollment');
    }
  };

  const openRejectDialog = (request: EnrollmentRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const openApproveDialog = (request: EnrollmentRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enrollment Management</h1>
            <p className="text-gray-500">Manage student enrollment requests</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Waitlisted</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.waitlisted}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                    <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Enrollment Requests</span>
              <Badge variant="secondary">{totalItems} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No enrollment requests found
              </div>
            ) : (
              <>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.firstName} {request.middleName} {request.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {request.email || request.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Grade {request.requestedGrade}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.parentFirstName} {request.parentLastName}
                            </p>
                            <p className="text-sm text-gray-500">{request.parentPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[request.status]?.color}>
                            {statusConfig[request.status]?.icon}
                            <span className="ml-1">{statusConfig[request.status]?.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(request)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {request.status === 'PENDING' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => openApproveDialog(request)}>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openRejectDialog(request)}>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalItems > pageSize && (
                  <div className="mt-4">
                    <Pagination
                      page={currentPage}
                      setPage={setCurrentPage}
                      totalPages={totalPages}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enrollment Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge className={statusConfig[selectedRequest.status]?.color}>
                    {statusConfig[selectedRequest.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Applied Grade</Label>
                  <p className="font-medium">Grade {selectedRequest.requestedGrade}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Student Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Name:</span> {selectedRequest.firstName} {selectedRequest.middleName} {selectedRequest.lastName}</div>
                  <div><span className="text-gray-500">DOB:</span> {formatDate(selectedRequest.dateOfBirth)}</div>
                  <div><span className="text-gray-500">Gender:</span> {selectedRequest.gender}</div>
                  <div><span className="text-gray-500">Nationality:</span> {selectedRequest.nationality || '-'}</div>
                  <div><span className="text-gray-500">Phone:</span> {selectedRequest.phone || '-'}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedRequest.email || '-'}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Parent/Guardian Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Name:</span> {selectedRequest.parentFirstName} {selectedRequest.parentLastName}</div>
                  <div><span className="text-gray-500">Phone:</span> {selectedRequest.parentPhone}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedRequest.parentEmail || '-'}</div>
                  <div><span className="text-gray-500">Relation:</span> {selectedRequest.parentRelation}</div>
                </div>
              </div>

              {selectedRequest.previousSchool && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Previous School
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">School:</span> {selectedRequest.previousSchool}</div>
                    <div><span className="text-gray-500">Grade:</span> {selectedRequest.previousGrade || '-'}</div>
                  </div>
                </div>
              )}

              {selectedRequest.allocatedStudentCode && (
                <div className="border-t pt-4 bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4" /> Enrollment Details
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Student Code:</span> <strong>{selectedRequest.allocatedStudentCode}</strong></div>
                    <div><span className="text-gray-500">Class:</span> <strong>{selectedRequest.allocatedClass?.name}</strong></div>
                    <div><span className="text-gray-500">Section:</span> <strong>{selectedRequest.allocatedSection?.name}</strong></div>
                  </div>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="border-t pt-4 bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-800">Rejection Reason</h3>
                  <p className="text-sm text-red-700">{selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            {selectedRequest?.status === 'PENDING' && (
              <>
                <Button variant="outline" onClick={() => { setViewDialogOpen(false); handleWaitlist(selectedRequest); }}>
                  Add to Waitlist
                </Button>
                <Button variant="destructive" onClick={() => { setViewDialogOpen(false); openRejectDialog(selectedRequest); }}>
                  Reject
                </Button>
                <Button onClick={() => { setViewDialogOpen(false); openApproveDialog(selectedRequest); }}>
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Enrollment</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div>
              <p>Are you sure you want to approve enrollment for:</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedRequest.firstName} {selectedRequest.lastName}</p>
                <p className="text-sm text-gray-500">Grade {selectedRequest.requestedGrade}</p>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                This will automatically:
                <ul className="list-disc list-inside mt-2">
                  <li>Allocate the student to a class and section</li>
                  <li>Generate a student code and roll number</li>
                  <li>Create user accounts for student and parent</li>
                  <li>Generate login credentials</li>
                </ul>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Enrollment Approved!
            </DialogTitle>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                The following credentials have been generated. Please share them with the student and parent.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Student Credentials</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Username:</span> <strong>{credentials.student.username}</strong></div>
                  <div><span className="text-gray-500">Student Code:</span> <strong>{credentials.student.studentCode}</strong></div>
                  <div><span className="text-gray-500">Class:</span> <strong>{credentials.student.class}</strong></div>
                  <div><span className="text-gray-500">Section:</span> <strong>{credentials.student.section}</strong></div>
                  <div><span className="text-gray-500">Roll Number:</span> <strong>{credentials.student.rollNumber}</strong></div>
                  <div><span className="text-gray-500">Temporary Password:</span> <code className="bg-white px-2 py-1 rounded">{credentials.student.password}</code></div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Parent Credentials</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Username:</span> <strong>{credentials.parent.username}</strong></div>
                  <div><span className="text-gray-500">Phone:</span> <strong>{credentials.parent.phone}</strong></div>
                  <div className="text-sm text-purple-700">
                    Note: Parent account already exists. They can login with their existing credentials.
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentialsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Enrollment</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div>
              <p>Please provide a reason for rejecting enrollment for:</p>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedRequest.firstName} {selectedRequest.lastName}</p>
              </div>
              <div className="mt-4">
                <Label>Rejection Reason *</Label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  rows={4}
                  placeholder="Please explain why this enrollment is being rejected..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
