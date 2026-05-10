"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { classesAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  Search,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Eye,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/Pagination";

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  avatarUrl?: string;
  studentCode?: string;
  rollNumber?: string;
  section?: {
    id: string;
    name: string;
  };
}

interface ClassData {
  id: string;
  name: string;
  grade: number;
  section: string;
  homeroomTeacherId?: string | null;
}

interface StudentsResponse {
  class: ClassData;
  students: Student[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ClassStudentsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && classId) {
      fetchStudents();
    }
  }, [isAuthenticated, isLoading, classId]);

  const fetchStudents = async (pageNum?: number) => {
    try {
      setLoading(true);
      const response = await classesAPI.getStudents(classId, {
        search: searchTerm || undefined,
        page: String(pageNum || pagination.page),
        limit: String(pagination.limit),
      });
      const data: StudentsResponse = response.data;

      setStudents((data.students || []).sort((a, b) => {
        const rollA = a.rollNumber ?? "";
        const rollB = b.rollNumber ?? "";
        return String(rollA).localeCompare(String(rollB), undefined, { numeric: true });
      }));
      setClassData(data.class);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error("Failed to fetch students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchStudents(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchStudents(newPage);
  };

  const handleLimitChange = (newLimit: string) => {
    setPagination(prev => ({ ...prev, limit: Number(newLimit), page: 1 }));
    fetchStudents(1);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getGenderBadgeColor = (gender?: string) => {
    if (!gender) return "text-gray-600 dark:text-gray-400 border-none";
    switch (gender.toLowerCase()) {
      case "male":
        return "text-gray-700 dark:text-gray-300 border-none";
      case "female":
        return "text-gray-700 dark:text-gray-300 border-none";
      default:
        return "text-gray-600 dark:text-gray-400 border-none";
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#e35336]" />
          <p className="text-gray-500 dark:text-gray-400">Loading students...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="p-5 space-y-4">
        {/* Header + Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/teacher/my-class")}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#e35336]">
                {classData?.name || "Class"} Students
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {classData
                  ? `Grade ${classData.grade} - Section ${classData.section}`
                  : "View and manage students"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, or student code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button size="sm" onClick={handleSearch} className="h-9">
            Search
          </Button>
          {classData?.homeroomTeacherId === user?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/teacher/attendance?classId=${classId}`)}
              className="h-9"
            >
              Attendance
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/teacher/grading?classId=${classId}`)}
            className="h-9"
          >
            Grade Entry
          </Button>
        </div>

        {/* Students Table */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="py-3 px-5 border-b dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Students ({students.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b dark:border-slate-800">
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3">Roll</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3">Student</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3 hidden sm:table-cell">Code</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3">Gender</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Section</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">Contact</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-500 px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow
                        key={student.id}
                        className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <TableCell className="px-4 py-3">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[50px] inline-block">
                            {student.rollNumber || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={student.avatarUrl} />
                              <AvatarFallback className="text-xs bg-blue-500 text-white">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{student.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm font-mono bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                            {student.studentCode || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {student.gender ? (
                            <Badge variant="outline" className={`${getGenderBadgeColor(student.gender)} text-xs px-2.5 py-1 min-w-[60px] justify-center`}>
                              {student.gender === 'MALE' ? 'Male' : student.gender === 'FEMALE' ? 'Female' : student.gender}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden md:table-cell">
                          {student.section ? (
                            <Badge variant="outline" className="text-xs px-2.5 py-1 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                              {student.section.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            {student.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> {student.phone}
                              </span>
                            )}
                            {student.email && (
                              <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                <Mail className="w-3.5 h-3.5 shrink-0" /> {student.email}
                              </span>
                            )}
                            {!student.phone && !student.email && "-"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/list/students/${student.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {searchTerm
                    ? "No students match your search"
                    : "No students assigned to this class"}
                </p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 text-xs"
                    onClick={() => {
                      setSearchTerm("");
                      fetchStudents(1);
                    }}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Show</span>
            <select
              value={pagination.limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>of {pagination.total} students</span>
          </div>
          <Pagination
            page={pagination.page}
            setPage={handlePageChange}
            totalPages={pagination.totalPages}
          />
        </div>
      </div>
    </div>
  );
};

export default ClassStudentsPage;
