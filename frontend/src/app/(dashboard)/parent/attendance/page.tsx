"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { attendanceAPI } from "@/lib/api";
import { parentsAPI } from "@/lib/api/people";
import { Calendar, User, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicYearsAPI } from "@/lib/api";

const buildMonthOptions = (
  selectedYear: string,
  academicYears: { id: string; name: string; startDate?: string; endDate?: string }[]
) => {
  const yearConfig = academicYears.find((year) => year.id === selectedYear);
  const now = new Date();

  if (!yearConfig?.startDate) {
    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), index, 1);
      return {
        value: `${monthDate.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
        label: monthDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }

  const start = new Date(yearConfig.startDate);
  const configuredEnd = yearConfig.endDate ? new Date(yearConfig.endDate) : now;
  const end = configuredEnd < now ? configuredEnd : now;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const options: Array<{ value: string; label: string }> = [];

  while (cursor <= end) {
    options.push({
      value: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return options;
};

const AttendanceSkeleton = () => (
  <div className="p-6 space-y-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-12 w-full max-w-md" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
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

export default function ParentAttendancePage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; startDate?: string; endDate?: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const monthOptions = buildMonthOptions(selectedYear, academicYears);

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
          if (!activeYear.startDate) {
            const currentDate = new Date();
            const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            setSelectedMonth(defaultMonth);
          } else {
            const startDate = new Date(activeYear.startDate);
            const currentDate = new Date();
            const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            setSelectedMonth(currentMonth >= startMonth ? currentMonth : startMonth);
          }
          if (years.length === 0) {
            setAcademicYears([{ id: activeYear.id, name: activeYear.name, startDate: activeYear.startDate, endDate: activeYear.endDate }]);
          }
        } else if (years.length > 0) {
          setSelectedYear(years[0].id);
          const currentDate = new Date();
          const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          setSelectedMonth(defaultMonth);
        }
      } catch (error) {
        const currentDate = new Date();
        const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(defaultMonth);
      }
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
      const studentIdentifier = selectedChild.userId || selectedChild.profileId || selectedChild.id;
      
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
      
      if (selectedMonth) {
        params.month = selectedMonth;
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
      case "PRESENT": return "bg-green-100 text-green-700";
      case "ABSENT": return "bg-red-100 text-red-700";
      case "LATE": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (authLoading || !isAuthenticated || user?.role !== "PARENT") {
    return <AttendanceSkeleton />;
  }

  if (initialLoad || loading) {
    return <AttendanceSkeleton />;
  }

  return (
    <div className="p-4 md:p-6">
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-color, #e35336)' }}>Child Attendance</h1>
          <p className="text-gray-500 mt-1">View your children's attendance records</p>
        </div>

        {/* Child, Year and Month Selector */}
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
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
              onValueChange={(value) => {
                setSelectedYear(value);
                const year = academicYears.find(y => y.id === value);
                if (year?.startDate) {
                  const startDate = new Date(year.startDate);
                  const currentDate = new Date();
                  const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
                  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(currentMonth >= startMonth ? currentMonth : startMonth);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Month</label>
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedChild && (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Attendance</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--brand-color, #e35336)' }}>{summary.attendancePercentage}%</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Days</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalDays}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.present}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Absent</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.absent}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Late</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.late}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Absence Alert */}
            {summary && summary.absent > 3 && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="pt-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700">
                    Your child has been absent {summary.absent} times this month. 
                    Please contact the school if you have concerns.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Attendance Records */}
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--brand-color, #e35336)', borderTopColor: 'transparent' }}></div>
                </CardContent>
              </Card>
            ) : attendance.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No attendance records found for this period.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Subject</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record) => (
                        <tr key={record.id} className="border-t">
                          <td className="px-4 py-3 text-sm">
                            {new Date(record.session.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.session.className 
                              ? `${record.session.className}${record.session.sectionName ? ` - ${record.session.sectionName}` : ''}`
                              : record.session.timetableSlot 
                                ? `${record.session.timetableSlot.className} - ${record.session.timetableSlot.sectionName}`
                                : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.session.subjectName || record.session.timetableSlot?.subjectName || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={getStatusColor(record.status)}>
                              {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.remark || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
