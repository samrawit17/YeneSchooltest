"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { assessmentsAPI, schoolSettingsAPI, termsAPI } from "@/lib/api";
import { examSeatingAPI } from "@/lib/api/operations";
import { getGradeNumbersFromSystem, getGradeRangeFromSystem } from "@/lib/grade-system";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface ExamSeatingAccessIssue {
  title: string;
  message: string;
  detail?: string;
  statusCode?: number;
  currentRole?: string;
  blockedRequest?: string;
  currentPlan?: string;
  requiredRoles?: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Base exam categories from the Ethiopian MoE curriculum
const EXAM_CATEGORIES = [
  { code: "MID", label: "Mid Exam", weight: 20 },
  { code: "FINAL", label: "Final Exam", weight: 30 },
  { code: "QUIZ", label: "Quiz/Test", weight: 15 },
  { code: "PRACTICAL", label: "Practical Exam", weight: 25 },
  { code: "ASSIGNMENT", label: "Assignment", weight: 10 },
];

const EXAM_SEATING_FEATURE = "EXAM_SEATING";
const PAGE_REQUEST_OPTIONS = { skipAuthErrorRedirect: true };
const SCHOOL_EXAM_SEATING_ROLE_LABELS = ["Admin", "IT Manager", "Registrar"];
const SCHOOL_EXAM_SEATING_ROLES = new Set(["ADMIN", "IT_MANAGER", "REGISTRAR"]);

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

function isBigSeatingExamType(value: string) {
  return (
    value === "MID_TERM" ||
    value === "FINAL" ||
    value.endsWith("_MID") ||
    value.endsWith("_FINAL")
  );
}

function isFinalSeatingExamType(value: string) {
  return value === "FINAL" || value.endsWith("_FINAL");
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

function normalizeSettingsResponse(data: any): Record<string, any> {
  const rawSettings = data?.data ?? data;
  const settings: Record<string, any> = {};

  if (Array.isArray(rawSettings)) {
    rawSettings.forEach((setting) => {
      if (setting?.key) {
        settings[setting.key] = setting.value;
      }
    });
    return settings;
  }

  if (rawSettings && typeof rawSettings === "object") {
    if (rawSettings.key) {
      settings[rawSettings.key] = rawSettings.value;
      return settings;
    }

    Object.entries(rawSettings).forEach(([key, value]) => {
      settings[key] =
        value && typeof value === "object" && "value" in value
          ? (value as { value: any }).value
          : value;
    });
  }

  return settings;
}

function formatRoleName(role?: string) {
  if (!role) return "Unknown";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getErrorMessage(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message;
}

function getBlockedRequest(error: any) {
  return error?.config?.url || error?.response?.config?.url || "";
}

function ExamSeatingDeniedState({ issue }: { issue: ExamSeatingAccessIssue }) {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] w-full p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-red-100 bg-white">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-950">{issue.title}</CardTitle>
          <CardDescription className="text-base">{issue.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {issue.detail && (
            <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {issue.detail}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {issue.currentRole && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium uppercase text-amber-700">Current role</p>
                <p className="text-sm font-semibold text-amber-900">
                  {formatRoleName(issue.currentRole)}
                </p>
              </div>
            )}

            {issue.requiredRoles?.length ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium uppercase text-blue-700">Allowed roles</p>
                <p className="text-sm font-semibold text-blue-900">
                  {issue.requiredRoles.join(", ")}
                </p>
              </div>
            ) : null}

            {issue.currentPlan && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase text-gray-500">Current plan</p>
                <p className="text-sm font-semibold text-gray-900">{issue.currentPlan}</p>
              </div>
            )}

            {issue.statusCode && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase text-gray-500">Status</p>
                <p className="text-sm font-semibold text-gray-900">{issue.statusCode}</p>
              </div>
            )}
          </div>

          {issue.blockedRequest && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="mb-1 text-xs font-medium uppercase text-gray-500">Blocked request</p>
              <p className="break-all font-mono text-xs text-gray-700">
                {issue.blockedRequest}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => router.push("/admin")}>Go to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
  const {
    hasFeature,
    loading: subscriptionLoading,
    plan: subscriptionPlan,
  } = useSubscription();
  const router = useRouter();
  const { t } = useTranslations<any>("examSeating");

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
  const [examCapacityInput, setExamCapacityInput] = useState<string>("30");
  const [shuffle, setShuffle] = useState<boolean>(true);
  const [useScoreThresholdFilter, setUseScoreThresholdFilter] = useState<boolean>(false);
  const [savedSettings, setSavedSettings] = useState<{
    fromGrade: number;
    toGrade: number;
    examCapacity: number;
    shuffle: boolean;
    useScoreThresholdFilter: boolean;
  } | null>(null);

  /* -------------------- UI state -------------------- */
  const [generating, setGenerating] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionSearch, setSectionSearch] = useState("");
  const [accessIssue, setAccessIssue] = useState<ExamSeatingAccessIssue | null>(null);

  /* -------------------- Derived state -------------------- */
  const normalizedRole = user?.role?.toUpperCase() || "";
  const canManageExamSeating = SCHOOL_EXAM_SEATING_ROLES.has(normalizedRole);
  const hasSchoolContext = Boolean(user?.schoolId);
  const canAccessExamSeating = canManageExamSeating && hasSchoolContext;
  const hasExamSeatingFeature = hasFeature(EXAM_SEATING_FEATURE);
  const canLoadExamSeating =
    canAccessExamSeating && !subscriptionLoading && hasExamSeatingFeature;

  const isDirty = useMemo(() => {
    if (!savedSettings || !seatingPlan) return false;
    return (
      fromGrade !== savedSettings.fromGrade ||
      toGrade !== savedSettings.toGrade ||
      examCapacity !== savedSettings.examCapacity ||
      shuffle !== savedSettings.shuffle ||
      useScoreThresholdFilter !== savedSettings.useScoreThresholdFilter
    );
  }, [
    fromGrade,
    toGrade,
    examCapacity,
    shuffle,
    useScoreThresholdFilter,
    savedSettings,
    seatingPlan,
  ]);

  const isFinalExamType = useMemo(
    () => isFinalSeatingExamType(selectedExamType),
    [selectedExamType]
  );

  const canUseResultFilter = isFinalExamType;

  const resultFilterTitle = isFinalExamType
    ? t.config.scoreFilter.midTitle
    : t.config.scoreFilter.finalTitle;

  const resultFilterDescription = isFinalExamType
    ? t.config.scoreFilter.midDescription
    : t.config.scoreFilter.finalDescription;

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
      canLoadExamSeating &&
      currentAcademicYear?.id
    ) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canLoadExamSeating, currentAcademicYear?.id, currentTerm?.id, curriculumType]);

  useEffect(() => {
    if (!selectedExamType) return;

    let cancelled = false;

    const loadPlan = async () => {
      setLoadingOverview(true);
      setSeatingOverview(null);
      try {
        const res = await examSeatingAPI.getSeatingPlanByType(
          selectedExamType,
          PAGE_REQUEST_OPTIONS
        );
        if (cancelled) return;

        if (res.data) {
          const plan: SeatingPlan = res.data;
          setSeatingPlan(plan);
          setFromGrade(plan.fromGrade);
          setToGrade(plan.toGrade);
          setExamCapacityValue(plan.examCapacity || 30);
          setShuffle(plan.shuffle);
          setUseScoreThresholdFilter(Boolean(plan.useScoreThresholdFilter));
          setSavedSettings({
            fromGrade: plan.fromGrade,
            toGrade: plan.toGrade,
            examCapacity: plan.examCapacity || 30,
            shuffle: plan.shuffle,
            useScoreThresholdFilter: Boolean(plan.useScoreThresholdFilter),
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
  const availableGradeOptions = useMemo(
    () => getGradeNumbersFromSystem(schoolSettings.grade_system || "1-12"),
    [schoolSettings.grade_system],
  );

  const resetFormToDefaults = useCallback(() => {
    const range = getGradeRangeFromSystem(schoolSettings.grade_system || "1-12");
    setFromGrade(range.min);
    setToGrade(range.max);
    setExamCapacity(30);
    setExamCapacityInput("30");
    setShuffle(true);
    setUseScoreThresholdFilter(false);
  }, [schoolSettings]);

  const setExamCapacityValue = useCallback((value: number) => {
    const next = Math.max(1, Math.min(100, Math.round(value)));
    setExamCapacity(next);
    setExamCapacityInput(String(next));
  }, []);

  const handleExamCapacityInputChange = (value: string) => {
    if (!/^\d*$/.test(value)) return;

    setExamCapacityInput(value);
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      setExamCapacity(parsed);
    }
  };

  const normalizeExamCapacityInput = () => {
    if (!examCapacityInput.trim()) {
      setExamCapacityInput(String(examCapacity));
      return;
    }

    const parsed = Number.parseInt(examCapacityInput, 10);
    if (!Number.isFinite(parsed)) {
      setExamCapacityInput(String(examCapacity));
      return;
    }

    setExamCapacityValue(parsed);
  };

  const hasValidExamCapacity = () => examCapacity >= 1 && examCapacity <= 100;

  const handleCriticalPermissionError = (error: any, title: string) => {
    const statusCode = error?.response?.status;
    if (statusCode !== 401 && statusCode !== 403) {
      return false;
    }

    setAccessIssue({
      title,
      message:
        getErrorMessage(error) ||
        "The server denied access to exam seating data for this account.",
      detail:
        "The page stayed open and captured the denied request instead of redirecting to the generic Access Denied screen.",
      statusCode,
      currentRole: normalizedRole,
      requiredRoles: SCHOOL_EXAM_SEATING_ROLE_LABELS,
      blockedRequest: getBlockedRequest(error),
    });
    return true;
  };

  /* -------------------- Data fetching -------------------- */
  const loadInitialData = async () => {
    setLoadingInitial(true);
    setAccessIssue(null);
    try {
      await Promise.all([fetchSchoolSettings(), fetchTermsAndExamTypes()]);
    } catch (e: any) {
      console.error("Failed to load initial data:", e);
      if (handleCriticalPermissionError(e, "Exam seating data access denied")) {
        return;
      }
      if (e?.response?.status === 403 || e?.response?.status === 404) {
        toast.error(t.toast.loadPermissionFailed);
      } else {
        toast.error(t.toast.loadFailed);
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
      const res = await schoolSettingsAPI.getAll(schoolId, PAGE_REQUEST_OPTIONS);
      const settings = normalizeSettingsResponse(res.data);
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
          const res = await termsAPI.getAll({}, PAGE_REQUEST_OPTIONS);
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
      if (handleCriticalPermissionError(e, "Curriculum data access denied")) {
        return;
      }
      toast.error(t.toast.loadCurriculumFailed);
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
        }, PAGE_REQUEST_OPTIONS),
        examSeatingAPI.getSeatingPlans(PAGE_REQUEST_OPTIONS),
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
          if (!isBigSeatingExamType(et.value)) {
            return false;
          }
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
      const legacyTypes = ["MID_TERM", "FINAL"];
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
            t.type.includes('_FINAL') && generatedTypes.find(ct => ct.value === t.type && ct.termOrder === currentTerm.order)
          );
          const currentMidExam = types.find(t => 
            t.type.includes('_MID') && generatedTypes.find(ct => ct.value === t.type && ct.termOrder === currentTerm.order)
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
      if (handleCriticalPermissionError(e, "Exam seating data access denied")) {
        return;
      }
      toast.error(t.toast.loadPlansFailed);
    }
  };

  const fetchSeatingOverview = async (planId: string, cancelled?: boolean) => {
    setLoadingOverview(true);
    try {
      const res = await examSeatingAPI.getSeatingOverview(planId, PAGE_REQUEST_OPTIONS);
      if (cancelled) return;
      setSeatingOverview(res.data);
      if (res.data?.sections?.length) {
        setExpandedSections(new Set(res.data.sections.map((s: any) => s.sectionId)));
      }
    } catch (e: any) {
      if (!cancelled) {
        if (handleCriticalPermissionError(e, "Seating overview access denied")) {
          return;
        }
        setSeatingOverview(null);
        toast.error(e.response?.data?.message || t.toast.loadOverviewFailed);
      }
    } finally {
      if (!cancelled) setLoadingOverview(false);
    }
  };

  /* -------------------- Actions -------------------- */
  const createAndGenerateSeating = async () => {
    if (!selectedExamType) {
      toast.warning(t.toast.selectExamType);
      return;
    }
    if (fromGrade > toGrade) {
      toast.warning(t.toast.invalidGradeRange);
      return;
    }
    if (!hasValidExamCapacity()) {
      toast.warning(t.toast.invalidCapacity);
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
          useScoreThresholdFilter: canUseResultFilter ? useScoreThresholdFilter : false,
        },
        PAGE_REQUEST_OPTIONS
      );

      const plan: SeatingPlan = createRes.data;
      setSeatingPlan(plan);
      setSavedSettings({
        fromGrade: plan.fromGrade,
        toGrade: plan.toGrade,
        examCapacity: plan.examCapacity || 30,
        shuffle: plan.shuffle,
        useScoreThresholdFilter: Boolean(plan.useScoreThresholdFilter),
      });

      const genRes = await examSeatingAPI.generateSeating(plan.id, PAGE_REQUEST_OPTIONS);
      setSeatingOverview(genRes.data);

      if (genRes.data?.sections?.length) {
        setExpandedSections(
          new Set(genRes.data.sections.map((s: any) => s.sectionId))
        );
      }

      toast.success(t.toast.seatingGenerated);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || t.toast.createFailed);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateSeating = async () => {
    if (!seatingPlan) return;

    if (isDirty) {
      if (!hasValidExamCapacity()) {
        toast.warning(t.toast.invalidCapacity);
        return;
      }

      toast.warning(t.toast.recreateTitle, {
        description: t.toast.recreateDescription,
        duration: 10000,
        action: {
          label: t.toast.continue,
          onClick: async () => {
            setGenerating(true);
            try {
              await examSeatingAPI.deleteSeatingPlan(seatingPlan.id, PAGE_REQUEST_OPTIONS);

              const createRes = await examSeatingAPI.createSeatingPlan(
                selectedExamType,
                {
                  mode: "GRADE_RANGE",
                  fromGrade,
                  toGrade,
                  examCapacity: examCapacity || 30,
                  shuffle,
                  useScoreThresholdFilter: canUseResultFilter ? useScoreThresholdFilter : false,
                },
                PAGE_REQUEST_OPTIONS
              );

              const plan: SeatingPlan = createRes.data;
              setSeatingPlan(plan);
              setSavedSettings({
                fromGrade: plan.fromGrade,
                toGrade: plan.toGrade,
                examCapacity: plan.examCapacity || 30,
                shuffle: plan.shuffle,
                useScoreThresholdFilter: Boolean(plan.useScoreThresholdFilter),
              });

              const genRes = await examSeatingAPI.generateSeating(plan.id, PAGE_REQUEST_OPTIONS);
              setSeatingOverview(genRes.data);

              if (genRes.data?.sections?.length) {
                setExpandedSections(
                  new Set(genRes.data.sections.map((s: any) => s.sectionId))
                );
              }

              toast.success(t.toast.planRecreated);
            } catch (e: any) {
              console.error(e);
              toast.error(e.response?.data?.message || t.toast.recreateFailed);
            } finally {
              setGenerating(false);
            }
          },
        },
        cancel: {
          label: t.toast.cancel,
          onClick: () => undefined,
        },
      });
      return;
    }

    setGenerating(true);
    try {
      await examSeatingAPI.clearGeneratedStudents(seatingPlan.id, PAGE_REQUEST_OPTIONS);
      const res = await examSeatingAPI.generateSeating(seatingPlan.id, PAGE_REQUEST_OPTIONS);
      setSeatingOverview(res.data);

      if (res.data?.sections?.length) {
        setExpandedSections(
          new Set(res.data.sections.map((s: any) => s.sectionId))
        );
      }

      toast.success(t.toast.seatingRegenerated);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || t.toast.regenerateFailed);
    } finally {
      setGenerating(false);
    }
  };

  const deleteSeatingPlan = async () => {
    if (!seatingPlan) return;
    if (!window.confirm(t.toast.deleteConfirm)) {
      return;
    }

    try {
      await examSeatingAPI.deleteSeatingPlan(seatingPlan.id, PAGE_REQUEST_OPTIONS);
      setSeatingPlan(null);
      setSeatingOverview(null);
      setSavedSettings(null);
      resetFormToDefaults();
      toast.success(t.toast.planDeleted);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t.toast.deleteFailed);
    }
  };

  const handlePrint = async () => {
    if (!seatingPlan) {
      toast.warning(t.toast.noPlanPrint);
      return;
    }
    try {
      const response = await examSeatingAPI.downloadPdfReport(
        seatingPlan.id,
        PAGE_REQUEST_OPTIONS
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seating-plan-${seatingPlan.examType}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t.toast.pdfDownloaded);
    } catch (e) {
      toast.error(t.toast.pdfFailed);
    }
  };

  const handleExportExcel = async () => {
    if (!seatingPlan) {
      toast.warning(t.toast.noPlanExport);
      return;
    }
    try {
      const response = await examSeatingAPI.downloadExcelReport(
        seatingPlan.id,
        PAGE_REQUEST_OPTIONS
      );
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
      toast.success(t.toast.excelDownloaded);
    } catch (e) {
      toast.error(t.toast.excelFailed);
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
  if (isLoading || loadingInitial || (canAccessExamSeating && subscriptionLoading)) {
    return (
      <div className="p-6 w-full space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-8">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 w-full space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!canManageExamSeating) {
    return (
      <ExamSeatingDeniedState
        issue={{
          title: "Exam seating access denied",
          message: "Your role is not allowed to open the exam seating page.",
          detail:
            "Exam seating is a school administration workflow. Super Admin, Teacher, Finance, Parent, and Student accounts are blocked from this page.",
          currentRole: normalizedRole,
          requiredRoles: SCHOOL_EXAM_SEATING_ROLE_LABELS,
        }}
      />
    );
  }

  if (!hasSchoolContext) {
    return (
      <ExamSeatingDeniedState
        issue={{
          title: "School context required",
          message: "This page needs a school-scoped account.",
          detail:
            "Exam seating is generated from one school's classes, sections, assessments, and students. Accounts without a school cannot access it.",
          currentRole: normalizedRole,
          requiredRoles: SCHOOL_EXAM_SEATING_ROLE_LABELS,
        }}
      />
    );
  }

  if (!hasExamSeatingFeature) {
    return (
      <ExamSeatingDeniedState
        issue={{
          title: "Exam seating is not enabled",
          message: "This school's current subscription does not include exam seating.",
          detail:
            "Enable the EXAM_SEATING feature for this school before opening the seating planner.",
          currentRole: normalizedRole,
          currentPlan: subscriptionPlan?.name || "No active plan",
        }}
      />
    );
  }

  if (accessIssue) {
    return <ExamSeatingDeniedState issue={accessIssue} />;
  }

  /* -------------------- JSX -------------------- */
  return (
    <div className="p-6 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">{t.page.title}</h1>
            <p className="text-gray-500">
              {t.page.subtitle}
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ==================== CONFIGURATION PANEL ==================== */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="bg-gray-50 dark:bg-[#111111]/50 pb-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  {t.config.title}
                </CardTitle>
                <CardDescription>
                  {t.config.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Exam Type */}
                <div className="space-y-2">
                  <Label>
                    {t.config.examType.label} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedExamType}
                    onValueChange={setSelectedExamType}
                    disabled={generating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.config.examType.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.length === 0 ? (
                        <div className="p-2 text-center text-gray-500 text-sm">
                          {t.config.examType.noExams.replace("{period}", currentTerm?.name?.toLowerCase() || 'current period')}
                        </div>
                      ) : (
                        examTypes.map((et) => (
                          <SelectItem key={et.type} value={et.type}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {et.label}
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {et.exams.length} {et.exams.length === 1 ? t.exams : t.exams_plural}
                              </Badge>
                              {allPlans.some((p) => p.examType === et.type) && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 text-xs text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-700"
                                >
                                  {t.config.examType.planExists}
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
                          {t.examsMore.replace("{count}", String(selectedTypeInfo.exams.length - 3))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grade Range */}
                <div className="space-y-3">
                  <Label className="font-medium">{t.config.gradeRange.label}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{t.config.gradeRange.from}</Label>
                      <Select
                        value={String(fromGrade)}
                        onValueChange={(v) => setFromGrade(Number(v))}
                        disabled={generating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGradeOptions.map((g) => (
                            <SelectItem key={g} value={String(g)} disabled={g > toGrade}>
                              {t.section.grade.replace("{grade}", String(g))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{t.config.gradeRange.to}</Label>
                      <Select
                        value={String(toGrade)}
                        onValueChange={(v) => setToGrade(Number(v))}
                        disabled={generating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGradeOptions.map((g) => (
                            <SelectItem key={g} value={String(g)} disabled={g < fromGrade}>
                              {t.section.grade.replace("{grade}", String(g))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t.config.gradeRange.hint.replace("{from}", String(fromGrade)).replace("{to}", String(toGrade))}
                  </p>
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <Label>{t.config.capacity.label}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      disabled={generating}
                      onClick={() => setExamCapacityValue(examCapacity - 5)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={examCapacityInput}
                      disabled={generating}
                      onChange={(e) => handleExamCapacityInputChange(e.target.value)}
                      onBlur={normalizeExamCapacityInput}
                      className="text-center"
                      min={1}
                      max={100}
                      inputMode="numeric"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      disabled={generating}
                      onClick={() => setExamCapacityValue(examCapacity + 5)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t.config.capacity.hint.replace("{capacity}", String(examCapacity))}
                  </p>
                </div>

                {/* Shuffle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111111] rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-primary" />
                    <div>
                      <Label className="font-medium">{t.config.shuffle.label}</Label>
                      <p className="text-xs text-gray-500">{t.config.shuffle.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={shuffle}
                    onCheckedChange={setShuffle}
                    disabled={generating}
                  />
                </div>

                {canUseResultFilter && (
                  <div className="space-y-3 rounded-lg border bg-gray-50 p-3 dark:bg-[#111111]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="font-medium">{resultFilterTitle}</Label>
                        <p className="text-xs text-gray-500">
                          {resultFilterDescription}
                        </p>
                      </div>
                      <Switch
                        checked={useScoreThresholdFilter}
                        onCheckedChange={setUseScoreThresholdFilter}
                        disabled={generating}
                      />
                    </div>
                  </div>
                )}

                {/* Dirty warning */}
                {seatingPlan && isDirty && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 text-sm text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{t.config.dirtyWarning.title}</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {t.config.dirtyWarning.description}
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
                      {seatingPlan ? t.config.buttons.processing : t.config.buttons.generating}
                    </>
                  ) : (
                    <>
                      {seatingPlan ? (
                        isDirty ? (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t.config.buttons.recreate}
                          </>
                        ) : (
                          <>
                            <Shuffle className="w-4 h-4 mr-2" />
                            {t.config.buttons.regenerate}
                          </>
                        )
                      ) : (
                        <>
                          <LayoutGrid className="w-4 h-4 mr-2" />
                          {t.config.buttons.generate}
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
                        {t.config.buttons.pdf}
                      </Button>
                      <Button variant="outline" onClick={handleExportExcel} disabled={generating}>
                        <Download className="w-4 h-4 mr-2" />
                        {t.config.buttons.excel}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={deleteSeatingPlan}
                      disabled={generating}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t.config.buttons.delete}
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
                    {t.summary.title}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.summary.examType}</span>
                      <span className="font-medium">
                        {getExamTypeLabel(seatingOverview.plan.examType, curriculumExamTypes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.summary.gradeRange}</span>
                      <span className="font-medium">
                        Grade {seatingOverview.plan.fromGrade} - {seatingOverview.plan.toGrade}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.summary.totalStudents}</span>
                      <span className="font-medium">{seatingOverview.totalStudents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.summary.sections}</span>
                      <span className="font-medium">{seatingOverview.totalSections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.summary.capacity}</span>
                      <span className="font-medium">{seatingOverview.plan.examCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.summary.shuffle}</span>
                      <span className="font-medium">
                        {seatingOverview.plan.shuffle ? t.summary.yes : t.summary.no}
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
              <CardHeader className="bg-white dark:bg-[#111111] border-b flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-gray-500" />
                    {t.overview.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {selectedTypeInfo
                      ? t.overview.description.replace("{examType}", selectedTypeInfo.label)
                      : t.config.examType.placeholder}
                  </CardDescription>
                </div>
                {seatingOverview && seatingOverview.sections.length > 0 && (
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t.overview.searchPlaceholder}
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
                    <div className="w-8 h-8 border-4 border-[var(--brand-color,#e35336)] border-t-transparent rounded-full animate-spin mb-4" />
                    <p>{t.overview.loading}</p>
                  </div>
                ) : !selectedExamType ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Users className="w-16 h-16 opacity-20 mb-4" />
                    <p>{t.overview.noSelection}</p>
                    <p className="text-sm mt-1">{t.overview.noSelectionHint}</p>
                  </div>
                ) : !seatingOverview ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <LayoutGrid className="w-16 h-16 opacity-20 mb-4" />
                    <p>{t.overview.noPlan}</p>
                    <p className="text-sm mt-1">
                      {t.overview.noPlanHint}
                    </p>
                  </div>
                ) : filteredSections.length === 0 && sectionSearch ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search className="w-16 h-16 opacity-20 mb-4" />
                    <p>{t.overview.noSearchResults}</p>
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
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-[#111111] px-4 py-3 border rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {expandedSections.has(section.sectionId) ? (
                                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 truncate">
                                  {section.sectionName}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">
                                  {section.className} • {t.section.grade.replace("{grade}", String(section.grade || t.section.gradeNa))}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {t.section.capacity.replace("{assigned}", String(section.assignedStudents)).replace("{capacity}", String(section.examCapacity))}
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border border-t-0 rounded-b-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-[#111111]/50">
                                  <TableHead className="w-12 text-center">{t.table.order}</TableHead>
                                  <TableHead>{t.table.studentName}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t.table.email}</TableHead>
                                  <TableHead className="hidden md:table-cell">
                                    {t.table.originalSection}
                                  </TableHead>
                                  <TableHead className="hidden md:table-cell">{t.table.grade}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {section.students.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={5}
                                      className="text-center text-gray-400 py-8"
                                    >
                                      {t.table.noStudents}
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  section.students.map((student) => (
                                    <TableRow
                                      key={student.studentId}
                                      className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50"
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
                                          {student.originalSection || t.na}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                                        {student.originalGrade || t.na}
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
  );
}
