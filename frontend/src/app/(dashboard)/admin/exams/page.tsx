"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentsAPI, termsAPI, classesAPI, subjectsAPI, teachersAPI } from "@/lib/api";
import { classSubjectsAPI } from "@/lib/api/admin";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Trash2,
  Lock,
  BookOpen,
  FileText,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Users,
  CalendarDays,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type AssessmentType = string;
type AssessmentStatus = "ACTIVE" | "LOCKED" | "COMPLETED" | "DRAFT";

interface Term {
  id: string;
  name: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}
interface AcademicYearOption {
  id: string;
  name: string;
  isActive?: boolean;
}
interface ClassItem {
  id: string;
  name: string;
  grade: number | null;
}
interface Section {
  id: string;
  name: string;
  classId: string;
}
interface Subject {
  id: string;
  name: string;
  code?: string;
}
interface Teacher {
  id: string;
  name: string;
}

interface SubjectEntry {
  id: string; // local uuid for key
  subjectId: string;
  classId: string;
  sectionId: string;
  teacherId: string;
  maxScore: number;
  passMark: number;
}

interface ClassSubjectAssignment {
  id: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId?: string | null;
  class?: { id: string; name: string; grade?: number | null };
  section?: { id: string; name: string };
  subject?: { id: string; name: string };
}

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  status: AssessmentStatus;
  calendarEventId?: string | null;
  startDate: string;
  endDate: string;
  academicYear: { id: string; name: string };
  term?: { id: string; name: string };
  subjects: {
    id: string;
    subject: { id: string; name: string };
    class: { id: string; name: string };
    section?: { id: string; name: string };
    teacher?: { id: string; name: string };
    maxScore: number;
    _count: { scores: number };
  }[];
}

interface AssessmentWeightRow {
  type: string;
  percentage: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode; description: string; weight: string }
> = {
  QUIZ: {
    label: "Quiz",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: <BookOpen className="w-4 h-4" />,
    description: "Short knowledge checks",
    weight: "15%",
  },
  TEST: {
    label: "Test",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    icon: <FileText className="w-4 h-4" />,
    description: "Chapter or unit tests",
    weight: "25%",
  },
  MID: {
    label: "Mid Assessment",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: <GraduationCap className="w-4 h-4" />,
    description: "Semester midpoint assessment",
    weight: "20%",
  },
  FINAL: {
    label: "Final Assessment",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "End-of-term assessment",
    weight: "30%",
  },
  ATTENDANCE: {
    label: "Attendance",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    icon: <Users className="w-4 h-4" />,
    description: "Participation score",
    weight: "10%",
  },
};

const getTypeMeta = (type: string) => {
  const key = String(type).toUpperCase();
  return (
    TYPE_META[key] ?? {
      label: key
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      color: "text-[var(--brand-color)]",
      bg: "bg-[rgba(var(--brand-color-rgb),0.08)]",
      border: "border-[rgba(var(--brand-color-rgb),0.18)]",
      icon: <ClipboardList className="w-4 h-4" />,
      description: "Custom assessment type",
      weight: "0%",
    }
  );
};

const shouldDefaultToCalendar = (type: string) =>
  ["MID", "MID_EXAM", "FINAL", "FINAL_EXAM", "TEST"].includes(
    String(type).toUpperCase(),
  );

const STATUS_META: Record<
  AssessmentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: { label: "Draft", color: "text-gray-500 dark:text-gray-400", icon: <Clock className="w-3 h-3" /> },
  ACTIVE: { label: "Active", color: "text-[var(--brand-color)]", icon: <CheckCircle2 className="w-3 h-3" /> },
  LOCKED: { label: "Locked", color: "text-[var(--brand-color)]", icon: <Lock className="w-3 h-3" /> },
  COMPLETED: { label: "Completed", color: "text-[var(--brand-color)]", icon: <CheckCircle2 className="w-3 h-3" /> },
};

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SubjectRow({
  entry,
  index,
  classes,
  sections,
  subjects,
  teachers,
  onChange,
  onRemove,
  canRemove,
}: {
  entry: SubjectEntry;
  index: number;
  classes: ClassItem[];
  sections: Section[];
  subjects: Subject[];
  teachers: Teacher[];
  onChange: (id: string, field: keyof SubjectEntry, value: string | number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const filteredSections = sections.filter((s) => s.classId === entry.classId);

  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="col-span-1 text-center">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{index + 1}</span>
      </div>

      {/* Subject */}
      <div className="col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Subject</Label>
        <Select
          value={entry.subjectId}
          onValueChange={(v) => onChange(entry.id, "subjectId", v)}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class */}
      <div className="col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Class</Label>
        <Select
          value={entry.classId}
          onValueChange={(v) => {
            onChange(entry.id, "classId", v);
            onChange(entry.id, "sectionId", "");
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Section */}
      <div className="col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Section</Label>
        <Select
          value={entry.sectionId}
          onValueChange={(v) => onChange(entry.id, "sectionId", v)}
          disabled={!entry.classId || filteredSections.length === 0}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200">
            <SelectValue placeholder={filteredSections.length === 0 ? "No sections" : "Section"} />
          </SelectTrigger>
          <SelectContent>
            {filteredSections.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Teacher */}
      <div className="col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Teacher</Label>
        <Select
          value={entry.teacherId}
          onValueChange={(v) => onChange(entry.id, "teacherId", v)}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200">
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Max Score */}
      <div className="col-span-1">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Max</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={entry.maxScore}
          onChange={(e) => onChange(entry.id, "maxScore", Number(e.target.value))}
          className="h-8 text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Pass Mark */}
      <div className="col-span-1">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Pass</Label>
        <Input
          type="number"
          min={0}
          max={entry.maxScore}
          value={entry.passMark}
          onChange={(e) => onChange(entry.id, "passMark", Number(e.target.value))}
          className="h-8 text-xs bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Remove */}
      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          disabled={!canRemove}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-[rgba(var(--brand-color-rgb),0.12)] hover:text-[var(--brand-color)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AssessmentCard({
  assessment,
  onLock,
  expanded,
  onToggle,
}: {
  assessment: Assessment;
  onLock: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const type = getTypeMeta(assessment.type);
  const status = STATUS_META[assessment.status];
  const totalScored = assessment.subjects.reduce((sum, s) => sum + s._count.scores, 0);
  const totalExpected = assessment.subjects.length;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
      <div
        className="flex items-center justify-between px-6 py-5 cursor-pointer select-none bg-white dark:bg-slate-900"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${type.bg} ${type.color}`}>{type.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-gray-900 dark:text-white">
                {assessment.title}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {new Date(assessment.startDate).toLocaleDateString()} –{" "}
                {new Date(assessment.endDate).toLocaleDateString()}
              </span>
              {assessment.term && (
                <span className="text-sm text-gray-400 dark:text-gray-500">{assessment.term.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{assessment.subjects.length} subjects</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{totalScored} scores entered</span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${status.color}`}>
            {status.icon}
            {status.label}
          </div>
          {assessment.status === "ACTIVE" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLock(assessment.id);
              }}
              className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-[var(--brand-color)]"
              title="Lock assessment"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-800 px-6 py-4 bg-gray-50 dark:bg-slate-800/50">
          {assessment.subjects.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
              No subjects assigned yet.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 px-2">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Subject</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Class</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Section</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Teacher</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 text-right">Scores</span>
              </div>
              {assessment.subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="grid grid-cols-5 gap-2 px-2 py-1.5 rounded bg-gray-50 dark:bg-slate-800"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {sub.subject.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{sub.class.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {sub.section?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {sub.teacher?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{sub._count.scores}</span>
                    {sub._count.scores > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-[var(--brand-color)]" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-[rgba(var(--brand-color-rgb),0.72)]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssessmentManagementPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // List state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [weightsSaving, setWeightsSaving] = useState(false);
  const [assessmentWeights, setAssessmentWeights] = useState<AssessmentWeightRow[]>([]);
  const [newAssessmentTypeName, setNewAssessmentTypeName] = useState("");

  // Lock confirm
  const [lockTarget, setLockTarget] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    type: "" as AssessmentType | "",
    academicYearId: "",
    termId: "",
    startDate: "",
    endDate: "",
    addToCalendar: false,
  });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [classSubjectAssignments, setClassSubjectAssignments] = useState<ClassSubjectAssignment[]>([]);

  useEffect(() => {
    if (pathname === "/admin/exams") {
      router.replace("/admin/assessments");
    }
  }, [pathname, router]);

  // Lookup data
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // ── Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/sign-in");
  }, [isAuthenticated, isLoading, router]);

  // ── Initial data load
  useEffect(() => {
    if (!isAuthenticated) return;
    loadAssessments();
    loadLookups();
    loadWeights();
  }, [isAuthenticated]);

  // ── Load terms when year changes
  useEffect(() => {
    if (formData.academicYearId) {
      termsAPI
        .getAll({ academicYearId: formData.academicYearId })
        .then((res) => {
          const data = (Array.isArray(res.data) ? res.data : res.data.data ?? []) as Term[];
          setTerms(data);
          setFormData((prev) => {
            if (!prev.academicYearId || prev.academicYearId !== formData.academicYearId) {
              return prev;
            }
            if (prev.termId && data.some((term) => term.id === prev.termId)) {
              return prev;
            }

            const now = new Date();
            const activeTerm =
              data.find((term) => term.isActive) ??
              data.find((term) => {
                if (!term.startDate || !term.endDate) return false;
                const start = new Date(term.startDate);
                const end = new Date(term.endDate);
                return start <= now && end >= now;
              }) ??
              data[0];

            return activeTerm ? { ...prev, termId: activeTerm.id } : prev;
          });
        })
        .catch(() => {});
    }
  }, [formData.academicYearId]);

  const loadAssessments = async () => {
    setListLoading(true);
    try {
      const res = await assessmentsAPI.list({});
      const data = Array.isArray(res.data) ? res.data : res.data.data ?? [];
      setAssessments(data);
    } catch {
      toast.error("Failed to load assessments");
    } finally {
      setListLoading(false);
    }
  };

  const loadWeights = async () => {
    try {
      const res = await assessmentsAPI.getWeights();
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      if (data.length > 0) {
        setAssessmentWeights(data as AssessmentWeightRow[]);
      } else {
        setAssessmentWeights(
          (["QUIZ", "TEST", "MID", "FINAL", "ATTENDANCE"] as AssessmentType[]).map((type) => ({
            type,
            percentage: Number(getTypeMeta(type).weight.replace("%", "")),
          })),
        );
      }
    } catch {
      toast.error("Failed to load assessment weights");
    }
  };

  const loadLookups = async () => {
    try {
      const [yearsRes, classesRes, sectionsRes, subjectsRes, teachersRes] = await Promise.all([
        assessmentsAPI.getAcademicYears?.() ?? Promise.resolve({ data: [] }),
        classesAPI.getAll(),
        classesAPI.getSections?.() ?? Promise.resolve({ data: [] }),
        subjectsAPI.getAll(),
        teachersAPI.getAll?.() ?? Promise.resolve({ data: [] }),
      ]);

      const normalize = (d: any) => (Array.isArray(d) ? d : d?.data ?? []);
      const normalizedYears = normalize(yearsRes.data) as AcademicYearOption[];
      setAcademicYears(normalizedYears);
      setFormData((prev) => {
        if (prev.academicYearId) return prev;
        const activeYear = normalizedYears.find((year) => year.isActive) ?? normalizedYears[0];
        return activeYear
          ? { ...prev, academicYearId: activeYear.id }
          : prev;
      });
      setClasses(normalize(classesRes.data));
      setSections(normalize(sectionsRes.data));
      setSubjects(normalize(subjectsRes.data));
      setTeachers(normalize(teachersRes.data));
    } catch {
      toast.error("Failed to load form data");
    }
  };

  // ── Subject entry handlers
  const toggleGradeSelection = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((item) => item !== grade) : [...prev, grade],
    );
  };

  const toggleAllGrades = () => {
    const allGrades = Array.from(
      new Set(
        classes
          .map((item) => item.grade)
          .filter((grade): grade is number => grade !== null && grade !== undefined)
          .map(String),
      ),
    );

    setSelectedGrades((prev) => (prev.length === allGrades.length ? [] : allGrades));
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((item) => item !== subjectId) : [...prev, subjectId],
    );
  };

  const toggleAllSubjects = () => {
    const allSubjectIds = Array.from(new Set(subjects.map((subject) => subject.id)));
    setSelectedSubjectIds((prev) => (prev.length === allSubjectIds.length ? [] : allSubjectIds));
  };

  useEffect(() => {
    if (!formData.academicYearId) {
      setClassSubjectAssignments([]);
      return;
    }

    classSubjectsAPI
      .getAll({ schoolId: user?.schoolId, academicYearId: formData.academicYearId })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setClassSubjectAssignments(data);
      })
      .catch(() => {
        setClassSubjectAssignments([]);
      });
  }, [formData.academicYearId, user?.schoolId]);

  // ── Submit
  const handleSubmit = async () => {
    if (!formData.title.trim()) return toast.error("Title is required");
    if (!formData.type) return toast.error("Assessment type is required");
    if (!formData.academicYearId) return toast.error("Academic year is required");
    if (!formData.startDate || !formData.endDate) return toast.error("Start and end dates are required");
    if (new Date(formData.endDate) < new Date(formData.startDate))
      return toast.error("End date cannot be before start date");

    if (selectedGrades.length === 0) return toast.error("Select at least one grade");
    if (selectedSubjectIds.length === 0) return toast.error("Select at least one subject");

    const selectedAssignments = classSubjectAssignments.filter((assignment) => {
      const grade = assignment.class?.grade;
      return (
        grade !== null &&
        grade !== undefined &&
        selectedGrades.includes(String(grade)) &&
        selectedSubjectIds.includes(assignment.subjectId)
      );
    });

    if (selectedAssignments.length === 0) {
      return toast.error("No class subjects found for the selected grades and subjects");
    }

    const typeMaxScore = getWeightValue(formData.type);
    if (typeMaxScore <= 0) {
      return toast.error("Assessment type max mark must be greater than 0");
    }

    setSubmitting(true);
    try {
      await assessmentsAPI.create({
        title: formData.title,
        type: formData.type,
        academicYearId: formData.academicYearId,
        termId: formData.termId || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        addToCalendar: formData.addToCalendar,
        subjects: selectedAssignments.map((assignment) => ({
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          sectionId: assignment.sectionId || undefined,
          teacherId: assignment.teacherId || undefined,
          maxScore: typeMaxScore,
          passMark: Math.min(typeMaxScore, Math.round(typeMaxScore * 0.5 * 100) / 100),
        })),
      });

      toast.success("Assessment created successfully");
      setModalOpen(false);
      resetForm();
      loadAssessments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      type: "",
      academicYearId: "",
      termId: "",
      startDate: "",
      endDate: "",
      addToCalendar: false,
    });
    setSelectedGrades([]);
    setSelectedSubjectIds([]);
  };

  const getWeightValue = (type: AssessmentType) =>
    assessmentWeights.find((row) => row.type.toUpperCase() === type.toUpperCase())?.percentage ??
    Number(getTypeMeta(type).weight.replace("%", ""));

  const updateWeightValue = (type: AssessmentType, value: string) => {
    const num = Number(value);
    const nextValue = Number.isNaN(num) ? 0 : Math.min(Math.max(num, 0), 100);

    const otherTotal = assessmentWeights.reduce(
      (sum, row) => (row.type === type ? sum : sum + row.percentage),
      0,
    );

    if (otherTotal + nextValue > 100) {
      toast.error("Total assessment weight cannot exceed 100%");
      return;
    }

    setAssessmentWeights((prev) =>
      prev.map((row) => (row.type === type ? { ...row, percentage: nextValue } : row)),
    );
  };

  const handleAddAssessmentType = () => {
    const normalizedType = newAssessmentTypeName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!normalizedType) {
      toast.error("Enter a valid assessment type name");
      return;
    }

    if (assessmentWeights.some((row) => row.type.toUpperCase() === normalizedType)) {
      toast.error("Assessment type already exists");
      return;
    }

    setAssessmentWeights((prev) => [...prev, { type: normalizedType, percentage: 0 }]);
    setNewAssessmentTypeName("");
  };

  const handleSaveWeights = async () => {
    const total = assessmentWeights.reduce((sum, row) => sum + row.percentage, 0);
    if (Math.round(total * 100) / 100 !== 100) {
      toast.error("Assessment weights must total 100");
      return;
    }

    setWeightsSaving(true);
    try {
      const res = await assessmentsAPI.updateWeights(
        assessmentWeights.map((row) => ({ type: row.type, percentage: row.percentage })),
      );
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setAssessmentWeights(data as AssessmentWeightRow[]);
      setWeightsOpen(false);
      toast.success("Assessment weights updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update assessment weights");
    } finally {
      setWeightsSaving(false);
    }
  };

  // ── Lock
  const handleLock = async () => {
    if (!lockTarget) return;
    setLocking(true);
    try {
      await assessmentsAPI.lock(lockTarget);
      toast.success("Assessment locked successfully");
      setLockTarget(null);
      loadAssessments();
    } catch {
      toast.error("Failed to lock assessment");
    } finally {
      setLocking(false);
    }
  };

  // ── Filtered list
  const filtered = assessments.filter((a) => {
    if (filterType !== "ALL" && a.type !== filterType) return false;
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    return true;
  });

  // ── Stats
  const stats = {
    total: assessments.length,
    active: assessments.filter((a) => a.status === "ACTIVE").length,
    locked: assessments.filter((a) => a.status === "LOCKED").length,
    subjects: assessments.reduce((sum, a) => sum + a.subjects.length, 0),
  };

  const brandSolidStyle = {
    backgroundColor: "var(--brand-color)",
    borderColor: "var(--brand-color)",
  } as const;

  const brandTextStyle = {
    color: "var(--brand-color)",
  } as const;

  const brandSoftStyle = {
    color: "var(--brand-color)",
    borderColor: "rgba(var(--brand-color-rgb),0.24)",
    backgroundColor: "rgba(var(--brand-color-rgb),0.12)",
  } as const;

  const configuredAssessmentTypes =
    assessmentWeights.length > 0
      ? assessmentWeights.map((row) => row.type.toUpperCase())
      : (["QUIZ", "TEST", "MID", "FINAL", "ATTENDANCE"] as string[]);

  if (isLoading || !isAuthenticated) return null;

  if (pathname === "/admin/exams") return null;

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Assessment Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            One unified workflow for quizzes, tests, mid assessments, and final assessments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setWeightsOpen(true)}
            className="self-start bg-white shadow-sm hover:opacity-90 md:self-auto dark:bg-slate-800"
            style={brandSoftStyle}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit Assessment Weight
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="self-start text-white shadow-sm hover:opacity-90 md:self-auto"
            style={brandSolidStyle}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
        </div>
      </div>



      {/* ── Type pills ── */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            filterType === "ALL"
              ? "text-white"
              : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
          }`}
          style={filterType === "ALL" ? brandSolidStyle : undefined}
        >
          All types
        </button>
        {configuredAssessmentTypes.map((t) => {
          const m = getTypeMeta(t);
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5 ${
                active
                  ? ""
                  : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
              }`}
              style={active ? brandSoftStyle : undefined}
            >
              {m.icon}
              {m.label}
              <span className="opacity-60">{getWeightValue(t)}%</span>
            </button>
          );
        })}

        <div className="ml-auto">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-32 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-xs dark:bg-slate-800 dark:border-[rgba(var(--brand-color-rgb),0.22)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All statuses</SelectItem>
              <SelectItem value="ACTIVE" className="text-xs">Active</SelectItem>
              <SelectItem value="LOCKED" className="text-xs">Locked</SelectItem>
              <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
              <SelectItem value="COMPLETED" className="text-xs">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Assessment List ── */}
      {listLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardContent className="py-14 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No assessments found</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              {assessments.length === 0
                ? "Create your first assessment to get started"
                : "Try adjusting the filters above"}
            </p>
            {assessments.length === 0 && (
              <Button
                size="sm"
                className="mt-4 text-white shadow-sm hover:opacity-90"
                onClick={() => setModalOpen(true)}
                style={brandSolidStyle}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Assessment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <AssessmentCard
              key={a.id}
              assessment={a}
              onLock={(id) => setLockTarget(id)}
              expanded={expandedId === a.id}
              onToggle={() => setExpandedId((prev) => (prev === a.id ? null : a.id))}
            />
          ))}
        </div>
      )}

      {/* ── Create Assessment Modal ── */}
      <Dialog open={weightsOpen} onOpenChange={setWeightsOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>Edit Assessment Weight</DialogTitle>
            <DialogDescription>
              Update the current assessment percentages. Total must equal 100.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {assessmentWeights.map((row) => {
              const type = row.type;
              return (
              <div key={type} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getTypeMeta(type).label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getTypeMeta(type).description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={getWeightValue(type)}
                    onChange={(e) => updateWeightValue(type, e.target.value)}
                    className="h-9 w-24 text-right"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
              );
            })}
            <div className="rounded-lg border border-dashed border-gray-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Add new assessment type
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={newAssessmentTypeName}
                  onChange={(e) => setNewAssessmentTypeName(e.target.value)}
                  placeholder="e.g. Project"
                  className="h-9"
                />
                <Button type="button" variant="outline" onClick={handleAddAssessmentType}>
                  Add
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm dark:border-slate-700">
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {assessmentWeights.reduce((sum, row) => sum + row.percentage, 0)}%
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWeightsOpen(false)} disabled={weightsSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveWeights} disabled={weightsSaving} style={brandSolidStyle}>
              {weightsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={brandTextStyle}>
              <Plus className="w-5 h-5" />
              New Assessment
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Set the assessment details, schedule, and target grades in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Step 1: Basic Info ── */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                1 · Basic information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <Label htmlFor="title" className="text-sm text-gray-700 dark:text-gray-300">
                    Assessment title <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Grade 10 — Mathematics Mid Assessment, Semester 1"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                    Assessment type <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {configuredAssessmentTypes.map((t) => {
                      const m = getTypeMeta(t);
                      const selected = formData.type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              type: t,
                              addToCalendar: shouldDefaultToCalendar(t),
                            }))
                          }
                          className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                            selected
                              ? "ring-1 ring-offset-1"
                              : "border-gray-200 bg-white hover:border-[rgba(var(--brand-color-rgb),0.28)] hover:bg-[rgba(var(--brand-color-rgb),0.04)] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:hover:bg-[rgba(var(--brand-color-rgb),0.08)]"
                          }`}
                          style={
                            selected
                              ? {
                                  color: "var(--brand-color)",
                                  borderColor: "rgba(var(--brand-color-rgb),0.28)",
                                  backgroundColor: "rgba(var(--brand-color-rgb),0.1)",
                                  boxShadow: "0 0 0 1px rgba(var(--brand-color-rgb),0.32)",
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {m.icon}
                            <span className="text-xs font-semibold">{m.label}</span>
                            <span className={`text-xs ml-auto ${selected ? "opacity-70" : "text-gray-300 dark:text-gray-600"}`}>
                              {m.weight}
                            </span>
                          </div>
                          <span className={`text-xs ${selected ? "opacity-70" : "text-gray-400 dark:text-gray-500"}`}>
                            {m.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Academic Year */}
                <div className="flex flex-col gap-4">
                  <div>
                    <Label className="text-sm text-gray-700 dark:text-gray-300">
                      Academic year <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.academicYearId}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, academicYearId: v, termId: "" }))
                      }
                    >
                      <SelectTrigger className="mt-1 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-gray-900 dark:border-[rgba(var(--brand-color-rgb),0.22)] dark:bg-slate-800 dark:text-gray-100">
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Term */}
                  <div>
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Term / Semester</Label>
                    <Select
                      value={formData.termId}
                      onValueChange={(v) => setFormData((p) => ({ ...p, termId: v }))}
                      disabled={!formData.academicYearId || terms.length === 0}
                    >
                      <SelectTrigger className="mt-1 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-gray-900 dark:border-[rgba(var(--brand-color-rgb),0.22)] dark:bg-slate-800 dark:text-gray-100">
                        <SelectValue
                          placeholder={
                            !formData.academicYearId
                              ? "Select year first"
                              : terms.length === 0
                              ? "No terms found"
                              : "Select term"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm text-gray-700 dark:text-gray-300">
                    Start date <span className="text-red-400">*</span>
                  </Label>
                  <CalendarDatePicker
                    value={formData.startDate ? new Date(formData.startDate) : undefined}
                    onChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        startDate: value ? value.toISOString().split("T")[0] : "",
                        endDate:
                          p.endDate &&
                          value &&
                          p.endDate < value.toISOString().split("T")[0]
                            ? value.toISOString().split("T")[0]
                            : p.endDate,
                      }))
                    }
                    placeholder="Select start date"
                    className="mt-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm text-gray-700 dark:text-gray-300">
                    End date <span className="text-red-400">*</span>
                  </Label>
                  <CalendarDatePicker
                    value={formData.endDate ? new Date(formData.endDate) : undefined}
                    onChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        endDate: value ? value.toISOString().split("T")[0] : "",
                      }))
                    }
                    placeholder="Select end date"
                    className="mt-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Add to calendar
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Mid, final, and test assessments should appear on the school calendar by default.
                    </p>
                  </div>
                  <Switch
                    checked={formData.addToCalendar}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({ ...p, addToCalendar: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* ── Step 2: Grades ── */}
            <div>
              <div className="mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  2 · Grade ranges
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  A quiz or test created here will be applied to all assigned subjects in the selected grades.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleAllGrades}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedGrades.length > 0 &&
                    selectedGrades.length ===
                      Array.from(
                        new Set(
                          classes
                            .map((item) => item.grade)
                            .filter((grade): grade is number => grade !== null && grade !== undefined),
                        ),
                      ).length
                      ? "text-white"
                      : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-slate-800 dark:text-gray-300"
                  }`}
                  style={
                    selectedGrades.length > 0 &&
                    selectedGrades.length ===
                      Array.from(
                        new Set(
                          classes
                            .map((item) => item.grade)
                            .filter((grade): grade is number => grade !== null && grade !== undefined),
                        ),
                      ).length
                      ? brandSolidStyle
                      : undefined
                  }
                >
                  All Grades
                </button>
                {Array.from(
                  new Set(
                    classes
                      .map((item) => item.grade)
                      .filter((grade): grade is number => grade !== null && grade !== undefined),
                  ),
                )
                  .sort((a, b) => a - b)
                  .map((grade) => {
                    const value = String(grade);
                    const selected = selectedGrades.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleGradeSelection(value)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          selected
                            ? "text-white"
                            : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-slate-800 dark:text-gray-300"
                        }`}
                        style={selected ? brandSolidStyle : undefined}
                      >
                        Grade {grade}
                      </button>
                    );
                  })}
              </div>

              <div className="mt-5">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Subjects
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleAllSubjects}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      selectedSubjectIds.length > 0 && selectedSubjectIds.length === subjects.length
                        ? "text-white"
                        : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-slate-800 dark:text-gray-300"
                    }`}
                    style={
                      selectedSubjectIds.length > 0 && selectedSubjectIds.length === subjects.length
                        ? brandSolidStyle
                        : undefined
                    }
                  >
                    All Subjects
                  </button>
                  {subjects.map((subject) => {
                    const selected = selectedSubjectIds.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubjectSelection(subject.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          selected
                            ? "text-white"
                            : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-slate-800 dark:text-gray-300"
                        }`}
                        style={selected ? brandSolidStyle : undefined}
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedGrades.length === 0 || selectedSubjectIds.length === 0
                    ? "Select grades and subjects to preview the scope."
                    : `${classSubjectAssignments.filter((assignment) => {
                        const grade = assignment.class?.grade;
                        return (
                          grade !== null &&
                          grade !== undefined &&
                          selectedGrades.includes(String(grade)) &&
                          selectedSubjectIds.includes(assignment.subjectId)
                        );
                      }).length} class-subject assignments will be included.`}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => { setModalOpen(false); resetForm(); }}
              disabled={submitting}
              className="bg-white hover:opacity-90 dark:bg-slate-800"
              style={{
                color: "var(--brand-color)",
                borderColor: "rgba(var(--brand-color-rgb),0.24)",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="min-w-[120px] text-white shadow-sm hover:opacity-90"
              style={brandSolidStyle}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create Assessment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lock Confirm Dialog ── */}
      <AlertDialog open={!!lockTarget} onOpenChange={(o) => { if (!o) setLockTarget(null); }}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Lock className="w-4 h-4" style={brandTextStyle} />
              Lock assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              Locking will prevent teachers from entering or editing scores. Only registrars
              and admins can override a locked assessment. This action cannot be undone without
              manual intervention.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={locking}
              className="bg-white hover:opacity-90 dark:bg-slate-800"
              style={{
                color: "var(--brand-color)",
                borderColor: "rgba(var(--brand-color-rgb),0.24)",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLock}
              disabled={locking}
              className="text-white shadow-sm hover:opacity-90"
              style={brandSolidStyle}
            >
              {locking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Lock assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
