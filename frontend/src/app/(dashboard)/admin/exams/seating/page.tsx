"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { assessmentsAPI, schoolSettingsAPI, termsAPI } from "@/lib/api";
import { examSeatingAPI } from "@/lib/api/operations";
import { toast } from "sonner";
import {
  Users,
  Save,
  Settings2,
  Eye,
  Shuffle,
  Printer,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  UserCheck,
  RotateCcw,
  Trash2,
  Plus,
  Minus,
  FileText,
  Calendar,
  Search,
  AlertTriangle,
  Download,
  GraduationCap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AccessDenied from "@/components/AccessDenied";
import { FeatureGuard } from "@/components/FeatureGuard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Exam {
  id: string;
  title: string;
  type: string;
  date: string;
  subject: { name: string };
  class: { name: string; grade: number | null; academicYearId?: string };
}

interface Assessment {
  id: string;
  assessmentId: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  term?: { id: string; name: string } | null;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  section?: { id: string; name: string } | null;
}

interface AcademicTerm {
  id: string;
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
}

interface CurriculumExamType {
  value: string;
  label: string;
  periodLabel: string;
  examCategory: "MID" | "FINAL" | "QUIZ" | "PRACTICAL" | "ASSIGNMENT";
  termOrder: number;
}

interface ExamTypeInfo {
  type: string;
  label: string;
  exams: Exam[];
}

interface SeatingPlan {
  id: string;
  examType: string;
  mode: string;
  fromGrade: number;
  toGrade: number;
  examCapacity: number;
  shuffle: boolean;
  useScoreThresholdFilter?: boolean;
  scoreThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

interface StudentInSection {
  orderIndex: number;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  originalSection: string | null;
  originalGrade: number | null;
}

interface SectionWithStudents {
  sectionId: string;
  sectionName: string;
  className: string;
  grade: number | null;
  capacity: number;
  examCapacity: number;
  assignedStudents: number;
  students: StudentInSection[];
}

interface SeatingOverview {
  plan: SeatingPlan;
  totalStudents: number;
  totalSections: number;
  totalCapacity: number;
  sections: SectionWithStudents[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Base exam categories from the Ethiopian MoE curriculum
const EXAM_CATEGORIES = [
  { code: "MID", label: "Mid Exam", weight: 20 },
  { code: "FINAL", label: "Final Exam", weight: 30 },
  { code: "QUIZ", label: "Quiz/Test", weight: 15 },
  { code: "PRACTICAL", label: "Practical Exam", weight: 25 },
  { code: "ASSIGNMENT", label: "Assignment", weight: 10 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate curriculum-period-aware exam types based on the school's
 * curriculum type (SEMESTER/QUARTER/TERM) and available terms.
 *
 * Ethiopian MoE Curriculum Structure:
 * - SEMESTER: 2 periods per year
 * - QUARTER: 4 periods per year
 * - TERM: 3 periods per year
 *
 * Each period has:
 * - Formative/Continuous Assessment (60% of grade)
 * - Summative Assessment (40%): Mid Exam + Final Exam
 */
function generateCurriculumExamTypes(
  curriculumType: string,
  terms: AcademicTerm[]
): CurriculumExamType[] {
  const periodLabel =
    curriculumType === "QUARTER"
      ? "Quarter"
      : curriculumType === "TERM"
      ? "Term"
      : "Semester";

  const sortedTerms = [...terms].sort((a, b) => a.order - b.order);
  const types: CurriculumExamType[] = [];

  for (const term of sortedTerms) {
    const termLabel = term.name?.trim() || `${periodLabel} ${term.order}`;

    // Mid Exam for this period
    types.push({
      value: `${termLabel}_MID`,
      label: `${termLabel} Mid Exam`,
      periodLabel: termLabel,
      examCategory: "MID",
      termOrder: term.order,
    });

    // Final Exam for this period
    types.push({
      value: `${termLabel}_FINAL`,
      label: `${termLabel} Final Exam`,
      periodLabel: termLabel,
      examCategory: "FINAL",
      termOrder: term.order,
    });
  }

  // Also add generic cross-period types for quizzes, practicals, assignments
  types.push({
    value: "QUIZ",
    label: "Quiz / Test",
    periodLabel: "General",
    examCategory: "QUIZ",
    termOrder: 0,
  });

  types.push({
    value: "PRACTICAL",
    label: "Practical Exam",
    periodLabel: "General",
    examCategory: "PRACTICAL",
    termOrder: 0,
  });

  types.push({
    value: "ASSIGNMENT",
    label: "Assignment",
    periodLabel: "General",
    examCategory: "ASSIGNMENT",
    termOrder: 0,
  });

  return types;
}

/**
 * Map an exam to its curriculum-period-aware exam type based on:
 * 1. The exam's date falling within a term's date range
 * 2. The exam's base type (MID_TERM → Mid, FINAL → Final, etc.)
 */
function mapExamToCurriculumType(
  exam: Exam,
  curriculumTypes: CurriculumExamType[],
  terms: AcademicTerm[]
): string | null {
  const examDate = new Date(exam.date);
  const examBaseType = exam.type; // MID_TERM, FINAL, QUIZ, etc.

  // For quizzes, practicals, assignments — use generic types
  if (["QUIZ", "PRACTICAL", "ASSIGNMENT"].includes(examBaseType)) {
    return examBaseType;
  }

  // Find which term the exam date falls into
  const matchingTerm = terms.find((term) => {
    if (!term.startDate || !term.endDate) return false;
    const start = new Date(term.startDate);
    const end = new Date(term.endDate);
    return examDate >= start && examDate <= end;
  });

  if (!matchingTerm) {
    // Keep the original exam type when term matching is unavailable.
    // This prevents exams like MID_TERM from being mapped into synthetic
    // values that the UI does not render.
    return examBaseType;
  }

  const termLabel = matchingTerm.name?.trim() || matchingTerm.order.toString();
  const category = examBaseType === "MID_TERM" ? "MID" : examBaseType;

  // Find the matching curriculum exam type
  const match = curriculumTypes.find(
    (ct) =>
      ct.examCategory === category &&
      ct.termOrder === matchingTerm.order
  );

  return match?.value || examBaseType;
}

function mapAssessmentToSeatingType(
  assessment: Assessment,
  curriculumTypes: CurriculumExamType[],
  terms: AcademicTerm[]
): string | null {
  const assessmentDate = new Date(assessment.startDate);
  const assessmentBaseType = assessment.type;

  if (assessmentBaseType === "ATTENDANCE") {
    return null;
  }

  if (assessmentBaseType === "QUIZ" || assessmentBaseType === "TEST") {
    return "QUIZ";
  }

  const matchingTerm =
    terms.find((term) => {
      if (!term.startDate || !term.endDate) return false;
      const start = new Date(term.startDate);
      const end = new Date(term.endDate);
      return assessmentDate >= start && assessmentDate <= end;
    }) ||
    terms.find((term) => term.id === assessment.term?.id);

  if (!matchingTerm) {
    if (assessmentBaseType === "MID") return "MID_TERM";
    if (assessmentBaseType === "FINAL") return "FINAL";
    return assessmentBaseType;
  }

  const category = assessmentBaseType === "MID" ? "MID" : assessmentBaseType;
  const match = curriculumTypes.find(
    (ct) => ct.examCategory === category && ct.termOrder === matchingTerm.order
  );

  if (match) {
    return match.value;
  }

  if (assessmentBaseType === "MID") return "MID_TERM";
  if (assessmentBaseType === "FINAL") return "FINAL";
  return assessmentBaseType;
}

/**
 * Get a human-readable label for an exam type value
 */
function getExamTypeLabel(
  value: string,
  curriculumTypes: CurriculumExamType[]
): string {
  const found = curriculumTypes.find((ct) => ct.value === value);
  if (found) return found.label;

  // Fallback for legacy types
  const legacyMap: Record<string, string> = {
    MID_TERM: "Mid Term Exam",
    FINAL: "Final Exam",
    QUIZ: "Quiz / Test",
    PRACTICAL: "Practical Exam",
    ASSIGNMENT: "Assignment",
  };
  return legacyMap[value] || value;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExamSeatingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const {
    currentAcademicYear,
    currentTerm,
    curriculumType,
    periodLabel,
    getTermsForYear,
  } = useAcademicYear();
  const router = useRouter();

  /* -------------------- Data state -------------------- */
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [curriculumExamTypes, setCurriculumExamTypes] = useState<CurriculumExamType[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeInfo[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const [schoolSettings, setSchoolSettings] = useState<Record<string, any>>({});
  const [seatingPlan, setSeatingPlan] = useState<SeatingPlan | null>(null);
  const [seatingOverview, setSeatingOverview] = useState<SeatingOverview | null>(null);
  const [allPlans, setAllPlans] = useState<Array<{ id: string; examType: string }>>([]);

  /* -------------------- Form state -------------------- */
  const [fromGrade, setFromGrade] = useState<number>(1);
  const [toGrade, setToGrade] = useState<number>(12);
  const [examCapacity, setExamCapacity] = useState<number>(30);
  const [shuffle, setShuffle] = useState<boolean>(true);
  const [savedSettings, setSavedSettings] = useState<{
    fromGrade: number;
    toGrade: number;
    examCapacity: number;
    shuffle: boolean;
  } | null>(null);

  /* -------------------- UI state -------------------- */
  const [generating, setGenerating] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionSearch, setSectionSearch] = useState("");

  /* -------------------- Derived state -------------------- */
  const isDirty = useMemo(() => {
    if (!savedSettings || !seatingPlan) return false;
    return (
      fromGrade !== savedSettings.fromGrade ||
      toGrade !== savedSettings.toGrade ||
      examCapacity !== savedSettings.examCapacity ||
      shuffle !== savedSettings.shuffle
    );
  }, [fromGrade, toGrade, examCapacity, shuffle, savedSettings, seatingPlan]);

  const selectedTypeInfo = useMemo(
    () => examTypes.find((et) => et.type === selectedExamType),
    [examTypes, selectedExamType]
  );

  const filteredSections = useMemo(() => {
    if (!seatingOverview) return [];
    if (!sectionSearch.trim()) return seatingOverview.sections;
    const term = sectionSearch.toLowerCase();
    return seatingOverview.sections.filter(
      (s) =>
        s.sectionName.toLowerCase().includes(term) ||
        s.className.toLowerCase().includes(term) ||
        s.students.some((st) => st.studentName.toLowerCase().includes(term))
    );
  }, [seatingOverview, sectionSearch]);

  /* -------------------- Effects -------------------- */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (
      isAuthenticated &&
      (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") &&
      currentAcademicYear?.id
    ) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, currentAcademicYear?.id, currentTerm?.id, curriculumType]);

  useEffect(() => {
    if (!selectedExamType) return;

    let cancelled = false;

    const loadPlan = async () => {
      setLoadingOverview(true);
      setSeatingOverview(null);
      try {
        const res = await examSeatingAPI.getSeatingPlanByType(selectedExamType);
        if (cancelled) return;

        if (res.data) {
          const plan: SeatingPlan = res.data;
          setSeatingPlan(plan);
          setFromGrade(plan.fromGrade);
          setToGrade(plan.toGrade);
          setExamCapacity(plan.examCapacity || 30);
          setShuffle(plan.shuffle);
          setSavedSettings({
            fromGrade: plan.fromGrade,
            toGrade: plan.toGrade,
            examCapacity: plan.examCapacity || 30,
            shuffle: plan.shuffle,
          });

          // Fetch overview in parallel
          fetchSeatingOverview(plan.id, cancelled);
        } else {
          resetFormToDefaults();
          setSeatingPlan(null);
          setSavedSettings(null);
          setLoadingOverview(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          resetFormToDefaults();
          setSeatingPlan(null);
          setSavedSettings(null);
          setLoadingOverview(false);
        }
      }
    };

    loadPlan();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamType]);

  /* -------------------- Helpers -------------------- */
  const getGradeRangeFromSystem = (system: string) => {
    const gradeSystems: Record<string, { min: number; max: number }> = {
      "1-8": { min: 1, max: 8 },
      "1-10": { min: 1, max: 10 },
      "1-12": { min: 1, max: 12 },
      "K-8": { min: 1, max: 8 },
      "K-12": { min: 1, max: 12 },
      "PRE-K-12": { min: 1, max: 12 },
      "9-12": { min: 9, max: 12 },
    };
    return gradeSystems[system] || { min: 1, max: 12 };
  };

  const resetFormToDefaults = useCallback(() => {
    const range = getGradeRangeFromSystem(schoolSettings.grade_system || "1-12");
    setFromGrade(range.min);
    setToGrade(range.max);
    setExamCapacity(30);
    setShuffle(true);
  }, [schoolSettings]);

  /* -------------------- Data fetching -------------------- */
  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      await Promise.all([fetchSchoolSettings(), fetchTermsAndExamTypes()]);
    } catch (e: any) {
      console.error("Failed to load initial data:", e);
      if (e?.response?.status === 403 || e?.response?.status === 404) {
        toast.error("Unable to load seating data. Please check your permissions.");
      } else {
        toast.error("Failed to load initial data");
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  const fetchSchoolSettings = async () => {
    try {
      const schoolId = user?.schoolId;
      if (!schoolId) {
        console.warn("No schoolId available for settings fetch");
        return;
      }
      const res = await schoolSettingsAPI.getAll(schoolId);
      const settings: Record<string, any> = {};
      res.data?.forEach((s: any) => {
        settings[s.key] = s.value;
      });
      setSchoolSettings(settings);

      const range = getGradeRangeFromSystem(settings.grade_system || "1-12");
      setFromGrade(range.min);
      setToGrade(range.max);
    } catch (e: any) {
      console.warn("School settings not available:", e?.message);
      setFromGrade(1);
      setToGrade(12);
    }
  };

  const fetchTermsAndExamTypes = async () => {
    try {
      // Fetch terms for the current academic year
      let termData: AcademicTerm[] = [];
      if (currentAcademicYear?.id) {
        termData = await getTermsForYear(currentAcademicYear.id);
      } else {
        // Fallback: try to fetch terms directly
        try {
          const res = await termsAPI.getAll({});
          termData = res.data?.data || res.data || [];
        } catch {
          termData = [];
        }
      }
      setTerms(termData);

      // Generate curriculum-aware exam types
      const generatedTypes = generateCurriculumExamTypes(curriculumType, termData);
      setCurriculumExamTypes(generatedTypes);

      // Now fetch assessments and plans, mapping them to seating exam types
      await fetchExamTypesAndPlans(generatedTypes, termData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load curriculum data");
    }
  };

  const fetchExamTypesAndPlans = async (
    generatedTypes: CurriculumExamType[],
    termData: AcademicTerm[]
  ) => {
    try {
      const [examsRes, plansRes] = await Promise.all([
        assessmentsAPI.list({
          academicYearId: currentAcademicYear?.id,
          termId: currentTerm?.id,
        }),
        examSeatingAPI.getSeatingPlans(),
      ]);

      const examsRaw = examsRes.data;
      const allAssessments: Assessment[] = Array.isArray(examsRaw)
        ? examsRaw
        : examsRaw?.data
        ? examsRaw.data
        : [];
      
      const plansRaw = plansRes.data;
      const plans: Array<{ id: string; examType: string }> = Array.isArray(plansRaw)
        ? plansRaw
        : (plansRaw?.data ? plansRaw.data : []);
        
      setAllPlans(plans);

      // Group assessments by the seating exam type they map to.
      const groupedByType = allAssessments.reduce<Record<string, Exam[]>>((acc, assessment) => {
        const mappedType = mapAssessmentToSeatingType(assessment, generatedTypes, termData);
        if (!mappedType) {
          return acc;
        }
        const type = mappedType || assessment.type || "OTHER";
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          id: assessment.assessmentId || assessment.id,
          title: assessment.title,
          type: assessment.type,
          date: assessment.startDate,
          subject: { name: assessment.subject?.name || "Unknown Subject" },
          class: {
            name: assessment.class?.name || "Unknown Class",
            grade: null,
            academicYearId: currentAcademicYear?.id,
          },
        });
        return acc;
      }, {});

      // Build type list from generated types that have either exams (any date) OR an existing plan
      // Show all exam types that have any exams or plans (not just future exams)
      const types: ExamTypeInfo[] = generatedTypes
        .filter((et) => {
          const hasExams = (groupedByType[et.value] || []).length > 0;
          const hasPlan = plans.some((p) => p.examType === et.value);
          return hasExams || hasPlan;
        })
        .map((et) => ({
          type: et.value,
          label: et.label,
          exams: groupedByType[et.value] || [],
        }));

      // Also add legacy seating types that still have matching assessment data or plans.
      const legacyTypes = ["MID_TERM", "FINAL", "QUIZ"];
      for (const legacyType of legacyTypes) {
        const hasExams = (groupedByType[legacyType] || []).length > 0;
        const hasPlan = plans.some((p) => p.examType === legacyType);
        if ((hasExams || hasPlan) && !types.some((t) => t.type === legacyType)) {
          types.push({
            type: legacyType,
            label: getExamTypeLabel(legacyType, generatedTypes),
            exams: groupedByType[legacyType] || [],
          });
        }
      }

      setExamTypes(types);

      // Auto-select: prefer current term's exam type, then type with existing plan, else first available
      if (types.length > 0) {
        let defaultType = types[0].type;
        
        // Prefer current term's Final exam first, then Mid exam
        if (currentTerm?.order) {
          const currentFinalExam = types.find(t => 
            t.type.includes('_FINAL') && curriculumExamTypes.find(ct => ct.value === t.type && ct.termOrder === currentTerm.order)
          );
          const currentMidExam = types.find(t => 
            t.type.includes('_MID') && curriculumExamTypes.find(ct => ct.value === t.type && ct.termOrder === currentTerm.order)
          );
          if (currentFinalExam) {
            defaultType = currentFinalExam.type;
          } else if (currentMidExam) {
            defaultType = currentMidExam.type;
          }
        }
        
        // Check if there's an existing plan, but prefer current period's type over plan
        const typeWithPlan = types.find((t) => plans.some((p) => p.examType === t.type));
        if (!currentTerm?.order && typeWithPlan) {
          defaultType = typeWithPlan.type;
        }
        
        setSelectedExamType(defaultType);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load exams and seating plans");
    }
  };

  const fetchSeatingOverview = async (planId: string, cancelled?: boolean) => {
    setLoadingOverview(true);
    try {
      const res = await examSeatingAPI.getSeatingOverview(planId);
      if (cancelled) return;
      setSeatingOverview(res.data);
      if (res.data?.sections?.length) {
        setExpandedSections(new Set(res.data.sections.map((s: any) => s.sectionId)));
      }
    } catch (e: any) {
      if (!cancelled) {
        setSeatingOverview(null);
        toast.error(e.response?.data?.message || "Failed to load seating overview");
      }
    } finally {
      if (!cancelled) setLoadingOverview(false);
    }
  };

  /* -------------------- Actions -------------------- */
  const createAndGenerateSeating = async () => {
    if (!selectedExamType) {
      toast.warning("Please select an exam type");
      return;
    }
    if (fromGrade > toGrade) {
      toast.warning("From grade must be less than or equal to To grade");
      return;
    }

    setGenerating(true);
    try {
      const createRes = await examSeatingAPI.createSeatingPlan(
        selectedExamType,
        {
          mode: "GRADE_RANGE",
          fromGrade,
          toGrade,
          examCapacity: examCapacity || 30,
          shuffle,
        }
      );

      const plan: SeatingPlan = createRes.data;
      setSeatingPlan(plan);
      setSavedSettings({
        fromGrade: plan.fromGrade,
        toGrade: plan.toGrade,
        examCapacity: plan.examCapacity || 30,
        shuffle: plan.shuffle,
      });

      const genRes = await examSeatingAPI.generateSeating(plan.id);
      setSeatingOverview(genRes.data);

      if (genRes.data?.sections?.length) {
        setExpandedSections(
          new Set(genRes.data.sections.map((s: any) => s.sectionId))
        );
      }

      toast.success("Seating arrangement generated successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to create seating plan");
    } finally {
      setGenerating(false);
    }
  };

  const regenerateSeating = async () => {
    if (!seatingPlan) return;

    // If user changed settings, we must delete the old plan and recreate
    // because the backend has no PUT endpoint for seating plans.
    if (isDirty) {
      const confirmed = window.confirm(
        "You have changed the seating configuration. This will delete the existing plan and create a new one with the updated settings. Continue?"
      );
      if (!confirmed) return;

      setGenerating(true);
      try {
        await examSeatingAPI.deleteSeatingPlan(seatingPlan.id);

        const createRes = await examSeatingAPI.createSeatingPlan(
          selectedExamType,
          {
            mode: "GRADE_RANGE",
            fromGrade,
            toGrade,
            examCapacity: examCapacity || 30,
            shuffle,
          }
        );

        const plan: SeatingPlan = createRes.data;
        setSeatingPlan(plan);
        setSavedSettings({
          fromGrade: plan.fromGrade,
          toGrade: plan.toGrade,
          examCapacity: plan.examCapacity || 30,
          shuffle: plan.shuffle,
        });

        const genRes = await examSeatingAPI.generateSeating(plan.id);
        setSeatingOverview(genRes.data);

        if (genRes.data?.sections?.length) {
          setExpandedSections(
            new Set(genRes.data.sections.map((s: any) => s.sectionId))
          );
        }

        toast.success("Plan recreated and seating generated with new settings!");
      } catch (e: any) {
        console.error(e);
        toast.error(e.response?.data?.message || "Failed to recreate seating plan");
      } finally {
        setGenerating(false);
      }
      return;
    }

    // Settings unchanged: just delete student assignments and regenerate
    setGenerating(true);
    try {
      await examSeatingAPI.clearGeneratedStudents(seatingPlan.id);
      const res = await examSeatingAPI.generateSeating(seatingPlan.id);
      setSeatingOverview(res.data);

      if (res.data?.sections?.length) {
        setExpandedSections(
          new Set(res.data.sections.map((s: any) => s.sectionId))
        );
      }

      toast.success("Seating regenerated successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to regenerate seating");
    } finally {
      setGenerating(false);
    }
  };

  const deleteSeatingPlan = async () => {
    if (!seatingPlan) return;
    if (!window.confirm("Are you sure you want to delete this seating plan? This action cannot be undone.")) {
      return;
    }

    try {
      await examSeatingAPI.deleteSeatingPlan(seatingPlan.id);
      setSeatingPlan(null);
      setSeatingOverview(null);
      setSavedSettings(null);
      resetFormToDefaults();
      toast.success("Seating plan deleted");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete seating plan");
    }
  };

  const handlePrint = async () => {
    if (!seatingPlan) {
      toast.warning("No seating plan to print");
      return;
    }
    try {
      const response = await examSeatingAPI.downloadPdfReport(seatingPlan.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seating-plan-${seatingPlan.examType}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (e) {
      toast.error("Failed to download PDF");
    }
  };

  const handleExportExcel = async () => {
    if (!seatingPlan) {
      toast.warning("No seating plan to export");
      return;
    }
    try {
      const response = await examSeatingAPI.downloadExcelReport(seatingPlan.id);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seating-plan-${seatingPlan.examType}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel file downloaded successfully");
    } catch (e) {
      toast.error("Failed to download Excel");
    }
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  /* -------------------- Render guards -------------------- */
  if (isLoading || loadingInitial) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <div className="h-96 bg-gray-100 rounded-xl" />
          </div>
          <div className="lg:col-span-8">
            <div className="h-96 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const hasPermission = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  if (!isAuthenticated || !hasPermission) {
    return <AccessDenied />;
  }

  /* -------------------- JSX -------------------- */
  return (
    <FeatureGuard feature="EXAM_SEATING" showUpgradePrompt={false} fallback={<AccessDenied />}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#e35336]">Exam Seating Arrangement</h1>
            <p className="text-gray-500">
              Configure and generate seating for students across multiple grades
            </p>
            {currentAcademicYear && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {currentAcademicYear.name || currentAcademicYear.label}
                </Badge>
              </div>
            )}
          </div>
          {seatingOverview && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-primary border-primary bg-primary/5">
                <UserCheck className="w-3 h-3 mr-1" />
                {seatingOverview.totalStudents} Students
              </Badge>
              <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                <LayoutGrid className="w-3 h-3 mr-1" />
                {seatingOverview.totalSections} Sections
              </Badge>
              {isDirty && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-600 bg-amber-50"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ==================== CONFIGURATION PANEL ==================== */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Seating Configuration
                </CardTitle>
                <CardDescription>
                  Select curriculum period exam and configure seating
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Exam Type */}
                <div className="space-y-2">
                  <Label>
                    Exam Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedExamType}
                    onValueChange={setSelectedExamType}
                    disabled={generating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.length === 0 ? (
                        <div className="p-2 text-center text-gray-500 text-sm">
                          No exams available for {currentTerm?.name?.toLowerCase() || 'current period'}
                        </div>
                      ) : (
                        examTypes.map((et) => (
                          <SelectItem key={et.type} value={et.type}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {et.label}
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {et.exams.length} exam{et.exams.length !== 1 ? "s" : ""}
                              </Badge>
                              {allPlans.some((p) => p.examType === et.type) && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 text-xs text-blue-600 border-blue-200"
                                >
                                  Plan exists
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {selectedTypeInfo && selectedTypeInfo.exams.length > 0 && (
                    <div className="text-xs text-gray-500 pt-1 space-y-1">
                      {selectedTypeInfo.exams.slice(0, 3).map((exam) => (
                        <div key={exam.id} className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {exam.subject.name} - {new Date(exam.date).toLocaleDateString()}
                        </div>
                      ))}
                      {selectedTypeInfo.exams.length > 3 && (
                        <div className="text-gray-400">
                          + {selectedTypeInfo.exams.length - 3} more exams
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grade Range */}
                <div className="space-y-3">
                  <Label className="font-medium">Grade Range for Exam</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">From Grade</Label>
                      <Select
                        value={String(fromGrade)}
                        onValueChange={(v) => setFromGrade(Number(v))}
                        disabled={generating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((g) => (
                            <SelectItem key={g} value={String(g)} disabled={g > toGrade}>
                              Grade {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">To Grade</Label>
                      <Select
                        value={String(toGrade)}
                        onValueChange={(v) => setToGrade(Number(v))}
                        disabled={generating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((g) => (
                            <SelectItem key={g} value={String(g)} disabled={g < fromGrade}>
                              Grade {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Students in Grades {fromGrade} to {toGrade} will be seated together
                  </p>
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <Label>Students per Section / Room</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      disabled={generating}
                      onClick={() => setExamCapacity((c) => Math.max(1, c - 5))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={examCapacity}
                      disabled={generating}
                      onChange={(e) =>
                        setExamCapacity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                      }
                      className="text-center"
                      min={1}
                      max={100}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      disabled={generating}
                      onClick={() => setExamCapacity((c) => Math.min(100, c + 5))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Each exam room / section will hold up to {examCapacity} students
                  </p>
                </div>

                {/* Shuffle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-primary" />
                    <div>
                      <Label className="font-medium">Shuffle Students</Label>
                      <p className="text-xs text-gray-500">Mix students from different classes</p>
                    </div>
                  </div>
                  <Switch
                    checked={shuffle}
                    onCheckedChange={setShuffle}
                    disabled={generating}
                  />
                </div>

                {/* Dirty warning */}
                {seatingPlan && isDirty && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 text-sm text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Settings changed</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Clicking "Recreate Plan" will delete the existing plan and create a
                        new one with these settings.
                      </p>
                    </div>
                  </div>
                )}

                {/* Main action */}
                <Button
                  className="w-full"
                  onClick={seatingPlan ? regenerateSeating : createAndGenerateSeating}
                  disabled={!selectedExamType || generating}
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {seatingPlan ? "Processing..." : "Generating..."}
                    </>
                  ) : (
                    <>
                      {seatingPlan ? (
                        isDirty ? (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Recreate Plan & Generate
                          </>
                        ) : (
                          <>
                            <Shuffle className="w-4 h-4 mr-2" />
                            Regenerate Seating
                          </>
                        )
                      ) : (
                        <>
                          <LayoutGrid className="w-4 h-4 mr-2" />
                          Generate Seating
                        </>
                      )}
                    </>
                  )}
                </Button>

                {/* Secondary actions */}
                {seatingOverview && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handlePrint} disabled={generating}>
                        <Printer className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" onClick={handleExportExcel} disabled={generating}>
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={deleteSeatingPlan}
                      disabled={generating}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Card */}
            {seatingOverview && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">
                    Seating Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Exam Type:</span>
                      <span className="font-medium">
                        {getExamTypeLabel(seatingOverview.plan.examType, curriculumExamTypes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Grade Range:</span>
                      <span className="font-medium">
                        Grade {seatingOverview.plan.fromGrade} - {seatingOverview.plan.toGrade}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Students:</span>
                      <span className="font-medium">{seatingOverview.totalStudents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sections / Rooms:</span>
                      <span className="font-medium">{seatingOverview.totalSections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Capacity / Section:</span>
                      <span className="font-medium">{seatingOverview.plan.examCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Shuffle:</span>
                      <span className="font-medium">
                        {seatingOverview.plan.shuffle ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ==================== OVERVIEW PANEL ==================== */}
          <div className="lg:col-span-8">
            <Card className="h-full border shadow-sm">
              <CardHeader className="bg-white dark:bg-slate-950 border-b flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-gray-500" />
                    Seating Overview
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {selectedTypeInfo
                      ? `${selectedTypeInfo.label} Seating Arrangement`
                      : "Select an exam type"}
                  </CardDescription>
                </div>
                {seatingOverview && seatingOverview.sections.length > 0 && (
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search sections or students..."
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {loadingOverview ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p>Loading seating overview...</p>
                  </div>
                ) : !selectedExamType ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Users className="w-16 h-16 opacity-20 mb-4" />
                    <p>No exam type selected.</p>
                    <p className="text-sm mt-1">Select an exam type to generate seating.</p>
                  </div>
                ) : !seatingOverview ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <LayoutGrid className="w-16 h-16 opacity-20 mb-4" />
                    <p>No seating arrangement yet.</p>
                    <p className="text-sm mt-1">
                      Configure settings and click "Generate Seating"
                    </p>
                  </div>
                ) : filteredSections.length === 0 && sectionSearch ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search className="w-16 h-16 opacity-20 mb-4" />
                    <p>No sections match your search.</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {filteredSections.map((section) => (
                      <Collapsible
                        key={section.sectionId}
                        open={expandedSections.has(section.sectionId)}
                        onOpenChange={() => toggleSectionExpanded(section.sectionId)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-3 border rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {expandedSections.has(section.sectionId) ? (
                                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {section.sectionName}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">
                                  {section.className} • Grade {section.grade || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {section.assignedStudents} / {section.examCapacity}
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border border-t-0 rounded-b-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-slate-900/50">
                                  <TableHead className="w-12 text-center">#</TableHead>
                                  <TableHead>Student Name</TableHead>
                                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                                  <TableHead className="hidden md:table-cell">
                                    Original Section
                                  </TableHead>
                                  <TableHead className="hidden md:table-cell">Grade</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {section.students.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={5}
                                      className="text-center text-gray-400 py-8"
                                    >
                                      No students assigned
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  section.students.map((student) => (
                                    <TableRow
                                      key={student.studentId}
                                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                                    >
                                      <TableCell className="text-center text-gray-500">
                                        {student.orderIndex}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {student.studentName}
                                      </TableCell>
                                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                                        {student.studentEmail || "—"}
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell text-sm">
                                        <Badge variant="secondary" className="text-xs">
                                          {student.originalSection || "N/A"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                                        {student.originalGrade || "N/A"}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FeatureGuard>
  );
}
