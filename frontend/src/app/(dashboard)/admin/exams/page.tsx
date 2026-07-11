"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
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
  Wand2,
  Info,
  Globe,
  Eye,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
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
  const { t } = useTranslations<any>("exams");
  const filteredSections = sections.filter((s) => s.classId === entry.classId);


  return (
    <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-2 items-stretch sm:items-end p-3 bg-gray-50 dark:bg-[#111111]/50 rounded-lg border border-gray-200 dark:border-[#2A2A2A]">
      <div className="hidden sm:col-span-1 sm:flex sm:justify-center">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 self-end pb-1.5">{index + 1}</span>
      </div>

      {/* Subject */}
      <div className="sm:col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.subjectRow.subject}</Label>
        <Select
          value={entry.subjectId}
          onValueChange={(v) => onChange(entry.id, "subjectId", v)}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#CCCCCC]">
            <SelectValue placeholder={t.subjectRow.subject} />
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
      <div className="sm:col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.subjectRow.class}</Label>
        <Select
          value={entry.classId}
          onValueChange={(v) => {
            onChange(entry.id, "classId", v);
            onChange(entry.id, "sectionId", "");
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#CCCCCC]">
            <SelectValue placeholder={t.subjectRow.class} />
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
      <div className="sm:col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.subjectRow.section}</Label>
        <Select
          value={entry.sectionId}
          onValueChange={(v) => onChange(entry.id, "sectionId", v)}
          disabled={!entry.classId || filteredSections.length === 0}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#CCCCCC]">
            <SelectValue placeholder={filteredSections.length === 0 ? t.subjectRow.noSections : t.subjectRow.section} />
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
      <div className="sm:col-span-2">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.subjectRow.teacher}</Label>
        <Select
          value={entry.teacherId}
          onValueChange={(v) => onChange(entry.id, "teacherId", v)}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#CCCCCC]">
            <SelectValue placeholder={t.subjectRow.teacher} />
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
      <div className="sm:col-span-1">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.subjectRow.max}</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={entry.maxScore}
          onChange={(e) => onChange(entry.id, "maxScore", Number(e.target.value))}
          className="h-8 text-xs bg-white dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#CCCCCC] dark:placeholder:text-[#666666]"
        />
      </div>

      {/* Pass Mark */}
      <div className="sm:col-span-1">
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.subjectRow.pass}</Label>
        <Input
          type="number"
          min={0}
          max={entry.maxScore}
          value={entry.passMark}
          onChange={(e) => onChange(entry.id, "passMark", Number(e.target.value))}
          className="h-8 text-xs bg-white dark:bg-[#1A1A1A] dark:border-[#333333] dark:text-[#CCCCCC] dark:placeholder:text-[#666666]"
        />
      </div>

      {/* Remove */}
      <div className="sm:col-span-1 flex sm:justify-center">
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
  const { t } = useTranslations<any>("exams");
  const status = STATUS_META[assessment.status];
  const totalScored = assessment.subjects.reduce((sum, s) => sum + s._count.scores, 0);
  const totalExpected = assessment.subjects.length;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md bg-white dark:bg-[#111111] border-gray-200 dark:border-[#2A2A2A]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-5 bg-white dark:bg-[#111111] gap-2">
        <Link
          href={`/admin/assessments/${assessment.id}`}
          className="min-w-0 flex flex-1 items-center rounded-md outline-none transition-colors hover:text-[var(--brand-color)] focus-visible:ring-2 focus-visible:ring-[var(--brand-color,#e35336)]"
        >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                  {assessment.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {new Date(assessment.startDate).toLocaleDateString()} –{" "}
                  {new Date(assessment.endDate).toLocaleDateString()}
                </span>
                {assessment.term && (
                  <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">{assessment.term.name}</span>
                )}
              </div>
            </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{assessment.subjects.length} {t.assessmentCard.subjects}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{totalScored} {t.assessmentCard.scoresEntered}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap ${status.color}`}>
            {status.icon}
            {t.filters[assessment.status.toLowerCase()] ?? assessment.status}
          </div>
          {assessment.status === "ACTIVE" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLock(assessment.id);
              }}
              className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-[var(--brand-color)]"
              title={t.assessmentCard.lockTooltip}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#1A1A1A] dark:hover:text-gray-200"
            aria-label={expanded ? "Collapse assessment subjects" : "Expand assessment subjects"}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-[#2A2A2A] px-4 sm:px-6 py-4 bg-gray-50 dark:bg-[#1A1A1A]/50">
          {assessment.subjects.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
              {t.assessmentCard.noSubjects}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-5 gap-2 px-2">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{t.assessmentCard.colSubject}</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{t.assessmentCard.colClass}</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{t.assessmentCard.colSection}</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{t.assessmentCard.colTeacher}</span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 text-right">{t.assessmentCard.colScores}</span>
              </div>
              {assessment.subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-1 sm:gap-2 px-2 sm:px-2 py-2 sm:py-1.5 rounded bg-gray-50 dark:bg-[#1A1A1A]"
                >
                  <div className="flex sm:block items-center justify-between sm:justify-normal">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 sm:font-normal">
                      {sub.subject.name}
                    </span>
                    <span className="sm:hidden text-xs text-gray-400">{sub.class.name}</span>
                  </div>
                  <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">{sub.class.name}</span>
                  <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
                    {sub.section?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </span>
                  <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
                    {sub.teacher?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </span>
                  <div className="flex sm:hidden items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>
                      {sub.section?.name ?? "—"} · {sub.teacher?.name ?? "—"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>{sub._count.scores}</span>
                      {sub._count.scores > 0 ? (
                        <CheckCircle2 className="w-3 h-3 text-[var(--brand-color)]" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-[rgba(var(--brand-color-rgb),0.72)]" />
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-end gap-1.5">
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
  const { t } = useTranslations<any>("exams");
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
  const [createStep, setCreateStep] = useState<"basic" | "scope" | "review">("basic");

  // Lock confirm
  const [lockTarget, setLockTarget] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [clearing, setClearing] = useState(false);

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
    loadLookups();
    loadWeights();
  }, [isAuthenticated]);

  // ── Load assessments when academic year changes
  useEffect(() => {
    if (!isAuthenticated || !formData.academicYearId) return;
    loadAssessments();
  }, [isAuthenticated, formData.academicYearId]);

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
      const res = await assessmentsAPI.list({
        academicYearId: formData.academicYearId || undefined,
      });
      const data = Array.isArray(res.data) ? res.data : res.data.data ?? [];
      setAssessments(data);
    } catch {
      toast.error(t.toasts.loadFailed);
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
      toast.error(t.toasts.weightsLoadFailed);
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
      toast.error(t.toasts.formDataLoadFailed);
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

  const selectedAssignments = useMemo(() => {
    const gradeByClassId = new Map(
      classes.map((item) => [item.id, item.grade] as const),
    );

    return classSubjectAssignments.filter((assignment) => {
      const grade = assignment.class?.grade ?? gradeByClassId.get(assignment.classId);
      return (
        grade !== null &&
        grade !== undefined &&
        selectedGrades.includes(String(grade)) &&
        selectedSubjectIds.includes(assignment.subjectId)
      );
    });
  }, [classSubjectAssignments, classes, selectedGrades, selectedSubjectIds]);

  const scopeStatus = useMemo(() => {
    if (selectedGrades.length === 0 || selectedSubjectIds.length === 0) {
      return {
        tone: "neutral",
        message: t.newAssessmentModal.selectScopeHint,
      };
    }

    if (classSubjectAssignments.length === 0) {
      return {
        tone: "warning",
        message:
          "No class-subject assignments exist for this academic year. Assign subjects to classes first, then return here.",
      };
    }

    if (selectedAssignments.length === 0) {
      return {
        tone: "warning",
        message:
          "The selected grades and subjects do not overlap with any class-subject assignments. Choose assigned grades/subjects or create the missing class-subject assignments.",
      };
    }

    return {
      tone: "success",
      message: `${selectedAssignments.length} ${t.newAssessmentModal.assignmentsIncluded}`,
    };
  }, [
    classSubjectAssignments.length,
    selectedAssignments.length,
    selectedGrades.length,
    selectedSubjectIds.length,
    t.newAssessmentModal.assignmentsIncluded,
    t.newAssessmentModal.selectScopeHint,
  ]);

  const assignmentsWithoutTeacher = useMemo(
    () => selectedAssignments.filter((assignment) => !assignment.teacherId),
    [selectedAssignments],
  );

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          classes
            .map((item) => item.grade)
            .filter((grade): grade is number => grade !== null && grade !== undefined),
        ),
      ).sort((a, b) => a - b),
    [classes],
  );

  const canContinueBasic =
    Boolean(formData.title.trim()) &&
    Boolean(formData.type) &&
    Boolean(formData.academicYearId) &&
    Boolean(formData.startDate) &&
    Boolean(formData.endDate) &&
    Number(parseLocalDate(formData.endDate)) >= Number(parseLocalDate(formData.startDate));

  const applyAssessmentTemplate = (type: string, grade?: number) => {
    const now = new Date();
    const startDate = formatLocalDate(now);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    setFormData((prev) => ({
      ...prev,
      type,
      title: `${getTypeMeta(type).label}${grade ? ` for Grade ${grade}` : ""}`,
      startDate: prev.startDate || startDate,
      endDate: prev.endDate || formatLocalDate(endDate),
      addToCalendar: shouldDefaultToCalendar(type),
    }));
    setSelectedGrades(grade ? [String(grade)] : gradeOptions.map(String));
    setSelectedSubjectIds(Array.from(new Set(subjects.map((subject) => subject.id))));
    setCreateStep("scope");
  };

  // ── Submit
  const handleSubmit = async () => {
    if (!formData.title.trim()) return toast.error(t.toasts.titleRequired);
    if (!formData.type) return toast.error(t.toasts.typeRequired);
    if (!formData.academicYearId) return toast.error(t.toasts.academicYearRequired);
    if (!formData.startDate || !formData.endDate) return toast.error(t.toasts.datesRequired);
    if (Number(parseLocalDate(formData.endDate)) < Number(parseLocalDate(formData.startDate)))
      return toast.error(t.toasts.endDateBeforeStart);

    if (selectedGrades.length === 0) return toast.error(t.toasts.gradeRequired);
    if (selectedSubjectIds.length === 0) return toast.error(t.toasts.subjectRequired);

    if (selectedAssignments.length === 0) {
      return toast.error(t.toasts.noClassSubjects);
    }

    const typeMaxScore = getWeightValue(formData.type);
    if (typeMaxScore <= 0) {
      return toast.error(t.toasts.maxMarkZero);
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

      toast.success(t.toasts.created);
      setModalOpen(false);
      resetForm();
      loadAssessments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t.toasts.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData((prev) => ({
      title: "",
      type: "",
      academicYearId: prev.academicYearId,
      termId: "",
      startDate: "",
      endDate: "",
      addToCalendar: false,
    }));
    setSelectedGrades([]);
    setSelectedSubjectIds([]);
    setCreateStep("basic");
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
      toast.error(t.toasts.weightExceeds100);
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
      toast.error(t.toasts.invalidTypeName);
      return;
    }

    if (assessmentWeights.some((row) => row.type.toUpperCase() === normalizedType)) {
      toast.error(t.toasts.typeExists);
      return;
    }

    setAssessmentWeights((prev) => [...prev, { type: normalizedType, percentage: 0 }]);
    setNewAssessmentTypeName("");
  };

  const handleSaveWeights = async () => {
    const total = assessmentWeights.reduce((sum, row) => sum + row.percentage, 0);
    if (Math.round(total * 100) / 100 !== 100) {
      toast.error(t.toasts.weightsMustTotal100);
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
      toast.success(t.toasts.weightsUpdated);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t.toasts.weightsUpdateFailed);
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
      toast.success(t.toasts.locked);
      setLockTarget(null);
      loadAssessments();
    } catch {
      toast.error(t.toasts.lockFailed);
    } finally {
      setLocking(false);
    }
  };

  const handleClearAssessments = async () => {
    setClearing(true);
    try {
      const res = await assessmentsAPI.clear();
      const deleted = Number(res.data?.deleted ?? 0);
      toast.success(deleted > 0 ? `Deleted ${deleted} assessment${deleted === 1 ? "" : "s"}` : "No assessments to delete");
      loadAssessments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to clear assessments");
    } finally {
      setClearing(false);
    }
  };

  const confirmClearAssessments = () => {
    toast.warning("Clear all assessments?", {
      description: "This will delete every assessment and its assessment entries for this school.",
      action: {
        label: "Clear",
        onClick: handleClearAssessments,
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
      duration: 10000,
    });
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
    color: "var(--brand-color)",
    borderColor: "rgba(var(--brand-color-rgb),0.24)",
    backgroundColor: "rgba(var(--brand-color-rgb),0.12)",
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#F8FAFC] dark:bg-[#111111] min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">{t.page.title}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {t.page.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={confirmClearAssessments}
            disabled={assessments.length === 0 || clearing}
            className="border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:bg-[#1A1A1A] dark:text-red-300 dark:hover:bg-red-950/30"
          >
            {clearing ? <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />}
            <span className="hidden sm:inline">Clear All</span>
            <span className="sm:hidden">Clear</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeightsOpen(true)}
            className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A]"
            style={brandSoftStyle}
          >
            <Pencil className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t.actions.editWeight}</span>
            <span className="sm:hidden">Weights</span>
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
              className="shadow-sm hover:opacity-90"
            style={brandSolidStyle}
          >
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t.actions.newAssessment}</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>



      {/* ── Type pills ── */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-2">
        <div className="flex overflow-x-auto flex-nowrap gap-3 pb-1 sm:flex-wrap sm:overflow-visible no-scrollbar">
          <button
            onClick={() => setFilterType("ALL")}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              filterType === "ALL"
                ? "text-white"
                : "bg-white dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2A2A2A] hover:border-gray-300 dark:hover:border-[#333333]"
            }`}
            style={filterType === "ALL" ? brandSolidStyle : undefined}
          >
            {t.filters.allTypes}
          </button>
          {configuredAssessmentTypes.map((at) => {
            const m = getTypeMeta(at);
            const active = filterType === at;
            return (
              <button
                key={at}
                onClick={() => setFilterType(at)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5 ${
                  active
                    ? ""
                    : "bg-white dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2A2A2A] hover:border-gray-300 dark:hover:border-[#333333]"
                }`}
                style={active ? brandSoftStyle : undefined}
              >
                {m.icon}
                {(t.assessmentType[at]?.label) ?? at}
                <span className="opacity-60 shrink-0">{getWeightValue(at)}%</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto sm:shrink-0">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-full sm:w-32 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-xs dark:bg-[#1A1A1A] dark:border-[rgba(var(--brand-color-rgb),0.22)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">{t.filters.allStatuses}</SelectItem>
              <SelectItem value="ACTIVE" className="text-xs">{t.filters.active}</SelectItem>
              <SelectItem value="LOCKED" className="text-xs">{t.filters.locked}</SelectItem>
              <SelectItem value="DRAFT" className="text-xs">{t.filters.draft}</SelectItem>
              <SelectItem value="COMPLETED" className="text-xs">{t.filters.completed}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={formData.academicYearId}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, academicYearId: v, termId: "" }))}
          >
            <SelectTrigger className="h-8 w-full sm:w-40 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-xs dark:bg-[#1A1A1A] dark:border-[rgba(var(--brand-color-rgb),0.22)]">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y.id} value={y.id} className="text-xs">
                  {y.name} {y.isActive ? "(Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Assessment List ── */}
      {listLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111]">
          <CardContent className="py-14 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{t.empty.noAssessments}</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              {assessments.length === 0
                ? t.empty.createFirst
                : t.empty.adjustFilters}
            </p>
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

      {/* ── Weight Modal ── */}
      <Dialog open={weightsOpen} onOpenChange={setWeightsOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-[#111111] border-gray-200 dark:border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle>{t.weightModal.title}</DialogTitle>
            <DialogDescription>
              {t.weightModal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {assessmentWeights.map((row) => {
              const type = row.type;
              return (
              <div key={type} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-[#F2F2F2]">
                    {t.assessmentType[type]?.label ?? type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.assessmentType[type]?.description ?? ""}
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
            <div className="rounded-lg border border-dashed border-gray-200 p-3 dark:border-[#2A2A2A]">
              <p className="mb-2 text-sm font-medium text-gray-900 dark:text-[#F2F2F2]">
                {t.weightModal.addNewType}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={newAssessmentTypeName}
                  onChange={(e) => setNewAssessmentTypeName(e.target.value)}
                  placeholder={t.weightModal.typePlaceholder}
                  className="h-9"
                />
                <Button type="button" variant="outline" onClick={handleAddAssessmentType}>
                  {t.actions.add}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm dark:border-[#2A2A2A]">
              <span className="text-gray-500 dark:text-gray-400">{t.weightModal.total}</span>
              <span className="font-semibold text-gray-900 dark:text-[#F2F2F2]">
                {assessmentWeights.reduce((sum, row) => sum + row.percentage, 0)}%
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWeightsOpen(false)} disabled={weightsSaving}>
              {t.weightModal.cancel}
            </Button>
            <Button onClick={handleSaveWeights} disabled={weightsSaving} style={brandSolidStyle}>
              {weightsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.weightModal.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto bg-white dark:bg-[#111111] border-gray-200 dark:border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={brandTextStyle}>
              <Plus className="w-5 h-5" />
              {t.newAssessmentModal.title}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {t.newAssessmentModal.description}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createStep} onValueChange={(v) => setCreateStep(v as "basic" | "scope" | "review")} className="min-w-0 max-w-full">
            <div className="-mx-4 max-w-[100vw] overflow-x-auto overflow-y-hidden px-4 pb-2 md:mx-0 md:max-w-full md:px-0">
              <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0 md:w-full">
                <TabsTrigger value="basic" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                  <Info className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                  <span>Basic Info</span>
                </TabsTrigger>
                <TabsTrigger value="scope" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                  <Globe className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                  <span>Scope</span>
                </TabsTrigger>
                <TabsTrigger value="review" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                  <Eye className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                  <span>Review</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-6 py-2">
              <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/40">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-[#F2F2F2]">
                  <Wand2 className="h-4 w-4" />
                  Quick templates
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyAssessmentTemplate("FINAL")}>
                    Final exam for all grades
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyAssessmentTemplate("MID")}>
                    Mid assessment for all grades
                  </Button>
                  {gradeOptions.slice(0, 6).map((grade) => (
                    <Button
                      key={grade}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyAssessmentTemplate("FINAL", grade)}
                    >
                      Final Grade {grade}
                    </Button>
                  ))}
                </div>
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {t.newAssessmentModal.stepBasicInfo}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <Label htmlFor="title" className="text-sm text-gray-700 dark:text-gray-300">
                    {t.newAssessmentModal.assessmentTitle} <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder={t.newAssessmentModal.titlePlaceholder}
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#2A2A2A] text-gray-900 dark:text-[#F2F2F2] placeholder:text-gray-400 dark:placeholder:text-[#666666]"
                  />
                </div>

                {/* Type */}
                <div>
                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                    {t.newAssessmentModal.assessmentType} <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                    {configuredAssessmentTypes.map((at) => {
                      const m = getTypeMeta(at);
                      const selected = formData.type === at;
                      return (
                        <button
                          key={at}
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              type: at,
                              addToCalendar: shouldDefaultToCalendar(at),
                            }))
                          }
                          className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                            selected
                              ? "ring-1 ring-offset-1"
                              : "border-gray-200 bg-white hover:border-[rgba(var(--brand-color-rgb),0.28)] hover:bg-[rgba(var(--brand-color-rgb),0.04)] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:hover:bg-[rgba(var(--brand-color-rgb),0.08)]"
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
                            <span className="text-xs font-semibold">{t.assessmentType[at]?.label ?? at}</span>
                            <span className={`text-xs ml-auto ${selected ? "opacity-70" : "text-gray-300 dark:text-gray-600"}`}>
                              {m.weight}
                            </span>
                          </div>
                          <span className={`text-xs ${selected ? "opacity-70" : "text-gray-400 dark:text-gray-500"}`}>
                            {t.assessmentType[at]?.description ?? ""}
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
                      {t.newAssessmentModal.academicYear} <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.academicYearId}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, academicYearId: v, termId: "" }))
                      }
                    >
                      <SelectTrigger className="mt-1 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-gray-900 dark:border-[rgba(var(--brand-color-rgb),0.22)] dark:bg-[#1A1A1A] dark:text-[#F2F2F2]">
                        <SelectValue placeholder={t.newAssessmentModal.selectAcademicYear} />
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
                    <Label className="text-sm text-gray-700 dark:text-gray-300">{t.newAssessmentModal.termSemester}</Label>
                    <Select
                      value={formData.termId}
                      onValueChange={(v) => setFormData((p) => ({ ...p, termId: v }))}
                      disabled={!formData.academicYearId || terms.length === 0}
                    >
                      <SelectTrigger className="mt-1 border-[rgba(var(--brand-color-rgb),0.2)] bg-white text-gray-900 dark:border-[rgba(var(--brand-color-rgb),0.22)] dark:bg-[#1A1A1A] dark:text-[#F2F2F2]">
                        <SelectValue
                          placeholder={
                            !formData.academicYearId
                              ? t.newAssessmentModal.selectYearFirst
                              : terms.length === 0
                              ? t.newAssessmentModal.noTerms
                              : t.newAssessmentModal.selectTerm
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm text-gray-700 dark:text-gray-300">
                    {t.newAssessmentModal.startDate} <span className="text-red-400">*</span>
                  </Label>
                  <CalendarDatePicker
                    value={parseLocalDate(formData.startDate)}
                    onChange={(value) => {
                      const selectedDate = value ? formatLocalDate(value) : "";
                      setFormData((p) => ({
                        ...p,
                        startDate: selectedDate,
                        endDate:
                          p.endDate &&
                          selectedDate &&
                          Number(parseLocalDate(p.endDate)) < Number(parseLocalDate(selectedDate))
                            ? selectedDate
                            : p.endDate,
                      }));
                    }}
                    placeholder={t.newAssessmentModal.selectStartDate}
                    className="mt-1 bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#2A2A2A] text-gray-900 dark:text-[#F2F2F2]"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm text-gray-700 dark:text-gray-300">
                    {t.newAssessmentModal.endDate} <span className="text-red-400">*</span>
                  </Label>
                  <CalendarDatePicker
                    value={parseLocalDate(formData.endDate)}
                    onChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        endDate: value ? formatLocalDate(value) : "",
                      }))
                    }
                    placeholder={t.newAssessmentModal.selectEndDate}
                    className="mt-1 bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#2A2A2A] text-gray-900 dark:text-[#F2F2F2]"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#F2F2F2]">
                      {t.newAssessmentModal.addToCalendar}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t.newAssessmentModal.calendarHint}
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
          </TabsContent>

            {/* ── Step 2: Grades ── */}
          <TabsContent value="scope" className="mt-0">
              <div className="mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t.newAssessmentModal.stepGradeRanges}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t.newAssessmentModal.gradeRangesHint}
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
                      : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-[#1A1A1A] dark:text-gray-300"
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
                  {t.newAssessmentModal.allGrades}
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
                            : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-[#1A1A1A] dark:text-gray-300"
                        }`}
                        style={selected ? brandSolidStyle : undefined}
                      >
                        {t.newAssessmentModal.grade} {grade}
                      </button>
                    );
                  })}
              </div>

              <div className="mt-5">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t.newAssessmentModal.subjects}
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleAllSubjects}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      selectedSubjectIds.length > 0 && selectedSubjectIds.length === subjects.length
                        ? "text-white"
                        : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-[#1A1A1A] dark:text-gray-300"
                    }`}
                    style={
                      selectedSubjectIds.length > 0 && selectedSubjectIds.length === subjects.length
                        ? brandSolidStyle
                        : undefined
                    }
                  >
                    {t.newAssessmentModal.allSubjects}
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
                            : "bg-white text-gray-600 hover:border-[rgba(var(--brand-color-rgb),0.28)] dark:bg-[#1A1A1A] dark:text-gray-300"
                        }`}
                        style={selected ? brandSolidStyle : undefined}
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`mt-4 rounded-xl border border-dashed p-4 ${
                  scopeStatus.tone === "warning"
                    ? "border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20"
                    : scopeStatus.tone === "success"
                      ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-[#2A2A2A]"
                }`}
              >
                <p
                  className={`text-sm ${
                    scopeStatus.tone === "warning"
                      ? "text-amber-800 dark:text-amber-300"
                      : scopeStatus.tone === "success"
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {scopeStatus.message}
                </p>
                {assignmentsWithoutTeacher.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {assignmentsWithoutTeacher.length} selected class-subject assignment{assignmentsWithoutTeacher.length === 1 ? "" : "s"} have no teacher assigned. They will be created, but teachers may not see them until a teacher is assigned.
                  </div>
                )}
              </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4 mt-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Review before creating
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assessment</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-[#F2F2F2]">{formData.title || "Untitled"}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formData.type || "No type selected"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scope</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-[#F2F2F2]">{selectedGrades.length} grade{selectedGrades.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedSubjectIds.length} subject{selectedSubjectIds.length === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Will create</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-[#F2F2F2]">{selectedAssignments.length}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">class-subject assessment entries</p>
                </div>
              </div>
              {assignmentsWithoutTeacher.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  <p className="font-medium">Teacher assignment warning</p>
                  <p className="mt-1">
                    {assignmentsWithoutTeacher.length} selected entry{assignmentsWithoutTeacher.length === 1 ? "" : "s"} do not have teachers yet. Assign teachers before expecting teacher marks entry to appear.
                  </p>
                </div>
              )}
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#2A2A2A]">
                {selectedAssignments.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No class-subject entries match the selected scope.</p>
                ) : (
                  selectedAssignments.slice(0, 30).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-sm last:border-b-0 dark:border-[#2A2A2A]">
                      <span className="text-gray-800 dark:text-[#CCCCCC]">
                        {assignment.class?.name} {assignment.section?.name ? `- ${assignment.section.name}` : ""} · {assignment.subject?.name}
                      </span>
                      <span className={assignment.teacherId ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {assignment.teacherId ? "Teacher assigned" : "No teacher"}
                      </span>
                    </div>
                  ))
                )}
              </div>
          </TabsContent>
          </div>
        </Tabs>

          <DialogFooter className="gap-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
            <Button
              variant="outline"
              onClick={() => { setModalOpen(false); resetForm(); }}
              disabled={submitting}
              className="bg-white hover:opacity-90 dark:bg-[#1A1A1A]"
              style={{
                color: "var(--brand-color)",
                borderColor: "rgba(var(--brand-color-rgb),0.24)",
              }}
            >
              {t.newAssessmentModal.cancel}
            </Button>
            {createStep !== "basic" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateStep(createStep === "review" ? "scope" : "basic")}
                disabled={submitting}
              >
                Back
              </Button>
            )}
            {createStep !== "review" ? (
              <Button
                type="button"
                onClick={() => {
                  if (createStep === "basic" && !canContinueBasic) {
                    toast.error("Complete the basic assessment details first");
                    return;
                  }
                  if (createStep === "scope" && selectedAssignments.length === 0) {
                    toast.error(scopeStatus.message);
                    return;
                  }
                  setCreateStep(createStep === "basic" ? "scope" : "review");
                }}
                className="min-w-[120px] shadow-sm hover:opacity-90"
                style={brandSolidStyle}
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || selectedAssignments.length === 0}
                className="min-w-[120px] shadow-sm hover:opacity-90"
                style={brandSolidStyle}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.newAssessmentModal.creating}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.newAssessmentModal.create}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lock Confirm Dialog ── */}
      <AlertDialog open={!!lockTarget} onOpenChange={(o) => { if (!o) setLockTarget(null); }}>
        <AlertDialogContent className="bg-white dark:bg-[#111111] border-gray-200 dark:border-[#2A2A2A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Lock className="w-4 h-4" style={brandTextStyle} />
              {t.lockDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              {t.lockDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={locking}
              className="bg-white hover:opacity-90 dark:bg-[#1A1A1A]"
              style={{
                color: "var(--brand-color)",
                borderColor: "rgba(var(--brand-color-rgb),0.24)",
              }}
            >
              {t.lockDialog.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLock}
              disabled={locking}
            className="shadow-sm hover:opacity-90"
              style={brandSolidStyle}
            >
              {locking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t.lockDialog.lock}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
