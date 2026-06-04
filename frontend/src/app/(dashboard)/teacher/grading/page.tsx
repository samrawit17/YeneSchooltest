"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import { gradingAPI } from "@/lib/api";
import { syncService } from "@/lib/db/sync-service";
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
  type?: string;
  isHomeroom?: boolean;
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
  internalNote?: string | null;
  registrarComment?: string | null;
  status: string;
  isLocked?: boolean;
  gradeId: string | null;
  componentScores?: Record<string, number | null>;
}

interface ComponentAvailability {
  code: string;
  assessmentSubjectId: string;
  startDate: string;
  endDate?: string;
  status: string;
  started: boolean;
  ended?: boolean;
  maxScore: number;
}

interface AssessmentColumn {
  code: string;
  label: string;
  maxScore: number;
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
  startDate?: string;
  endDate?: string;
}

const formatAssessmentLabel = (code: string) => {
  switch (code.toUpperCase()) {
    case "QUIZ":
      return "Quiz";
    case "TEST":
      return "Test";
    case "MID":
      return "Mid Exam";
    case "FINAL":
      return "Final Exam";
    case "ATTENDANCE":
      return "Attendance";
    case "CA":
      return "Continuous Assessment";
    default:
      return code
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
};

const normalizeAssignments = (payload: any): TeacherAssignment[] => {
  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root as TeacherAssignment[];

  const subjectAssignments = Array.isArray(root?.subjectAssignments)
    ? root.subjectAssignments.map((a: any) => ({ 
        ...a, 
        type: 'subject',
        subject: a.subjectId ? { id: a.subjectId, name: a.subjectName || a.subject?.name || 'Unknown Subject' } : a.subject,
        class: a.classId ? { id: a.classId, name: a.className || a.class?.name || 'Unknown Class' } : a.class,
        section: a.sectionId ? { id: a.sectionId, name: a.sectionName || a.section?.name || 'Unknown Section' } : a.section,
      }))
    : [];
   
  // Process homeroom - if no subjects, still create an entry with the homeroom class/section
  let homeroomAssignments: any[] = [];
  if (Array.isArray(root?.homeroomAssignments)) {
    for (const assignment of root.homeroomAssignments) {
      if (assignment.subjects && assignment.subjects.length > 0) {
        const mapped = assignment.subjects.map((entry: any) => ({
          id: `homeroom-${assignment.section?.id}-${entry.subject?.id}`,
          subject: entry.subjectId ? { id: entry.subjectId, name: entry.subjectName || entry.subject?.name || 'Homeroom' } : entry.subject,
          class: assignment.classId ? { id: assignment.classId, name: assignment.className || assignment.class?.name || 'Unknown Class' } : assignment.class,
          section: assignment.sectionId ? { id: assignment.sectionId, name: assignment.sectionName || assignment.section?.name || 'Unknown Section' } : assignment.section,
          type: 'homeroom',
          isHomeroom: true,
        }));
        homeroomAssignments.push(...mapped);
      } else if (assignment.class && assignment.section) {
        homeroomAssignments.push({
          id: `homeroom-${assignment.section.id}`,
          subject: { id: 'homeroom', name: 'Homeroom Class' },
          class: assignment.class,
          section: assignment.section,
          type: 'homeroom',
          isHomeroom: true,
        });
      }
    }
  }

  const merged = [...subjectAssignments, ...homeroomAssignments].filter(
    (assignment) =>
      assignment?.id &&
      (assignment?.subject?.id || assignment?.subjectId) &&
      (assignment?.class?.id || assignment?.classId) &&
      (assignment?.section?.id || assignment?.sectionId),
  );

  const deduped = new Map<string, TeacherAssignment>();
  for (const assignment of merged) {
    const classId = assignment.class?.id || assignment.classId;
    const sectionId = assignment.section?.id || assignment.sectionId;
    const subjectId = assignment.subject?.id || assignment.subjectId;
    const key = `${classId}:${sectionId}:${subjectId}`;
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
  const { currentAcademicYear, getAllAcademicYears, getTermsForYear, formatDate } = useAcademicYear();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [isTermLocked, setIsTermLocked] = useState<boolean>(false);
  const [gradingComponents, setGradingComponents] = useState<{ code: string; name: string; percentage: number }[]>([]);
  const [componentAvailability, setComponentAvailability] = useState<Record<string, ComponentAvailability>>({});
  
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const normalizedRole = (user?.role || "").toUpperCase();
  const isTeacherUser = normalizedRole === "TEACHER";
  const isStaffReadOnly = useMemo(() => {
    const role = (user?.role || "").toUpperCase();
    return role === "ADMIN" || role === "SUPER_ADMIN" || role === "REGISTRAR" || role === "IT_MANAGER";
  }, [user]);

  const normalizeGradeStatus = (status?: string | null) =>
    String(status || "").toUpperCase();

  const isStudentDraftEditable = (student: StudentGrade) => {
    const status = normalizeGradeStatus(student.status);
    return (
      isTeacherUser &&
      !isStaffReadOnly &&
      !isTermLocked &&
      !student.isLocked &&
      status !== "APPROVED"
    );
  };
  
  // Derived: get unique subjects from assignments (prioritize by grade)
  const subjectOptions = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];
    
    // Filter out homeroom assignments - only show actual subjects
    const subjectOnlyAssignments = assignments.filter((a) => a.type !== 'homeroom' && a.isHomeroom !== true);
    
    // First get unique subjects with their class info
    const subjectMap = new Map();
    subjectOnlyAssignments.forEach((a) => {
      if (!subjectMap.has(a.subject.id)) {
        subjectMap.set(a.subject.id, { 
          id: a.subject.id, 
          name: a.subject.name,
          className: a.class.name,
          sectionName: a.section.name,
        });
      }
    });
    return Array.from(subjectMap.values()).sort((a, b) => {
      // Sort by class name (grade) and section
      const gradeA = parseInt(a.className?.replace('Grade ', '') || '0') || 0;
      const gradeB = parseInt(b.className?.replace('Grade ', '') || '0') || 0;
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.sectionName?.localeCompare(b.sectionName || '');
    });
  }, [assignments]);

  // Derived: get unique class-sections from assignments filtered by selected subject
  const classSectionOptions = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];
    
    // Filter out homeroom assignments
    const nonHomeroomAssignments = assignments.filter((a) => a.type !== 'homeroom' && a.isHomeroom !== true);
    
    const filtered = selectedSubjectId 
      ? nonHomeroomAssignments.filter((a) => a.subject.id === selectedSubjectId)
      : nonHomeroomAssignments;
    // Sort by class name and section
    return [...filtered].sort((a, b) => {
      const gradeA = parseInt(a.class?.name?.replace('Grade ', '') || '0') || 0;
      const gradeB = parseInt(b.class?.name?.replace('Grade ', '') || '0') || 0;
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.section?.name?.localeCompare(b.section?.name || '') || 0;
    });
  }, [assignments, selectedSubjectId]);

  const selectedTermObj = useMemo(() => {
    return terms.find((t) => t.id === selectedTerm) || null;
  }, [terms, selectedTerm]);

  const selectedAssignmentData = assignments.find((a) => {
    if (selectedClassSectionId) {
      return a.id === selectedClassSectionId;
    }
    return false;
  });
  
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
      { label: "Marks Entry", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  const fetchInitialData = useCallback(async () => {
    try {
      // Use centralized context to get academic years
      let years = (await getAllAcademicYears()) as AcademicYear[];

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

      // Fetch teacher-visible assessment types without hitting admin-only endpoints
      try {
        const weightsRes = await gradingAPI.getTeacherAssessmentTypes();
        const weightsData = Array.isArray(weightsRes.data)
          ? weightsRes.data
          : weightsRes.data?.data ?? [];
        if (weightsRes.status === 200 && weightsData.length > 0) {
          setGradingComponents(
            weightsData.map((item: { code?: string; type?: string; name?: string; percentage: number }) => {
              const code = item.code ?? item.type ?? "";
              return {
                code,
                name: item.name || formatAssessmentLabel(code),
                percentage: item.percentage,
              };
            }),
          );
        }
      } catch (err: any) {
        // Silent fail - use defaults
      }

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
        // Prefer URL param term if valid, otherwise pick the term that contains today's date, else default to the first term
        const now = new Date();
        const urlTermValid = queryAssignment.termId && termsData.find((term: Term) => term.id === queryAssignment.termId);
        const currentPeriod = termsData.find((term: Term) => term.startDate && term.endDate && new Date(term.startDate) <= now && new Date(term.endDate) >= now);
        const preferredTerm = urlTermValid
          ? queryAssignment.termId
          : currentPeriod?.id || termsData[0]?.id || "";
        setSelectedTerm(preferredTerm);

        // Fetch teacher's subject assignments using the selected academic year
        const assignmentRes = await gradingAPI.getTeacherAssignments({ academicYear: activeYear.id });
        const parsedAssignments = normalizeAssignments(assignmentRes.data);
        setAssignments(parsedAssignments);
        
        // Find preferred from URL params
        const preferredFromUrl = parsedAssignments.find((assignment) => {
          return (
            assignment.class?.id === queryAssignment.classId &&
            assignment.subject?.id === queryAssignment.subjectId &&
            (!queryAssignment.sectionId || assignment.section?.id === queryAssignment.sectionId)
          );
        });
        
        // Find preferred assignment (filter out homeroom)
        const nonHomeroomAssignments = parsedAssignments.filter((a) => a.type !== 'homeroom' && a.isHomeroom !== true);
        let preferredAssignment: TeacherAssignment | undefined;
        if (preferredFromUrl) {
          preferredAssignment = preferredFromUrl;
        } else if (nonHomeroomAssignments.length > 0) {
          preferredAssignment = nonHomeroomAssignments[0];
        }
        
        if (preferredAssignment) {
          setSelectedSubjectId(preferredAssignment.subject?.id);
          setSelectedClassSectionId(preferredAssignment.id);
        }
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

    if (normalizedRole && normalizedRole !== "TEACHER") {
      router.push("/");
      return;
    }

    fetchInitialData();
  }, [user, authLoading, router, fetchInitialData, normalizedRole]);

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

    if (match && match.id !== selectedClassSectionId) {
      setSelectedClassSectionId(match.id);
    }
  }, [assignments, queryAssignment, selectedYear, selectedTerm, selectedClassSectionId, currentAcademicYear, getAllAcademicYears, getTermsForYear]);

  // Fetch terms when academic year changes
  const fetchTermsForYear = useCallback(async (yearId: string) => {
    try {
      // Use centralized context to get terms
      const termsData = await getTermsForYear(yearId);
      setTerms(termsData);
      if (termsData.length > 0) {
        // Default to the term that contains today's date when available
        const now = new Date();
        const currentPeriod = termsData.find((term: Term) => term.startDate && term.endDate && new Date(term.startDate) <= now && new Date(term.endDate) >= now);
        setSelectedTerm(currentPeriod?.id || termsData[0].id);
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
      const nonHomeroomAssignments = parsedAssignments.filter((a) => a.type !== 'homeroom' && a.isHomeroom !== true);
      const nextAssignment = preferredAssignment || nonHomeroomAssignments[0] || parsedAssignments[0];
      setSelectedSubjectId(nextAssignment?.subject?.id || "");
      setSelectedClassSectionId(nextAssignment?.id || "");
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
      setSelectedSubjectId("");
      setSelectedClassSectionId("");
    }
  }, [queryAssignment]);

  useEffect(() => {
    if (!initialLoad && selectedYear) {
      fetchAssignmentsForYear(selectedYear);
    }
  }, [selectedYear, initialLoad, fetchAssignmentsForYear]);

  // Fetch students when filters change
  const fetchStudents = useCallback(async () => {
    const assignment = assignments.find((a) => a.id === selectedClassSectionId);
    if (!assignment) {
      setStudents([]);
      return;
    }

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
      const currentColumns =
        gradingComponents.length === 0
          ? [
              { code: 'CA', label: 'Quiz', maxScore: 15 },
              { code: 'MID', label: 'Mid Exam', maxScore: 20 },
              { code: 'FINAL', label: 'Final Exam', maxScore: 30 },
            ]
          : gradingComponents.map((c) => ({
              code: c.code,
              label: c.name,
              maxScore: c.percentage,
            }));
      
      // Handle both {students, isTermLocked} format and direct array response
      const studentData = data?.students || (Array.isArray(data) ? data : (data.data || []));
      const availabilityData = Array.isArray(data?.componentAvailability)
        ? data.componentAvailability
        : [];
      const locked = data?.isTermLocked || false;
      
      setComponentAvailability(
        Object.fromEntries(
          availabilityData.map((item: ComponentAvailability) => [
            String(item.code).toUpperCase(),
            item,
          ]),
        ),
      );
      setStudents(
        (studentData as any[])
          .map((student) => {
            const persistedComponentScores = ((student.componentScores || []) as Array<{ code: string; score: number | null }>);
            const normalizedComponentScores = Object.fromEntries(
              persistedComponentScores.map((item) => [
                String(item.code).toUpperCase(),
                item.score ?? null,
              ]),
            );

            const hasGranularCaScores = persistedComponentScores.some((item) => {
              const code = String(item.code).toUpperCase();
              return code !== "MID" && code !== "FINAL" && item.score !== null && item.score !== undefined;
            });
            let assignedLegacyCa = false;
            for (const column of currentColumns) {
              const code = column.code.toUpperCase();
              if (normalizedComponentScores[code] !== undefined) continue;

              if (code === "MID") {
                normalizedComponentScores[code] = student.midScore ?? null;
              } else if (code === "FINAL") {
                normalizedComponentScores[code] = student.finalScore ?? null;
              } else if (!hasGranularCaScores && !assignedLegacyCa) {
                normalizedComponentScores[code] = student.caScore ?? null;
                assignedLegacyCa = true;
              } else {
                normalizedComponentScores[code] = null;
              }
            }

            const totalScore = calculateTotal(
              normalizedComponentScores,
              student.caScore ?? null,
              student.midScore ?? null,
              student.finalScore ?? null,
            );

            return {
              ...student,
              componentScores: normalizedComponentScores,
              totalScore,
              gradeLetter: totalScore !== null ? calculateGrade(totalScore) : student.gradeLetter ?? null,
            };
          })
          .sort((a, b) => {
            const aRoll = Number(a.rollNumber);
            const bRoll = Number(b.rollNumber);
            const aHasNumericRoll = Number.isFinite(aRoll) && String(a.rollNumber ?? "").trim() !== "";
            const bHasNumericRoll = Number.isFinite(bRoll) && String(b.rollNumber ?? "").trim() !== "";

            if (aHasNumericRoll && bHasNumericRoll) {
              return aRoll - bRoll;
            }

            if (aHasNumericRoll) return -1;
            if (bHasNumericRoll) return 1;

            return String(a.studentName || "").localeCompare(String(b.studentName || ""));
          }) as StudentGrade[],
      );
      setHasUnsavedChanges(false);
      setIsTermLocked(locked);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      const message = error?.response?.data?.message || "Failed to load students";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [assignments, selectedClassSectionId, selectedYear, selectedTerm, gradingComponents]);

  useEffect(() => {
    if (selectedYear && selectedTerm && selectedClassSectionId) {
      fetchStudents();
    }
  }, [selectedYear, selectedTerm, selectedClassSectionId, fetchStudents]);

  useEffect(() => {
    if (!isTeacherUser) return;

    syncService.startAutoSync();
    return () => syncService.stopAutoSync();
  }, [isTeacherUser]);

  function calculateTotal(componentScores?: Record<string, number | null>, ca?: number | null, mid?: number | null, final?: number | null): number | null {
    if (componentScores && Object.keys(componentScores).length > 0) {
      const values = Object.values(componentScores).filter((value) => value !== null && value !== undefined) as number[];
      if (values.length === 0) return null;
      return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
    }

    if (ca === null && mid === null && final === null) return null;
    return Math.round(((ca ?? 0) + (mid ?? 0) + (final ?? 0)) * 100) / 100;
  }

  // Map assessment types for display
  const assessmentColumns = useMemo<AssessmentColumn[]>(() => {
    if (gradingComponents.length === 0) {
      return [
        { code: 'CA', label: 'Quiz', maxScore: 15 },
        { code: 'MID', label: 'Mid Exam', maxScore: 20 },
        { code: 'FINAL', label: 'Final Exam', maxScore: 30 },
      ];
    }
    
    return gradingComponents.map(c => ({
      code: c.code,
      label: c.name,
      maxScore: c.percentage,
    }));
  }, [gradingComponents]);

  function calculateGrade(total: number | null): string {
    if (total === null) return "";
    if (total >= 90) return "A";
    if (total >= 80) return "B";
    if (total >= 70) return "C";
    if (total >= 60) return "D";
    return "F";
  }

  const handleScoreChange = (studentId: string, componentCode: string, value: string) => {
    if (!isTeacherUser || isStaffReadOnly) return;

    const currentStudent = students.find((student) => student.studentId === studentId);
    if (!currentStudent || !isStudentDraftEditable(currentStudent)) return;

    const normalizedCode = componentCode.toUpperCase();
    const availability = componentAvailability[normalizedCode];
    if (availability && !availability.started) {
      toast.error(`${formatAssessmentLabel(normalizedCode)} has not started yet`);
      return;
    }

    const col = assessmentColumns.find(c => c.code.toUpperCase() === normalizedCode);
    const maxWeight = col?.maxScore;
    const parsedValue = value === "" ? null : parseFloat(value);
    let numValue = parsedValue;

    if (maxWeight === undefined) {
      toast.error(`${col?.label || normalizedCode} max score is not available`);
      return;
    }

    if (numValue !== null && Number.isNaN(numValue)) {
      return;
    }

    if (numValue !== null && numValue < 0) {
      numValue = 0;
    }

    if (numValue !== null && numValue > maxWeight) {
      toast.error(`${col?.label || normalizedCode} max score is ${maxWeight}`);
      numValue = maxWeight;
    }
    
    setStudents(prev => prev.map(student => {
      if (student.studentId !== studentId) return student;

      const nextComponentScores = {
        ...(student.componentScores || {}),
        [normalizedCode]: numValue,
      };

      const newStudent = { ...student, componentScores: nextComponentScores };
      const total = calculateTotal(nextComponentScores, newStudent.caScore, newStudent.midScore, newStudent.finalScore);
      newStudent.totalScore = total;
      newStudent.gradeLetter = total !== null ? calculateGrade(total) : null;
      
      return newStudent;
    }));
    setHasUnsavedChanges(true);
  };
  
  const handleInternalNoteChange = (studentId: string, value: string) => {
    if (isStaffReadOnly) return;
    const currentStudent = students.find((student) => student.studentId === studentId);
    if (!currentStudent || !isStudentDraftEditable(currentStudent)) return;

    setStudents(prev => prev.map(student => {
      if (student.studentId !== studentId) return student;
      return { ...student, internalNote: value };
    }));
    setHasUnsavedChanges(true);
  };

  const isComponentStarted = (code: string) =>
    componentAvailability[code.toUpperCase()]?.started ?? false;

  const isComponentEnded = (code: string) => {
    const availability = componentAvailability[code.toUpperCase()];
    if (!availability) return false;
    if (availability.ended === true) return true;
    if (!availability.endDate) return false;

    const endDate = new Date(availability.endDate);
    return Number.isFinite(endDate.getTime()) && endDate < new Date();
  };

  const getComponentMaxScore = (code: string) =>
    assessmentColumns.find((column) => column.code.toUpperCase() === code.toUpperCase())?.maxScore;

  const canEditComponent = (code: string) => {
    const availability = componentAvailability[code.toUpperCase()];
    return (
      isTeacherUser &&
      !isStaffReadOnly &&
      Boolean(availability) &&
      availability.status !== "LOCKED" &&
      availability.status !== "COMPLETED" &&
      isComponentStarted(code) &&
      !isComponentEnded(code) &&
      getComponentMaxScore(code) !== undefined
    );
  };

  const clampScoreInput = (rawValue: string, code: string) => {
    if (rawValue === "") return "";

    const maxScore = getComponentMaxScore(code);
    if (maxScore === undefined) return "";

    const parsedValue = parseFloat(rawValue);
    if (Number.isNaN(parsedValue)) return "";

    if (parsedValue < 0) return "0";
    if (parsedValue > maxScore) return String(maxScore);
    return rawValue;
  };

  const getComponentStartLabel = (code: string) => {
    const availability = componentAvailability[code.toUpperCase()];
    if (!availability) return "Not scheduled";
    if (availability.status === "LOCKED") return "Locked";
    if (availability.status === "COMPLETED") return "Completed";
    if (isComponentEnded(code)) return "Entry closed";
    if (availability.started) return "Started";
    return `Starts ${formatDate(availability.startDate) || new Date(availability.startDate).toLocaleDateString()}`;
  };

  const lockExpiredComponentFromError = (message: string) => {
    if (!/assessment entry period is over/i.test(message)) return false;

    const expiredColumn = assessmentColumns.find((column) => {
      const code = column.code.toUpperCase();
      const label = column.label.toUpperCase();
      const normalizedMessage = message.toUpperCase();
      return normalizedMessage.includes(`${code} ASSESSMENT`) || normalizedMessage.includes(`${label} ASSESSMENT`);
    });

    if (!expiredColumn) return false;

    setComponentAvailability((prev) => {
      const code = expiredColumn.code.toUpperCase();
      const current = prev[code];
      if (!current) return prev;
      return {
        ...prev,
        [code]: {
          ...current,
          ended: true,
        },
      };
    });
    return true;
  };

  const hasStartedAssessment = assessmentColumns.some((col) =>
    isComponentStarted(col.code),
  );

  const hasPendingAssessmentStart = assessmentColumns.some(
    (col) => componentAvailability[col.code.toUpperCase()] && !isComponentStarted(col.code),
  );

  const hasEditableAssessment = assessmentColumns.some((col) =>
    canEditComponent(col.code),
  );

  const lockedOrUpcomingColumns = assessmentColumns.filter((col) => !canEditComponent(col.code));

  const gradeEntryStatusMessage = !hasStartedAssessment && hasPendingAssessmentStart
    ? "Marks entry is locked until the scheduled assessment start date. Check the column status below for when each assessment opens."
    : hasEditableAssessment
      ? "Enter marks for the assessments that are currently active."
      : "Marks entry is closed for the current assessment window.";

  const componentCompletion = useMemo(() => {
    return assessmentColumns.map((column) => {
      const code = column.code.toUpperCase();
      const entered = students.filter((student) => {
        const value = student.componentScores?.[code];
        return value !== null && value !== undefined;
      }).length;
      return { code, entered, total: students.length };
    });
  }, [assessmentColumns, students]);

  const handlePasteScores = (studentId: string, startCode: string, rawText: string) => {
    const rows = rawText
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split(/\t|,/).map((cell) => cell.trim()));

    if (rows.length === 0 || rows.every((row) => row.every((cell) => cell === ""))) return;

    const startStudentIndex = students.findIndex((student) => student.studentId === studentId);
    const startColumnIndex = assessmentColumns.findIndex(
      (column) => column.code.toUpperCase() === startCode.toUpperCase(),
    );
    if (startStudentIndex === -1 || startColumnIndex === -1) return;

    let changed = 0;
    setStudents((prev) => {
      const next = prev.map((student) => ({ ...student, componentScores: { ...(student.componentScores || {}) } }));
      rows.forEach((row, rowOffset) => {
        const targetStudent = next[startStudentIndex + rowOffset];
        if (!targetStudent) return;
        if (!isStudentDraftEditable(targetStudent)) return;

        row.forEach((cell, columnOffset) => {
          const column = assessmentColumns[startColumnIndex + columnOffset];
          if (!column || cell === "" || !canEditComponent(column.code)) return;

          const clamped = clampScoreInput(cell, column.code);
          if (clamped === "") return;

          targetStudent.componentScores![column.code.toUpperCase()] = Number(clamped);
          const total = calculateTotal(
            targetStudent.componentScores,
            targetStudent.caScore,
            targetStudent.midScore,
            targetStudent.finalScore,
          );
          targetStudent.totalScore = total;
          targetStudent.gradeLetter = total !== null ? calculateGrade(total) : null;
          changed += 1;
        });
      });
      return next;
    });

    if (changed > 0) {
      setHasUnsavedChanges(true);
      toast.success(`Pasted ${changed} marks`);
    }
  };

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveDraft = async () => {
    if (!isTeacherUser) {
      toast.error("Only teachers can save grade drafts");
      return;
    }

    setSaving(true);
    let offlinePayload: Record<string, unknown> | null = null;
    try {
      const assignment = assignments.find((a) => a.id === selectedClassSectionId);
      if (!assignment) return;

      // Filter students with at least one score entered
      const gradesToSave = students
        .filter((student) => isStudentDraftEditable(student))
        .filter(s => {
          const componentValues = assessmentColumns
            .filter((col) => canEditComponent(col.code))
            .map((col) => s.componentScores?.[col.code.toUpperCase()]);
          if (componentValues.some(value => value !== null && value !== undefined)) {
            return true;
          }
          return false;
        })
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
          componentScores: assessmentColumns
            .filter((col) => canEditComponent(col.code))
            .map(col => ({
              code: col.code,
              score: student.componentScores?.[col.code.toUpperCase()] ?? null,
              assessmentSubjectId:
                componentAvailability[col.code.toUpperCase()]?.assessmentSubjectId,
            })),
          remark: student.remark,
          internalNote: student.internalNote,
        }));

      if (gradesToSave.length === 0) {
        toast.error("No editable draft grades to save");
        setSaving(false);
        return;
      }

      offlinePayload = {
        grades: gradesToSave,
        userId: user?.id,
        contextKey: `${selectedClassSectionId}:${selectedYear}:${selectedTerm}`,
      };

      // Use bulk API for better performance
      const res = await gradingAPI.bulkEnterGrades({ grades: gradesToSave });
      const data = res.data;

      // Handle both success response and direct response
      if (data?.successful !== undefined) {
        toast.success(`Saved ${data.successful} grades successfully`);
        setHasUnsavedChanges(false);
        if (data.failed > 0) {
          toast.warning(`${data.failed} grades failed to save`);
        }
        fetchStudents();
      } else if (data?.success) {
        toast.success("Grades saved successfully");
        setHasUnsavedChanges(false);
        fetchStudents();
      } else {
        toast.error(data?.message || "Failed to save grades");
      }
    } catch (error: any) {
      console.error("Error saving draft:", error);
      const isNetworkError = !navigator.onLine || !error?.response;
      if (isNetworkError && offlinePayload) {
        await syncService.saveGradeDraftOffline(offlinePayload);
        toast.success("Grades saved offline. They will sync when online.");
        setHasUnsavedChanges(false);
      } else {
        const message = error?.response?.data?.message || "Failed to save draft";
        if (lockExpiredComponentFromError(message)) {
          setHasUnsavedChanges(false);
          fetchStudents();
        }
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToRegistrar = async () => {
    if (!isTeacherUser) {
      toast.error("Only teachers can submit grades to registrar");
      return;
    }

    if (hasUnsavedChanges) {
      toast.error("Save your draft before submitting to registrar");
      return;
    }

    setSaving(true);
    try {
      const assignment = assignments.find((a) => a.id === selectedClassSectionId);
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
        setHasUnsavedChanges(false);
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
    switch (normalizeGradeStatus(status)) {
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
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-5 bg-gray-50 px-3 py-4 dark:bg-gray-900 sm:px-4 sm:py-6 md:space-y-6 md:px-6 lg:px-8">
      {/* Header */}
      <div className="min-w-0">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold text-black sm:text-2xl">
            Marks Entry
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-gray-500 dark:text-gray-400 sm:text-base">
            Enter and manage student marks for your assigned subjects
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="w-full min-w-0 max-w-full overflow-hidden dark:bg-gray-800">
        <CardContent className="px-4 pb-4 pt-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Academic Year</label>
              <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setSelectedSubjectId(""); setSelectedClassSectionId(""); }}>
                <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
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
              <Select value={selectedTerm} onValueChange={(val) => { setSelectedTerm(val); setSelectedClassSectionId(""); }}>
                <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
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
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Subject</label>
              <Select value={selectedSubjectId} onValueChange={(val) => { setSelectedSubjectId(val); setSelectedClassSectionId(""); }}>
                <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {subjectOptions.map(subject => (
                    <SelectItem key={subject.id} value={subject.id} className="dark:text-white dark:focus:bg-gray-700">
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Class - Section</label>
              <Select value={selectedClassSectionId} onValueChange={setSelectedClassSectionId} disabled={!selectedSubjectId}>
                <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {classSectionOptions.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="dark:text-white dark:focus:bg-gray-700">
                      {cls.class?.name || "Unknown Class"} - Section {cls.section?.name || "Unknown Section"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marks Entry Table */}
      {selectedAssignmentData && (
        <Card className="w-full min-w-0 max-w-full overflow-hidden border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="flex w-full flex-col gap-4 border-b border-gray-100 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Student Marks</CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                {gradeEntryStatusMessage}
              </CardDescription>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="h-9 justify-center border-amber-200 bg-amber-50 px-3 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  Unsaved changes
                </Badge>
              )}
              <Button 
                type="button"
                variant="outline" 
                onClick={handleSaveDraft} 
                disabled={saving || isTermLocked || !hasEditableAssessment || isStaffReadOnly}
                className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600 sm:w-auto"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>
              <Button 
                type="button"
                onClick={handleSubmitToRegistrar} 
                disabled={saving || isTermLocked || !hasEditableAssessment || isStaffReadOnly || hasUnsavedChanges}
                className="w-full sm:w-auto"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit to Registrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="w-full min-w-0 p-0">
            {isTermLocked && (
              <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 sm:mx-6">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">This term is locked for grading. You can view existing grades but cannot make changes.</p>
              </div>
            )}
            {!isTermLocked && lockedOrUpcomingColumns.length > 0 && (
              <div className="mx-4 mb-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 sm:mx-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">
                      Some mark columns are not editable yet.
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {lockedOrUpcomingColumns.map((column) => `${column.label}: ${getComponentStartLabel(column.code)}`).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
              </div>
            ) : (
              <>
                <div className="space-y-3 px-4 pb-4 sm:hidden">
                  {students.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-muted-foreground dark:border-gray-700 dark:text-gray-400">
                      No students found for the selected criteria
                    </div>
                  ) : (
                    students.map((student, index) => (
                      <div key={student.studentId} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                              {index + 1}. {student.studentName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Roll {student.rollNumber || "-"}
                            </p>
                          </div>
                          <div className="shrink-0">{getStatusBadge(student.status)}</div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {assessmentColumns.map(col => (
                            <label key={col.code} className="min-w-0">
                              <span className="mb-1 block truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                                {col.code}
                              </span>
                              <Input
                                type="number"
                                className="h-9 w-full px-1 text-center text-xs dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                min="0"
                                max={getComponentMaxScore(col.code)}
                                value={student.componentScores?.[col.code.toUpperCase()] ?? ""}
                                onInput={(e) => {
                                  const nextValue = clampScoreInput(
                                    e.currentTarget.value,
                                    col.code,
                                  );
                                  if (nextValue !== e.currentTarget.value) {
                                    e.currentTarget.value = nextValue;
                                  }
                                }}
                                onChange={(e) => handleScoreChange(student.studentId, col.code, e.target.value)}
                                onPaste={(e) => {
                                  const text = e.clipboardData.getData("text");
                                  if (text.includes("\n") || text.includes("\t") || text.includes(",")) {
                                    e.preventDefault();
                                    handlePasteScores(student.studentId, col.code, text);
                                  }
                                }}
                                disabled={!isStudentDraftEditable(student) || !canEditComponent(col.code)}
                                placeholder={getComponentMaxScore(col.code) !== undefined ? `0-${getComponentMaxScore(col.code)}` : "N/A"}
                              />
                            </label>
                          ))}
                        </div>
                        
                        <div className="mt-3">
                          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Internal Note (Private)</label>
                          <Input
                            className="h-8 w-full text-xs dark:bg-gray-700 dark:text-white"
                            placeholder="Staff-only notes..."
                            value={student.internalNote || ""}
                            onChange={(e) => handleInternalNoteChange(student.studentId, e.target.value)}
                            disabled={!isStudentDraftEditable(student)}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-gray-700">
                          <span className="font-medium text-slate-700 dark:text-gray-300">Total: {student.totalScore ?? "-"}</span>
                          <span className={`inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-semibold ${getGradeColor(student.gradeLetter)}`}>
                            {student.gradeLetter || "-"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="hidden w-full max-w-full sm:block">
                <Table className="w-full table-fixed">
                <TableHeader className="sticky top-0 bg-gray-50 dark:bg-slate-900/50">
                  <TableRow className="border-b border-gray-100 dark:border-slate-700">
                    <TableHead className="w-[8%] px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Roll No.</TableHead>
                    <TableHead className="w-[18%] px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Student</TableHead>
                    {assessmentColumns.map(col => (
                      <TableHead key={col.code} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span className="block truncate">{col.label} (Max {col.maxScore})</span>
                      </TableHead>
                    ))}
                    <TableHead className="w-[8%] px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Total</TableHead>
                    <TableHead className="w-[8%] px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Grade</TableHead>
                    <TableHead className="w-[15%] px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Internal Note</TableHead>
                    <TableHead className="w-[8%] px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5 + assessmentColumns.length} className="py-10 text-center text-muted-foreground dark:text-gray-400">
                        No students found for the selected criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.studentId} className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-700/50 dark:hover:bg-slate-700/30">
                        <TableCell className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{student.rollNumber || "-"}</TableCell>
                        <TableCell className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          <div className="truncate">{student.studentName}</div>
                        </TableCell>
                        {assessmentColumns.map(col => (
                          <TableCell key={col.code} className="px-2 py-3 text-center">
                            <Input
                              type="number"
                              className="h-8 w-full min-w-0 border-gray-200 px-1 text-center text-xs dark:border-slate-600 dark:bg-gray-700 dark:text-white"
                              min="0"
                              max={getComponentMaxScore(col.code)}
                              value={student.componentScores?.[col.code.toUpperCase()] ?? ""}
                              onInput={(e) => {
                                const nextValue = clampScoreInput(
                                  e.currentTarget.value,
                                  col.code,
                                );
                                if (nextValue !== e.currentTarget.value) {
                                  e.currentTarget.value = nextValue;
                                }
                              }}
                              onChange={(e) => handleScoreChange(student.studentId, col.code, e.target.value)}
                                onPaste={(e) => {
                                  const text = e.clipboardData.getData("text");
                                  if (text.includes("\n") || text.includes("\t") || text.includes(",")) {
                                    e.preventDefault();
                                    handlePasteScores(student.studentId, col.code, text);
                                  }
                                }}
                              disabled={!isStudentDraftEditable(student) || !canEditComponent(col.code)}
                              placeholder={getComponentMaxScore(col.code) !== undefined ? `0-${getComponentMaxScore(col.code)}` : "N/A"}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="px-3 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                          {student.totalScore ?? "-"}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-center">
                          <span className={`inline-flex min-w-[40px] justify-center rounded-full px-2 py-1 text-xs font-semibold ${getGradeColor(student.gradeLetter)}`}>
                            {student.gradeLetter || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                           <Input
                              className="h-8 w-full border-gray-200 px-2 text-xs dark:border-slate-600 dark:bg-gray-700 dark:text-white"
                              placeholder="Private note..."
                              value={student.internalNote || ""}
                              onChange={(e) => handleInternalNoteChange(student.studentId, e.target.value)}
                              disabled={!isStudentDraftEditable(student)}
                            />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          {getStatusBadge(student.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
