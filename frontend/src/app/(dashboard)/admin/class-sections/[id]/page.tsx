"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { classesAPI, sectionsAPI } from "@/lib/api";
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
  ChevronDown,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
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
    queryKey: ["class-stats", classId, sectionFilter],
    queryFn: async () => {
      const params: { sectionId?: string } = {};
      if (sectionFilter) params.sectionId = sectionFilter;
      return classesAPI.getStats(classId, params);
    },
    enabled: !!classId,
  });

  // Fetch sections for the class
  const { data: sectionsData } = useQuery({
    queryKey: ["class-sections", classId],
    queryFn: async () => {
      const response = await sectionsAPI.getAll({ classId });
      return response.data?.data || response.data || [];
    },
    enabled: !!classId,
  });

  // Fetch students
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ["class-students", classId, sectionFilter, searchTerm, page],
    queryFn: async () => {
      const params: { sectionId?: string; search?: string; page?: string; limit?: string; orderBy?: string } = {
        page: page.toString(),
        limit: "50",
        orderBy: "rollNumber",
      };
      if (sectionFilter) params.sectionId = sectionFilter;
      if (searchTerm) params.search = searchTerm;
      return classesAPI.getStudents(classId, params);
    },
    enabled: !!classId,
  });

  // Global search for classes and sections
  const { data: globalSearchResults, isLoading: globalSearchLoading } = useQuery({
    queryKey: ["global-search", globalSearchTerm],
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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleSectionChange = (value: string) => {
    setSectionFilter(value === "all" ? "" : value);
    setPage(1);
  };

  // Close global search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.global-search-container')) {
        setShowGlobalSearch(false);
      }
    };
    
    if (showGlobalSearch) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
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
        <div className="flex items-center gap-4">
          <Link href="/admin/class-sections">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            {statsLoading ? (
              <>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64 mt-1" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">
                  {classInfo?.name || "Class Details"}
                </h1>
                <p className="text-muted-foreground">
                  Grade {classInfo?.grade} • Section {classInfo?.section}
                </p>
                {classInfo?.homeroomTeacher && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    <span className="font-medium">Homeroom Teacher:</span> {classInfo.homeroomTeacher.name}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        {/* Global Search */}
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
              className="w-64 pl-9"
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
          {/* Search Results Dropdown */}
          {showGlobalSearch && globalSearchTerm.length >= 2 && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, email, or code..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sectionFilter || "all"} onValueChange={handleSectionChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sectionsData?.map((section: any) => (
              <SelectItem key={section.id} value={section.id}>
                <div className="flex flex-col">
                  <span>Section {section.name}</span>
                  {section.homeroomTeacher && (
                    <span className="text-xs text-muted-foreground">
                      Teacher: {section.homeroomTeacher.name}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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