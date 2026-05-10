"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StudentIdCardGenerator, { StudentIdCardData, SchoolInfo } from "@/components/StudentIdCard";
import { studentsAPI, academicYearsAPI, classesAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Users,
  Filter,
  Printer,
  RefreshCw,
  Search,
  GraduationCap,
  Loader2,
} from "lucide-react";

export default function IdCardGeneratorPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<StudentIdCardData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentIdCardData[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadAcademicYears();
    }
  }, [isAuthenticated]);

  // Load students when year changes
  useEffect(() => {
    if (isAuthenticated && selectedYear) {
      loadStudents();
    }
  }, [selectedYear]);

  // Apply filters
  useEffect(() => {
    let result = students;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.studentCode.toLowerCase().includes(term)
      );
    }

    if (filterGrade !== "all") {
      result = result.filter((s) => s.grade === parseInt(filterGrade));
    }

    if (filterSection !== "all") {
      result = result.filter((s) => s.section === filterSection);
    }

    setFilteredStudents(result);
  }, [searchTerm, filterGrade, filterSection, students]);

  async function loadAcademicYears() {
    try {
      const resp = await academicYearsAPI.getAll();
      const years = resp.data?.data || resp.data || [];
      setAcademicYears(years);
      const active = years.find((y: any) => y.isActive);
      if (active) {
        setSelectedYear(active.id);
      } else if (years.length > 0) {
        setSelectedYear(years[0].id);
      }
    } catch (error) {
      console.error("Failed to load academic years", error);
    }
  }

  async function loadStudents() {
    setLoading(true);
    try {
      // Check for pre-selected student IDs from URL (e.g., from bulk upload redirect)
      const studentIdsParam = searchParams.get("studentIds");

      const params: any = {};
      if (selectedYear) params.academicYear = selectedYear;
      if (studentIdsParam) params.studentIds = studentIdsParam;

      const resp = await studentsAPI.getForIdCards(params);
      const data = resp.data;

      // Set school info from response
      if (data.school) {
        setSchoolInfo({
          name: data.school.name || "",
          address: data.school.address || "",
          phone: data.school.phone || "",
          email: data.school.email || "",
          logo: data.school.logo || undefined,
          tagline: "Excellence in Education",
        });
      }

      // Map students
      const mapped: StudentIdCardData[] = (data.students || []).map((s: any) => ({
        studentId: s.studentId,
        studentCode: s.studentCode,
        name: s.name,
        grade: s.grade || 0,
        section: s.section || "N/A",
        academicYear: s.academicYear || data.academicYear || "",
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        address: s.address,
        phone: s.phone,
        email: s.email,
        photoUrl: s.photoUrl,
        rollNumber: s.rollNumber,
        emergencyContact: s.emergencyContact,
      }));

      setStudents(mapped);
      setFilteredStudents(mapped);

      if (studentIdsParam && mapped.length > 0) {
        toast.success(`Loaded ${mapped.length} students from recent import`);
      }
    } catch (error: any) {
      console.error("Failed to load students", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load student data");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = useCallback(() => {
    loadStudents();
  }, [selectedYear]);

  const grades = Array.from(new Set(students.map((s) => s.grade).filter(Boolean))).sort(
    (a, b) => a - b
  );
  const sections = Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-black">
                  Student ID Card Generator
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Generate, customize, and print professional student ID cards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Students", value: students.length, color: "text-blue-500" },
            { icon: CreditCard, label: "Filtered", value: filteredStudents.length, color: "text-emerald-500" },
            { icon: GraduationCap, label: "Grades", value: grades.length, color: "text-purple-500" },
            { icon: Printer, label: "Ready to Print", value: filteredStudents.length, color: "text-orange-500" },
          ].map((stat) => (
            <Card key={stat.label} className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-xl font-bold dark:text-white">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              {/* Academic Year */}
              <div className="w-full md:w-48">
                <Label className="text-xs text-gray-500 mb-1 block">Academic Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name} {y.isActive ? "✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or student code..."
                    className="pl-9 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Grade */}
              <div className="w-full md:w-40">
                <Label className="text-xs text-gray-500 mb-1 block">Grade</Label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g.toString()}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section */}
              <div className="w-full md:w-40">
                <Label className="text-xs text-gray-500 mb-1 block">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        Section {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Card Generator */}
        {loading ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading students...</p>
            </CardContent>
          </Card>
        ) : (
          <StudentIdCardGenerator
            students={filteredStudents}
            school={schoolInfo}
          />
        )}
      </div>
    </div>
  );
}
