"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useTranslations } from "@/hooks/useTranslations";
import { Filters, useFilters } from "@/components/filters/Filters";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Save,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
  GraduationCap,
  LayoutGrid,
  EyeOff,
  Search,
  Filter,
  ArrowRight,
  Download,
  Printer,
  Sparkles,
  Wand2,
  BarChart3,
} from "lucide-react";


// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { schoolSettingsAPI } from "@/lib/api";
import { adminTimetableAPI } from "@/lib/api/timetable";
import { periodTimeAPI, type PeriodTime } from "@/lib/api/siren";
import {
  getEthiopianSchedule,
  getTeachingSlots,
  getSchoolTimeBounds,
  getSlotRanges,
  SCHOOL_WEEK_DAYS,
} from "@/lib/timetable";
import { cn } from "@/lib/utils";

// Types
interface Class {
  id: string;
  name: string;
  grade: number;
  section: string;
  sections?: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  color?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface ClassSubject {
  id: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  academicYear?: string;
  teacherId?: string;
  subject?: Subject;
  teacher?: Teacher;
}

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  subject?: Subject;
  teacher?: Teacher;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface ScheduleEntry {
  subjectId: string;
  teacherId: string;
  room: string;
}

interface GeneratedSlotPreview {
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  periodNumber: number;
}

interface AutoGenerationResult {
  success: boolean;
  applied: boolean;
  generatedSlots: GeneratedSlotPreview[];
  unscheduled: Array<{
    classSubjectId: string;
    subjectName: string;
    teacherName?: string | null;
    reason: string;
  }>;
  summary: {
    requestedPeriods: number;
    generatedPeriods: number;
    unscheduledPeriods: number;
  };
}

interface AutoGenerationDemand {
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string | null;
  periodsPerWeek: number;
}

// Subject color palette for visual distinction
const SUBJECT_COLORS = [
  { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", hover: "hover:bg-rose-100 dark:hover:bg-rose-900/40", accent: "bg-rose-500" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", hover: "hover:bg-orange-100 dark:hover:bg-orange-900/40", accent: "bg-orange-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", hover: "hover:bg-amber-100 dark:hover:bg-amber-900/40", accent: "bg-amber-500" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", hover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40", accent: "bg-emerald-500" },
  { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300", hover: "hover:bg-teal-100 dark:hover:bg-teal-900/40", accent: "bg-teal-500" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", hover: "hover:bg-cyan-100 dark:hover:bg-cyan-900/40", accent: "bg-cyan-500" },
  { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", hover: "hover:bg-blue-100 dark:hover:bg-blue-900/40", accent: "bg-blue-500" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", hover: "hover:bg-indigo-100 dark:hover:bg-indigo-900/40", accent: "bg-indigo-500" },
  { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", hover: "hover:bg-violet-100 dark:hover:bg-violet-900/40", accent: "bg-violet-500" },
  { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-200 dark:border-fuchsia-800", text: "text-fuchsia-700 dark:text-fuchsia-300", hover: "hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40", accent: "bg-fuchsia-500" },
];

const buildAutoSlotKey = (dayOfWeek: number, startTime: string) => `${dayOfWeek}:${startTime}`;
const DEFAULT_MAX_PERIODS_PER_DAY = 7;

const shuffleAutoItems = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const TimetablePageSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#111111] dark:to-[#111111] p-4 md:p-8 space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>

    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-[120px_repeat(5,minmax(120px,1fr))] gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`header-${index}`} className="h-12 w-full rounded-xl" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid grid-cols-[120px_repeat(5,minmax(120px,1fr))] gap-3">
              {Array.from({ length: 6 }).map((_, cellIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={cellIndex === 0 ? "h-20 w-full rounded-xl" : "h-20 w-full rounded-2xl"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AdminTimetablePage = () => {
  const { t } = useTranslations<any>("timetable");
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { currentAcademicYear } = useAcademicYear();

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, any>>({});

  const { selectedGrade, setSelectedGrade, selectedSection, setSelectedSection, selectedYear, setSelectedYear } = useFilters({
    academicYear: true,
    grade: true,
    section: true,
  });

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [schedule, setSchedule] = useState<Record<string, ScheduleEntry>>({});
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [showTeacherNames, setShowTeacherNames] = useState(true);
  const [showRoomNumbers, setShowRoomNumbers] = useState(true);
  const [searchSubject, setSearchSubject] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [periodCount, setPeriodCount] = useState(0);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>([]);
  const [periodLoads, setPeriodLoads] = useState<Record<string, string>>({});
  const [autoPreview, setAutoPreview] = useState<AutoGenerationResult | null>(null);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const { startTime: schoolStartTime, endTime: schoolEndTime } = getSchoolTimeBounds(schoolSettings);
  const maxPeriodsPerDay = useMemo(() => {
    const configured = Number(schoolSettings?.MAX_PERIODS_PER_DAY);
    return Number.isInteger(configured) && configured >= 1 && configured <= 12
      ? configured
      : DEFAULT_MAX_PERIODS_PER_DAY;
  }, [schoolSettings]);
  const fallbackSlotRanges = getSlotRanges(schoolStartTime, schoolEndTime);
  const slotRanges = useMemo(
    () =>
      periodTimes.length > 0
        ? [...periodTimes]
            .sort((left, right) => left.periodNumber - right.periodNumber)
            .map((period) => ({ start: period.startTime, end: period.endTime }))
        : fallbackSlotRanges,
    [fallbackSlotRanges, periodTimes],
  );

  // Subject color mapping
  const subjectColorMap = useMemo(() => {
    const map: Record<string, typeof SUBJECT_COLORS[0]> = {};
    subjects.forEach((subject, index) => {
      map[subject.id] = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    });
    return map;
  }, [subjects]);

  // Stats
  const stats = useMemo(() => {
    const filledSlots = Object.values(schedule).filter(s => s.subjectId).length;
    const totalSlots = slotRanges.length * SCHOOL_WEEK_DAYS.length;
    const uniqueSubjects = new Set(Object.values(schedule).map(s => s.subjectId).filter(Boolean)).size;
    const uniqueTeachers = new Set(Object.values(schedule).map(s => s.teacherId).filter(Boolean)).size;
    return { filledSlots, totalSlots, uniqueSubjects, uniqueTeachers, percentage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0 };
  }, [schedule, slotRanges]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchInitialData = useCallback(async () => {
    try {
      setFetchingData(true);
      const [subjectsRes, academicYearsRes, schoolSettingsRes] = await Promise.all([
        adminTimetableAPI.getSubjects(),
        currentAcademicYear ? adminTimetableAPI.getAcademicYears() : Promise.resolve({ data: [] }),
        user?.schoolId ? schoolSettingsAPI.getAll(user.schoolId) : Promise.resolve({ data: {} }),
      ]);

      if (user?.schoolId) {
        const periodsRes = await periodTimeAPI.list(user.schoolId);
        const fetchedPeriods = Array.isArray(periodsRes.data) ? periodsRes.data : [];
        setPeriodTimes(fetchedPeriods);
        setPeriodCount(fetchedPeriods.length);
      }

      setSubjects(subjectsRes.data || []);
      setAcademicYears(academicYearsRes.data || []);
      setSchoolSettings(schoolSettingsRes.data || {});
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error(t.toasts.loadFailed);
    } finally {
      setFetchingData(false);
    }
  }, [user?.schoolId, currentAcademicYear, t.toasts.loadFailed]);

  const fetchClassesForYear = useCallback(async () => {
    if (!selectedYear) {
      setClasses([]);
      return;
    }

    try {
      const classesRes = await adminTimetableAPI.getClasses({ academicYearId: selectedYear });
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch classes for year:', error);
      toast.error(t.toasts.loadClassesFailed);
      setClasses([]);
    }
  }, [selectedYear, t.toasts.loadClassesFailed]);

  // Link grade filter to class selection
  useEffect(() => {
    if (!selectedGrade || !classes.length || fetchingData) return;

    const gradeNum = parseInt(selectedGrade);
    const classForGrade = classes.find(c => c.grade === gradeNum);
    if (classForGrade) {
      setSelectedClassId(classForGrade.id);
    }
  }, [selectedGrade, classes, fetchingData]);

  // Link section filter to section selection
  useEffect(() => {
    if (!selectedSection || selectedSection === "all") {
      setSelectedSectionId("");
      return;
    }

    const classWithSection = classes.find((classItem) =>
      classItem.sections?.some(
        (section) =>
          section.id === selectedSection || section.name === selectedSection
      )
    );

    if (!classWithSection?.sections?.length) {
      setSelectedSectionId("");
      return;
    }

    const sectionMatch = classWithSection.sections.find(
      (section) =>
        section.id === selectedSection || section.name === selectedSection
    );

    if (sectionMatch) {
      if (selectedClassId !== classWithSection.id) {
        setSelectedClassId(classWithSection.id);
      }
      setSelectedSectionId(sectionMatch.id);
    }
  }, [selectedSection, selectedClassId, classes]);

  // Auto-select first section when grade changes
  useEffect(() => {
    if (selectedClassId && classes.length > 0 && !fetchingData && !selectedSection) {
      const classInfo = classes.find(c => c.id === selectedClassId);
      const sections = classInfo?.sections;
      if (sections && sections.length > 0) {
        const firstSectionName = sections[0].name;
        setSelectedSection(firstSectionName);
        setSelectedSectionId(sections[0].id);
      }
    }
  }, [selectedClassId, classes, fetchingData, selectedSection, setSelectedSection]);

  // Set the academic year for filters
  useEffect(() => {
    if (currentAcademicYear?.id && !selectedYear) {
      setSelectedYear(currentAcademicYear.id);
    }
  }, [currentAcademicYear, selectedYear, setSelectedYear]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchInitialData();
    }
  }, [fetchInitialData, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && selectedYear) {
      fetchClassesForYear();
      setSelectedClassId("");
      setSelectedSectionId("");
      setClassSubjects([]);
      setSchedule({});
      setUnsavedChanges(false);
    }
  }, [fetchClassesForYear, isAuthenticated, isLoading, selectedYear]);

  const fetchClassData = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId || !selectedYear) return;

    try {
      setLoading(true);

      const classSubjectsRes = await adminTimetableAPI.getClassSubjects({
        academicYearId: selectedYear,
      });

      const filtered = (classSubjectsRes.data || []).filter(
        (cs: ClassSubject) => cs.classId === selectedClassId && cs.sectionId === selectedSectionId
      );
      setClassSubjects(filtered);
      setPeriodLoads(Object.fromEntries(filtered.map((item: ClassSubject) => [item.id, "1"])));
      setAutoPreview(null);

      const slotsRes = await adminTimetableAPI.getGrid(selectedClassId, {
        sectionId: selectedSectionId,
        academicYearId: selectedYear,
      });

      const slots = slotsRes.data?.slots || [];
      const initialSchedule: Record<string, ScheduleEntry> = {};
      slots.forEach((slot: TimetableSlot) => {
        const key = `${slot.dayOfWeek}-${slot.startTime}`;
        initialSchedule[key] = {
          subjectId: slot.subject?.id || '',
          teacherId: slot.teacher?.id || '',
          room: slot.room || '',
        };
      });
      setSchedule(initialSchedule);
      setUnsavedChanges(false);

    } catch (error) {
      console.error('Failed to fetch class data:', error);
      toast.error(t.toasts.loadScheduleFailed);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId, selectedYear, t.toasts.loadScheduleFailed]);

  useEffect(() => {
    if (selectedClassId && selectedSectionId && selectedYear) {
      fetchClassData();
    }
  }, [fetchClassData, selectedClassId, selectedSectionId, selectedYear]);

  const getSlotKey = (day: number, time: string) => `${day}-${time}`;

  const updateSlot = (day: number, time: string, field: keyof ScheduleEntry, value: string) => {
    const key = getSlotKey(day, time);
    setSchedule(prev => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value,
        }
      };
      return updated;
    });
    setUnsavedChanges(true);
  };

  const previewSchedule = useMemo(() => {
    if (!autoPreview || autoPreview.applied) {
      return null;
    }

    const nextSchedule: Record<string, ScheduleEntry> = {};
    autoPreview.generatedSlots.forEach((slot) => {
      nextSchedule[getSlotKey(slot.dayOfWeek, slot.startTime)] = {
        subjectId: slot.subjectId,
        teacherId: slot.teacherId || "",
        room: "",
      };
    });
    return nextSchedule;
  }, [autoPreview]);

  const displayedSchedule = previewSchedule || schedule;
  const isPreviewingInGrid = !!previewSchedule;

  const getSlot = (day: number, time: string): ScheduleEntry => {
    const key = getSlotKey(day, time);
    return displayedSchedule[key] || { subjectId: '', teacherId: '', room: '' };
  };

  const getTeacherForSubject = (subjectId: string) => {
    const cs = classSubjects.find(c => c.subjectId === subjectId && !!c.teacherId);
    return cs?.teacherId || '';
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || '';
  };

  const getTeacherName = (teacherId: string) => {
    return classSubjects.find(cs => cs.teacherId === teacherId)?.teacher?.name || '';
  };

  const exportTimetablePdf = () => {
    if (!selectedClassId || !selectedSectionId) {
      toast.error("Select class and section first");
      return;
    }

    const selectedSectionName = sections.find((section) => section.id === selectedSectionId)?.name || selectedSection || "-";
    const gradeLabel = selectedClass?.name || (selectedGrade ? `Grade ${selectedGrade}` : "Grade");
    const escapeHtml = (value: string) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const rows = slotRanges.map((timeRange, index) => {
      const cells = SCHOOL_WEEK_DAYS.map((day) => {
        const slot = getSlot(day.value, timeRange.start);
        const subject = slot.subjectId ? getSubjectName(slot.subjectId) : "";
        const teacher = slot.teacherId ? getTeacherName(slot.teacherId) : "";
        const room = slot.room ? `Room: ${slot.room}` : "";
        const details = [teacher, room].filter(Boolean).join("<br />");
        return `
          <td>
            ${subject ? `<div class="subject">${escapeHtml(subject)}</div>` : `<div class="empty">-</div>`}
            ${details ? `<div class="details">${details}</div>` : ""}
          </td>
        `;
      }).join("");

      return `
        <tr>
          <th class="period">
            <div>Period ${index + 1}</div>
            <span>${escapeHtml(timeRange.start)} - ${escapeHtml(timeRange.end)}</span>
          </th>
          ${cells}
        </tr>
      `;
    }).join("");

    const printable = window.open("", "_blank", "width=1200,height=800");
    if (!printable) {
      toast.error("Allow popups to export the timetable PDF");
      return;
    }

    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(gradeLabel)} Section ${escapeHtml(selectedSectionName)} Weekly Schedule</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
            .header { text-align: center; margin-bottom: 14px; }
            .header h1 { font-size: 22px; margin: 0 0 6px; }
            .header .meta { font-size: 14px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #111827; padding: 8px; vertical-align: middle; text-align: center; }
            thead th { background: #e5e7eb; font-size: 13px; }
            .period { width: 100px; background: #f3f4f6; font-size: 12px; }
            .period span { display: block; margin-top: 4px; font-size: 10px; font-weight: 400; color: #4b5563; }
            .subject { font-size: 13px; font-weight: 700; }
            .details { margin-top: 4px; font-size: 10px; line-height: 1.35; color: #374151; }
            .empty { color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Weekly Schedule</h1>
            <div class="meta">${escapeHtml(gradeLabel)} &nbsp; | &nbsp; Section ${escapeHtml(selectedSectionName)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="period">Period</th>
                ${SCHOOL_WEEK_DAYS.map((day) => `<th>${escapeHtml(day.name)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printable.document.close();
  };

  const periodRequirements = useMemo(
    () =>
      classSubjects
        .map((item) => ({
          classSubjectId: item.id,
          periodsPerWeek: Number(periodLoads[item.id] || 0),
        }))
        .filter((item) => item.periodsPerWeek > 0),
    [classSubjects, periodLoads],
  );

  const totalRequestedPeriods = useMemo(
    () => periodRequirements.reduce((sum, item) => sum + item.periodsPerWeek, 0),
    [periodRequirements],
  );

  const runAutoGenerate = useCallback(async (apply: boolean) => {
    if (!selectedClassId || !selectedSectionId || !user?.schoolId) {
      toast.error("Select class and section first");
      return;
    }

    if (periodRequirements.length === 0) {
      toast.error("Enter at least one period load");
      return;
    }

    setAutoGenerating(true);
    try {
      const [periodsRes, slotsRes] = await Promise.all([
        periodTimeAPI.list(user.schoolId),
        adminTimetableAPI.getAllSlots({ academicYearId: selectedYear || undefined }),
      ]);

      const periodTimes = Array.isArray(periodsRes.data) ? periodsRes.data : [];
      const existingSlots = Array.isArray(slotsRes.data) ? slotsRes.data : [];

      if (periodTimes.length === 0) {
        toast.error("Create period times before auto-generating a timetable");
        return;
      }

      if (periodTimes.length > maxPeriodsPerDay) {
        toast.error(`This school supports a maximum of ${maxPeriodsPerDay} periods per day`);
        return;
      }

      const weeklyCapacity = SCHOOL_WEEK_DAYS.length * periodTimes.length;
      const excessiveRequirement = periodRequirements.find(
        (item) => item.periodsPerWeek > weeklyCapacity,
      );

      if (excessiveRequirement) {
        toast.error(`A subject cannot exceed ${weeklyCapacity} periods per week for the configured school week`);
        return;
      }

      if (totalRequestedPeriods > weeklyCapacity) {
        toast.error(`The requested weekly load exceeds the section capacity of ${weeklyCapacity} periods`);
        return;
      }

      const classSubjectMap = new Map(classSubjects.map((item) => [item.id, item]));
      const candidateSlots = shuffleAutoItems(
        SCHOOL_WEEK_DAYS.flatMap((day) =>
          periodTimes.map((period: any, slotIndex: number) => ({
            dayOfWeek: day.value,
            startTime: period.startTime,
            endTime: period.endTime,
            periodNumber: period.periodNumber,
            slotIndex,
          })),
        ),
      ).map((candidate, candidateIndex) => ({
        ...candidate,
        randomOrder: candidateIndex,
      }));

      const sectionSlotKeys = new Set<string>();
      const teacherSlotKeys = new Set<string>();
      const teacherSubjectUsageByDay = new Map<string, number>();

      for (const slot of existingSlots) {
        const isTargetSection =
          slot.classId === selectedClassId && slot.sectionId === selectedSectionId;
        if (isTargetSection && apply) continue;

        const slotKey = buildAutoSlotKey(slot.dayOfWeek, slot.startTime);
        sectionSlotKeys.add(slotKey);

        if (slot.teacherId) {
          teacherSlotKeys.add(`${slot.teacherId}:${slotKey}`);
        }

        if (slot.teacherId && slot.subjectId) {
          const teacherSubjectDailyKey = `${slot.teacherId}:${slot.subjectId}:${slot.dayOfWeek}`;
          teacherSubjectUsageByDay.set(
            teacherSubjectDailyKey,
            (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) + 1,
          );
        }
      }

      const subjectUsageByDay = new Map<string, number>();
      const teacherUsageByDay = new Map<string, number>();
      const classDayUsage = new Map<number, number>();
      const generatedSlots: GeneratedSlotPreview[] = [];
      const unscheduled: AutoGenerationResult["unscheduled"] = [];

      const demands = shuffleAutoItems(
        periodRequirements
        .flatMap((requirement) => {
          const classSubject = classSubjectMap.get(requirement.classSubjectId);
          if (!classSubject) {
            unscheduled.push({
              classSubjectId: requirement.classSubjectId,
              subjectName: "Unknown subject",
              teacherName: null,
              reason: "Assignment not found for the selected class and section",
            });
            return [];
          }

          return Array.from({ length: requirement.periodsPerWeek }, () => ({
            classSubjectId: requirement.classSubjectId,
            subjectId: classSubject.subjectId,
            subjectName: classSubject.subject?.name || "Unknown subject",
            teacherId: classSubject.teacherId || "",
            teacherName: classSubject.teacher?.name || null,
            periodsPerWeek: requirement.periodsPerWeek,
          }));
        })
        .sort((left, right) => {
          const leftPenalty = left.teacherId ? 0 : 1;
          const rightPenalty = right.teacherId ? 0 : 1;
          if (leftPenalty !== rightPenalty) return leftPenalty - rightPenalty;
          return right.periodsPerWeek - left.periodsPerWeek;
        }),
      ) as AutoGenerationDemand[];

      for (const demand of demands) {
        if (!demand.teacherId) {
          unscheduled.push({
            classSubjectId: demand.classSubjectId,
            subjectName: demand.subjectName,
            teacherName: null,
            reason: "No teacher assigned to this class subject",
          });
          continue;
        }

        const chosen = candidateSlots
          .filter((candidate) => {
            const slotKey = buildAutoSlotKey(candidate.dayOfWeek, candidate.startTime);
            const teacherSubjectDailyKey = `${demand.teacherId}:${demand.subjectId}:${candidate.dayOfWeek}`;
            return (
              !sectionSlotKeys.has(slotKey) &&
              !teacherSlotKeys.has(`${demand.teacherId}:${slotKey}`) &&
              (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) === 0
            );
          })
          .map((candidate) => {
            const subjectDailyKey = `${demand.subjectId}:${candidate.dayOfWeek}`;
            const teacherDailyKey = `${demand.teacherId}:${candidate.dayOfWeek}`;
            const classDayCount = classDayUsage.get(candidate.dayOfWeek) || 0;
            return {
              ...candidate,
              score:
                (subjectUsageByDay.get(subjectDailyKey) || 0) * 1000 +
                (teacherUsageByDay.get(teacherDailyKey) || 0) * 100 +
                classDayCount * 160 +
                candidate.randomOrder,
            };
          })
          .sort((a, b) => a.score - b.score)[0];

        if (!chosen) {
          unscheduled.push({
            classSubjectId: demand.classSubjectId,
            subjectName: demand.subjectName,
            teacherName: demand.teacherName,
            reason: "No conflict-free period is available for this teacher and section",
          });
          continue;
        }

        const slotKey = buildAutoSlotKey(chosen.dayOfWeek, chosen.startTime);
        sectionSlotKeys.add(slotKey);
        teacherSlotKeys.add(`${demand.teacherId}:${slotKey}`);
        const subjectDailyKey = `${demand.subjectId}:${chosen.dayOfWeek}`;
        const teacherDailyKey = `${demand.teacherId}:${chosen.dayOfWeek}`;
        const teacherSubjectDailyKey = `${demand.teacherId}:${demand.subjectId}:${chosen.dayOfWeek}`;
        subjectUsageByDay.set(subjectDailyKey, (subjectUsageByDay.get(subjectDailyKey) || 0) + 1);
        teacherUsageByDay.set(teacherDailyKey, (teacherUsageByDay.get(teacherDailyKey) || 0) + 1);
        teacherSubjectUsageByDay.set(
          teacherSubjectDailyKey,
          (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) + 1,
        );
        classDayUsage.set(chosen.dayOfWeek, (classDayUsage.get(chosen.dayOfWeek) || 0) + 1);

        generatedSlots.push({
          classSubjectId: demand.classSubjectId,
          subjectId: demand.subjectId,
          subjectName: demand.subjectName,
          teacherId: demand.teacherId,
          teacherName: demand.teacherName,
          dayOfWeek: chosen.dayOfWeek,
          startTime: chosen.startTime,
          endTime: chosen.endTime,
          periodNumber: chosen.periodNumber,
        });
      }

      const result: AutoGenerationResult = {
        success: unscheduled.length === 0,
        applied: false,
        generatedSlots,
        unscheduled,
        summary: {
          requestedPeriods: totalRequestedPeriods,
          generatedPeriods: generatedSlots.length,
          unscheduledPeriods: unscheduled.length,
        },
      };

      setAutoPreview(result);

      if (apply) {
        if (unscheduled.length > 0) {
          toast.error("Generation preview contains conflicts. Nothing was saved.");
          return;
        }

        const generatedSchedule: Record<string, ScheduleEntry> = {};
        generatedSlots.forEach((slot) => {
          generatedSchedule[getSlotKey(slot.dayOfWeek, slot.startTime)] = {
            subjectId: slot.subjectId,
            teacherId: slot.teacherId || "",
            room: "",
          };
        });
        setSchedule(generatedSchedule);
        setUnsavedChanges(true);
        result.applied = true;
        setAutoPreview({ ...result });
        toast.success("Generated timetable loaded into the editor. Save to publish it.");
      } else {
        toast.success("Preview generated");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to auto-generate timetable");
    } finally {
      setAutoGenerating(false);
    }
  }, [classSubjects, maxPeriodsPerDay, periodRequirements, selectedClassId, selectedSectionId, selectedYear, totalRequestedPeriods, user?.schoolId]);

  const handleSubjectChange = (day: number, time: string, subjectId: string) => {
    const teacherId = getTeacherForSubject(subjectId);
    const key = getSlotKey(day, time);
    setSchedule(prev => {
      const updated = {
        ...prev,
        [key]: {
          subjectId,
          teacherId,
          room: prev[key]?.room || '',
        }
      };
      return updated;
    });
    setUnsavedChanges(true);
  };

  const clearSlot = (day: number, time: string) => {
    const key = getSlotKey(day, time);
    setSchedule(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    setUnsavedChanges(true);
  };

  const clearSchedule = () => {
    setSchedule({});
    setUnsavedChanges(true);
    toast.info(t.toasts.scheduleCleared);
  };

  const saveSchedule = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedYear) {
      toast.error(t.toasts.selectRequired);
      return;
    }

    try {
      setSaving(true);

      await adminTimetableAPI.clearSectionSlots(selectedClassId, selectedSectionId, {
        academicYearId: selectedYear,
      });

      const slots: any[] = [];
      Object.entries(schedule).forEach(([key, value]) => {
        if (value.subjectId && value.teacherId) {
          const [dayStr, startTime] = key.split('-');
          const day = parseInt(dayStr);
          const range = slotRanges.find((item) => item.start === startTime);
          if (!range) return;

          slots.push({
            classId: selectedClassId,
            sectionId: selectedSectionId,
            subjectId: value.subjectId,
            teacherId: value.teacherId,
            dayOfWeek: day,
            startTime,
            endTime: range.end,
            room: value.room || undefined,
            academicYearId: selectedYear,
          });
        }
      });

      if (slots.length === 0) {
        toast.error(t.toasts.noSlots);
        return;
      }

      const response = await adminTimetableAPI.bulkCreateSlots(slots);

      if (response.data?.success) {
        toast.success(t.toasts.saved.replace("{count}", String(response.data.created.length)));
        if (response.data.errors?.length > 0) {
          toast.warning(t.toasts.conflicts.replace("{count}", String(response.data.errors.length)));
        }
        setUnsavedChanges(false);
        fetchClassData();
      } else {
        toast.error(t.toasts.saveFailed);
      }

    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      toast.error(error.response?.data?.message || t.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  // Filtered subjects for search
  const filteredSubjects = useMemo(() => {
    if (!searchSubject) return subjects;
    return subjects.filter(s => s.name.toLowerCase().includes(searchSubject.toLowerCase()));
  }, [subjects, searchSubject]);

  // Quick fill: fill empty slots with a subject
  const quickFillSubject = (subjectId: string) => {
    const teacherId = getTeacherForSubject(subjectId);
    if (!teacherId) {
      toast.error(t.toasts.noTeacherAssigned);
      return;
    }

    setSchedule(prev => {
      const updated = { ...prev };
      SCHOOL_WEEK_DAYS.forEach(day => {
        slotRanges.forEach(range => {
          const key = getSlotKey(day.value, range.start);
          if (!updated[key]?.subjectId) {
            updated[key] = { subjectId, teacherId, room: '' };
          }
        });
      });
      return updated;
    });
    setUnsavedChanges(true);
    toast.success(t.toasts.emptySlotsFilled);
  };

  if (isLoading || fetchingData) {
    return <TimetablePageSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#111111] dark:to-[#111111] p-2 md:p-4 space-y-3">

        {/* Header */}
        <div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">

              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {t.title}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {t.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unsavedChanges && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">{t.unsavedChanges}</span>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  {t.export}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportTimetablePdf}>
                  <Printer className="w-4 h-4 mr-2" />
                  {t.printSchedule}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportTimetablePdf}>
                  <Download className="w-4 h-4 mr-2" />
                  {t.exportPDF}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <RefreshCw className="w-4 h-4" />
                  {t.clear}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.clearScheduleTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.clearScheduleDesc}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={clearSchedule} className="bg-red-600 hover:bg-red-700">
                    {t.clearSchedule}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              onClick={saveSchedule} 
              disabled={saving || !selectedClassId || !selectedSectionId}
              size="sm"
              className="gap-2 bg-[var(--brand-color,#e35336)] hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t.saveSchedule}
            </Button>

          </div>
        </div>



        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6">

          <Card className="border-0 shadow-sm bg-white dark:bg-[#1A1A1A] overflow-hidden">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-color,#e35336)]/5 to-transparent dark:from-[var(--brand-color,#e35336)]/10" />
              <CardHeader className="relative border-b bg-gray-50/50 dark:bg-[#1A1A1A]/50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-color,#e35336)]/10 dark:bg-[var(--brand-color,#e35336)]/20">
                      <Sparkles className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                    </div>
                    <div>
                      <CardTitle className="text-base dark:text-white">
                        Auto Generate
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Set subject loads, preview, then apply to grid.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAutoGenerate(false)}
                      disabled={autoGenerating || !selectedClassId || !selectedSectionId || !selectedYear}
                      className="gap-2"
                    >
                      {autoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => runAutoGenerate(true)}
                      disabled={autoGenerating || !selectedClassId || !selectedSectionId || !selectedYear}
                      className="gap-2 bg-[var(--brand-color,#e35336)] hover:opacity-90 text-white"
                    >
                      {autoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Use In Grid
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </div>
            <CardContent className="grid gap-3 p-3 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-[#1A1A1A] p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Available / week</div>
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">{periodCount * SCHOOL_WEEK_DAYS.length}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-[#1A1A1A] p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                        <BarChart3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Requested</div>
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">{totalRequestedPeriods}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-[#1A1A1A] p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Subjects</div>
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">{classSubjects.length}</div>
                  </div>
                </div>

                {classSubjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2A2A2A] p-8 text-center">
                    <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No subjects configured</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Select an academic year, class, and section to define subject loads.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] overflow-hidden">
                    <div className="bg-gray-50 dark:bg-[#1A1A1A]/80 px-4 py-2.5 border-b border-gray-200 dark:border-[#2A2A2A]">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Subject Loads</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50">
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400">Subject</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400">Teacher</TableHead>
                          <TableHead className="w-40 text-xs font-semibold text-gray-500 dark:text-gray-400">Periods Needed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classSubjects.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50">
                            <TableCell>
                              <div className="font-medium text-gray-900 dark:text-white">{item.subject?.name || "Unknown subject"}</div>
                              <div className="text-xs text-gray-400">{item.subject?.code || item.subjectId}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-[#2A2A2A] flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {item.teacher?.name?.charAt(0) || "?"}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{item.teacher?.name || "No teacher"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={periodCount > 0 ? periodCount * SCHOOL_WEEK_DAYS.length : 50}
                                value={periodLoads[item.id] || ""}
                                onChange={(event) =>
                                  setPeriodLoads((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className="w-24 h-8 text-center"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {!autoPreview ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2A2A2A] p-8 text-center h-full">
                    <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No preview generated</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Click Preview to see the generated schedule.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-[#1A1A1A] p-2.5">
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Requested</div>
                        <div className="text-lg font-bold text-violet-700 dark:text-violet-400">{autoPreview.summary.requestedPeriods}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-[#1A1A1A] p-2.5">
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Generated</div>
                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{autoPreview.summary.generatedPeriods}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-[#1A1A1A] p-2.5">
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Unscheduled</div>
                        <div className="text-lg font-bold text-red-700 dark:text-red-400">{autoPreview.summary.unscheduledPeriods}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-color,#e35336)]" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Generated Slots</h3>
                      </div>
                      {autoPreview.generatedSlots.length === 0 ? (
                        <p className="text-sm text-gray-400">No generated slots.</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {autoPreview.generatedSlots.map((slot, index) => (
                            <div key={`${slot.classSubjectId}-${index}`} className="rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-[#1A1A1A]/50 p-3 text-sm hover:border-[var(--brand-color,#e35336)]/30 transition-colors">
                              <div className="font-medium text-gray-900 dark:text-white">{slot.subjectName}</div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {slot.teacherName || "Unknown teacher"} · {SCHOOL_WEEK_DAYS.find((day) => day.value === slot.dayOfWeek)?.shortName || slot.dayOfWeek} · Period {slot.periodNumber} · {slot.startTime} - {slot.endTime}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Unscheduled</h3>
                      </div>
                      {autoPreview.unscheduled.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">All subjects scheduled successfully.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {autoPreview.unscheduled.map((item, index) => (
                            <div key={`${item.classSubjectId}-${index}`} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                              <div className="font-medium text-amber-900 dark:text-amber-200">{item.subjectName}</div>
                              <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{item.teacherName || "No teacher"} · {item.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Timetable */}
          <div 
            className="xl:col-span-3"
          >
            <Card className="border bg-white dark:bg-[#1A1A1A] overflow-hidden">
              <CardHeader className="border-b bg-gray-50/50 dark:bg-[#1A1A1A]/50 px-3 sm:px-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Clock className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                      {t.weeklySchedule}
                    </CardTitle>
                    {isPreviewingInGrid && (
                      <CardDescription className="mt-1">
                        Showing the generated preview in the grid. Use `Use In Grid` to load it into the editor.
                      </CardDescription>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Filters
                      config={{ academicYear: true, grade: true, section: true }}
                      sectionMode="name"
                      selectedYear={selectedYear}
                      onYearChange={setSelectedYear}
                      selectedGrade={selectedGrade}
                      onGradeChange={(val) => { setSelectedGrade(val); setSchedule({}); setUnsavedChanges(false); }}
                      selectedSection={selectedSection}
                      onSectionChange={(val) => { setSelectedSection(val); setSchedule({}); setUnsavedChanges(false); }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {selectedClassId && selectedSectionId ? (
                  loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
                        <p className="text-sm text-gray-500">{t.loadingSchedule}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="border-b-2 border-gray-100 dark:border-[#2A2A2A]">
                            <TableHead className="w-28 bg-gray-50/80 dark:bg-[#1A1A1A]/80 font-bold text-gray-700 dark:text-gray-300 sticky left-0 z-10">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {t.time}
                              </div>
                            </TableHead>
                            {SCHOOL_WEEK_DAYS.map((day) => (
                              <TableHead 
                                key={day.value} 
                                className="bg-gray-50/80 dark:bg-[#1A1A1A]/80 text-center min-w-[200px] font-bold text-gray-700 dark:text-gray-300"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span>{t.weekdays[day.shortName]}</span>
                                  <span className="text-[10px] font-normal text-gray-400">
                                    {t.slots.replace("{count}", String(Object.entries(displayedSchedule).filter(([k, entry]) => k.startsWith(`${day.value}-`) && entry.subjectId).length))}
                                  </span>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slotRanges.map((timeRange, timeIndex) => (
                            <TableRow 
                              key={timeRange.start}
                              className={cn(
                                "border-b border-gray-100 dark:border-[#2A2A2A]/50 transition-colors",
                                timeIndex % 2 === 0 ? "bg-white dark:bg-[#1A1A1A]" : "bg-gray-50/30 dark:bg-[#1A1A1A]/50"
                              )}
                            >
                              <TableCell className="font-semibold bg-gray-50/80 dark:bg-[#1A1A1A]/80 sticky left-0 z-10 border-r">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm text-gray-900 dark:text-white">{timeRange.start}</span>
                                  <span className="text-xs text-gray-400">{timeRange.end}</span>
                                </div>
                              </TableCell>

                              {SCHOOL_WEEK_DAYS.map((day) => {
                                const slot = getSlot(day.value, timeRange.start);
                                const isFilled = !!slot.subjectId;
                                const colors = slot.subjectId ? subjectColorMap[slot.subjectId] : null;
                                const slotKey = getSlotKey(day.value, timeRange.start);
                                const isHovered = hoveredSlot === slotKey;

                                return (
                                  <TableCell 
                                    key={day.value} 
                                    className="p-1.5 relative"
                                    onMouseEnter={() => setHoveredSlot(slotKey)}
                                    onMouseLeave={() => setHoveredSlot(null)}
                                  >
                                    
                                      {isFilled ? (
                                        <div
                                          className={cn(
                                            "relative rounded-xl border-2 p-2.5 transition-all",
                                            "bg-[var(--brand-color,#e35336)]/10 border-[var(--brand-color,#e35336)]/30",
                                            isHovered && "scale-[1.02] z-20"
                                          )}
                                        >
                                          {/* Remove button */}
                                          {isHovered && !isPreviewingInGrid && (
                                            <button
                                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--brand-color,#e35336)] text-white rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-colors z-30"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                clearSlot(day.value, timeRange.start);
                                              }}
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}

                                          <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <div className={cn("w-2 h-2 rounded-full shrink-0", "bg-[var(--brand-color,#e35336)]")} />
                                              <p className={cn("font-bold text-sm leading-tight", "text-[var(--brand-color,#e35336)]")}>
                                                {getSubjectName(slot.subjectId)}
                                              </p>
                                            </div>

                                            {showTeacherNames && slot.teacherId && (
                                              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <User className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{getTeacherName(slot.teacherId)}</span>
                                              </div>
                                            )}

                                            {showRoomNumbers && !isPreviewingInGrid && (
                                              <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                                <Input
                                                  placeholder={t.room}
                                                  value={slot.room}
                                                  onChange={(e) => updateSlot(day.value, timeRange.start, 'room', e.target.value)}
                                                  className="h-6 text-xs bg-white/60 dark:bg-[#2A2A2A]/60 border-0 focus:ring-1 focus:ring-[var(--brand-color,#e35336)] px-1.5"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className={cn(
                                            "h-full min-h-[80px] rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2A2A2A] p-2 transition-all",
                                            isHovered && "border-[var(--brand-color,#e35336)]/50 bg-[var(--brand-color,#e35336)]/5"
                                          )}
                                        >
                                          {isPreviewingInGrid ? (
                                            <div className="flex h-full min-h-[60px] items-center justify-center text-center text-xs text-gray-400">
                                              Preview empty slot
                                            </div>
                                          ) : (
                                            <Select
                                              value=""
                                              onValueChange={(v) => handleSubjectChange(day.value, timeRange.start, v)}
                                            >
                                              <SelectTrigger className="h-full min-h-[60px] border-0 bg-transparent hover:bg-gray-50 dark:hover:bg-[#2A2A2A]/50 transition-colors text-xs text-gray-400">
                                                <SelectValue placeholder={t.addSubject} />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-[300px]">
                                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">{t.selectSubject}</div>
                                                {subjects.map((s) => {
                                                  const hasTeacher = !!getTeacherForSubject(s.id);
                                                  return (
                                                    <SelectItem 
                                                      key={s.id} 
                                                      value={s.id}
                                                      disabled={!hasTeacher}
                                                      className="text-sm"
                                                    >
                                                      <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{s.name}</span>
                                                        {!hasTeacher && (
                                                          <Badge variant="outline" className="text-[10px] text-gray-400">
                                                            {t.noTeacher}
                                                          </Badge>
                                                        )}
                                                      </div>
                                                    </SelectItem>
                                                  );
                                                })}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      )}
                                    
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div
                      className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#2A2A2A] dark:to-[#1A1A1A] rounded-3xl flex items-center justify-center mb-6"
                    >
                      <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {t.noClassSelected}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-[var(--brand-color,#e35336)]">
                      <ArrowRight className="w-4 h-4 animate-bounce" />
                      <span>{t.startBySelecting}</span>
                    </div>
                  </div>
                )}
              </CardContent>

              {selectedClassId && selectedSectionId && !loading && (
                <CardFooter className="border-t bg-gray-50/50 dark:bg-[#1A1A1A]/50 px-6 py-4">
                  <div className="flex items-center justify-between w-full text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        {t.filled}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        {t.empty}
                      </span>
                    </div>
                    <p>{t.hint}</p>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminTimetablePage;
