"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { attendanceAPI, classesAPI } from "@/lib/api";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  Filter,
  ChevronDown
} from "lucide-react";

interface Class {
  id: string;
  name: string;
  grade: number;
}

interface AttendanceSession {
  id: string;
  date: string;
  status: "DRAFT" | "SUBMITTED";
  takenBy: string;
  timetableSlot: {
    id: string;
    class: { id: string; name: string; grade: number };
    section: { id: string; name: string };
    subject: { name: string; code?: string };
    teacher: { id: string; name: string };
  };
  records: Array<{
    id: string;
    studentId: string;
    student: { id: string; name: string; rollNumber: string };
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remark?: string;
  }>;
}

export default function AttendanceListPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
    // Redirect teachers to their own attendance page
    if (!isLoading && user?.role === 'TEACHER') {
      router.push('/teacher/attendance');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchClasses();
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchSessions();
    }
  }, [isAuthenticated, isLoading, selectedDate, selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      setClasses(response.data);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getAllSessions({
        startDate: selectedDate,
        endDate: selectedDate,
        classId: selectedClass || undefined,
      });
      setSessions(response.data);
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      toast.error("Failed to load attendance sessions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      case 'EXCUSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ABSENT': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'LATE': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'EXCUSED': return <FileText className="w-4 h-4 text-gray-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Stats calculation
  const totalSessions = sessions.length;
  const submittedSessions = sessions.filter(s => s.status === 'SUBMITTED').length;
  const draftSessions = sessions.filter(s => s.status === 'DRAFT').length;
  const totalRecords = sessions.reduce((acc, s) => acc + s.records.length, 0);
  const presentRecords = sessions.reduce((acc, s) => acc + s.records.filter(r => r.status === 'PRESENT').length, 0);
  const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#e35336]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Attendance Records</h1>
          <p className="text-gray-600">View and manage all attendance records</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Grade {cls.grade} - {cls.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Sessions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">Submitted</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{submittedSessions}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-700">Draft</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{draftSessions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Records</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
        </div>
        <div className={`rounded-lg shadow p-4 border ${
          attendanceRate >= 90 
            ? 'bg-green-100 border-green-200' 
            : attendanceRate >= 75 
              ? 'bg-yellow-100 border-yellow-200'
              : 'bg-red-100 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">Attendance Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{attendanceRate}%</p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Records Found</h3>
            <p className="text-gray-600">No attendance records found for this date.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {session.timetableSlot.class.name} - {session.timetableSlot.section.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {session.timetableSlot.subject.name} | {session.timetableSlot.teacher.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      session.status === 'SUBMITTED' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {session.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {session.records.map((record) => (
                    <div 
                      key={record.id} 
                      className={`p-2 rounded-lg border ${getStatusColor(record.status)}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {getStatusIcon(record.status)}
                        <span className="text-xs font-medium">{record.status}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{record.student.name}</p>
                      <p className="text-xs opacity-75">{record.student.rollNumber}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
