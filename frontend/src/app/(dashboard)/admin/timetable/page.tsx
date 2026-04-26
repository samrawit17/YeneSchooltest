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
  Download,
  Printer,
  Eye,
  EyeOff,
  Search,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
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

import api from "@/lib/api";
import { schoolSettingsAPI } from "@/lib/api";
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
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", hover: "hover:bg-rose-100", accent: "bg-rose-500" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", hover: "hover:bg-orange-100", accent: "bg-orange-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", hover: "hover:bg-amber-100", accent: "bg-amber-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", hover: "hover:bg-emerald-100", accent: "bg-emerald-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", hover: "hover:bg-teal-100", accent: "bg-teal-500" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", hover: "hover:bg-cyan-100", accent: "bg-cyan-500" },
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", hover: "hover:bg-blue-100", accent: "bg-blue-500" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", hover: "hover:bg-indigo-100", accent: "bg-indigo-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", hover: "hover:bg-violet-100", accent: "bg-violet-500" },
  { bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-700", hover: "hover:bg-fuchsia-100", accent: "bg-fuchsia-500" },
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
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");

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
      const [classesRes, subjectsRes, academicYearsRes, schoolSettingsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        currentAcademicYear ? api.get(`/academic-years`) : Promise.resolve({ data: [] }),
        user?.schoolId ? schoolSettingsAPI.getAll(user.schoolId) : Promise.resolve({ data: {} }),
      ]);

      setClasses(classesRes.data || []);
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
    if (!selectedSection || selectedSection === "all" || !selectedClassId) return;

    const classInfo = classes.find(c => c.id === selectedClassId);
    if (!classInfo?.sections?.length) return;

    const sectionMatch = classInfo.sections.find(s => s.name === selectedSection);
    if (sectionMatch) {
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

  const fetchClassData = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;

    try {
      setLoading(true);

      const classSubjectsRes = await api.get(`/class-subjects`, {
        params: { schoolId: user?.schoolId }
      });

      const filtered = (classSubjectsRes.data || []).filter(
        (cs: ClassSubject) => cs.classId === selectedClassId && cs.sectionId === selectedSectionId
      );
      setClassSubjects(filtered);

      const slotsRes = await api.get(`/timetable-slots/grid/class/${selectedClassId}`, {
        params: { sectionId: selectedSectionId }
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
  }, [selectedClassId, selectedSectionId, user?.schoolId]);

  useEffect(() => {
    if (selectedClassId && selectedSectionId) {
      fetchClassData();
    }
  }, [fetchClassData, selectedClassId, selectedSectionId]);

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
    const cs = classSubjects.find(c => c.subjectId === subjectId);
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

      await api.delete(`/timetable-slots/class/${selectedClassId}/section/${selectedSectionId}`);

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

      const response = await api.post('/timetable-slots/bulk', { slots });

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
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e35336] rounded-xl shadow-lg shadow-[#e35336]/20">
                <Calendar className="w-6 h-6 text-white" />
              </div>
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">Unsaved changes</span>
              </motion.div>
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
                <DropdownMenuItem>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Schedule
                </DropdownMenuItem>
                <DropdownMenuItem>
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
              className="gap-2 bg-[#e35336] hover:bg-[#d1492e] shadow-lg shadow-[#e35336]/25"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Schedule
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: "Slots Filled", value: `${stats.filledSlots}/${stats.totalSlots}`, icon: LayoutGrid, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Completion", value: `${stats.percentage}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Subjects", value: stats.uniqueSubjects, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
            { label: "Teachers", value: stats.uniqueTeachers, icon: User, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Left Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-1 space-y-4"
          >
            {/* Class Selection */}
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#e35336] to-[#f08060] text-white pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Class Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Filters
                  config={{ academicYear: true, grade: true, section: true }}
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  selectedGrade={selectedGrade}
                  onGradeChange={(val) => { setSelectedGrade(val); setSchedule({}); setUnsavedChanges(false); }}
                  selectedSection={selectedSection}
                  onSectionChange={(val) => { setSelectedSection(val); setSchedule({}); setUnsavedChanges(false); }}
                />
              </CardContent>
            </Card>

            {/* View Controls */}
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  Display Options
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-teachers" className="text-sm cursor-pointer">Show Teachers</Label>
                  <Switch 
                    id="show-teachers" 
                    checked={showTeacherNames} 
                    onCheckedChange={setShowTeacherNames}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-rooms" className="text-sm cursor-pointer">Show Rooms</Label>
                  <Switch 
                    id="show-rooms" 
                    checked={showRoomNumbers} 
                    onCheckedChange={setShowRoomNumbers}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">View Mode</span>
                  <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        viewMode === "grid" ? "bg-white dark:bg-slate-600 shadow-sm" : "text-gray-400"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("compact")}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        viewMode === "compact" ? "bg-white dark:bg-slate-600 shadow-sm" : "text-gray-400"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Assignments */}
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    Subject Assignments
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {classSubjects.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search subjects..."
                    value={searchSubject}
                    onChange={(e) => setSearchSubject(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-2">
                    {filteredSubjects.map((subject, index) => {
                      const cs = classSubjects.find(c => c.subjectId === subject.id);
                      const colors = subjectColorMap[subject.id] || SUBJECT_COLORS[0];
                      const isAssigned = !!cs?.teacherId;

                      return (
                        <motion.div
                          key={subject.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "group relative p-3 rounded-xl border transition-all cursor-pointer",
                            colors.bg,
                            colors.border,
                            "hover:shadow-md hover:scale-[1.02]"
                          )}
                          onClick={() => isAssigned && quickFillSubject(subject.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", colors.accent)} />
                                <p className={cn("font-semibold text-sm truncate", colors.text)}>
                                  {subject.name}
                                </p>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <User className="w-3 h-3" />
                                <span className="truncate">
                                  {cs?.teacher?.name || 'No teacher assigned'}
                                </span>
                              </div>
                              {cs?.teacher?.email && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate pl-5">
                                  {cs.teacher.email}
                                </p>
                              )}
                            </div>
                            {isAssigned && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded">
                                    <RefreshCw className="w-3 h-3 text-gray-500" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Quick fill empty slots</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {!isAssigned && (
                            <div className="absolute inset-0 bg-gray-100/80 dark:bg-slate-700/80 rounded-xl flex items-center justify-center">
                              <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-300">
                                Not Assigned
                              </Badge>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Timetable */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-3"
          >
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#e35336]" />
                      Weekly Schedule
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedClassId && selectedSectionId ? (
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="font-medium">
                            Grade {selectedGrade}
                          </Badge>
                          <Badge variant="outline" className="font-medium">
                            Section {selectedSection}
                          </Badge>
                          <span className="text-gray-400">|</span>
                          <span>{stats.filledSlots} of {stats.totalSlots} slots filled</span>
                        </span>
                      ) : (
                        "Select a class and section to begin editing"
                      )}
                    </CardDescription>
                  </div>

                  {selectedClassId && selectedSectionId && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#e35336] to-[#f08060] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.percentage}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{stats.percentage}%</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {selectedClassId && selectedSectionId ? (
                  loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
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
                                    <AnimatePresence mode="wait">
                                      {isFilled ? (
                                        <motion.div
                                          key="filled"
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          className={cn(
                                            "relative rounded-xl border-2 p-2.5 transition-all",
                                            colors?.bg,
                                            colors?.border,
                                            isHovered && "shadow-lg scale-[1.02] z-20"
                                          )}
                                        >
                                          {/* Remove button */}
                                          {isHovered && (
                                            <motion.button
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-30"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                clearSlot(day.value, timeRange.start);
                                              }}
                                            >
                                              <X className="w-3 h-3" />
                                            </motion.button>
                                          )}

                                          <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <div className={cn("w-2 h-2 rounded-full shrink-0", colors?.accent)} />
                                              <p className={cn("font-bold text-sm leading-tight", colors?.text)}>
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
                                                  className="h-6 text-xs bg-white/60 dark:bg-slate-700/60 border-0 focus:ring-1 focus:ring-[#e35336] px-1.5"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      ) : (
                                        <motion.div
                                          key="empty"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          className={cn(
                                            "h-full min-h-[80px] rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-2 transition-all",
                                            isHovered && "border-[#e35336]/50 bg-[#e35336]/5"
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
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
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
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner"
                    >
                      <Calendar className="w-10 h-10 text-gray-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      No Class Selected
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                      Please select a grade and section from the sidebar to view and edit the timetable
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[#e35336]">
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
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminTimetablePage;
