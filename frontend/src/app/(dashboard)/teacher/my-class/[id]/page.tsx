"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { classesAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  Search,
  ArrowLeft,
  Loader2,
  Phone,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  avatarUrl?: string;
  studentCode?: string;
  rollNumber?: string;
  parentPhone?: string | null;
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
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
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

  const fetchStudents = async (search?: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await classesAPI.getStudents(classId, {
        search: search || searchTerm || undefined,
        limit: "100",
      });
      const data: StudentsResponse = response.data;

      setStudents(data.students || []);
      setClassData(data.class);
      setPagination(data.pagination);

      const uniqueSections = Array.from(
        new Set(
          data.students
            .filter((s) => s.section)
            .map((s) => JSON.stringify(s.section))
        )
      ).map((s) => JSON.parse(s as string));
      setSections(uniqueSections);
    } catch (error: any) {
      console.error("Failed to fetch students:", error);
      toast.error("Failed to load students");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchTerm, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredStudents = students
    .filter((student) => {
      const matchesGender =
        filterGender === "all" || student.gender === filterGender;
      const matchesSection =
        filterSection === "all" || student.section?.id === filterSection;
      return matchesGender && matchesSection;
    })
    .sort((a, b) => {
      const rollA = a.rollNumber ?? "";
      const rollB = b.rollNumber ?? "";
      return String(rollA).localeCompare(String(rollB), undefined, { numeric: true });
    });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
              <h1 className="text-xl font-bold text-black">
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
            <div className="flex items-center gap-4 text-sm text-gray-500">
            </div>
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
          </div>
        </div>

        {/* Students Table */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="py-3 px-5 border-b dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Students ({filteredStudents.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8 text-sm w-[500px]"
                  />
                </div>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger className="w-[110px] h-8 text-sm">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {sections.length > 0 && (
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger className="w-[130px] h-8 text-sm">
                      <SelectValue placeholder="Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.filter((section) => section.id).map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStudents.length > 0 ? (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/list/students/${student.id}`)}
                      >
                        <TableCell className="px-4 py-3">
                          <span className="text-sm font-semibold text-black dark:text-blue-400 min-w-[50px] inline-block">
                            {student.rollNumber || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={student.avatarUrl} />
                              <AvatarFallback className="text-xs">
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
                            <Badge variant="outline" className="border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400 text-xs px-2.5 py-1 min-w-[60px] justify-center">
                              {student.gender === 'MALE' ? 'Male' : student.gender === 'FEMALE' ? 'Female' : student.gender}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden md:table-cell">
                          {student.section ? (
                            <Badge variant="outline" className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                              {student.section.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            {student.parentPhone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> {student.parentPhone}
                              </span>
                            )}
                            {!student.parentPhone && "-"}
                          </div>
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
                  {searchTerm || filterGender !== "all" || filterSection !== "all"
                    ? "No students match your filters"
                    : "No students assigned to this class"}
                </p>
                {(searchTerm || filterGender !== "all" || filterSection !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 text-xs"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterGender("all");
                      setFilterSection("all");
                      fetchStudents("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClassStudentsPage;
