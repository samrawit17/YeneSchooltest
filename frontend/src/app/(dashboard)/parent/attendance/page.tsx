"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Views } from "react-big-calendar";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { attendanceAPI } from "@/lib/api";
import { parentsAPI } from "@/lib/api/people";
import BigCalendar, { type CalendarDisplayEvent } from "@/components/BigCalendar";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearsAPI } from "@/lib/api";

interface ParentAttendanceMessages {
  title: string;
  description: string;
  selectChild: string;
  selectChildPlaceholder: string;
  academicYear: string;
  selectYearPlaceholder: string;
  selectedYearFallback: string;
  unknown: string;
  nA: string;
  errorLoadFailed: string;
  attendance: string;
  totalDays: string;
  present: string;
  absent: string;
  late: string;
  excused: string;
  absenceAlert: string;
  calendarTitle: string;
  calendarDesc: string;
  emptyMessage: string;
  emptyMessageNoChild: string;
  emptyHint: string;
  detailsTitle: string;
  detailsDesc: string;
  date: string;
  status: string;
  remark: string;
}

const AttendanceSkeleton = () => (
  <div className="p-6 space-y-6 dark:bg-[#0F172A] min-h-screen">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-12 w-full max-w-md" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardContent className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

interface Child {
  id: string;
  profileId: string;
  userId: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
}

interface AttendanceRecord {
  id: string;
  status: string;
  remark?: string;
  session: {
    date: string;
    className?: string;
    sectionName?: string;
    subjectName?: string;
    timetableSlot?: {
      className: string;
      sectionName: string;
      subjectName: string;
    } | null;
  };
}

interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused?: number;
  attendancePercentage: number;
}

interface DailyAttendanceRecord {
  id: string;
  date: string;
  status: string;
  remark?: string;
}

const ATTENDANCE_STATUS_PRIORITY: Record<string, number> = {
  ABSENT: 4,
  LATE: 3,
  EXCUSED: 2,
  PRESENT: 1,
};

const formatStatusLabel = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase();

export default function ParentAttendancePage() {
  const { t } = useTranslations<ParentAttendanceMessages>("parentAttendance");
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; startDate?: string; endDate?: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");

  const fetchChildren = useCallback(async () => {
    try {
      setLoading(true);
      const [childrenRes, yearsRes] = await Promise.allSettled([
        parentsAPI.getChildren(),
        academicYearsAPI.getAll(),
      ]);

      const childrenData = childrenRes.status === "fulfilled" 
        ? (childrenRes.value.data?.children || childrenRes.value.data || [])
        : [];
      const normalizedChildren = Array.isArray(childrenData)
        ? childrenData.map((child: any) => ({
            id: child.studentId || child.id,
            profileId: child.studentId || child.id,
            userId: child.student?.userId || child.student?.user?.id || child.student?.id || child.userId,
            name: child.name || child.student?.user?.name || child.studentName || "Unknown",
            studentCode: child.student?.studentCode || child.studentCode || "",
            className: child.className || child.student?.className || "N/A",
            section: child.section || child.student?.section || "N/A",
          }))
        : [];
      setChildren(normalizedChildren);
      if (normalizedChildren.length > 0) {
        setSelectedChild(normalizedChildren[0]);
      }

      let years: { id: string; name: string; startDate?: string; endDate?: string }[] = [];
      if (yearsRes.status === "fulfilled") {
        years = Array.isArray(yearsRes.value.data)
          ? yearsRes.value.data
          : (yearsRes.value.data?.data || []);
        setAcademicYears(years);
      }

      try {
        const activeYearRes = await academicYearsAPI.getActive();
        const activeYear = activeYearRes.data?.data || activeYearRes.data;
        if (activeYear?.id) {
          setSelectedYear(activeYear.id);
          if (years.length === 0) {
            setAcademicYears([{ id: activeYear.id, name: activeYear.name, startDate: activeYear.startDate, endDate: activeYear.endDate }]);
          }
        } else if (years.length > 0) {
          setSelectedYear(years[0].id);
        }
      } catch (error) {}
    } catch (err: any) {
      console.error("Error fetching children:", err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!selectedChild) return;

    try {
      setLoading(true);
      setErrorMessage("");
      const studentIdentifier = selectedChild.profileId || selectedChild.id || selectedChild.userId;
      
      const params: { month?: string; academicYear?: string; startDate?: string; endDate?: string } = {};
      
      if (selectedYear && academicYears.length > 0) {
        const yearConfig = academicYears.find(y => y.id === selectedYear);
        if (yearConfig?.startDate && yearConfig?.endDate) {
          const startDate = new Date(yearConfig.startDate);
          const endDate = new Date(yearConfig.endDate);
          params.startDate = startDate.toISOString().split('T')[0];
          params.endDate = endDate.toISOString().split('T')[0];
        } else {
          params.academicYear = selectedYear;
        }
      }
      
      const response = await attendanceAPI.getStudentAttendance(studentIdentifier, params);
      const attendanceData = response.data?.records || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setSummary(
        response.data?.summary || {
          totalDays: 0,
          present: 0,
          absent: 0,
          late: 0,
          attendancePercentage: 0,
        },
      );
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
      setAttendance([]);
      setSummary({
        totalDays: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendancePercentage: 0,
      });
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [selectedChild, selectedYear, academicYears]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    } else if (!authLoading && isAuthenticated && user?.role !== "PARENT") {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "PARENT") {
      fetchChildren();
    }
  }, [fetchChildren, isAuthenticated, user]);

  useEffect(() => {
    if (selectedChild) {
      fetchAttendance();
    }
  }, [fetchAttendance, selectedChild]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "ABSENT": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "LATE": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  const dailyAttendance = Array.from(
    attendance.reduce((grouped, record) => {
      const dateKey = record.session.date.split("T")[0];
      const existing = grouped.get(dateKey);
      const existingPriority = existing ? ATTENDANCE_STATUS_PRIORITY[existing.status] || 0 : 0;
      const recordPriority = ATTENDANCE_STATUS_PRIORITY[record.status] || 0;

      if (!existing || recordPriority > existingPriority) {
        grouped.set(dateKey, {
          id: record.id,
          date: record.session.date,
          status: record.status,
          remark: record.remark,
        });
      }

      return grouped;
    }, new Map<string, DailyAttendanceRecord>()).values(),
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displaySummary = summary
    ? {
        totalDays: dailyAttendance.length,
        present: dailyAttendance.filter((record) => record.status === "PRESENT").length,
        absent: dailyAttendance.filter((record) => record.status === "ABSENT").length,
        late: dailyAttendance.filter((record) => record.status === "LATE").length,
        excused: dailyAttendance.filter((record) => record.status === "EXCUSED").length,
        attendancePercentage:
          dailyAttendance.length > 0
            ? Math.round(
                (dailyAttendance.filter((record) => record.status === "PRESENT").length /
                  dailyAttendance.length) *
                  100,
              )
            : 0,
      }
    : null;

  const attendanceCalendarEvents: CalendarDisplayEvent[] = dailyAttendance.map((record) => ({
    id: record.id,
    title: formatStatusLabel(record.status),
    startDate: record.date,
    endDate: record.date,
    eventType: `ATTENDANCE_${record.status}`,
    resource: record,
  }));
  const emptyAttendanceMessage = selectedChild
    ? `No submitted attendance for ${selectedChild.name} in ${getSelectedYearName(selectedYear, academicYears)}.`
    : "No submitted attendance for this child in the selected academic year.";

  if (authLoading || !isAuthenticated || user?.role !== "PARENT") {
    return <AttendanceSkeleton />;
  }

  if (initialLoad || loading) {
    return <AttendanceSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 dark:bg-[#0F172A] min-h-screen">
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-color, #e35336)' }}>Child Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View your children's attendance records</p>
        </div>

        {/* Child and Year Selector */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Child</label>
            <Select
              value={selectedChild?.id || ""}
              onValueChange={(value) => {
                const child = children.find((c) => c.id === value);
                setSelectedChild(child || null);
              }}
            >
              <SelectTrigger className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name} - {child.className} ({child.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Academic Year</label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedChild && (
          <>
            {errorMessage && (
              <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <CardContent className="pt-4">
                  <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            {displaySummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Attendance</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--brand-color, #e35336)' }}>{displaySummary.attendancePercentage}%</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Days</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{displaySummary.totalDays}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{displaySummary.present}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Absent</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{displaySummary.absent}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Late</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{displaySummary.late}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Absence Alert */}
            {displaySummary && displaySummary.absent > 3 && (
              <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <CardContent className="pt-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-700 dark:text-red-300">
                    Your child has been absent {displaySummary.absent} times in the selected period.
                    Please contact the school if you have concerns.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6 dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle>Attendance Calendar</CardTitle>
                <CardDescription>
                  {selectedChild.name} attendance for the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BigCalendar
                  events={attendanceCalendarEvents}
                  initialView={Views.MONTH}
                  views={[Views.MONTH]}
                  height={620}
                />
                {dailyAttendance.length === 0 && !loading && (
                  <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {emptyAttendanceMessage}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Once the school submits attendance for this child, the calendar and daily marks will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Records */}
            {loading ? (
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="py-8 text-center">
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--brand-color, #e35336)', borderTopColor: 'transparent' }}></div>
                </CardContent>
              </Card>
            ) : dailyAttendance.length === 0 ? (
              null
            ) : (
              <>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle>Attendance Details</CardTitle>
                  <CardDescription>One daily attendance mark for the selected period.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium dark:text-gray-200">Date</th>
                        <th className="px-4 py-3 text-center text-sm font-medium dark:text-gray-200">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium dark:text-gray-200">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyAttendance.map((record) => (
                        <tr key={record.id} className="border-t dark:border-slate-700">
                          <td className="px-4 py-3 text-sm dark:text-gray-300">
                            <FormattedDate date={record.date} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={getStatusColor(record.status)}>
                              {formatStatusLabel(record.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{record.remark || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
