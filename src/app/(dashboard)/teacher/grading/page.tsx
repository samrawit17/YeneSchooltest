"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { gradingAPI } from "@/lib/api";
import {
  BookOpen,
  Users,
  ClipboardList,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Calculator,
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

// Types
interface TeacherAssignment {
  id: string;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  section: { id: string; name: string };
}

interface StudentGrade {
  studentId: string;
  studentName: string;
  rollNumber: string;
  caScore: number | null;
  midScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  gradeLetter: string | null;
  remark: string | null;
  registrarComment?: string | null;
  status: string;
  isLocked?: boolean;
  gradeId: string | null;
}

interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
  ethiopianYear?: number | null;
}

interface Term {
  id: string;
  name: string;
  order: number;
}

const normalizeAssignments = (payload: any): TeacherAssignment[] => {
  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root as TeacherAssignment[];

  const subjectAssignments = Array.isArray(root?.subjectAssignments)
    ? root.subjectAssignments
    : [];
  const homeroomAssignments = Array.isArray(root?.homeroomAssignments)
    ? root.homeroomAssignments.flatMap((assignment: any) =>
        (assignment.subjects || []).map((entry: any) => ({
          id: `homeroom-${assignment.section?.id}-${entry.subject?.id}`,
          subject: entry.subject,
          class: assignment.class,
          section: assignment.section,
        })),
      )
    : [];

  const merged = [...subjectAssignments, ...homeroomAssignments].filter(
    (assignment) =>
      assignment?.id &&
      assignment?.subject?.id &&
      assignment?.class?.id &&
      assignment?.section?.id,
  );

  const deduped = new Map<string, TeacherAssignment>();
  for (const assignment of merged) {
    const key = `${assignment.class.id}:${assignment.section.id}:${assignment.subject.id}`;
    if (!deduped.has(key)) {
      deduped.set(key, assignment as TeacherAssignment);
    }
  }

  return Array.from(deduped.values());
};

export default function TeacherGradingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setItems } = useBreadcrumb();
  const { currentAcademicYear, getAllAcademicYears, getTermsForYear } = useAcademicYear();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  
  // Derived: get unique classes from assignments
  const classOptions = assignments.map((a) => ({
    id: a.id,
    name: a.class.name,
    sectionName: a.section.name,
    subjectName: a.subject.name,
  }));

  const selectedAssignmentData = assignments.find((a) => a.id === selectedAssignmentId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const queryAssignment = useMemo(() => ({
    classId: searchParams.get("classId") || "",
    sectionId: searchParams.get("sectionId") || "",
    subjectId: searchParams.get("subjectId") || "",
    termId: searchParams.get("termId") || "",
    academicYear: searchParams.get("academicYear") || "",
  }), [searchParams]);

  // Set breadcrumbs
  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Grade Entry", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  const fetchInitialData = useCallback(async () => {
    try {
      // Use centralized context to get academic years
      let years = await getAllAcademicYears();

      // Set display name - if ethiopianYear field exists, use it; otherwise use name directly
      years = years.map((year: AcademicYear) => ({
        ...year,
        name: year.ethiopianYear ? `${year.ethiopianYear}` : year.name,
      })).sort((a: AcademicYear, b: AcademicYear) => {
        // Sort by year descending if both are numbers
        const aNum = parseInt(a.name, 10);
        const bNum = parseInt(b.name, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return bNum - aNum;
        }
        return b.name.localeCompare(a.name);
      });

      setAcademicYears(years);

      // Set the first year as default or find active year from context
      const activeYear =
        years.find((y: AcademicYear) => y.id === queryAssignment.academicYear) ||
        (currentAcademicYear ? years.find((y: AcademicYear) => y.id === currentAcademicYear.id) : null) ||
        years.find((y: AcademicYear) => y.isActive) ||
        years[0];
      if (activeYear) {
        setSelectedYear(activeYear.id);

        // Fetch terms for selected year using centralized context
        const termsData = await getTermsForYear(activeYear.id);
        setTerms(termsData);
        const preferredTerm =
          queryAssignment.termId && termsData.find((term: Term) => term.id === queryAssignment.termId)
            ? queryAssignment.termId
            : termsData[0]?.id || "";
        setSelectedTerm(preferredTerm);

        // Fetch teacher's subject assignments using the selected academic year
        const assignmentRes = await gradingAPI.getTeacherAssignments({ academicYear: activeYear.id });
        const parsedAssignments = normalizeAssignments(assignmentRes.data);
        setAssignments(parsedAssignments);
        const preferredAssignment = parsedAssignments.find((assignment) => {
          return (
            assignment.class?.id === queryAssignment.classId &&
            assignment.subject?.id === queryAssignment.subjectId &&
            (!queryAssignment.sectionId || assignment.section?.id === queryAssignment.sectionId)
          );
        });
        setSelectedAssignmentId(preferredAssignment?.id || parsedAssignments[0]?.id || "");
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setInitialLoad(false);
    }
  }, [queryAssignment]);

  // Fetch academic years, terms, and assignments on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }

    if (user?.role !== "TEACHER") {
      router.push("/");
      return;
    }

    fetchInitialData();
  }, [user, authLoading, router, fetchInitialData]);

  useEffect(() => {
    if (!selectedYear || !queryAssignment.classId || !queryAssignment.subjectId) return;
    if (queryAssignment.termId && queryAssignment.termId !== selectedTerm) return;

    const match = assignments.find((assignment) => {
      const assignmentClassId = assignment.class?.id || "";
      const assignmentSectionId = assignment.section?.id || "";
      const assignmentSubjectId = assignment.subject?.id || "";
      return (
        assignmentClassId === queryAssignment.classId &&
        assignmentSubjectId === queryAssignment.subjectId &&
        (!queryAssignment.sectionId || assignmentSectionId === queryAssignment.sectionId)
      );
    });

    if (match && match.id !== selectedAssignmentId) {
      setSelectedAssignmentId(match.id);
    }
  }, [assignments, queryAssignment, selectedYear, selectedTerm, selectedAssignmentId, currentAcademicYear, getAllAcademicYears, getTermsForYear]);

  // Fetch terms when academic year changes
  const fetchTermsForYear = useCallback(async (yearId: string) => {
    try {
      // Use centralized context to get terms
      const termsData = await getTermsForYear(yearId);
      setTerms(termsData);
      if (termsData.length > 0) {
        setSelectedTerm(termsData[0].id);
      } else {
        setSelectedTerm("");
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  }, [getTermsForYear]);

  useEffect(() => {
    if (selectedYear) {
      fetchTermsForYear(selectedYear);
    }
  }, [selectedYear, fetchTermsForYear]);

  // Refetch assignments when academic year changes (user selection).
  // Initial assignments are fetched in `fetchInitialData()`.
  const fetchAssignmentsForYear = useCallback(async (academicYearId: string) => {
    try {
      const assignmentRes = await gradingAPI.getTeacherAssignments({ academicYear: academicYearId });
      const parsedAssignments = normalizeAssignments(assignmentRes.data);
      setAssignments(parsedAssignments);
      const preferredAssignment = parsedAssignments.find((assignment) => {
        return (
          assignment.class?.id === queryAssignment.classId &&
          assignment.subject?.id === queryAssignment.subjectId &&
          (!queryAssignment.sectionId || assignment.section?.id === queryAssignment.sectionId)
        );
      });
      setSelectedAssignmentId(preferredAssignment?.id || parsedAssignments[0]?.id || "");
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
      setSelectedAssignmentId("");
    }
  }, [queryAssignment]);

  useEffect(() => {
    if (!initialLoad && selectedYear) {
      fetchAssignmentsForYear(selectedYear);
    }
  }, [selectedYear, initialLoad, fetchAssignmentsForYear]);

  // Fetch students when filters change
  const fetchStudents = useCallback(async () => {
    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (!assignment) return;

    setLoading(true);
    try {
      const res = await gradingAPI.getTeacherStudents({
        academicYear: selectedYear,
        termId: selectedTerm,
        classId: assignment.class.id,
        sectionId: assignment.section.id,
        subjectId: assignment.subject.id,
      });
      const data = res.data;
      
      // Handle both direct array response and {success, data} format
      const students = Array.isArray(data) ? data : (data.data || []);
      setStudents(students as StudentGrade[]);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      const message = error?.response?.data?.message || "Failed to load students";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [assignments, selectedAssignmentId, selectedYear, selectedTerm]);

  useEffect(() => {
    if (selectedYear && selectedTerm && selectedAssignmentId) {
      fetchStudents();
    }
  }, [selectedYear, selectedTerm, selectedAssignmentId, fetchStudents]);

  const calculateTotal = (ca: number | null, mid: number | null, final: number | null): number | null => {
    if (ca === null && mid === null && final === null) return null;
    const caVal = ca ?? 0;
    const midVal = mid ?? 0;
    const finalVal = final ?? 0;
    return Math.round((caVal * 0.3 + midVal * 0.2 + finalVal * 0.5) * 100) / 100;
  };

  const calculateGrade = (total: number | null): string => {
    if (total === null) return "";
    if (total >= 90) return "A";
    if (total >= 80) return "B";
    if (total >= 70) return "C";
    if (total >= 60) return "D";
    return "F";
  };

  const handleScoreChange = (studentId: string, field: "caScore" | "midScore" | "finalScore", value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    
    // Validate score range
    if (numValue !== null && (numValue < 0 || numValue > 100)) {
      toast.error("Score must be between 0 and 100");
      return;
    }
    
    setStudents(prev => prev.map(student => {
      if (student.studentId !== studentId) return student;
      
      const newStudent = { ...student, [field]: numValue };
      const total = calculateTotal(newStudent.caScore, newStudent.midScore, newStudent.finalScore);
      newStudent.totalScore = total;
      newStudent.gradeLetter = total !== null ? calculateGrade(total) : null;
      
      return newStudent;
    }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const assignment = assignments.find((a) => a.id === selectedAssignmentId);
      if (!assignment) return;

      // Filter students with at least one score entered
      const gradesToSave = students
        .filter(s => s.caScore !== null || s.midScore !== null || s.finalScore !== null)
        .map(student => ({
          studentId: student.studentId,
          subjectId: assignment.subject.id,
          classId: assignment.class.id,
          sectionId: assignment.section.id,
          academicYear: selectedYear,
          termId: selectedTerm,
          caScore: student.caScore,
          midScore: student.midScore,
          finalScore: student.finalScore,
          remark: student.remark,
        }));

      if (gradesToSave.length === 0) {
        toast.error("No grades to save");
        setSaving(false);
        return;
      }

      // Use bulk API for better performance
      const res = await gradingAPI.bulkEnterGrades({ grades: gradesToSave });
      const data = res.data;

      // Handle both success response and direct response
      if (data?.successful !== undefined) {
        toast.success(`Saved ${data.successful} grades successfully`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} grades failed to save`);
        }
        fetchStudents();
      } else if (data?.success) {
        toast.success("Grades saved successfully");
        fetchStudents();
      } else {
        toast.error(data?.message || "Failed to save grades");
      }
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error(error?.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToRegistrar = async () => {
    setSaving(true);
    try {
      const assignment = assignments.find((a) => a.id === selectedAssignmentId);
      if (!assignment) {
        toast.error("Please select an assignment");
        return;
      }

      const hasPending = students.some(
        (student) => student.status === "DRAFT" || student.status === "REJECTED",
      );
      if (!hasPending) {
        toast.error("No draft grades available to submit");
        return;
      }
      
      const res = await gradingAPI.submitAllGrades({
        academicYear: selectedYear,
        termId: selectedTerm,
        classId: assignment.class.id,
        sectionId: assignment.section.id,
        subjectId: assignment.subject.id,
      });
      const data = res.data;
      
      // Handle both success response and direct response
      if (data?.success || data?.message?.includes('success')) {
        toast.success("Grades submitted to registrar successfully");
        fetchStudents();
      } else {
        toast.error(data?.message || "Failed to submit grades");
      }
    } catch (error: any) {
      console.error("Error submitting grades:", error);
      toast.error(error?.response?.data?.message || "Failed to submit grades");
    } finally {
      setSaving(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "";
    switch (grade) {
      case "A": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "B": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "C": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "D": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "F": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Draft</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Submitted</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</Badge>;
      default:
        return null;
    }
  };

  if (authLoading || initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[#e35336]">
            
            Grade Entry
          </h1>
          <p className="text-muted-foreground text-gray-500 dark:text-gray-400">
            Enter and manage student grades for your assigned subjects
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 dark:text-white">Select Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id} className="dark:text-white dark:focus:bg-gray-700">
                      {year.name} {year.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id} className="dark:text-white dark:focus:bg-gray-700">
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Class</label>
              <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                <SelectTrigger className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {classOptions.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="dark:text-white dark:focus:bg-gray-700">
                      {cls.subjectName} • {cls.name} ({cls.sectionName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-muted-foreground bg-muted dark:bg-gray-700 dark:text-gray-300 p-3 rounded-md w-full">
                {selectedAssignmentData && (
                  <div className="space-y-1">
                    <p><strong>Subject:</strong> {selectedAssignmentData.subject.name}</p>
                    <p><strong>Class:</strong> {selectedAssignmentData.class.name} - {selectedAssignmentData.section.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Entry Table */}
      {selectedAssignmentData && (
        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900 dark:text-white">Student Grades</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Ethiopian Grading System: CA (30%) + Mid Exam (20%) + Final Exam (50%)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={handleSubmitToRegistrar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit to Registrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700">
                    <TableHead className="w-12 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">#</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Student Name</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Roll No.</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">CA (30%)</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Mid (20%)</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Final (50%)</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Total</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Grade</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-gray-200">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground dark:text-gray-400">
                        No students found for the selected criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student, index) => (
                      <TableRow key={student.studentId} className="hover:bg-slate-50 dark:hover:bg-gray-700 border-b border-slate-100 dark:border-gray-600">
                        <TableCell className="px-4 py-3 text-sm dark:text-gray-300">{index + 1}</TableCell>
                        <TableCell className="px-4 py-3 font-medium text-sm text-slate-800 dark:text-white">{student.studentName}</TableCell>
                        <TableCell className="px-4 py-3 text-sm dark:text-gray-300">{student.rollNumber || "-"}</TableCell>
                        <TableCell className="text-center px-4 py-3">
                          <Input
                            type="number"
                            className="w-20 text-center dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            min="0"
                            max="100"
                            value={student.caScore ?? ""}
                            onChange={(e) => handleScoreChange(student.studentId, "caScore", e.target.value)}
                            disabled={student.status === "SUBMITTED" || student.status === "APPROVED" || student.isLocked}
                            placeholder="0-100"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            className="w-20 text-center dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            min="0"
                            max="100"
                            value={student.midScore ?? ""}
                            onChange={(e) => handleScoreChange(student.studentId, "midScore", e.target.value)}
                            disabled={student.status === "SUBMITTED" || student.status === "APPROVED" || student.isLocked}
                            placeholder="0-100"
                          />
                        </TableCell>
                        <TableCell className="text-center px-4 py-3">
                          <Input
                            type="number"
                            className="w-20 text-center dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            min="0"
                            max="100"
                            value={student.finalScore ?? ""}
                            onChange={(e) => handleScoreChange(student.studentId, "finalScore", e.target.value)}
                            disabled={student.status === "SUBMITTED" || student.status === "APPROVED" || student.isLocked}
                            placeholder="0-100"
                          />
                        </TableCell>
                        <TableCell className="text-center px-4 py-3 font-semibold text-slate-800 dark:text-white">
                          {student.totalScore ?? "-"}
                        </TableCell>
                        <TableCell className="text-center px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(student.gradeLetter)}`}>
                            {student.gradeLetter || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {getStatusBadge(student.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grading Scale Reference */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
            <Calculator className="h-5 w-5" />
            Grade Scale Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <div className="text-2xl font-bold text-green-800 dark:text-green-400">A</div>
              <div className="text-sm text-green-700 dark:text-green-400">90-100</div>
              <div className="text-xs text-green-600 dark:text-green-500">Excellent</div>
            </div>
            <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-400">B</div>
              <div className="text-sm text-blue-700 dark:text-blue-400">80-89</div>
              <div className="text-xs text-blue-600 dark:text-blue-500">Very Good</div>
            </div>
            <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-400">C</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">70-79</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-500">Good</div>
            </div>
            <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-400">D</div>
              <div className="text-sm text-orange-700 dark:text-orange-400">60-69</div>
              <div className="text-xs text-orange-600 dark:text-orange-500">Satisfactory</div>
            </div>
            <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <div className="text-2xl font-bold text-red-800 dark:text-red-400">F</div>
              <div className="text-sm text-red-700 dark:text-red-400">0-59</div>
              <div className="text-xs text-red-600 dark:text-red-500">Fail</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
