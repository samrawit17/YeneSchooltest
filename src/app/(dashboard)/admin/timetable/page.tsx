"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Save,
  Loader2,
  RefreshCw,
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
import api from "@/lib/api";
import { schoolSettingsAPI } from "@/lib/api";
import {
  getEthiopianSchedule,
  getTeachingSlots,
  getSchoolTimeBounds,
  getSlotRanges,
  SCHOOL_WEEK_DAYS,
} from "@/lib/timetable";

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

const AdminTimetablePage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, any>>({});

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");

  const [schedule, setSchedule] = useState<Record<string, {
    subjectId: string;
    teacherId: string;
    room: string;
  }>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const { startTime: schoolStartTime, endTime: schoolEndTime } = getSchoolTimeBounds(schoolSettings);
  const slotRanges = getSlotRanges(schoolStartTime, schoolEndTime);

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
        api.get('/academic-years'),
        user?.schoolId ? schoolSettingsAPI.getAll(user.schoolId) : Promise.resolve({ data: {} }),
      ]);

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setAcademicYears(academicYearsRes.data || []);
      setSchoolSettings(schoolSettingsRes.data || {});

      // Set current academic year
      const academicYears = academicYearsRes.data || [];
      const currentYear = academicYears.find((y: any) => y.isCurrent) || academicYears[0];
      if (currentYear) {
        setSelectedAcademicYearId(currentYear.id);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setFetchingData(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchInitialData();
    }
  }, [fetchInitialData, isAuthenticated, isLoading]);

  const fetchClassData = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;

    try {
      setLoading(true);

      // Fetch class subjects for this class/section
      const classSubjectsRes = await api.get(`/class-subjects`, {
        params: { schoolId: user?.schoolId }
      });
      
      // Filter for selected class and section
      const filtered = (classSubjectsRes.data || []).filter(
        (cs: ClassSubject) => cs.classId === selectedClassId && cs.sectionId === selectedSectionId
      );
      setClassSubjects(filtered);

      // Fetch existing timetable slots
      const slotsRes = await api.get(`/timetable-slots/grid/class/${selectedClassId}`, {
        params: { sectionId: selectedSectionId }
      });
      
      const slots = slotsRes.data?.slots || [];
      // Initialize schedule from existing slots
      const initialSchedule: Record<string, any> = {};
      slots.forEach((slot: TimetableSlot) => {
        const key = `${slot.dayOfWeek}-${slot.startTime}`;
        initialSchedule[key] = {
          subjectId: slot.subject?.id || '',
          teacherId: slot.teacher?.id || '',
          room: slot.room || '',
        };
      });
      setSchedule(initialSchedule);

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

  const updateSlot = (day: number, time: string, field: string, value: string) => {
    const key = getSlotKey(day, time);
    setSchedule(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  const getSlot = (day: number, time: string) => {
    const key = getSlotKey(day, time);
    return schedule[key] || { subjectId: '', teacherId: '', room: '' };
  };

  const getTeacherForSubject = (subjectId: string) => {
    const cs = classSubjects.find(c => c.subjectId === subjectId);
    return cs?.teacherId || '';
  };

  const handleSubjectChange = (day: number, time: string, subjectId: string) => {
    const teacherId = getTeacherForSubject(subjectId);
    const key = getSlotKey(day, time);
    setSchedule(prev => ({
      ...prev,
      [key]: {
        subjectId,
        teacherId,
        room: prev[key]?.room || '',
      }
    }));
  };

  const saveSchedule = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedAcademicYearId) {
      toast.error('Please select class, section, and academic year');
      return;
    }

    try {
      setSaving(true);

      // Delete existing slots first
      await api.delete(`/timetable-slots/class/${selectedClassId}/section/${selectedSectionId}`);

      // Build slots array
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
            academicYearId: selectedAcademicYearId,
          });
        }
      });

      if (slots.length === 0) {
        toast.error('No slots to save. Please add some subjects to the schedule.');
        return;
      }

      // Bulk create
      const response = await api.post('/timetable-slots/bulk', { slots });
      
      if (response.data?.success) {
        toast.success(`Saved ${response.data.created.length} slots`);
        if (response.data.errors?.length > 0) {
          toast.warning(`${response.data.errors.length} slots had conflicts`);
        }
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

  const clearSchedule = () => {
    setSchedule({});
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  if (isLoading || fetchingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#e35336]" />
          <p className="text-gray-500 dark:text-gray-400">Loading timetable data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Timetable Management</h1>
          <p className="text-gray-500">Create and manage class schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearSchedule}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button onClick={saveSchedule} disabled={saving || !selectedClassId || !selectedSectionId}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Schedule
          </Button>
        </div>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Select Class</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassId} onValueChange={(v) => {
              setSelectedClassId(v);
              setSelectedSectionId('');
              setSchedule({});
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} - Section {c.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Select Section</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedSectionId} 
              onValueChange={setSelectedSectionId}
              disabled={!selectedClassId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Section {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
              <Select 
              value={selectedAcademicYearId} 
              onValueChange={setSelectedAcademicYearId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1E293B] dark:border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Assigned Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold dark:text-white">{classSubjects.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">subjects with teachers</p>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Grid */}
      {selectedClassId && selectedSectionId ? (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              Monday to Friday only. Time bands follow the school&apos;s configured start and end times.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24 bg-gray-50">Time</TableHead>
                      {SCHOOL_WEEK_DAYS.map((day) => (
                        <TableHead key={day.value} className="bg-gray-50 text-center min-w-[180px]">
                          {day.name}
                        </TableHead>
                      ))}
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {slotRanges.map((timeRange) => (
                      <TableRow key={timeRange.start}>
                        <TableCell className="font-medium bg-gray-50">
                          {timeRange.start} - {timeRange.end}
                        </TableCell>
                        {SCHOOL_WEEK_DAYS.map((day) => {
                          const slot = getSlot(day.value, timeRange.start);
                          
                          return (
                            <TableCell key={day.value} className="p-1">
                              <div className="space-y-1">
                                <Select
                                  value={slot.subjectId}
                                  onValueChange={(v) => handleSubjectChange(day.value, timeRange.start, v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {subjects.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {slot.subjectId && (
                                  <Input
                                    placeholder="Room"
                                    value={slot.room}
                                    onChange={(e) => updateSlot(day.value, timeRange.start, 'room', e.target.value)}
                                    className="h-7 text-xs"
                                  />
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Class Selected</h3>
              <p className="text-gray-500">
                Please select a class and section to view and edit the timetable
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject-Teacher Assignment Info */}
      {classSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Assignments</CardTitle>
            <CardDescription>
              Teachers assigned to each subject for this class/section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {classSubjects.map((cs) => (
                <div
                  key={cs.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{cs.subject?.name}</p>
                    <p className="text-sm text-gray-500">
                      {cs.teacher?.name || 'No teacher assigned'}
                    </p>
                  </div>
                  {cs.teacher && (
                    <Badge variant="outline" className="text-xs">
                      {cs.teacher.email}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminTimetablePage;
