"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { syncService } from "@/lib/db/sync-service";
import { toast } from "sonner";
import { attendanceAPI, timetableSlotsAPI, teachersAPI } from "@/lib/api";
import { toEthiopian } from "ethiopian-calendar-new";
import {
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  CheckCircle,
  Loader2,
  Search,
  TrendingUp,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Types
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'UNMARKED';

interface TimetableSlot {
  id: string;
  class: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
  };
}

interface ClassOption {
  key: string;
  id: string;
  name: string;
  sectionName: string;
  sectionId?: string;
  type?: 'homeroom';
}

interface StudentAttendance {
  id: string;
  rollNumber: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  avatarUrl?: string;
  status: AttendanceStatus;
  remark: string;
  lastUpdated: string;
}

// Mock data removed - now fetching from API

// Trend data - fetched from API for analytics
interface TrendData {
  day: string;
  present: number;
  absent: number;
  late: number;
}

const defaultTrendData = {
  weekly: [
    { day: "Mon", present: 0, absent: 0, late: 0 },
    { day: "Tue", present: 0, absent: 0, late: 0 },
    { day: "Wed", present: 0, absent: 0, late: 0 },
    { day: "Thu", present: 0, absent: 0, late: 0 },
    { day: "Fri", present: 0, absent: 0, late: 0 },
  ],
  monthly: [
    { day: "Week 1", present: 0, absent: 0, late: 0 },
    { day: "Week 2", present: 0, absent: 0, late: 0 },
    { day: "Week 3", present: 0, absent: 0, late: 0 },
    { day: "Week 4", present: 0, absent: 0, late: 0 },
  ],
  term: [
    { day: "Term 1", present: 0, absent: 0, late: 0 },
    { day: "Term 2", present: 0, absent: 0, late: 0 },
    { day: "Term 3", present: 0, absent: 0, late: 0 },
  ],
};

const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikemet",
  "Hidar",
  "Tahsas",
  "Ter",
  "Yekatit",
  "Megabit",
  "Miyazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

const FALLBACK_ETH_DATE = "Meskerem 1, 2019 E.C.";

export default function TeacherAttendancePage() {
  const { isLoading, user } = useAuth();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { setItems } = useBreadcrumb();

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "My Attendance", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  // Filters
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [ethiopianDate, setEthiopianDate] = useState(() => {
    const today = getTodayDate();
    const date = new Date(`${today}T00:00:00`);
    if (isNaN(date.getTime())) return FALLBACK_ETH_DATE;
    const eth = toEthiopian(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
    const monthName = ETHIOPIAN_MONTHS[eth.month - 1] || "Meskerem";
    return `${monthName} ${eth.day}, ${eth.year} E.C.`;
  });
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("weekly");

  // Data
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Analytics data
  const [trendData, setTrendData] = useState(defaultTrendData);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Session tracking
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Offline tracking
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Loading states
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Teacher's assigned classes and subjects
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<{ id: string; name: string }[]>([]);

  // Fetch teacher's assigned classes and subjects
  const fetchTeacherClasses = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoadingClasses(true);

      // First try to get assignments from the new endpoint
      let slots: TimetableSlot[] = [];
      let classOptionsData: ClassOption[] = [];

      try {
        // Use the new endpoint and keep attendance classes homeroom-only.
        const assignmentsResponse = await teachersAPI.getMyAssignments();
        const assignments = assignmentsResponse.data;
        const homeroomSections = assignments.homeroomSections || [];

        // Build class options from homeroom sections
        const classMap = new Map<string, ClassOption>();

        homeroomSections.forEach((section: any) => {
          const cls = section.class;
          if (!cls) return;

          let sectionName = section.name || 'A';
          const key = `${cls.id}:${section.id}`;
          classMap.set(key, {
            key,
            id: cls.id,
            name: cls.name || `Grade ${cls.grade}`,
            sectionName: sectionName,
            sectionId: section.id,
            type: 'homeroom'
          });
        });

        classOptionsData = Array.from(classMap.values());
        setClassOptions(classOptionsData);

      } catch (assignError) {
        // Fallback to slot list and keep homeroom-only.
        const response = await timetableSlotsAPI.getByTeacher(user.id);
        slots = response.data;

        // Extract only homeroom classes from slots.
        const classMap = new Map<string, ClassOption>();

        slots.forEach((slot: TimetableSlot) => {
          const isHomeroom = (slot.class as any).homeroomTeacherId === user.id;
          if (!isHomeroom) return;

          const key = `${slot.class.id}-${slot.section?.id || 'default'}`;
          let sectionName = slot.section?.name || '';
          if (!sectionName || sectionName === 'All Sections') {
            sectionName = (slot.class as any).section || '';
          }
          if (!classMap.has(key)) {
            classMap.set(key, {
              key,
              id: slot.class.id,
              name: slot.class.name,
              sectionName: sectionName || 'A',
              sectionId: slot.section?.id,
              type: 'homeroom'
            });
          }
        });

        classOptionsData = Array.from(classMap.values());
        setClassOptions(classOptionsData);
      }

      // Set default selections
      if (classOptionsData.length > 0 && !selectedClass) {
        setSelectedClass(classOptionsData[0].key);
      }

      const homeroomSubject = [{ id: "homeroom", name: "Homeroom Attendance" }];
      setSubjectOptions(homeroomSubject);
      if (!selectedSubject) {
        setSelectedSubject(homeroomSubject[0].name);
      }

    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      toast.error('Failed to load your assigned classes', { dismissible: true });
    } finally {
      setIsLoadingClasses(false);
    }
  }, [user?.id, selectedClass, selectedSubject]);

  // Fetch students for selected class
  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return;

    try {
      setIsLoadingStudents(true);

      // Find the section for the selected class
      const selectedClassData = classOptions.find(c => c.key === selectedClass);
      const classId = selectedClassData?.id;
      const className = selectedClassData?.name || '';
      let sectionName = selectedClassData?.sectionName || 'A';
      const sectionId = selectedClassData?.sectionId;

      // Handle "All Sections" case
      if (sectionName === 'All Sections' || sectionName === 'ALL SECTIONS') {
        sectionName = 'A';
      }

      if (!classId) {
        setStudents([]);
        return;
      }

      // Use the session-based approach - open or get an attendance session
      // This is more reliable because it uses the classId directly
      const slotId = `homeroom-${classId}${sectionId ? `:${sectionId}` : ''}`;

      // Helper function to fetch students directly from enrollment
      const fetchStudentsDirectly = async (
        clsId: string,
        sectName: string,
        sectId?: string,
      ) => {
        try {
          const response = await attendanceAPI.getStudentsForClassById(
            clsId,
            className,
            sectName,
            selectedDate,
            sectId,
          );
          const rawStudents = response.data;

          if (rawStudents && rawStudents.length > 0) {
            // Transform to attendance format - always start as UNMARKED
            const attendanceStudents: StudentAttendance[] = rawStudents.map((student: any) => ({
              id: student.userId || student.id,
              rollNumber: student.rollNumber || 'N/A',
              name: student.user?.name || student.name || 'Unknown',
              gender: student.gender || 'MALE',
              avatarUrl: student.avatarUrl,
              status: 'UNMARKED' as AttendanceStatus,
              remark: '',
              lastUpdated: new Date().toISOString()
            }));
            setStudents(attendanceStudents);
            await syncService.cacheStudents(rawStudents.map((student: any) => {
              const id = student.userId || student.id;
              const name = student.user?.name || student.name || '';
              const [firstName, ...lastNameParts] = name.split(' ');
              return {
                id,
                firstName: firstName || name,
                lastName: lastNameParts.join(' '),
                studentId: student.studentId || student.username || id,
                classId: clsId,
                className,
                sectionId: sectId,
                sectionName: sectName,
                photo: student.avatarUrl,
                enrollmentStatus: 'active' as const,
                updatedAt: Date.now(),
              };
            }));
          } else {
            setStudents([]);
          }
        } catch (err) {
          const cachedStudents = await syncService.getCachedStudents(clsId, sectId);
          if (cachedStudents.length > 0) {
            setStudents(cachedStudents.map((student) => ({
              id: student.id,
              rollNumber: student.studentId || 'N/A',
              name: `${student.firstName} ${student.lastName || ''}`.trim() || 'Unknown',
              gender: 'MALE',
              avatarUrl: student.photo,
              status: 'UNMARKED' as AttendanceStatus,
              remark: '',
              lastUpdated: new Date(student.updatedAt || student.cachedAt).toISOString()
            })));
            toast.info('Loaded cached student roster from this device', { dismissible: true });
          } else {
            setStudents([]);
          }
        }
      };

      try {
        // Try to open/get attendance session
        const sessionResponse = await attendanceAPI.openSession(slotId, selectedDate);
        const session = sessionResponse.data;
        // Track session ID and submission status
        setIsSubmitted(session.isSubmitted || session.status === 'SUBMITTED' || false);

        // Check if session has existing attendance records with explicit marks
        if (session.attendanceRecords && session.attendanceRecords.length > 0) {
          // Check if records have explicit status (not default PRESENT)
          const hasExplicitMarks = session.attendanceRecords.some((record: any) =>
            record.status && record.status !== 'PRESENT'
          );

          if (hasExplicitMarks) {
            // Use existing records with their explicit status
            const attendanceStudents: StudentAttendance[] = session.attendanceRecords.map((record: any) => ({
              id: record.studentId,
              rollNumber: record.student?.studentProfile?.rollNumber || 'N/A',
              name: record.student?.name || 'Unknown',
              gender: record.student?.studentProfile?.gender || 'MALE',
              avatarUrl: record.student?.avatarUrl,
              status: record.status as AttendanceStatus,
              remark: record.remark || '',
              lastUpdated: record.updatedAt || new Date().toISOString()
            }));
            setStudents(attendanceStudents);
          } else {
            // No explicit marks yet - get fresh students and set to UNMARKED
            await fetchStudentsDirectly(classId, sectionName, sectionId);
          }
        } else {
          // No records yet - get fresh students and set to UNMARKED
          await fetchStudentsDirectly(classId, sectionName, sectionId);
        }
      } catch (sessionError) {
        setIsSubmitted(false);
        const message = (sessionError as any)?.response?.data?.message;
        if (typeof message === 'string') {
          toast.error(message, { dismissible: true });
        }
        await fetchStudentsDirectly(classId, sectionName, sectionId);
      }

    } catch (error) {
      toast.error('Failed to load students', { dismissible: true });
    } finally {
      setIsLoadingStudents(false);
    }

  }, [selectedClass, classOptions, selectedDate]);

  // Fetch analytics data from teacher dashboard
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const response = await attendanceAPI.getTeacherDashboard();
      const data = response.data;

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      if (data.weeklyStats && data.weeklyStats.length > 0) {
        // Transform weekly stats to trend data format
        const weeklyStats: TrendData[] = data.weeklyStats.map((stat: any) => {
          const date = new Date(stat.date);
          return {
            day: dayNames[date.getDay()],
            present: stat.percentage || 0,
            absent: 100 - (stat.percentage || 0),
            late: 0
          };
        });

        setTrendData(prev => ({
          ...prev,
          weekly: weeklyStats.length >= 5 ? weeklyStats.slice(0, 5) : [...weeklyStats, ...Array(5 - weeklyStats.length).fill({ day: '', present: 0, absent: 0, late: 0 })]
        }));
      }

      // Calculate monthly stats from weekly data
      if (data.weeklyStats && data.weeklyStats.length > 0) {
        const monthlyStats: TrendData[] = [];
        const weeksInMonth = 4;
        for (let i = 0; i < weeksInMonth; i++) {
          const weekData = data.weeklyStats.slice(i * 7, (i + 1) * 7);
          const avgPercentage = weekData.length > 0
            ? weekData.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / weekData.length
            : 0;
          monthlyStats.push({
            day: `Week ${i + 1}`,
            present: Math.round(avgPercentage),
            absent: Math.round(100 - avgPercentage),
            late: 0
          });
        }
        setTrendData(prev => ({ ...prev, monthly: monthlyStats }));
      }

      // Calculate term stats (assuming 3 terms)
      if (data.weeklyStats && data.weeklyStats.length > 0) {
        const termStats: TrendData[] = [];
        const totalWeeks = data.weeklyStats.length;
        const weeksPerTerm = Math.ceil(totalWeeks / 3);

        for (let i = 0; i < 3; i++) {
          const startWeek = i * weeksPerTerm;
          const endWeek = Math.min((i + 1) * weeksPerTerm, totalWeeks);
          const termData = data.weeklyStats.slice(startWeek, endWeek);
          const avgPercentage = termData.length > 0
            ? termData.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / termData.length
            : 0;
          termStats.push({
            day: `Term ${i + 1}`,
            present: Math.round(avgPercentage),
            absent: Math.round(100 - avgPercentage),
            late: 0
          });
        }
        setTrendData(prev => ({ ...prev, term: termStats }));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  // Initial fetch of teacher's classes
  useEffect(() => {
    if (user?.id && !isLoading) {
      fetchTeacherClasses();
      fetchAnalytics();
    }
  }, [user?.id, isLoading, fetchTeacherClasses, fetchAnalytics]);

  // Handle network status changes
  useEffect(() => {
    if (wasOffline && isOnline) {
      toast.success('Back online! Syncing saved attendance.', { dismissible: true });
      syncService.syncNow().finally(() => {
        syncService.getSyncStatus().then((status) => setPendingOfflineCount(status.pendingCount + status.failedCount));
        fetchStudents();
      });
    }
  }, [wasOffline, isOnline, fetchStudents]);

  useEffect(() => {
    syncService.startAutoSync();
    const refreshSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setPendingOfflineCount(status.pendingCount + status.failedCount);
    };
    refreshSyncStatus();
    const interval = setInterval(refreshSyncStatus, 5000);
    return () => {
      clearInterval(interval);
      syncService.stopAutoSync();
    };
  }, []);

  // Show warning when going offline with pending changes
  useEffect(() => {
    if (!isOnline && hasChanges) {
      toast.warning(`You're offline. ${students.filter(s => s.status !== 'UNMARKED').length} records will sync when online.`, { dismissible: true });
    }
  }, [isOnline, hasChanges, students]);

  // Fetch students when class or date changes
  useEffect(() => {
    if (selectedClass && classOptions.length > 0) {
      fetchStudents();
    }
  }, [selectedClass, fetchStudents, classOptions.length, selectedDate]);

  const isWeekendDate = (dateString: string) => {
    const day = new Date(`${dateString}T00:00:00`).getDay();
    return day === 0 || day === 6;
  };

  const getErrorMessage = (error: any, fallback: string) => {
    const responseMessage = error?.response?.data?.message;
    if (Array.isArray(responseMessage)) return responseMessage[0] || fallback;
    if (typeof responseMessage === "string") return responseMessage;
    if (typeof error?.message === "string") return error.message;
    return fallback;
  };

  const isWeekendSelection = isWeekendDate(selectedDate);

  // Ethiopian date conversion
  const getEthiopianDate = (gregorianDate: string): string => {
    try {
      const date = new Date(`${gregorianDate}T00:00:00`);
      if (isNaN(date.getTime())) {
        return FALLBACK_ETH_DATE; // Fallback
      }

      const eth = toEthiopian(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );
      const monthName = ETHIOPIAN_MONTHS[eth.month - 1] || "Meskerem";
      return `${monthName} ${eth.day}, ${eth.year} E.C.`;
    } catch (e) {
      console.error('Error converting date:', e);
      return FALLBACK_ETH_DATE; // Fallback on error
    }
  };

  // Update Ethiopian date when selectedDate changes
  useEffect(() => {
    setEthiopianDate(getEthiopianDate(selectedDate));
  }, [selectedDate]);

  // Check if user can edit (teacher cannot edit past dates or submitted sessions)
  const canEdit = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate >= today && !isSubmitted && !isWeekendSelection;
  };

  const selectedClassMeta = classOptions.find((c) => c.key === selectedClass);
  const selectedSectionLabel = selectedClassMeta?.sectionName?.trim() || 'A';
  const selectedClassLabel = selectedClassMeta
    ? `${selectedClassMeta.name} - Section ${selectedSectionLabel}`
    : 'No Class Selected';

  // Filter students
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, status, lastUpdated: new Date().toISOString() }
        : s
    ));
    setHasChanges(true);
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, remark }
        : s
    ));
    setHasChanges(true);
  };

  const handleMarkAllPresent = () => {
    setStudents(prev => prev.map(s => ({
      ...s,
      status: 'PRESENT' as AttendanceStatus,
      lastUpdated: new Date().toISOString()
    })));
    setHasChanges(true);
  };

  const handleReset = () => {
    fetchStudents();
    setHasChanges(false);
  };

  // Handle manual sync when back online
  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline', { dismissible: true });
      return;
    }

    setIsSyncing(true);
    try {
      const status = await syncService.getSyncStatus();
      if (status.pendingCount === 0 && status.failedCount === 0) {
        toast.info('No pending records to sync', { dismissible: true });
        return;
      }

      const result = await syncService.syncNow();
      const nextStatus = await syncService.getSyncStatus();
      setPendingOfflineCount(nextStatus.pendingCount + nextStatus.failedCount);

      if (result.synced > 0) {
        toast.success(`Successfully synced ${result.synced} records`, { dismissible: true });
        fetchStudents();
      } else {
        toast.error(result.failed > 0 ? 'Some records failed to sync' : 'No records were synced', { dismissible: true });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync', { dismissible: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first', { dismissible: true });
      return;
    }

    // Check if all students are marked
    const unmarkedCount = students.filter(s => s.status === 'UNMARKED').length;
    if (unmarkedCount > 0) {
      toast.error(`Please mark all students before saving. ${unmarkedCount} students are still unmarked.`, { dismissible: true });
      return;
    }

    setIsSaving(true);

    try {
      const selectedClassData = classOptions.find(c => c.key === selectedClass);
      const classId = selectedClassData?.id;

      if (!classId) {
        throw new Error('No class ID found');
      }

      // Create or get session first
      const slotId = `homeroom-${classId}`;

      // Open session
      const sessionResponse = await attendanceAPI.openSession(slotId, selectedDate);
      const session = sessionResponse.data;
      const sessionId = session.id;

      // Prepare attendance records - only save students with explicit status changes
      // Only save students who have been marked (not UNMARKED)
      const records = students
        .filter(student => student.status !== 'UNMARKED')
        .map(student => ({
          studentId: student.id,
          status: student.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
          remark: student.remark || ''
        }));

      // Mark attendance and auto-submit
      await attendanceAPI.markAttendance(sessionId, { records });

      // Auto-submit the session - saving attendance means submitting it
      await attendanceAPI.submitSession(sessionId);

      setIsSubmitted(true);
      setHasChanges(false);
      toast.success('Attendance saved and submitted successfully!', { dismissible: true });

      // Refresh the data
      fetchStudents();
    } catch (error: any) {
      // If offline or API error, save locally
      if (!isOnline) {
        console.log('Offline - saving locally');
        const selectedClassData = classOptions.find(c => c.key === selectedClass);
        const classId = selectedClassData?.id;
        const sectionId = selectedClassData?.sectionId;
        if (!classId || !sectionId) {
          throw new Error('Class and section are required for offline attendance');
        }
        
        const records = students
          .filter(student => student.status !== 'UNMARKED')
          .map(student => ({
            studentId: student.id,
            status: student.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
            remarks: student.remark || ''
          }));

        await Promise.all(records.map((record) =>
          syncService.saveAttendanceOffline({
            studentId: record.studentId,
            classId,
            sectionId,
            sessionId: `${classId}:${sectionId}:${selectedDate}:homeroom`,
            date: selectedDate,
            status: record.status.toLowerCase() as 'present' | 'absent' | 'late' | 'excused',
            remarks: record.remarks,
            recordedBy: user?.id || '',
            recordedAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          })
        ));
        
        setIsSubmitted(true);
        setHasChanges(false);
        const status = await syncService.getSyncStatus();
        setPendingOfflineCount(status.pendingCount + status.failedCount);
        toast.success('Attendance saved offline in IndexedDB. It will sync when online.', { dismissible: true });
      } else {
        console.error('Error saving attendance:', error);
        toast.error(getErrorMessage(error, 'Failed to save attendance'), { dismissible: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Status pill component
  const StatusPill = ({ status, onChange, disabled }: {
    status: AttendanceStatus;
    onChange: (status: AttendanceStatus) => void;
    disabled?: boolean;
  }) => {
    const statusConfig = {
      PRESENT: { label: 'Present', color: 'bg-[rgba(var(--brand-color-rgb),0.12)] dark:bg-[rgba(var(--brand-color-rgb),0.22)] text-[var(--brand-color,#e35336)] border-[rgba(var(--brand-color-rgb),0.18)] hover:bg-[rgba(var(--brand-color-rgb),0.18)] dark:hover:bg-[rgba(var(--brand-color-rgb),0.3)]', selectedColor: 'bg-[var(--brand-color,#e35336)] text-white border-[var(--brand-color,#e35336)]' },
      ABSENT: { label: 'Absent', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50', selectedColor: 'bg-red-600 text-white border-red-600' },
      LATE: { label: 'Late', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50', selectedColor: 'bg-orange-500 text-white border-orange-500' },
      UNMARKED: { label: 'Unmarked', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900/50', selectedColor: 'bg-yellow-500 text-white border-yellow-500' },
    };

    return (
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(statusConfig) as AttendanceStatus[]).filter(s => s !== 'UNMARKED' && s !== 'EXCUSED').map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${status === s
                ? statusConfig[s].selectedColor
                : `${statusConfig[s].color} border-transparent`
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {statusConfig[s].label}
          </button>
        ))}
      </div>
    );
  };

  // Chart component (simplified line chart)
  const TrendChart = ({ data }: { data: { day: string; present: number; absent: number; late: number }[] }) => {
    // Calculate max value for scaling
    const maxValue = Math.max(
      ...data.map(d => d.present + d.absent + d.late),
      1 // Minimum 1 to avoid division by zero
    );

    return (
      <div className="relative h-[180px] sm:h-[150px] w-full overflow-x-auto">
        {/* Chart area */}
        <div className="min-w-[300px] h-full flex items-end gap-2 sm:gap-4 px-2 sm:px-4">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex gap-0.5 sm:gap-1 h-[100px] sm:h-[120px] items-end">
                <div
                  className="flex-1 bg-[var(--brand-color,#e35336)] rounded-t"
                  style={{ height: `${maxValue > 0 ? (item.present / maxValue) * 100 : 0}%` }}
                />
                <div
                  className="flex-1 bg-red-400 rounded-t"
                  style={{ height: `${maxValue > 0 ? (item.absent / maxValue) * 100 : 0}%` }}
                />
                <div
                  className="flex-1 bg-orange-400 rounded-t"
                  style={{ height: `${maxValue > 0 ? (item.late / maxValue) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.day}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-gray-600 dark:text-gray-400 px-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-[var(--brand-color,#e35336)] rounded"></span> Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded"></span> Absent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-400 rounded"></span> Late
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-[#0F172A]">
      <div className="mx-auto w-full min-w-0 px-3 sm:px-6 lg:p-6">
        {/* Top Header */}
        <div className="mb-4 min-w-0 rounded-lg border border-[rgba(var(--brand-color-rgb),0.16)] bg-white p-3 shadow-sm dark:border-[#334155] dark:bg-[#1E293B] sm:mb-6 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            {/* Title */}
            <div className="min-w-0 order-1">
              <h1 className="text-2xl font-bold text-black">Attendance</h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1 hidden sm:block">Mark and monitor daily student attendance</p>
              {isWeekendSelection && (
                <div className="mt-2 inline-flex max-w-full items-start gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <span>Attendance is locked on Saturday and Sunday</span>
                </div>
              )}
              {isSubmitted && (
                <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-[rgba(var(--brand-color-rgb),0.14)] px-3 py-1 text-sm text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.22)]">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Attendance Submitted</span>
                </div>
              )}
              {/* Offline indicator */}
              {!isOnline && (
                <div className="mt-2 inline-flex max-w-full items-start gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  <span>Offline - Changes will sync when online</span>
                </div>
              )}
              {isOnline && pendingOfflineCount > 0 && (
                <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-[rgba(var(--brand-color-rgb),0.14)] px-3 py-1 text-sm text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.22)]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pendingOfflineCount} records pending sync</span>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="order-2 grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              {/* Connection Status Badge */}
              <div className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                isOnline 
                  ? 'bg-[rgba(var(--brand-color-rgb),0.14)] dark:bg-[rgba(var(--brand-color-rgb),0.22)] text-[var(--brand-color,#e35336)]' 
                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {/* Date Picker - Ethiopian Calendar Only */}
              <div className="flex min-w-0 items-center justify-between gap-0.5 rounded-lg border border-[rgba(var(--brand-color-rgb),0.2)] bg-[rgba(var(--brand-color-rgb),0.08)] p-0.5 dark:border-[rgba(var(--brand-color-rgb),0.3)] dark:bg-[rgba(var(--brand-color-rgb),0.16)] sm:gap-1 sm:p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const prevDate = new Date(selectedDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    setSelectedDate(prevDate.toISOString().split('T')[0]);
                  }}
                  className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--brand-color,#e35336)]"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-0.5 sm:px-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--brand-color,#e35336)] hidden sm:block" />
                  <span className="min-w-0 truncate text-center text-xs font-medium text-[var(--brand-color,#e35336)] sm:min-w-[120px] sm:text-sm">
                    {ethiopianDate || getEthiopianDate(selectedDate) || 'Loading...'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const nextDate = new Date(selectedDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    setSelectedDate(nextDate.toISOString().split('T')[0]);
                  }}
                  className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--brand-color,#e35336)]"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>

              {/* Class (Teacher can only view assigned class) */}
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
                disabled={isLoadingClasses}
              >
                <SelectTrigger className="w-full border-[rgba(var(--brand-color-rgb),0.18)] focus:ring-[var(--brand-color,#e35336)] dark:border-[#334155] dark:bg-[#0F172A] dark:text-white sm:w-[180px]">
                  <SelectValue placeholder={isLoadingClasses ? "Loading..." : "Class"} />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#1E293B] dark:border-[#334155]">
                  {classOptions.map(cls => (
                    <SelectItem key={cls.key} value={cls.key} className="dark:text-white dark:focus:bg-[#334155]">
                      {cls.name} - Section {cls.sectionName} {cls.type === 'homeroom' ? '(Homeroom)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>


            </div>
          </div>
        </div>

        {/* Main Body - Student Attendance Table */}
        <Card className="mb-6 min-w-0 overflow-hidden border-[rgba(var(--brand-color-rgb),0.16)] shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <CardHeader className="border-b border-[rgba(var(--brand-color-rgb),0.14)] dark:border-[#334155] pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                <span className="hidden sm:inline">Student Attendance - {selectedClassLabel}</span>
                <span className="sm:hidden">Student Attendance</span>
              </CardTitle>
              {/* Search */}
              <div className="relative w-full sm:w-80 lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-[rgba(var(--brand-color-rgb),0.18)] focus:ring-[var(--brand-color,#e35336)] dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
                />
              </div>
            </div>
          </CardHeader>

          <div className="space-y-3 p-3 sm:hidden">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-color,#e35336)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading students...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {!selectedClass ? "No class selected" : searchTerm.trim().length > 0 ? "No students found" : `No students found for ${selectedClassLabel}.`}
                </p>
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div key={student.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 dark:border-[#334155] dark:bg-[#0F172A]">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{student.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Roll {student.rollNumber}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <StatusPill
                      status={student.status}
                      onChange={(status) => handleStatusChange(student.id, status)}
                      disabled={!canEdit()}
                    />
                  </div>
                  <Input
                    placeholder="Remark..."
                    value={student.remark}
                    onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                    disabled={!canEdit()}
                    className="mt-3 h-9 border-[rgba(var(--brand-color-rgb),0.18)] text-xs focus:ring-[var(--brand-color,#e35336)] dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
                  />
                </div>
              ))
            )}
          </div>

          {/* Table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[700px] sm:min-w-full">
              <thead className="bg-[rgba(var(--brand-color-rgb),0.05)] dark:bg-[#0F172A] border-b border-[rgba(var(--brand-color-rgb),0.14)] dark:border-[#334155]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roll Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                {isLoadingStudents ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-color,#e35336)]" />
                        <span className="text-gray-500 dark:text-gray-400">Loading students...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        {!selectedClass ? (
                          <>
                            <p className="text-gray-500 dark:text-gray-400">No class selected</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm">
                              Select a class to view students.
                            </p>
                          </>
                        ) : searchTerm.trim().length > 0 ? (
                          <>
                            <p className="text-gray-500 dark:text-gray-400">No students found</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm">
                              No results for &quot;{searchTerm.trim()}&quot;.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-500 dark:text-gray-400">No students found</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm">
                              No students found for {selectedClassLabel}.
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-[rgba(var(--brand-color-rgb),0.05)] dark:hover:bg-[#334155]">
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{student.rollNumber}</td>
                      <td className="px-2 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {student.gender === 'MALE' ? 'Male' : 'Female'}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <StatusPill
                          status={student.status}
                          onChange={(status) => handleStatusChange(student.id, status)}
                          disabled={!canEdit()}
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <Input
                          placeholder="Remark..."
                          value={student.remark}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          disabled={!canEdit()}
                          className="w-full sm:w-32 lg:w-48 h-8 border-[rgba(var(--brand-color-rgb),0.18)] focus:ring-[var(--brand-color,#e35336)] dark:border-[#334155] dark:bg-[#0F172A] dark:text-white text-xs sm:text-sm"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        {new Date(student.lastUpdated).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-4 sm:bottom-6 bg-white dark:bg-[#1E293B] border border-[rgba(var(--brand-color-rgb),0.16)] dark:border-[#334155] rounded-lg p-3 sm:p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                onClick={handleMarkAllPresent}
                variant="outline"
                disabled={!canEdit()}
                className="border-[rgba(var(--brand-color-rgb),0.18)] dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:bg-[rgba(var(--brand-color-rgb),0.08)] dark:hover:bg-[#334155] text-xs sm:text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Mark All Present</span>
                <span className="sm:hidden">All Present</span>
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={!canEdit() || !hasChanges}
                className="border-[rgba(var(--brand-color-rgb),0.18)] dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:bg-[rgba(var(--brand-color-rgb),0.08)] dark:hover:bg-[#334155] text-xs sm:text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-1 sm:mr-2" />
                Reset
              </Button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!canEdit() || !hasChanges || isSaving || isSubmitted}
              className="bg-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.9)] text-white min-w-[140px] sm:min-w-[160px] text-xs sm:text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Saving</span>
                </>
              ) : isSubmitted ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Already Submitted</span>
                  <span className="sm:hidden">Submitted</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Save Attendance</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
            {/* Sync Button - shows when online and has pending */}
            {isOnline && pendingOfflineCount > 0 && (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                className="border-[rgba(var(--brand-color-rgb),0.35)] text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.08)]"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Sync ({pendingOfflineCount})</span>
                <span className="sm:hidden">Sync</span>
              </Button>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
