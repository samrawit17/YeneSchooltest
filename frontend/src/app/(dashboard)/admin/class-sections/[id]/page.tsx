"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { classesAPI, sectionsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { 
  ArrowLeft, 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Loader2,
  Mail,
  Phone,
  Hash,
  X,
  School,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Student = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  avatarUrl: string | null;
  studentCode: string | null;
  rollNumber: string | null;
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
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

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
  const { data: sectionsData } = useQuery({
    queryKey: queryKeys.classSections.sectionsByClass(classId),
    queryFn: async () => {
      const response = await sectionsAPI.getAll({ classId });
      return response.data?.data || response.data || [];
    },
    enabled: !!classId,
  });

  // Fetch students
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: queryKeys.classSections.students(classId, "", "", page),
    queryFn: async () => {
      const params: { page?: string; limit?: string; orderBy?: string } = {
        page: page.toString(),
        limit: "50",
        orderBy: "rollNumber",
      };
      return classesAPI.getStudents(classId, params);
    },
    enabled: !!classId,
  });

  const { data: globalSearchResults, isLoading: globalSearchLoading } = useQuery({
    queryKey: queryKeys.classSections.globalSearch(globalSearchTerm),
    queryFn: async () => {
      if (!globalSearchTerm || globalSearchTerm.length < 2) {
        return { classes: [], sections: [] };
      }
      const [classesRes, sectionsRes] = await Promise.all([
        classesAPI.search({ q: globalSearchTerm }),
        sectionsAPI.search({ search: globalSearchTerm }),
      ]);
      return {
        classes: classesRes.data || [],
        sections: sectionsRes.data || [],
      };
    },
    enabled: !!globalSearchTerm && globalSearchTerm.length >= 2,
  });

  const stats = statsData?.data?.stats;
  const classInfo = statsData?.data?.class;
  const students: Student[] = studentsData?.data?.students || [];
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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".global-search-container")) {
        setShowGlobalSearch(false);
      }
    };

    if (showGlobalSearch) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showGlobalSearch]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                  <div className="inline-flex items-center gap-2 rounded-lg border border-[rgba(var(--brand-color-rgb),0.18)] bg-[rgba(var(--brand-color-rgb),0.08)] px-3 py-2">
                    <School className="h-4 w-4 text-[var(--brand-color,#e35336)]" />
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Homeroom Teacher:
                    </span>
                    <span className="font-semibold text-[var(--brand-color,#e35336)]">
                      {displayedHomeroomTeacher?.name || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalStudents || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Male Students</CardTitle>
                <UserCheck className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.maleCount || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Female Students</CardTitle>
                <UserX className="h-4 w-4 text-pink-500 dark:text-pink-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{stats?.femaleCount || 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="relative global-search-container">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes or sections..."
            value={globalSearchTerm}
            onChange={(e) => {
              setGlobalSearchTerm(e.target.value);
              setShowGlobalSearch(true);
            }}
            onFocus={() => setShowGlobalSearch(true)}
            className="w-full max-w-md pl-9"
          />
          {globalSearchTerm && (
            <button
              onClick={() => {
                setGlobalSearchTerm("");
                setShowGlobalSearch(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {showGlobalSearch && globalSearchTerm.length >= 2 && (
          <div className="absolute left-0 top-full mt-2 w-full max-w-md bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {globalSearchLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                {globalSearchResults?.classes?.length === 0 && globalSearchResults?.sections?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No results found
                  </div>
                ) : (
                  <>
                    {globalSearchResults?.classes?.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Classes</div>
                        {globalSearchResults.classes.slice(0, 5).map((cls: any) => (
                          <div
                            key={cls.id}
                            onClick={() => {
                              window.location.href = `/admin/class-sections/${cls.id}`;
                            }}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          >
                            <Users className="h-4 w-4" />
                            <span>{cls.name}</span>
                            <span className="text-xs text-muted-foreground">Grade {cls.grade}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {globalSearchResults?.sections?.length > 0 && (
                      <div className="p-2 border-t">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Sections</div>
                        {globalSearchResults.sections.slice(0, 5).map((section: any) => (
                          <div
                            key={section.id}
                            onClick={() => {
                              window.location.href = `/admin/class-sections/${section.class?.id}`;
                            }}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          >
                            <Hash className="h-4 w-4" />
                            <span>Section {section.name}</span>
                            <span className="text-xs text-muted-foreground">{section.class?.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Students Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Students List</CardTitle>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            // Card-level skeleton - just show loading indicator in the card
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found in this class.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="text-left p-3 font-medium">Roll No.</TableHead>
                      <TableHead className="text-left p-3 font-medium">Student</TableHead>
                      <TableHead className="text-left p-3 font-medium">Code</TableHead>
                      <TableHead className="text-left p-3 font-medium">Section</TableHead>
                      <TableHead className="text-left p-3 font-medium">Gender</TableHead>
                      <TableHead className="text-left p-3 font-medium">Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow key={student.id} className="border-b hover:bg-muted/50">
                        <TableCell className="p-3">{student.rollNumber || (page - 1) * 50 + index + 1}</TableCell>
                        <TableCell className="p-3">
                          <div 
                            onClick={() => router.push(`/list/students/${student.id}`)}
                            className="flex items-center gap-3 cursor-pointer hover:underline"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {student.avatarUrl ? (
                                <img 
                                  src={student.avatarUrl} 
                                  alt={student.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium">
                                  {student.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{student.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge variant="outline">{student.studentCode || "N/A"}</Badge>
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge variant="secondary">
                            {student.section?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3">
                          {student.gender === "MALE" || student.gender === "Male" || student.gender === "male" ? (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-none">Male</Badge>
                          ) : student.gender === "FEMALE" || student.gender === "Female" || student.gender === "female" ? (
                            <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400 border-none">Female</Badge>
                          ) : (
                            <Badge variant="outline">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell className="p-3">
                          <div className="flex flex-col gap-1 text-sm">
                            {student.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{student.email}</span>
                              </div>
                            )}
                            {student.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                <span>{student.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
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
