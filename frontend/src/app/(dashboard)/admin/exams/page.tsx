"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentsAPI, termsAPI, classesAPI, subjectsAPI, teachersAPI } from "@/lib/api";
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

type AssessmentType = "QUIZ" | "TEST" | "MID" | "FINAL" | "ATTENDANCE";
type AssessmentStatus = "ACTIVE" | "LOCKED" | "COMPLETED" | "DRAFT";

interface Term {
  id: string;
  name: string;
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

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  status: AssessmentStatus;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  AssessmentType,
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
    label: "Mid Exam",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: <GraduationCap className="w-4 h-4" />,
    description: "Semester midpoint exam",
    weight: "20%",
  },
  FINAL: {
    label: "Final Exam",
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
  const type = TYPE_META[assessment.type];
  const status = STATUS_META[assessment.status];
  const totalScored = assessment.subjects.reduce((sum, s) => sum + s._count.scores, 0);
  const totalExpected = assessment.subjects.length;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-white dark:bg-slate-900"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${type.bg} ${type.color}`}>{type.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {assessment.title}
              </span>
              <Badge
                variant="outline"
                className={`text-xs px-1.5 py-0 ${type.bg} ${type.color} ${type.border}`}
              >
                {type.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {new Date(assessment.startDate).toLocaleDateString()} –{" "}
                {new Date(assessment.endDate).toLocaleDateString()}
              </span>
              {assessment.term && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{assessment.term.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{assessment.subjects.length} subjects</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{totalScored} scores entered</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
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
        <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-3 bg-gray-50 dark:bg-slate-800/50">
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

  // List state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
  });
  const [subjectEntries, setSubjectEntries] = useState<SubjectEntry[]>([
    { id: uid(), subjectId: "", classId: "", sectionId: "", teacherId: "", maxScore: 100, passMark: 50 },
  ]);

  // Lookup data
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
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
  }, [isAuthenticated]);

  // ── Load terms when year changes
  useEffect(() => {
    if (formData.academicYearId) {
      termsAPI
        .getAll({ academicYearId: formData.academicYearId })
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : res.data.data ?? [];
          setTerms(data);
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
      setAcademicYears(normalize(yearsRes.data));
      setClasses(normalize(classesRes.data));
      setSections(normalize(sectionsRes.data));
      setSubjects(normalize(subjectsRes.data));
      setTeachers(normalize(teachersRes.data));
    } catch {
      toast.error("Failed to load form data");
    }
  };

  // ── Subject entry handlers
  const updateSubjectEntry = (id: string, field: keyof SubjectEntry, value: string | number) => {
    setSubjectEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const addSubjectEntry = () => {
    setSubjectEntries((prev) => [
      ...prev,
      { id: uid(), subjectId: "", classId: "", sectionId: "", teacherId: "", maxScore: 100, passMark: 50 },
    ]);
  };

  const removeSubjectEntry = (id: string) => {
    setSubjectEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Submit
  const handleSubmit = async () => {
    if (!formData.title.trim()) return toast.error("Title is required");
    if (!formData.type) return toast.error("Assessment type is required");
    if (!formData.academicYearId) return toast.error("Academic year is required");
    if (!formData.startDate || !formData.endDate) return toast.error("Start and end dates are required");
    if (new Date(formData.endDate) < new Date(formData.startDate))
      return toast.error("End date cannot be before start date");

    const validSubjects = subjectEntries.filter(
      (e) => e.subjectId && e.classId && e.maxScore > 0
    );

    setSubmitting(true);
    try {
      await assessmentsAPI.create({
        title: formData.title,
        type: formData.type,
        academicYearId: formData.academicYearId,
        termId: formData.termId || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        subjects: validSubjects.map((e) => ({
          subjectId: e.subjectId,
          classId: e.classId,
          sectionId: e.sectionId || undefined,
          teacherId: e.teacherId || undefined,
          maxScore: e.maxScore,
          passMark: e.passMark || undefined,
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
    setFormData({ title: "", type: "", academicYearId: "", termId: "", startDate: "", endDate: "" });
    setSubjectEntries([
      { id: uid(), subjectId: "", classId: "", sectionId: "", teacherId: "", maxScore: 100, passMark: 50 },
    ]);
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

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Assessment Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            One unified workflow for quizzes, tests, mid exams, and final exams
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="self-start text-white shadow-sm hover:opacity-90 md:self-auto"
          style={brandSolidStyle}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700 dark:text-gray-300", bg: "bg-white dark:bg-slate-800", icon: <ClipboardList className="w-4 h-4 text-gray-400" /> },
          { label: "Active", value: stats.active, color: "text-[var(--brand-color)]", bg: "bg-[rgba(var(--brand-color-rgb),0.1)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]", icon: <CheckCircle2 className="w-4 h-4 text-[var(--brand-color)]" /> },
          { label: "Locked", value: stats.locked, color: "text-[var(--brand-color)]", bg: "bg-[rgba(var(--brand-color-rgb),0.1)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]", icon: <Lock className="w-4 h-4 text-[var(--brand-color)]" /> },
          { label: "Subjects Assigned", value: stats.subjects, color: "text-[var(--brand-color)]", bg: "bg-[rgba(var(--brand-color-rgb),0.1)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]", icon: <BookOpen className="w-4 h-4 text-[var(--brand-color)]" /> },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border border-gray-200 dark:border-slate-700 shadow-sm`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                </div>
                {s.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Type pills ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            filterType === "ALL"
              ? "text-white"
              : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
          }`}
          style={filterType === "ALL" ? brandSolidStyle : undefined}
        >
          All types
        </button>
        {(Object.keys(TYPE_META) as AssessmentType[]).map((t) => {
          const m = TYPE_META[t];
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${
                active
                  ? ""
                  : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
              }`}
              style={active ? brandSoftStyle : undefined}
            >
              {m.icon}
              {m.label}
              <span className="opacity-60">{m.weight}</span>
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
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={brandTextStyle}>
              <Plus className="w-5 h-5" />
              New Assessment
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Fill in the details below. Subjects can be added now or after creation.
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
                    placeholder="e.g. Grade 10 — Mathematics Mid Exam, Semester 1"
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
                    {(Object.keys(TYPE_META) as AssessmentType[]).map((t) => {
                      const m = TYPE_META[t];
                      const selected = formData.type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, type: t }))}
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
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                    className="mt-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm text-gray-700 dark:text-gray-300">
                    End date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                    className="mt-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* ── Step 2: Subjects ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  2 · Subject assignments{" "}
                  <span className="normal-case font-normal text-gray-300 dark:text-gray-600">(optional now)</span>
                </h3>
                <button
                  type="button"
                  onClick={addSubjectEntry}
                  className="flex items-center gap-1 text-xs font-medium hover:opacity-80"
                  style={brandTextStyle}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add row
                </button>
              </div>

              {/* Column labels */}
              <div className="grid grid-cols-12 gap-2 px-3 mb-1">
                {["#", "Subject", "Class", "Section", "Teacher", "Max", "Pass", ""].map(
                  (h, i) => (
                    <span
                      key={i}
                      className={`text-xs font-medium text-gray-400 dark:text-gray-500 ${
                        i === 0 || i === 7 ? "col-span-1 text-center" : "col-span-2"
                      }`}
                    >
                      {h}
                    </span>
                  )
                )}
              </div>

              <div className="space-y-2">
                {subjectEntries.map((entry, idx) => (
                  <SubjectRow
                    key={entry.id}
                    entry={entry}
                    index={idx}
                    classes={classes}
                    sections={sections}
                    subjects={subjects}
                    teachers={teachers}
                    onChange={updateSubjectEntry}
                    onRemove={removeSubjectEntry}
                    canRemove={subjectEntries.length > 1}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Rows with no subject or class selected will be skipped.
              </p>
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
