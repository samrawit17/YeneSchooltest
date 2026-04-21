"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { attendanceAPI } from "@/lib/api";

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

export default function StudentAttendancePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    } else if (!isLoading && isAuthenticated && user?.role !== "STUDENT") {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "STUDENT") {
      fetchAttendance();
      fetchSummary();
    }
  }, [isAuthenticated, user, selectedMonth]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getMyAttendance({ month: selectedMonth });
      setAttendance(response.data || []);
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
      setError(err.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await attendanceAPI.getMyAttendance({ month: selectedMonth });
      const records = response.data || [];
      
      const total = records.length;
      const present = records.filter((r: any) => r.status === "PRESENT").length;
      const absent = records.filter((r: any) => r.status === "ABSENT").length;
      const late = records.filter((r: any) => r.status === "LATE").length;
      const excused = records.filter((r: any) => r.status === "EXCUSED").length;
      
      setSummary({
        total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    } catch (err: any) {
      console.error("Error fetching summary:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-700";
      case "ABSENT":
        return "bg-red-100 text-red-700";
      case "LATE":
        return "bg-yellow-100 text-yellow-700";
      case "EXCUSED":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "STUDENT") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Attendance</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600">Attendance %</p>
            <p className="text-2xl font-bold text-blue-600">{summary.attendancePercentage}%</p>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border rounded-lg px-4 py-2"
          max={new Date().toISOString().slice(0, 7)}
        />
      </div>

      {/* Attendance Records */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : attendance.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-8 rounded text-center">
          No attendance records found for this period.
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Remark</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id} className="border-b">
                  <td className="px-4 py-3">
                    {new Date(record.session.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {record.session.className 
                      ? `${record.session.className}${record.session.sectionName ? ` - ${record.session.sectionName}` : ''}`
                      : record.session.timetableSlot 
                        ? `${record.session.timetableSlot.className} - ${record.session.timetableSlot.sectionName}`
                        : '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    {record.session.subjectName || record.session.timetableSlot?.subjectName || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-sm ${getStatusColor(record.status)}`}
                    >
                      {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{record.remark || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
