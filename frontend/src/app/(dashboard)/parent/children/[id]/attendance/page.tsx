"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { attendanceAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  createdAt: string;
}

interface ChildInfo {
  id: string;
  userId: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
}

interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
}

const ChildAttendancePage = () => {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const childResponse = await parentDashboardAPI.getChildren();
        const childRows = childResponse.data?.children || childResponse.data || [];
        const childData = (Array.isArray(childRows) ? childRows : []).find((item: any) =>
          item.studentId === childId ||
          item.id === childId ||
          item.student?.id === childId ||
          item.userId === childId ||
          item.student?.userId === childId
        );
        const userId =
          childData?.student?.userId ||
          childData?.student?.user?.id ||
          childData?.userId ||
          childId;
        const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
        const response = await attendanceAPI.getStudentAttendance(userId, { month: monthStr });
        const data = response.data;
        setAttendance(data.records || []);
        setStats(data.summary || null);
        setChild(data.student ? { 
          id: childData?.studentId || childId,
          userId: data.student.id,
          name: data.student.name, 
          studentCode: data.student.studentCode || '',
          className: data.student.className || '',
          section: data.student.section || ''
        } : null);
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [childId, selectedMonth, selectedYear]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-700 border-green-200";
      case "ABSENT":
        return "bg-red-100 text-red-700 border-red-200";
      case "LATE":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "HALF_DAY":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "LEAVE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "HOLIDAY":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "✓";
      case "ABSENT":
        return "✗";
      case "LATE":
        return "⏰";
      case "HALF_DAY":
        return "½";
      case "LEAVE":
        return "📋";
      case "HOLIDAY":
        return "🎉";
      default:
        return "?";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e35336]"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Image src="/close.png" alt="Back" width={20} height={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#e35336]">Attendance Records</h1>
            {child && (
              <p className="text-sm text-gray-500">
                {child.name} • {child.className} - Section {child.section}
              </p>
            )}
          </div>
        </div>
        
        {/* Month/Year Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalDays}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
            <p className="text-2xl font-bold text-blue-600">{stats.attendancePercentage}%</p>
          </div>
        </div>
      )}

      {/* Attendance Progress Bar */}
      {stats && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Monthly Attendance Progress</span>
            <span className="text-sm text-gray-500">{stats.attendancePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.attendancePercentage >= 90
                  ? "bg-green-500"
                  : stats.attendancePercentage >= 75
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${stats.attendancePercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span>Target: 90%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { status: "PRESENT", label: "Present" },
            { status: "ABSENT", label: "Absent" },
            { status: "LATE", label: "Late" },
            { status: "HALF_DAY", label: "Half Day" },
            { status: "LEAVE", label: "Leave" },
            { status: "HOLIDAY", label: "Holiday" },
          ].map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
              </span>
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">Daily Records</h3>
        </div>
        
        {attendance.length === 0 ? (
          <div className="p-8 text-center">
            <Image src="/attendance.png" alt="No records" width={48} height={48} className="mx-auto opacity-50 mb-4" />
            <p className="text-gray-500">No attendance records found for this month</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {attendance.map((record) => (
              <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(record.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {record.remarks && (
                      <p className="text-xs text-gray-500 mt-1">{record.remarks}</p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                  {record.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildAttendancePage;
