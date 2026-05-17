"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Views } from "react-big-calendar";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { lessonsAPI, CreateLessonDto } from "@/lib/api/content";
import { periodTimeAPI, type PeriodTime } from "@/lib/api/siren-period-time";
import BigCalendar, { type CalendarDisplayEvent } from "@/components/BigCalendar";
import { CalendarType, formatTimeByCalendarType } from "@/lib/calendar-utils";
import { toast } from "sonner";
import TableSearch from "@/components/TableSearch";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import {
  BookText,
  Plus,
  Search,
  Filter,
  Calendar,
  BookOpen,
  Users,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  Save,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/dialog";

interface Lesson {
  id: string;
  title: string;
  subject: string | { id: string; schoolId: string; name: string; code: string; isActive: boolean; description: string; grade: string; credits: number; colorCode: string; createdAt: string; updatedAt: string };
  className: string | { id: string; name: string; section: string };
  date?: string;
  lessonDate?: string;
  periodNumber?: number;
  grade?: number;
  section?: string;
  sectionName?: string;
  duration: number;
  status: 'DRAFT' | 'PUBLISHED' | 'PENDING_REVIEW' | 'COVERED' | 'MISSED' | 'RESCHEDULED';
  objective: string;
  lessonContent: string;
  homework: string;
  attachments: Array<{ id: string; name: string; url: string }>;
}

// Helper to get subject name
const getSubjectName = (subject: Lesson['subject']) => {
  if (typeof subject === 'string') return subject;
  return subject?.name || 'N/A';
};

// Helper to get class name
const getClassName = (className: Lesson['className']) => {
  if (typeof className === 'string') return className;
  return className?.name || 'N/A';
};

const PERIOD_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "8:00 AM", end: "8:45 AM" },
  2: { start: "8:45 AM", end: "9:30 AM" },
  3: { start: "9:40 AM", end: "10:25 AM" },
  4: { start: "10:25 AM", end: "11:10 AM" },
  5: { start: "11:20 AM", end: "12:05 PM" },
  6: { start: "12:05 PM", end: "12:50 PM" },
  7: { start: "1:30 PM", end: "2:15 PM" },
  8: { start: "2:15 PM", end: "3:00 PM" },
};

const getLessonDateValue = (lesson: Lesson) => lesson.lessonDate || lesson.date || "";

const getDateKey = (date: Date | string) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

const formatWeekday = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "long" });

const getLessonClassLabel = (lesson: Lesson) => {
  const className = getClassName(lesson.className);
  const section = lesson.sectionName || lesson.section;
  if (className !== "N/A") return section ? `${className} - ${section}` : className;
  if (lesson.grade) return section ? `Grade ${lesson.grade} - ${section}` : `Grade ${lesson.grade}`;
  return "Class N/A";
};

const formatConfiguredTime = (value: string | undefined, calendarType: CalendarType) => {
  if (!value) return "";
  return formatTimeByCalendarType(value, calendarType);
};

const TeacherLessonsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const { schoolCalendarType } = useAcademicYear();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [periodTimes, setPeriodTimes] = useState<Record<number, { start: string; end: string }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formObjective, setFormObjective] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formHomework, setFormHomework] = useState("");
  const [formGrade, setFormGrade] = useState<string>("");
  const [formSection, setFormSection] = useState<string>("");
  const [formAcademicYearId, setFormAcademicYearId] = useState<string>("");
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [formLessonDate, setFormLessonDate] = useState("");
  const [formPeriodNumber, setFormPeriodNumber] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formDataResponse, setFormDataResponse] = useState<any>(null);
  const [formDataLoading, setFormDataLoading] = useState(false);

  // Set breadcrumbs
  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Lesson Plans", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchLessons();
      fetchFormData();
      fetchPeriodTimes();
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (createModalOpen && formDataResponse) {
      setFormTitle("");
      setFormObjective("");
      setFormContent("");
      setFormHomework("");
      setFormLessonDate(new Date().toISOString().split("T")[0]);
      if (formDataResponse.activeAcademicYearId) setFormAcademicYearId(formDataResponse.activeAcademicYearId);
      else if (formDataResponse.academicYears?.length) setFormAcademicYearId(formDataResponse.academicYears[0].id);
      if (formDataResponse.grades?.length && !formGrade) setFormGrade(formDataResponse.grades[0].toString());
      if (formDataResponse.periods?.length) setFormPeriodNumber(formDataResponse.periods[0].value.toString());
    }
  }, [createModalOpen]);

  const fetchFormData = async () => {
    try {
      setFormDataLoading(true);
      const response = await lessonsAPI.getFormData();
      const data: any = response.data;
      setFormDataResponse(data);
      if (data.activeAcademicYearId) setFormAcademicYearId(data.activeAcademicYearId);
      else if (data.academicYears?.length) setFormAcademicYearId(data.academicYears[0].id);
      if (data.grades?.length) setFormGrade(data.grades[0].toString());
      if (data.teacherSubjects?.length === 1) {
        setFormSubjectId(data.teacherSubjects[0].id);
        if (data.teacherSubjects[0].grade) setFormGrade(data.teacherSubjects[0].grade.toString());
        if (data.teacherSubjects[0].section) setFormSection(data.teacherSubjects[0].section);
      }
      if (data.periods?.length) setFormPeriodNumber(data.periods[0].value.toString());
      setFormLessonDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Failed to fetch form data:", error);
    } finally {
      setFormDataLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      // Use /lessons endpoint - backend automatically filters by teacherId for TEACHER role
      const response = await lessonsAPI.listForTeacher();
      setLessons((response.data.data || response.data) as unknown as Lesson[]);
    } catch (error: any) {
      console.error('Failed to fetch lessons:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodTimes = async () => {
    if (!user?.schoolId) return;
    try {
      const response = await periodTimeAPI.list(user.schoolId);
      const mapped = (response.data || []).reduce(
        (acc: Record<number, { start: string; end: string }>, period: PeriodTime) => {
          acc[period.periodNumber] = {
            start: formatConfiguredTime(period.startTime, schoolCalendarType),
            end: formatConfiguredTime(period.endTime, schoolCalendarType),
          };
          return acc;
        },
        {},
      );
      setPeriodTimes(mapped);
    } catch (error) {
      setPeriodTimes({});
    }
  };

  const handleCreateLesson = async () => {
    if (!formTitle || !formSubjectId || !formGrade || !formSection || !formAcademicYearId) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setSubmitting(true);
      await lessonsAPI.create({
        title: formTitle,
        objective: formObjective || undefined,
        lessonContent: formContent || undefined,
        grade: parseInt(formGrade),
        section: formSection,
        academicYearId: formAcademicYearId,
        subjectId: formSubjectId,
        lessonDate: new Date(formLessonDate).toISOString(),
        periodNumber: parseInt(formPeriodNumber) || 1,
        status: "DRAFT",
        homework: formHomework ? { title: formTitle, description: formHomework } : undefined,
      });
      toast.success("Lesson created successfully!");
      setCreateModalOpen(false);
      setFormTitle("");
      setFormObjective("");
      setFormContent("");
      setFormHomework("");
      setFormGrade("");
      setFormSection("");
      setFormSubjectId("");
      await fetchLessons();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    try {
      await lessonsAPI.delete(id);
      toast.success('Lesson deleted successfully');
      await fetchLessons();
    } catch (error: any) {
      console.error('Failed to delete lesson:', error);
      toast.error('Failed to delete lesson');
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getSubjectName(lesson.subject).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || lesson.status === filterStatus;
    const matchesClass = filterClass === "all" || getLessonClassLabel(lesson) === filterClass || getClassName(lesson.className) === filterClass;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 6);
  const lessonsByDay = weekDays.map((day) => {
    const key = getDateKey(day);
    return filteredLessons
      .filter((lesson) => getDateKey(getLessonDateValue(lesson)) === key)
      .sort((left, right) => (left.periodNumber || 99) - (right.periodNumber || 99));
  });
  const lessonCalendarEvents: CalendarDisplayEvent[] = filteredLessons.map((lesson) => {
    const period = lesson.periodNumber || 1;
    const time = periodTimes[period] || PERIOD_TIMES[period];
    return {
      id: lesson.id,
      title: `${getSubjectName(lesson.subject)}: ${lesson.title}${time ? ` ${time.start}` : ""}`,
      startDate: getLessonDateValue(lesson),
      endDate: getLessonDateValue(lesson),
      eventType: "ACADEMIC",
      resource: lesson,
    };
  });

  const classOptions = Array.from(new Set(lessons.map((l) => getLessonClassLabel(l)))).filter(Boolean);

  const stats = {
    total: lessons.length,
    draft: lessons.filter(l => l.status === 'DRAFT').length,
    published: lessons.filter(l => l.status === 'PUBLISHED').length,
    covered: lessons.filter(l => l.status === 'COVERED').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'PUBLISHED':
        return <Badge variant="default">Published</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'COVERED':
        return <Badge variant="outline">Covered</Badge>;
      case 'MISSED':
        return <Badge variant="destructive">Missed</Badge>;
      case 'RESCHEDULED':
        return <Badge variant="outline">Rescheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Lesson Plans</h1>
          <p className="text-gray-500">Create and manage your lesson plans</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Lesson
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Total Lessons</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Draft</p>
                <p className="text-xl font-bold">{stats.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Published</p>
                <p className="text-xl font-bold">{stats.published}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Covered</p>
                <p className="text-xl font-bold">{stats.covered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <TableSearch
          search={searchTerm}
          setSearch={setSearchTerm}
          placeholder="Search lessons..."
          className="flex-1"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="COVERED">Covered</SelectItem>
            <SelectItem value="MISSED">Missed</SelectItem>
            <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classOptions.map((cls) => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lesson Calendar */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg">Lesson Calendar</CardTitle>
          <CardDescription>Weekly calendar view for lesson plans</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <BigCalendar
            events={lessonCalendarEvents}
            initialView={Views.MONTH}
            views={[Views.MONTH]}
            height={640}
            onEventClick={(event) => {
              const lesson = event.resource as Lesson | undefined;
              if (lesson?.id) router.push(`/teacher/lessons/${lesson.id}`);
            }}
          />
        </CardContent>
      </Card>

      {filteredLessons.length === 0 && (
        <div className="text-center py-12">
          <BookText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No lessons found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Lesson Plan</DialogTitle>
            <DialogDescription>Create a new lesson plan for your class</DialogDescription>
          </DialogHeader>
          {formDataLoading ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year *</Label>
                <Select value={formAcademicYearId} onValueChange={setFormAcademicYearId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.academicYears || []).map((year: any) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.isActive && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={formSubjectId} onValueChange={(val) => {
                  setFormSubjectId(val);
                  const sub = formDataResponse?.teacherSubjects?.find((s: any) => s.id === val);
                  if (sub?.grade) setFormGrade(sub.grade.toString());
                  if (sub?.section) setFormSection(sub.section);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.teacherSubjects || []).map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} {subject.code && `(${subject.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select value={formGrade} onValueChange={setFormGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.grades || []).map((g: number) => (
                      <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section *</Label>
                <Select value={formSection} onValueChange={setFormSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.sectionsByGrade?.[parseInt(formGrade)] || []).map((s: any) => (
                      <SelectItem key={s.id} value={s.name}>Section {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lesson Date</Label>
                <CalendarDatePicker
                  value={formLessonDate ? new Date(formLessonDate) : undefined}
                  onChange={(date) => setFormLessonDate(date ? date.toISOString().split("T")[0] : "")}
                  placeholder="Select lesson date"
                />
              </div>
              <div className="space-y-2">
                <Label>Period Number</Label>
                <Select value={formPeriodNumber} onValueChange={setFormPeriodNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.periods || []).map((p: any) => (
                      <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-title">Title *</Label>
              <Input
                id="modal-title"
                placeholder="Enter lesson title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-objective">Learning Objective</Label>
              <Textarea
                id="modal-objective"
                placeholder="What will students learn from this lesson?"
                value={formObjective}
                onChange={(e) => setFormObjective(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-content">Lesson Content</Label>
              <Textarea
                id="modal-content"
                placeholder="Detailed lesson content and activities..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-homework">Homework</Label>
              <Textarea
                id="modal-homework"
                placeholder="Assignments for students..."
                value={formHomework}
                onChange={(e) => setFormHomework(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateLesson} disabled={submitting}>
                <Save className="w-4 h-4 mr-2" />
                {submitting ? "Saving..." : "Save Lesson"}
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherLessonsPage;
