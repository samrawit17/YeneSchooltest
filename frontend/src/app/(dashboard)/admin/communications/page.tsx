"use client";

import { useState } from "react";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Download, 
  Calendar,
  User,
  Clock,
  MessageSquare,
  Eye,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { CommunicationStatus } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Types
type DateRange = "all" | "today" | "week" | "month" | "custom";

interface CommunicationOverview {
  id: string;
  studentName: string;
  studentGrade: string;
  parentName: string;
  teacherName: string;
  lastMessage: string;
  status: CommunicationStatus;
  lastActivity: string;
}

// Mock data
const mockCommunications: CommunicationOverview[] = [
  { id: "1", studentName: "John Smith", studentGrade: "Grade 5-A", parentName: "Michael Smith", teacherName: "Mrs. Sarah Johnson", lastMessage: "He's doing well but needs more practice...", status: "OPEN", lastActivity: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", studentName: "Emma Brown", studentGrade: "Grade 5-A", parentName: "Lisa Brown", teacherName: "Mrs. Sarah Johnson", lastMessage: "Thank you for informing us...", status: "ACKNOWLEDGED", lastActivity: new Date(Date.now() - 43200000).toISOString() },
  { id: "3", studentName: "David Wilson", studentGrade: "Grade 5-B", parentName: "Robert Wilson", teacherName: "Mr. Robert Davis", lastMessage: "Thank you for your help. David is improving...", status: "CLOSED", lastActivity: new Date(Date.now() - 86400000).toISOString() },
  { id: "4", studentName: "Sophie Martinez", studentGrade: "Grade 5-A", parentName: "Carlos Martinez", teacherName: "Mrs. Sarah Johnson", lastMessage: "That sounds exciting! What topics...", status: "OPEN", lastActivity: new Date(Date.now() - 1800000).toISOString() },
  { id: "5", studentName: "James Lee", studentGrade: "Grade 5-B", parentName: "Jennifer Lee", teacherName: "Mr. Robert Davis", lastMessage: "I wanted to discuss John's progress...", status: "OPEN", lastActivity: new Date(Date.now() - 14400000).toISOString() },
  { id: "6", studentName: "Ava Johnson", studentGrade: "Grade 6-A", parentName: "John Johnson", teacherName: "Ms. Emily Chen", lastMessage: "Ava is performing exceptionally well...", status: "ACKNOWLEDGED", lastActivity: new Date(Date.now() - 172800000).toISOString() },
  { id: "7", studentName: "Liam Garcia", studentGrade: "Grade 6-A", parentName: "Maria Garcia", teacherName: "Ms. Emily Chen", lastMessage: "Regarding the upcoming project...", status: "OPEN", lastActivity: new Date(Date.now() - 7200000).toISOString() },
  { id: "8", studentName: "Olivia Miller", studentGrade: "Grade 4-A", parentName: "David Miller", teacherName: "Mr. James Wilson", lastMessage: "Thank you for the update...", status: "CLOSED", lastActivity: new Date(Date.now() - 259200000).toISOString() },
];

const grades = ["All Grades", "Grade 4-A", "Grade 4-B", "Grade 5-A", "Grade 5-B", "Grade 6-A", "Grade 6-B"];
const teachers = ["All Teachers", "Mrs. Sarah Johnson", "Mr. Robert Davis", "Ms. Emily Chen", "Mr. James Wilson"];
const statuses = ["All Status", "OPEN", "ACKNOWLEDGED", "CLOSED"];

// KPI Card Component
function KPICard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: CommunicationStatus }) {
  const config = {
    OPEN: { bg: "bg-orange-100", text: "text-orange-800", label: "Open" },
    ACKNOWLEDGED: { bg: "bg-blue-100", text: "text-blue-800", label: "Acknowledged" },
    CLOSED: { bg: "bg-green-100", text: "text-green-800", label: "Closed" },
  }[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
}

export default function AdminCommunicationDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [selectedTeacher, setSelectedTeacher] = useState("All Teachers");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Calculate KPIs
  const totalConversations = mockCommunications.length;
  const openThreads = mockCommunications.filter(c => c.status === "OPEN" || c.status === "ACKNOWLEDGED").length;
  const unreadMessages = mockCommunications.filter(c => c.status === "OPEN").length;
  const resolvedToday = mockCommunications.filter(c => {
    const today = new Date();
    const activityDate = new Date(c.lastActivity);
    return c.status === "CLOSED" && activityDate.toDateString() === today.toDateString();
  }).length;

  const filteredCommunications = mockCommunications.filter(comm => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!comm.studentName.toLowerCase().includes(q) && !comm.parentName.toLowerCase().includes(q) && 
          !comm.teacherName.toLowerCase().includes(q) && !comm.lastMessage.toLowerCase().includes(q)) return false;
    }
    if (selectedGrade !== "All Grades" && comm.studentGrade !== selectedGrade) return false;
    if (selectedTeacher !== "All Teachers" && comm.teacherName !== selectedTeacher) return false;
    if (selectedStatus !== "All Status" && comm.status !== selectedStatus) return false;
    if (dateRange !== "all") {
      const commDate = new Date(comm.lastActivity);
      const now = new Date();
      if (dateRange === "today" && commDate.toDateString() !== now.toDateString()) return false;
      if (dateRange === "week" && commDate < new Date(now.getTime() - 7*24*60*60*1000)) return false;
      if (dateRange === "month" && commDate < new Date(now.getTime() - 30*24*60*60*1000)) return false;
      if (dateRange === "custom") {
        if (startDate && commDate < new Date(startDate)) return false;
        if (endDate && commDate > new Date(endDate)) return false;
      }
    }
    return true;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex-1 p-6 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e35336] flex items-center gap-3">
            <MessageSquare className="w-7 h-7" />
            Communication Overview
          </h1>
          <p className="text-gray-500 mt-1">Monitor and manage all school communications</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard title="Total Conversations" value={totalConversations} icon={MessageSquare} color="bg-blue-100 text-blue-600" />
          <KPICard title="Open Threads" value={openThreads} icon={AlertCircle} color="bg-orange-100 text-orange-600" />
          <KPICard title="Unread Messages" value={unreadMessages} icon={Eye} color="bg-red-100 text-red-600" />
          <KPICard title="Resolved Today" value={resolvedToday} icon={CheckCircle} color="bg-green-100 text-green-600" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search student, parent, or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#1E3A8A]" />
            </div>

            {/* Grade Filter */}
            <div className="relative">
              <button onClick={() => { setGradeDropdownOpen(!gradeDropdownOpen); setTeacherDropdownOpen(false); setStatusDropdownOpen(false); setDateDropdownOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${selectedGrade !== "All Grades" ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50" : "border-[#E2E8F0] text-gray-700"}`}>
                {selectedGrade} <ChevronDown className="w-4 h-4" />
              </button>
              {gradeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10">
                  {grades.map(g => (
                    <button key={g} onClick={() => { setSelectedGrade(g); setGradeDropdownOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC] ${selectedGrade === g ? "bg-blue-50 text-[#1E3A8A]" : ""}`}>{g}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher Filter */}
            <div className="relative">
              <button onClick={() => { setTeacherDropdownOpen(!teacherDropdownOpen); setGradeDropdownOpen(false); setStatusDropdownOpen(false); setDateDropdownOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${selectedTeacher !== "All Teachers" ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50" : "border-[#E2E8F0] text-gray-700"}`}>
                <User className="w-4 h-4" /> {selectedTeacher} <ChevronDown className="w-4 h-4" />
              </button>
              {teacherDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10">
                  {teachers.map(t => (
                    <button key={t} onClick={() => { setSelectedTeacher(t); setTeacherDropdownOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC] ${selectedTeacher === t ? "bg-blue-50 text-[#1E3A8A]" : ""}`}>{t}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setGradeDropdownOpen(false); setTeacherDropdownOpen(false); setDateDropdownOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${selectedStatus !== "All Status" ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50" : "border-[#E2E8F0] text-gray-700"}`}>
                <Filter className="w-4 h-4" /> {selectedStatus} <ChevronDown className="w-4 h-4" />
              </button>
              {statusDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10">
                  {statuses.map(s => (
                    <button key={s} onClick={() => { setSelectedStatus(s); setStatusDropdownOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC] ${selectedStatus === s ? "bg-blue-50 text-[#1E3A8A]" : ""}`}>{s}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <button onClick={() => { setDateDropdownOpen(!dateDropdownOpen); setGradeDropdownOpen(false); setTeacherDropdownOpen(false); setStatusDropdownOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${dateRange !== "all" ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50" : "border-[#E2E8F0] text-gray-700"}`}>
                <Calendar className="w-4 h-4" /> {dateRange === "all" ? "All Time" : dateRange} <ChevronDown className="w-4 h-4" />
              </button>
              {dateDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10">
                  {(["all", "today", "week", "month", "custom"] as DateRange[]).map(r => (
                    <button key={r} onClick={() => { setDateRange(r); setDateDropdownOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC] ${dateRange === r ? "bg-blue-50 text-[#1E3A8A]" : ""}`}>
                      {r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "Custom"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm" />
                <span className="text-gray-500">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm" />
              </div>
            )}

            <button className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Parent</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Teacher</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Message</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Activity</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E2E8F0]">
              {filteredCommunications.map(comm => (
                <TableRow key={comm.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-sm font-medium">
                        {comm.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{comm.studentName}</p>
                        <p className="text-xs text-gray-500">{comm.studentGrade}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700">{comm.parentName}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700">{comm.teacherName}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{comm.lastMessage}</TableCell>
                  <TableCell className="px-4 py-3"><StatusBadge status={comm.status} /></TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500">{formatDate(comm.lastActivity)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <button className="p-2 text-gray-500 hover:text-[#1E3A8A] hover:bg-blue-50 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredCommunications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No communications found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
