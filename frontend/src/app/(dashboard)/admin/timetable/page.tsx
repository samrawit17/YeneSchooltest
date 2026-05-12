"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
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

const AdminTimetablePage = () => {
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const { startTime: schoolStartTime, endTime: schoolEndTime } = getSchoolTimeBounds(schoolSettings);
  const slotRanges = getSlotRanges(schoolStartTime, schoolEndTime);

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

      setSubjects(subjectsRes.data || []);
      setAcademicYears(academicYearsRes.data || []);
      setSchoolSettings(schoolSettingsRes.data || {});
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setFetchingData(false);
    }
  }, [user?.schoolId, currentAcademicYear]);

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
      toast.error('Failed to load classes');
      setClasses([]);
    }
  }, [selectedYear]);

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
      if (classInfo?.sections?.length > 0) {
        const firstSectionName = classInfo.sections[0].name;
        setSelectedSection(firstSectionName);
        setSelectedSectionId(classInfo.sections[0].id);
      }
    }
  }, [selectedClassId, classes, fetchingData, selectedSection]);

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
        schoolId: user?.schoolId,
        academicYearId: selectedYear,
      });

      const filtered = (classSubjectsRes.data || []).filter(
        (cs: ClassSubject) => cs.classId === selectedClassId && cs.sectionId === selectedSectionId
      );
      setClassSubjects(filtered);

      const slotsRes = await adminTimetableAPI.getGrid(selectedClassId, {
        sectionId: selectedSectionId
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
      toast.error('Failed to load class schedule');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId, selectedYear, user?.schoolId]);

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

  const getSlot = (day: number, time: string): ScheduleEntry => {
    const key = getSlotKey(day, time);
    return schedule[key] || { subjectId: '', teacherId: '', room: '' };
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
    toast.info("Schedule cleared. Do not forget to save!");
  };

  const saveSchedule = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedYear) {
      toast.error('Please select class, section, and academic year');
      return;
    }

    try {
      setSaving(true);

      await adminTimetableAPI.clearSectionSlots(selectedClassId, selectedSectionId);

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
        toast.error('No slots to save. Please add some subjects to the schedule.');
        return;
      }

      const response = await adminTimetableAPI.bulkCreateSlots(slots);

      if (response.data?.success) {
        toast.success(`Saved ${response.data.created.length} slots`);
        if (response.data.errors?.length > 0) {
          toast.warning(`${response.data.errors.length} slots had conflicts`);
        }
        setUnsavedChanges(false);
        fetchClassData();
      } else {
        toast.error('Failed to save schedule');
      }

    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to save schedule');
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
      toast.error('No teacher assigned to this subject');
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
    toast.success('Empty slots filled');
  };

  if (isLoading || fetchingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-[#e35336]" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-[#e35336]/20 animate-ping" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading timetable data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8 space-y-6">

        {/* Header */}
        <div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">

              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Timetable Management
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Create and manage class schedules with ease
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
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">Unsaved changes</span>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Schedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <RefreshCw className="w-4 h-4" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all subjects from the current timetable. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearSchedule} className="bg-red-600 hover:bg-red-700">
                    Clear Schedule
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              onClick={saveSchedule} 
              disabled={saving || !selectedClassId || !selectedSectionId}
              size="sm"
              className="gap-2 bg-[var(--brand-color,#e35336)] hover:opacity-90 shadow-lg shadow-[var(--brand-color,#e35336)]/25"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Schedule
            </Button>
          </div>
        </div>



        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6">

          {/* Main Timetable */}
          <div>
          </div>

          {/* Main Timetable */}
          <div 
            className="xl:col-span-3"
          >
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Clock className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                      Weekly Schedule
                    </CardTitle>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 ml-auto">
                    {selectedClassId && selectedSectionId && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[var(--brand-color,#e35336)] rounded-full"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{stats.percentage}%</span>
                      </div>
                    )}
                    
                    <Filters
                      config={{ academicYear: true, grade: true, section: true }}
                      sectionMode="name"
                      className="!w-auto"
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
                        <p className="text-sm text-gray-500">Loading schedule...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="border-b-2 border-gray-100 dark:border-slate-700">
                            <TableHead className="w-28 bg-gray-50/80 dark:bg-slate-800/80 font-bold text-gray-700 dark:text-gray-300 sticky left-0 z-10">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Time
                              </div>
                            </TableHead>
                            {SCHOOL_WEEK_DAYS.map((day) => (
                              <TableHead 
                                key={day.value} 
                                className="bg-gray-50/80 dark:bg-slate-800/80 text-center min-w-[200px] font-bold text-gray-700 dark:text-gray-300"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span>{day.name}</span>
                                  <span className="text-[10px] font-normal text-gray-400">
                                    {Object.entries(schedule).filter(([k]) => k.startsWith(`${day.value}-`) && schedule[k].subjectId).length} slots
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
                                "border-b border-gray-100 dark:border-slate-700/50 transition-colors",
                                timeIndex % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50/30 dark:bg-slate-800/50"
                              )}
                            >
                              <TableCell className="font-semibold bg-gray-50/80 dark:bg-slate-800/80 sticky left-0 z-10 border-r">
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
                                            isHovered && "shadow-lg scale-[1.02] z-20"
                                          )}
                                        >
                                          {/* Remove button */}
                                          {isHovered && (
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

                                            {showRoomNumbers && (
                                              <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                                <Input
                                                  placeholder="Room"
                                                  value={slot.room}
                                                  onChange={(e) => updateSlot(day.value, timeRange.start, 'room', e.target.value)}
                                                  className="h-6 text-xs bg-white/60 dark:bg-slate-700/60 border-0 focus:ring-1 focus:ring-[var(--brand-color,#e35336)] px-1.5"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className={cn(
                                            "h-full min-h-[80px] rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-2 transition-all",
                                            isHovered && "border-[var(--brand-color,#e35336)]/50 bg-[var(--brand-color,#e35336)]/5"
                                          )}
                                        >
                                          <Select
                                            value=""
                                            onValueChange={(v) => handleSubjectChange(day.value, timeRange.start, v)}
                                          >
                                            <SelectTrigger className="h-full min-h-[60px] border-0 bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-xs text-gray-400">
                                              <SelectValue placeholder="+ Add Subject" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Select Subject</div>
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
                                                          No teacher
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </SelectItem>
                                                );
                                              })}
                                            </SelectContent>
                                          </Select>
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
                      className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner"
                    >
                      <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      No Class Selected
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                      Please select a grade and section from the sidebar to view and edit the timetable
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[var(--brand-color,#e35336)]">
                      <ArrowRight className="w-4 h-4 animate-bounce" />
                      <span>Start by selecting a class</span>
                    </div>
                  </div>
                )}
              </CardContent>

              {selectedClassId && selectedSectionId && !loading && (
                <CardFooter className="border-t bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4">
                  <div className="flex items-center justify-between w-full text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Filled
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        Empty
                      </span>
                    </div>
                    <p>Click on empty slots to add subjects • Hover over filled slots to remove</p>
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
