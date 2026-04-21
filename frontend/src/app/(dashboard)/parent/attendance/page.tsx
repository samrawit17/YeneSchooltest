"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { attendanceAPI, studentsAPI } from "@/lib/api";
import { Calendar, User, AlertCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Child {
  id: string;
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

export default function ParentAttendancePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    } else if (!isLoading && isAuthenticated && user?.role !== "PARENT") {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "PARENT") {
      fetchChildren();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (selectedChild) {
      fetchAttendance();
    }
  }, [selectedChild, selectedMonth]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getChildren();
      const childrenData = response.data?.children || response.data || [];
      setChildren(Array.isArray(childrenData) ? childrenData : []);
      if (Array.isArray(childrenData) && childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (err: any) {
      console.error("Error fetching children:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedChild) return;

    try {
      setLoading(true);
      // Use userId (User.id) instead of id (StudentProfile.id) for attendance
      const response = await attendanceAPI.getStudentAttendance(selectedChild.userId, {
        month: selectedMonth,
      });
      const attendanceData = response.data?.records || response.data || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      
      const records = Array.isArray(attendanceData) ? attendanceData : [];
      const total = records.length;
      const present = records.filter((r: any) => r.status === "PRESENT").length;
      const absent = records.filter((r: any) => r.status === "ABSENT").length;
      const late = records.filter((r: any) => r.status === "LATE").length;
      
      setSummary({
        total,
        present,
        absent,
        late,
        attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-700";
      case "ABSENT": return "bg-red-100 text-red-700";
      case "LATE": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading || !isAuthenticated || user?.role !== "PARENT") {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e35336]">Child Attendance</h1>
          <p className="text-gray-500 mt-1">View your children's attendance records</p>
        </div>

        {/* Child and Month Selector */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
            <select
              value={selectedChild?.id || ""}
              onChange={(e) => {
                const child = children.find((c) => c.id === e.target.value);
                setSelectedChild(child || null);
              }}
              className="border rounded-lg px-4 py-2 w-full"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name} - {child.className} ({child.section})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-4 py-2"
              max={new Date().toISOString().slice(0, 7)}
            />
          </div>
        </div>

        {selectedChild && (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Attendance</p>
                    <p className="text-2xl font-bold text-blue-600">{summary.attendancePercentage}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Total Days</p>
                    <p className="text-2xl font-bold">{summary.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Present</p>
                    <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Late</p>
                    <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
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
                  <div className="w-8 h-8 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin mx-auto"></div>
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
