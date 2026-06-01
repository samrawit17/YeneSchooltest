"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { academicYearsAPI, studentsAPI } from "@/lib/api";
import { bulkUploadAPI } from "@/lib/api/bulk-upload";
import { queryKeys } from "@/lib/query-keys";
import { formatStudentDisplayCode } from "@/lib/student-code";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { useAuth } from "@/context/AuthContext";
import { Filters, useFilters } from "@/components/filters/Filters";
import { useTranslations } from "@/hooks/useTranslations";
import {
  UserPlus,
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
  academicYearDisplay?: string | null;
  grade: number;
  gender?: string;
  address?: string;
  phone?: string;
  className?: string;
  section?: string;
  rollNumber?: string;
  parentName?: string;
  parentPhone?: string;
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

interface AcademicYearOption {
  id: string;
  name?: string;
  ethiopianYear?: number | null;
}

const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );

const StudentsListPage = () => {
  const { t } = useTranslations<any>("peopleLists");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

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

  // Add Student state
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    email: "",
    phone: "",
    mother_name: "",
    mother_phone: "",
    gender: "MALE"
  });
  const [importResult, setImportResult] = useState<{ credentials?: { name: string; email: string; username: string; role: string }[] } | null>(null);

  // Fetch students data
  const { data: studentsData, isLoading } = useQuery<StudentsResponse>({
    queryKey: queryKeys.students.list(
      currentPage,
      searchInput,
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
        year: yearFilter,
        search: searchInput,
      });
      const response = await studentsAPI.getAll({
        status: statusFilter || undefined,
        grade: gradeFilter || undefined,
        section: sectionFilter || undefined,
        year: yearFilter || undefined,
        page: currentPage.toString(),
        limit: '10',
        search: searchInput || undefined,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: academicYearsData } = useQuery<AcademicYearOption[]>({
    queryKey: queryKeys.academicYears.list(user?.schoolId),
    queryFn: async () => {
      const response = await academicYearsAPI.getAll({ schoolId: user?.schoolId });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },
    enabled: !!user?.schoolId,
  });

  const academicYearDisplayById = new Map(
    (academicYearsData || []).map((year) => [
      year.id,
      String(year.ethiopianYear || year.name || year.id),
    ]),
  );

  const updateSearch = (value: string) => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const updateYearFilter = (value: string) => {
    setYearFilter(value);
    setCurrentPage(1);
  };

  const updateGradeFilter = (value: string) => {
    setGradeFilter(value);
    setSectionFilter("");
    setCurrentPage(1);
  };

  const updateSectionFilter = (value: string) => {
    setSectionFilter(value);
    setCurrentPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsAPI.delete(id),
    onSuccess: () => {
      toast.success(t.messages.studentDeleted);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t.messages.deleteStudentFailed);
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
    if (!isActive) return t.status.inactive;
    switch (status) {
      case "APPROVED": return t.status.active;
      case "PENDING": return t.status.pending;
      case "REJECTED": return t.status.rejected;
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
      toast.error(t.messages.studentRequired);
      return;
    }

    try {
      // Create a file with single student data for the bulk API
      const csvContent = `full_name,email,phone,mother_name,mother_phone,role\n${newStudent.full_name},${newStudent.email},${newStudent.phone || ""},${newStudent.mother_name || ""},${newStudent.mother_phone || ""},student`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'single_student.csv', { type: 'text/csv' });

      const response = await bulkUploadAPI.uploadUsers(file);

      if (response.data.status === 'success') {
        // Store the credentials to display
        setImportResult(response.data);
        queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
        toast.success(t.messages.studentCreated);
      } else {
        toast.error(t.messages.createStudentFailed);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t.messages.createStudentFailed);
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
        <div className="w-full space-y-6">
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
        <div className="w-full space-y-6">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white">{t.titles.students}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.subtitles.students}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user?.role === 'REGISTRAR' && (
                <>
                  <Link href="/admin/bulk-upload">
                    <Button
                      variant="outline"
                      className="dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t.actions.bulkImport}
                    </Button>
                  </Link>
                  <Button
                    style={{ backgroundColor: "#1E3A8A" }}
                    onClick={handleAddStudentClick}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t.actions.addStudent}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-row flex-wrap items-center gap-3">
                {/* Search Bar using TableSearch Component */}
                <div className="flex-1 min-w-[160px]">
                  <TableSearch
                    search={searchInput}
                    setSearch={updateSearch}
                    placeholder={t.placeholders.studentSearch}
                    className="w-full"
                  />
                </div>

                {/* Centralized Filters */}
                <div className="flex-1 min-w-[200px]">
                  <Filters
                    config={{
                      academicYear: true,
                      grade: true,
                      section: true,
                      status: true,
                    }}
                    selectedYear={yearFilter}
                    onYearChange={updateYearFilter}
                    selectedGrade={gradeFilter}
                    onGradeChange={updateGradeFilter}
                    selectedSection={sectionFilter}
                    onSectionChange={updateSectionFilter}
                    sectionMode="name"
                    selectedStatus={statusFilter}
                    onStatusChange={updateStatusFilter}
                    options={{
                      statusOptions: [
                        { value: "Active", label: t.status.active },
                        { value: "Inactive", label: t.status.inactive },
                        { value: "Pending", label: t.status.pending },
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
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.photo}</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.studentName}</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.studentId}</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.grade}</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.section}</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.parent}</TableHead>
                    <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.parentPhone}</TableHead>
                    <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/list/students/${student.id}`)}
                    >
                      <TableCell className="px-4 py-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm">
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
                        <div className="font-mono font-medium">
                          {formatStudentDisplayCode(
                            student.studentCode,
                            student.academicYearDisplay ||
                              academicYearDisplayById.get(student.academicYear) ||
                              student.academicYear,
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.grade ? `${t.table.grade} ${student.grade}` : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.section || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.parentName || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {student.parentPhone || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(student.enrollmentStatus, student.user?.isActive || false)}`}>
                          {getStatusText(student.enrollmentStatus, student.user?.isActive || false)}
                        </span>
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
                    {t.empty.noStudents}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatMessage(t.empty.noStudentsSearch, { query: searchInput })}
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
                  ? formatMessage(t.pagination.studentsSearch, { start: startItem, end: Math.min(endItem, total), total, query: searchInput })
                  : formatMessage(t.pagination.students, { start: startItem, end: endItem, total })}
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
            <DialogTitle>{t.actions.addNewStudent}</DialogTitle>
            <DialogDescription>
              {t.modal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.modal.fullName}</label>
              <input
                type="text"
                value={newStudent.full_name}
                onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder={t.placeholders.fullName}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t.modal.email}</label>
              <input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder={t.placeholders.email}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t.modal.phone}</label>
              <input
                type="text"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder={t.placeholders.phone}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Mother's Name</label>
              <input
                type="text"
                value={newStudent.mother_name}
                onChange={(e) => setNewStudent({ ...newStudent, mother_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter mother's full name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Mother's Phone</label>
              <input
                type="text"
                value={newStudent.mother_phone}
                onChange={(e) => setNewStudent({ ...newStudent, mother_phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter mother's phone number"
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t.modal.gender}</label>
              <select
                value={newStudent.gender}
                onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="MALE">{t.modal.male}</option>
                <option value="FEMALE">{t.modal.female}</option>
                <option value="OTHER">{t.modal.other}</option>
              </select>
            </div>

            {/* Show credentials after creation */}
            {importResult && importResult.credentials && importResult.credentials.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">{t.modal.created}</span>
                </div>
                <p className="text-sm text-green-700 mb-2">{t.modal.credentials}</p>
                <div className="bg-white p-3 rounded border text-sm font-mono">
                  <div><span className="font-semibold">{t.modal.name}</span> {importResult.credentials[0]?.name}</div>
                  <div><span className="font-semibold">{t.modal.emailLabel}</span> <span className="text-blue-600">{importResult.credentials[0]?.email}</span></div>
                  <div><span className="font-semibold">{t.modal.username}</span> <span className="text-blue-600">{importResult.credentials[0]?.username}</span></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddStudentDialogOpen(false)}>
                {t.actions.cancel}
              </Button>
              <Button onClick={handleAddStudent} style={{ backgroundColor: "#1E3A8A" }}>
                {t.actions.createStudent}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsListPage;
