"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { studentsAPI } from "@/lib/api";
import { bulkUploadAPI } from "@/lib/api/bulk-upload";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import { Filters, useFilters } from "@/components/filters/Filters";
import {
  UserPlus,
  Eye,
  Trash2,
  Edit2,
  Filter,
  Search,
  X,
  ChevronDown,
  Upload,
  MoreHorizontal,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Users
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Types for student data
interface Student {
  id: string;
  userId: string;
  studentCode: string;
  enrollmentStatus: "PENDING" | "APPROVED" | "REJECTED";
  academicYear: string;
  grade: number;
  gender?: string;
  address?: string;
  phone?: string;
  className?: string;
  section?: string;
  rollNumber?: string;
  parentName?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
  };
  enrollment?: {
    id: string;
    status: string;
    grade: number;
  };
}

// Types for paginated response
interface StudentsResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const StudentsListPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is registrar
  const isRegistrar = user?.role?.toUpperCase() === 'REGISTRAR';
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Use centralized filters
  const {
    selectedYear: yearFilter,
    setSelectedYear: setYearFilter,
    selectedGrade: gradeFilter,
    setSelectedGrade: setGradeFilter,
    selectedSection: sectionFilter,
    setSelectedSection: setSectionFilter,
    selectedStatus: statusFilter,
    setSelectedStatus: setStatusFilter,
  } = useFilters();

  // Debounce the search query with 500ms delay
  const debouncedSearch = useDebounce(searchInput, 500);

  // Add Student state
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "MALE"
  });
  const [importResult, setImportResult] = useState<{ credentials?: { name: string; email: string; username: string; role: string }[] } | null>(null);

  // Fetch students data
  const { data: studentsData, isLoading } = useQuery<StudentsResponse>({
    queryKey: queryKeys.students.list(
      currentPage,
      debouncedSearch,
      statusFilter,
      gradeFilter,
      sectionFilter,
      yearFilter
    ),
    queryFn: async () => {
      console.log("API Params:", { 
        status: statusFilter, 
        grade: gradeFilter, 
        section: sectionFilter, 
        year: yearFilter 
      });
      const response = await studentsAPI.getAll({
        status: statusFilter || undefined,
        grade: gradeFilter || undefined,
        section: sectionFilter || undefined,
        year: yearFilter || undefined,
        page: currentPage.toString(),
        limit: '10',
        search: debouncedSearch || undefined,
      });
      return response.data;
    },
  });

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, gradeFilter, sectionFilter, yearFilter]);

  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsAPI.delete(id),
    onSuccess: () => {
      toast.success("Student deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete student");
    },
  });

  // Mock data for demo - REMOVED to fetch actual data
  // const mockStudents: Student[] = [...]

  const students = studentsData?.data || [];
  const total = studentsData?.total || 0;
  const totalPages = studentsData?.totalPages || 0;

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "PENDING":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "REJECTED":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusText = (status: string, isActive: boolean) => {
    if (!isActive) return "Inactive";
    switch (status) {
      case "APPROVED": return "Active";
      case "PENDING": return "Pending";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Add Student handler
  const handleAddStudentClick = () => {
    setAddStudentDialogOpen(true);
  };

  const handleAddStudent = async () => {
    if (!newStudent.full_name || !newStudent.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      // Create a file with single student data for the bulk API
      const csvContent = `full_name,email,phone,role\n${newStudent.full_name},${newStudent.email},${newStudent.phone || ""},student`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'single_student.csv', { type: 'text/csv' });

      const response = await bulkUploadAPI.uploadUsers(file);

      if (response.data.status === 'success') {
        // Store the credentials to display
        setImportResult(response.data);
        queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
        toast.success(`Student created successfully!`);
      } else {
        toast.error("Failed to create student");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create student");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await bulkUploadAPI.getTemplate('students-auto');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_upload_students_auto_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback template
      const content = "first_name,middle_name,last_name,email,phone,current_class\nJohn,,Doe,john@example.com,0911111111,4\nJane,,Smith,jane@example.com,0922222222,4-A";
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_upload_students_auto_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-10 w-40" />
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-5 flex-1" />
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const startItem = (currentPage - 1) * 10 + 1;
  const endItem = Math.min(currentPage * 10, total);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-black">Students Management</h1>
            <div className="flex items-center gap-3">
              {user?.role === 'REGISTRAR' && (
                <>
                  <Link href="/admin/bulk-upload">
                    <Button
                      variant="outline"
                      className="dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Import
                    </Button>
                  </Link>
                  <Button
                    style={{ backgroundColor: "#1E3A8A" }}
                    onClick={handleAddStudentClick}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Search Bar using TableSearch Component */}
                <div className="w-full lg:flex-1">
                  <TableSearch
                    search={searchInput}
                    setSearch={setSearchInput}
                    placeholder="Search by student name, email, or student ID..."
                    className="w-full"
                  />
                </div>

                {/* Centralized Filters */}
                <div className="w-full lg:w-auto lg:min-w-[60%]">
                  <Filters
                    config={{
                      academicYear: true,
                      grade: true,
                      section: true,
                      status: true,
                    }}
                    selectedYear={yearFilter}
                    onYearChange={setYearFilter}
                    selectedGrade={gradeFilter}
                    onGradeChange={(val) => { setGradeFilter(val); setSectionFilter(""); }}
                    selectedSection={sectionFilter}
                    onSectionChange={setSectionFilter}
                    sectionMode="name"
                    selectedStatus={statusFilter}
                    onStatusChange={setStatusFilter}
                    options={{
                      statusOptions: [
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                        { value: "Pending", label: "Pending" },
                      ]
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Data Table */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                  <TableRow className="border-b border-gray-100 dark:border-slate-700">
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Photo</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Student Name</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Student ID</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Grade</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Section</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Parent</TableHead>
                    <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</TableHead>
                    <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <TableCell className="px-4 py-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">
                            {student.user?.name ? getInitials(student.user.name) : "S"}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{student.user?.name || "-"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{student.user?.email || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.studentCode || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.grade ? `Grade ${student.grade}` : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.section || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.parentName || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(student.enrollmentStatus, student.user?.isActive || false)}`}>
                          {getStatusText(student.enrollmentStatus, student.user?.isActive || false)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/list/students/${student.id}`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-[#e35336]" />
                          </Link>
                          {isRegistrar && (
                            <>
                              <Link
                                href={`/list/students/${student.id}/edit`}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </Link>
                              <button
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* No results message when searching */}
              {students.length === 0 && searchInput && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    No students found
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No students match "{searchInput}". Try different keywords.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Bottom - Pagination using Pagination Component */}
          {students.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchInput
                  ? `Showing ${startItem}–${Math.min(endItem, total)} of ${total} students for "${searchInput}"`
                  : `Showing ${startItem}–${endItem} of ${total} students`}
              </p>
              <Pagination
                page={currentPage}
                setPage={setCurrentPage}
                totalPages={totalPages}
                className="flex-wrap"
              />
            </div>
          )}
        </div>
      </div>


      {/* Add Student Dialog */}
      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student account. A username and temporary password will be generated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                value={newStudent.full_name}
                onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email *</label>
              <input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Gender</label>
              <select
                value={newStudent.gender}
                onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Show credentials after creation */}
            {importResult && importResult.credentials && importResult.credentials.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Student created successfully!</span>
                </div>
                <p className="text-sm text-green-700 mb-2">User credentials:</p>
                <div className="bg-white p-3 rounded border text-sm font-mono">
                  <div><span className="font-semibold">Name:</span> {importResult.credentials[0]?.name}</div>
                  <div><span className="font-semibold">Email:</span> <span className="text-blue-600">{importResult.credentials[0]?.email}</span></div>
                  <div><span className="font-semibold">Username:</span> <span className="text-blue-600">{importResult.credentials[0]?.username}</span></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddStudentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStudent} style={{ backgroundColor: "#1E3A8A" }}>
                Create Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsListPage;
