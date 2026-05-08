"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authAPI, classesAPI, sectionsAPI, subjectsAPI, teachersAPI } from "@/lib/api";
import { bulkUploadAPI } from "@/lib/api/hr";
import { classSubjectsAPI } from "@/lib/api/admin";
import { toast } from "sonner";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import { useDebounce } from "@/hooks/useDebounce";

// Shadcn/ui Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icons
import { 
  UserPlus, 
  Eye, 
  Trash2, 
  Edit2,
  Upload,
  Search,
  MoreHorizontal,
  BookOpen,
  Users,
  Phone,
  GraduationCap,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

// Types for teacher data
interface Teacher {
  id: string;
  userId?: string;
  email: string;
  name: string;
  staffId?: string;
  subject?: string;
  assignedClasses?: string[];
  phone?: string;
  employmentStatus?: "Active" | "On Leave" | "Inactive";
  isActive?: boolean;
  designation?: string;
  specialization?: string;
  subjects?: string[];
  img?: string;
  avatarUrl?: string;
}

// Types for paginated response
interface TeachersResponse {
  data: Teacher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TeachersListPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Debounce the search query
  const debouncedSearch = useDebounce(searchInput, 500);
  
  // Add Teacher state
  const [addTeacherDialogOpen, setAddTeacherDialogOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    full_name: "",
    email: "",
    phone: ""
  });
  const [importResult, setImportResult] = useState<{ credentials?: { name: string; email: string; username: string; role: string }[] } | null>(null);

  // Assign Class state
  const [assignClassDialogOpen, setAssignClassDialogOpen] = useState(false);
  const [selectedTeacherForClass, setSelectedTeacherForClass] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [assigningClass, setAssigningClass] = useState(false);
  const [assignType, setAssignType] = useState<'class' | 'section' | 'subject'>('class');

  // Fetch classes for dropdown and deduplicate by unique grade
  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const response = await classesAPI.getAll();
      const classes = response.data || [];
      // Deduplicate by grade
      const uniqueGrades = classes.reduce((acc: any[], cls: any) => {
        if (!acc.find(c => c.grade === cls.grade)) {
          acc.push(cls);
        }
        return acc;
      }, []);
      return uniqueGrades;
    },
  });

  // Fetch sections for selected class
  const { data: sectionsData } = useQuery({
    queryKey: ["sections", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const response = await sectionsAPI.getAll({ classId: selectedClass });
      return response.data;
    },
    enabled: !!selectedClass,
  });

  // Fetch teachers data
  const { data: teachersData, isLoading, error } = useQuery<TeachersResponse>({
    queryKey: ["teachers", currentPage, debouncedSearch, statusFilter, classFilter, sectionFilter, subjectFilter],
    queryFn: async () => {
      const response = await teachersAPI.getAll({ 
        page: currentPage, 
        limit: 10, 
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        classId: classFilter || undefined,
        sectionId: sectionFilter || undefined,
        subject: subjectFilter || undefined
      });
      return response.data;
    },
  });

  // Fetch subjects for filter dropdown
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await subjectsAPI.getAll();
      return response.data;
    },
  });

  // Fetch subjects for selected class and section
  const { data: classSubjectsData } = useQuery({
    queryKey: ["class-subjects", selectedClass, selectedSection],
    queryFn: async () => {
      if (!selectedClass || !selectedSection) return [];
      const response = await classSubjectsAPI.getByClass(selectedClass, selectedSection);
      return response.data;
    },
    enabled: !!selectedClass && !!selectedSection,
  });

  // Fetch sections for filter dropdown
  const { data: filterSectionsData } = useQuery({
    queryKey: ["filter-sections", classFilter],
    queryFn: async () => {
      if (!classFilter) return [];
      const response = await sectionsAPI.getAll({ classId: classFilter });
      return response.data;
    },
    enabled: !!classFilter,
  });

  // Delete teacher mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersAPI.delete(id),
    onSuccess: () => {
      toast.success("Teacher deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete teacher");
    },
  });

  // Mock data for demo - REMOVED to fetch actual data
  // const mockTeachers: Teacher[] = [...]

  // Use only real data from API
  const teachers = teachersData?.data || [];
  const total = teachersData?.total || 0;
  const totalPages = teachersData?.totalPages || 0;

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "On Leave":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "Inactive":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
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

  // Add Teacher handler

  // Add Teacher handler

  // Add Teacher handler
  const handleAddTeacherClick = () => {
    setAddTeacherDialogOpen(true);
  };

  const handleAddTeacher = async () => {
    if (!newTeacher.full_name || !newTeacher.email) {
      toast.error("Name and email are required");
      return;
    }
    
    try {
      const csvContent = `full_name,email,phone,role\n${newTeacher.full_name},${newTeacher.email},${newTeacher.phone || ""},teacher`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'single_teacher.csv', { type: 'text/csv' });
      
      const response = await bulkUploadAPI.uploadUsers(file);
      
      if (response.data.status === 'success') {
        setImportResult(response.data);
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
        toast.success(`Teacher created successfully!`);
      } else {
        toast.error("Failed to create teacher");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create teacher");
    }
  };

  // Handle error state
  if (error) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-500">Failed to load teachers. Please try again later.</p>
                <p className="text-sm text-gray-500 mt-2">{(error as any).message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!isLoading && teachers.length === 0 && !searchInput) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-500">No teachers found.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const startItem = (currentPage - 1) * 10 + 1;
  const endItem = Math.min(currentPage * 10, total);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-[#e35336]">Teachers</h1>
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
                    onClick={handleAddTeacherClick}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Teacher
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="w-full lg:flex-1">
                  <TableSearch
                    search={searchInput}
                    setSearch={setSearchInput}
                    placeholder="Search by name, staff ID..."
                    className="w-full"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="w-full lg:w-auto lg:min-w-[60%]">
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-w-[140px]"
                    >
                      <option value="">All Subjects</option>
                      {(subjectsData || [])?.map((subject: any) => (
                        <option key={subject.id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={classFilter}
                      onChange={(e) => {
                        setClassFilter(e.target.value);
                        setSectionFilter("");
                      }}
                      className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-w-[140px]"
                    >
                      <option value="">All Classes</option>
                      {(classesData || [])?.map((cls: any) => {
                        const gradeStr = cls.grade ? `Grade ${cls.grade}` : cls.name;
                        return (
                          <option key={cls.id} value={cls.id}>
                            {gradeStr}
                          </option>
                        );
                      })}
                    </select>

                    {classFilter && (
                      <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-w-[140px]"
                      >
                        <option value="">All Sections</option>
                        {(filterSectionsData || [])?.map((section: any) => (
                          <option key={section.id} value={section.id}>
                            Section {section.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-w-[140px]"
                    >
                      <option value="">All Status</option>
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Data Table */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Photo</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Teacher Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Staff ID</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Assigned Classes</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Phone</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <Avatar className="w-10 h-10">
                          {(teacher.img || teacher.avatarUrl) ? (
                            <AvatarImage src={teacher.img || teacher.avatarUrl} alt={teacher.name} />
                          ) : null}
                          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm">
                            {getInitials(teacher.name)}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{teacher.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {teacher.staffId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {teacher.subjects && teacher.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects.slice(0, 2).map((subject, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {subject}
                                </Badge>
                              ))}
                              {teacher.subjects.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{teacher.subjects.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClasses?.slice(0, 2).map((cls, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cls}
                            </Badge>
                          ))}
                          {(!teacher.assignedClasses || teacher.assignedClasses.length === 0) && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {teacher.assignedClasses && teacher.assignedClasses.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{teacher.assignedClasses.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{teacher.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(teacher.employmentStatus as any, teacher.isActive as any)}`}>
                          {teacher.employmentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/list/teachers/${teacher.id || ''}`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </Link>
                          {(user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') && (
                            <Link
                              href={`/list/teachers/${teacher.id || ''}/edit`}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </Link>
                          )}
                          <div className="relative group">
                            <button
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Assign"
                            >
                              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            {/* Dropdown menu */}
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <button
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                                onClick={() => {
                                  setSelectedTeacherForClass(teacher);
                                  setAssignType('class');
                                  setAssignClassDialogOpen(true);
                                }}
                              >
                                Assign Class
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                                onClick={() => {
                                  setSelectedTeacherForClass(teacher);
                                  setAssignType('section');
                                  setAssignClassDialogOpen(true);
                                }}
                              >
                                Assign Section
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                                onClick={() => {
                                  setSelectedTeacherForClass(teacher);
                                  setAssignType('subject');
                                  setAssignClassDialogOpen(true);
                                }}
                              >
                                Assign Subject
                              </button>
                            </div>
                          </div>
                          {(user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') && (
                            <button
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this teacher?')) {
                                  deleteMutation.mutate(teacher.id || teacher.userId || '');
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* No results message when searching */}
              {teachers.length === 0 && searchInput && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    No teachers found
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No teachers match "{searchInput}". Try different keywords.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Bottom - Pagination */}
          {teachers.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchInput 
                  ? `Showing ${startItem}–${Math.min(endItem, total)} of ${total} teachers for "${searchInput}"`
                  : `Showing ${startItem}–${endItem} of ${total} teachers`}
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

      {/* Add Teacher Dialog */}
      <Dialog open={addTeacherDialogOpen} onOpenChange={setAddTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Create a new teacher account. A username and temporary password will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                value={newTeacher.full_name}
                onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Email *</label>
              <input
                type="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                value={newTeacher.phone}
                onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="Enter phone number"
              />
            </div>

            {/* Show credentials after creation */}
            {importResult && importResult.credentials && importResult.credentials.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Teacher created successfully!</span>
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
              <Button variant="outline" onClick={() => setAddTeacherDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTeacher} style={{ backgroundColor: "#1E3A8A" }}>
                Create Teacher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Class/Section/Subject Dialog */}
      <Dialog open={assignClassDialogOpen} onOpenChange={(open) => {
        setAssignClassDialogOpen(open);
        if (!open) {
          setSelectedClass("");
          setSelectedSection("");
          setSelectedSubject("");
          setAssignType('class');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignType === 'class' && 'Assign Class to Teacher'}
              {assignType === 'section' && 'Assign Section to Teacher'}
              {assignType === 'subject' && 'Assign Subject to Teacher'}
            </DialogTitle>
            <DialogDescription>
              {assignType === 'class' && `Select a class to assign ${selectedTeacherForClass?.name} as homeroom teacher`}
              {assignType === 'section' && `Select a section to assign ${selectedTeacherForClass?.name} as homeroom teacher`}
              {assignType === 'subject' && `Select a subject to assign ${selectedTeacherForClass?.name} as teacher`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Teacher</label>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedTeacherForClass?.name || selectedTeacherForClass?.email}
              </p>
            </div>
            
            {/* Class Assignment */}
            {assignType === 'class' && (
              <div>
                <label className="text-sm font-medium">Select Class *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">Select a class</option>
                  {(classesData || [])?.map((cls: any) => {
                    const gradeStr = cls.grade ? `Grade ${cls.grade}` : cls.name;
                    return (
                      <option key={cls.id} value={cls.id}>
                        {gradeStr}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Section Assignment */}
            {assignType === 'section' && (
              <>
                <div>
                  <label className="text-sm font-medium">Select Class *</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedSection("");
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">Select a class</option>
                    {(classesData || [])?.map((cls: any) => {
                      const gradeStr = cls.grade ? `Grade ${cls.grade}` : cls.name;
                      return (
                        <option key={cls.id} value={cls.id}>
                          {gradeStr}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {selectedClass && (
                  <div>
                    <label className="text-sm font-medium">Select Section *</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="">Select a section</option>
                      {(sectionsData || [])?.map((section: any) => (
                        <option key={section.id} value={section.id}>
                          Section {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Subject Assignment */}
            {assignType === 'subject' && (
              <div>
                <label className="text-sm font-medium">Select Subject *</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">Select a subject</option>
                  {(subjectsData || [])?.map((subject: any) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAssignClassDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  setAssigningClass(true);
                  try {
                    if (assignType === 'subject') {
                      // For subject, we just update the teacher's specialization
                      await authAPI.updateUser(selectedTeacherForClass.id, {
                        specialization: selectedSubject
                      });
                      toast.success(`Subject assigned to ${selectedTeacherForClass?.name}`);
                    } else if (assignType === 'section') {
                      if (!selectedSection) throw new Error("Please select a section");
                      await sectionsAPI.setHomeroomTeacher(selectedSection, selectedTeacherForClass.id);
                      toast.success(`Section assigned to ${selectedTeacherForClass?.name}`);
                    } else {
                      if (!selectedClass) throw new Error("Please select a class");
                      await classesAPI.setHomeroomTeacher(selectedClass, selectedTeacherForClass.id);
                      toast.success(`Class assigned to ${selectedTeacherForClass?.name}`);
                    }
                    setAssignClassDialogOpen(false);
                    setSelectedClass("");
                    setSelectedSection("");
                    setSelectedSubject("");
                    queryClient.invalidateQueries({ queryKey: ["teachers"] });
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || error.message || "Failed to assign");
                  } finally {
                    setAssigningClass(false);
                  }
                }} 
                disabled={
                  (assignType === 'class' && !selectedClass) ||
                  (assignType === 'section' && !selectedSection) ||
                  (assignType === 'subject' && !selectedSubject) ||
                  assigningClass
                }
                style={{ backgroundColor: "#1E3A8A" }}
              >
                {assignType === 'class' && "Assign Class"}
                {assignType === 'section' && "Assign Section"}
                {assignType === 'subject' && "Assign Subject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};

export default TeachersListPage;
