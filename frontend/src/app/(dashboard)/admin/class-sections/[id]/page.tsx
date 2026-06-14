"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useRouter, useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { classesAPI, sectionsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { 
  ArrowLeft, 
  Search, 
  Loader2,
  Mail,
  Phone,
  X,
  School,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStudentDisplayCode } from "@/lib/student-code";

type Student = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  gender: string | null;
  avatarUrl: string | null;
  studentCode: string | null;
  academicYear?: string | null;
  rollNumber: string | null;
  stream?: string | null;
  section: {
    id: string;
    name: string;
  };
};

type ClassStats = {
  class: {
    id: string;
    name: string;
    grade: number;
    section: string;
    homeroomTeacher?: { id: string; name: string; email: string } | null;
    sections?: {
      id: string;
      name: string;
      capacity: number;
      roomNumber?: string;
      homeroomTeacher?: { id: string; name: string; email: string } | null;
    }[];
  };
  stats: {
    totalStudents: number;
    maleCount: number;
    femaleCount: number;
  };
};

export default function ClassDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { setItems } = useBreadcrumb();
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch class stats
  const { data: statsData, isLoading: statsLoading } = useQuery<{ data: ClassStats }>({
    queryKey: queryKeys.classSections.classStats(classId, ""),
    queryFn: async () => {
      return classesAPI.getStats(classId);
    },
    enabled: !!classId,
  });

  // Fetch sections for the class
  // Fetch students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: queryKeys.classSections.students(classId, "", searchTerm, page),
    queryFn: async () => {
      const params: { page?: string; limit?: string; orderBy?: string; search?: string } = {
        page: page.toString(),
        limit: "50",
        orderBy: "rollNumber",
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      return classesAPI.getStudents(classId, params);
    },
    enabled: !!classId,
    placeholderData: keepPreviousData,
  });
  const classInfo = statsData?.data?.class;
  const showStreamColumn = Number(classInfo?.grade) >= 11;
  const students: Student[] = useMemo(() => {
    const rows: Student[] = studentsData?.data?.students || [];
    return [...rows].sort((a, b) => {
      const rollA = a.rollNumber ?? "";
      const rollB = b.rollNumber ?? "";
      return String(rollA).localeCompare(String(rollB), undefined, { numeric: true, sensitivity: "base" });
    });
  }, [studentsData?.data?.students]);
  const pagination = studentsData?.data?.pagination;
  const displayedHomeroomTeacher = useMemo(() => {
    if (classInfo?.homeroomTeacher) {
      return classInfo.homeroomTeacher;
    }

    const matchingSection = (classInfo?.sections || []).find(
      (section) => section.name === classInfo?.section,
    );

    return matchingSection?.homeroomTeacher || null;
  }, [classInfo]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  useEffect(() => {
    if (!classInfo) return;

    const classLabel = classInfo.name || "Class Details";
    const sectionLabel = classInfo.section
      ? `Section ${classInfo.section}`
      : "Section";

    setItems([
      { label: "Dashboard", href: "/admin", isCurrent: false },
      { label: "Administration", href: "/admin", isCurrent: false },
      { label: "Class & Sections", href: "/admin/class-sections", isCurrent: false },
      { label: classLabel, isCurrent: false },
      { label: sectionLabel, isCurrent: true },
    ]);

    return () => setItems(null);
  }, [classInfo, setItems]);
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <Link href="/admin/class-sections">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            {statsLoading ? (
              <>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64 mt-1" />
              </>
            ) : (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {classInfo?.name || "Class Details"}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Grade {classInfo?.grade} • Section {classInfo?.section}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 text-sm lg:items-end">
                  <div className="inline-flex items-center gap-2">
                    <School className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      Homeroom Teacher:
                    </span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {displayedHomeroomTeacher?.name || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Students Table Card */}
      <Card className="shadow-sm border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] overflow-hidden">
        <CardHeader className="border-b border-gray-200 dark:border-[#2A2A2A]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Students List</CardTitle>
            <div className="relative w-full sm:w-auto sm:min-w-[420px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name, code, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 dark:bg-[#111111] dark:border-[#2A2A2A]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {studentsLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                ))}
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No students found in this class.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className="bg-gray-50 dark:bg-[#111111]/50 sticky top-0">
                    <TableRow className="border-b border-gray-100 dark:border-[#2A2A2A]">
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Roll No.</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Student</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Code</TableHead>
                      {showStreamColumn && (
                        <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Stream</TableHead>
                      )}
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Section</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Gender</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Parent</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Phone Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow key={student.id} className="border-b border-gray-100 dark:border-[#2A2A2A]/50 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/30 transition-colors">
                        <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {student.rollNumber || (page - 1) * 50 + index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div 
                            onClick={() => router.push(`/list/students/${student.id}`)}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="text-sm">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{student.email || "-"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="font-mono font-medium">
                            {formatStudentDisplayCode(student.studentCode, student.academicYear)}
                          </div>
                        </TableCell>
                        {showStreamColumn && (
                          <TableCell className="px-4 py-3">
                            {student.stream ? (
                              <Badge variant="outline" className="border-gray-200 text-gray-600 dark:border-[#2A2A2A] dark:text-gray-300">
                                {student.stream === "NATURAL" ? "Natural" : student.stream === "SOCIAL" ? "Social" : student.stream}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {student.section?.name || "N/A"}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {student.gender === "MALE" || student.gender === "Male" || student.gender === "male" ? (
                            <Badge variant="outline" className="border-gray-200 text-gray-600 dark:border-[#2A2A2A] dark:text-gray-300">Male</Badge>
                          ) : student.gender === "FEMALE" || student.gender === "Female" || student.gender === "female" ? (
                            <Badge variant="outline" className="border-gray-200 text-gray-600 dark:border-[#2A2A2A] dark:text-gray-300">Female</Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-200 text-gray-600 dark:border-[#2A2A2A] dark:text-gray-300">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {student.parentName || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {student.parentPhone || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
