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
  MapPin,
  GraduationCap,
  Filter,
  Eye,
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
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

  const fetchStudents = async (search?: string) => {
    try {
      setLoading(true);
      const response = await classesAPI.getStudents(classId, {
        search: search || searchTerm || undefined,
        limit: "100",
      });
      const data: StudentsResponse = response.data;

      setStudents(data.students || []);
      setClassData(data.class);
      setPagination(data.pagination);

      // Extract unique sections
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
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchStudents(searchTerm);
  };

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

  const getGenderBadgeColor = (gender?: string) => {
    if (!gender) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-none";
    switch (gender.toLowerCase()) {
      case "male":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-none";
      case "female":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400 border-none";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-none";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/teacher/my-class")}
              className="hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">
                {classData?.name || "Class"} Students
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {classData
                  ? `Grade ${classData.grade} - Section ${classData.section}`
                  : "View and manage students in this class"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {classData?.homeroomTeacherId === user?.id && (
              <Button
                variant="outline"
                onClick={() => router.push(`/teacher/attendance?classId=${classId}`)}
                className="bg-white dark:bg-gray-900"
              >
                Take Attendance
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Female</p>
                  <p className="text-2xl font-bold">
                    {students.filter((s) => s.gender?.toLowerCase() === "female")
                      .length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Male</p>
                  <p className="text-2xl font-bold">
                    {students.filter((s) => s.gender?.toLowerCase() === "male")
                      .length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Sections</p>
                  <p className="text-2xl font-bold">{sections.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, student code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
              {sections.length > 0 && (
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.filter((section) => section.id).map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={handleSearch}>
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students Table - Full Width */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Students List</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                  Showing {filteredStudents.length} of {students.length} students in {classData?.name || 'this class'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white dark:bg-gray-900 px-4 py-2 rounded-full border shadow-sm">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{students.length}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">total</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStudents.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4">Roll No.</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4">Student</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4">Student Code</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4">Gender</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4">Section</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4">Contact</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-6 py-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow 
                        key={student.id} 
                        className="hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-6 py-4">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 min-w-[60px] inline-block">
                            {student.rollNumber || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4 min-w-[240px]">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-800 shadow-sm">
                              <AvatarImage src={student.avatarUrl} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{student.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg min-w-[100px] inline-block text-center">
                            {student.studentCode || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {student.gender ? (
                            <Badge className={`${getGenderBadgeColor(student.gender)} px-3 py-1.5 min-w-[70px] justify-center`}>
                              {student.gender === 'MALE' ? 'Male' : student.gender === 'FEMALE' ? 'Female' : student.gender}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {student.section ? (
                            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 px-3 py-1.5 min-w-[100px] justify-center">
                              Section {student.section.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            {student.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg">
                                  <Phone className="w-3.5 h-3.5" />
                                </div>
                                <span>{student.phone}</span>
                              </div>
                            )}
                            {student.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg">
                                  <Mail className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate max-w-[180px]">{student.email}</span>
                              </div>
                            )}
                            {!student.phone && !student.email && (
                              <span className="text-gray-400">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/list/students/${student.id}`)
                            }
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No students found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {searchTerm || filterGender !== "all" || filterSection !== "all"
                    ? "Try adjusting your filters to find what you're looking for"
                    : "No students are assigned to this class yet"}
                </p>
                {(searchTerm || filterGender !== "all" || filterSection !== "all") && (
                  <Button
                    variant="outline"
                    size="lg"
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
