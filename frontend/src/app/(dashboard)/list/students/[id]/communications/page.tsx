"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Download, 
  Calendar,
  User,
  Clock,
  MessageSquare,
  X,
  Send,
  ArrowLeft
} from "lucide-react";
import { studentsAPI } from "@/lib/api";
import {
  CommunicationStatus,
  CommunicationReply,
  communicationsAPI,
} from "@/lib/api/communications";
import { useAuth } from "@/context/AuthContext";

// Types
type DateRange = "all" | "today" | "week" | "month" | "custom";

interface StudentCommunication {
  id: string;
  studentName: string;
  studentId: string;
  parentName: string;
  teacherName: string;
  subject: string;
  message: string;
  status: CommunicationStatus;
  createdAt: string;
  updatedAt: string;
  replies: CommunicationReply[];
}

// Mock data
const mockCommunications: StudentCommunication[] = [
  {
    id: "1",
    studentName: "John Smith",
    studentId: "s1",
    parentName: "Michael Smith",
    teacherName: "Mrs. Sarah Johnson",
    subject: "Academic Progress",
    message: "I wanted to discuss John's progress in Mathematics. He has been showing improvement in class but struggles with fractions.",
    status: "OPEN",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    replies: [
      {
        id: "r1",
        message: "Thank you for reaching out. How is he performing in class?",
        createdAt: new Date(Date.now() - 72000000).toISOString(),
        sender: { id: "p1", name: "Michael Smith", role: "Parent" }
      },
      {
        id: "r2",
        message: "He's doing well but needs more practice with fractions.",
        createdAt: new Date(Date.now() - 68000000).toISOString(),
        sender: { id: "t1", name: "Mrs. Sarah Johnson", role: "Teacher" }
      }
    ]
  },
  {
    id: "2",
    studentName: "John Smith",
    studentId: "s1",
    parentName: "Michael Smith",
    teacherName: "Mr. Robert Davis",
    subject: "Science Project",
    message: "Regarding the upcoming science fair, John needs help choosing a topic.",
    status: "ACKNOWLEDGED",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    replies: []
  },
  {
    id: "3",
    studentName: "John Smith",
    studentId: "s1",
    parentName: "Michael Smith",
    teacherName: "Mrs. Sarah Johnson",
    subject: "Attendance",
    message: "John was absent on Monday due to a doctor appointment.",
    status: "CLOSED",
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date(Date.now() - 518400000).toISOString(),
    replies: []
  }
];

const teachers = [
  { id: "t1", name: "Mrs. Sarah Johnson" },
  { id: "t2", name: "Mr. Robert Davis" },
  { id: "t3", name: "Ms. Emily Chen" }
];

// Status Badge Component
function StatusBadge({ status }: { status: CommunicationStatus }) {
  const statusConfig = {
    OPEN: { bg: "bg-orange-100", text: "text-orange-800", label: "Open" },
    ACKNOWLEDGED: { bg: "bg-blue-100", text: "text-blue-800", label: "Acknowledged" },
    CLOSED: { bg: "bg-green-100", text: "text-green-800", label: "Closed" },
  };
  const config = statusConfig[status] || statusConfig.OPEN;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Inner component that uses useSearchParams
function CommunicationsContent({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const composeMode = searchParams.get("compose") === "true";
  
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommunication, setSelectedCommunication] = useState<StudentCommunication | null>(null);
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [showComposeForm, setShowComposeForm] = useState(composeMode);
  const [selectedStudent, setSelectedStudent] = useState<{id: string, name: string} | null>(null);
  const [composeForm, setComposeForm] = useState({
    subject: "",
    message: "",
    priority: "NORMAL" as "NORMAL" | "HIGH" | "LOW"
  });
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedStudentUserId, setResolvedStudentUserId] = useState(studentId);

  useEffect(() => {
    let cancelled = false;

    const resolveStudentId = async () => {
      try {
        const response = await studentsAPI.getById(studentId);
        const resolvedUserId = response.data?.user?.id;
        if (!cancelled) {
          setResolvedStudentUserId(resolvedUserId || studentId);
        }
      } catch {
        if (!cancelled) {
          setResolvedStudentUserId(studentId);
        }
      }
    };

    resolveStudentId();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // Fetch student info when in compose mode
  useEffect(() => {
    if (showComposeForm && studentId) {
      // In a real app, we'd fetch student details
      setSelectedStudent({ id: studentId, name: `Student #${studentId}` });
    }
  }, [showComposeForm, studentId]);

  const filteredCommunications = mockCommunications.filter(comm => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!comm.message.toLowerCase().includes(query) && 
          !comm.subject.toLowerCase().includes(query) &&
          !comm.teacherName.toLowerCase().includes(query)) return false;
    }
    if (selectedTeacher && comm.teacherName !== selectedTeacher) return false;
    
    if (dateRange !== "all") {
      const commDate = new Date(comm.createdAt);
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const handleExportPDF = () => alert("Exporting to PDF...");

  const handleSendMessage = async () => {
    if (!composeForm.subject.trim() || !composeForm.message.trim()) {
      alert("Please fill in subject and message");
      return;
    }
    setIsSending(true);
    setIsLoading(true);
    try {
      await communicationsAPI.create({
        studentId: resolvedStudentUserId,
        subject: composeForm.subject,
        message: composeForm.message,
      });
      alert("Message sent successfully!");
      setShowComposeForm(false);
      setComposeForm({ subject: "", message: "", priority: "NORMAL" });
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
      setIsLoading(false);
    }
  };

  // If compose mode, show the compose form
  if (showComposeForm) {
    return (
      <div className="flex flex-col h-full bg-[#F8FAFC]">
        <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowComposeForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <MessageSquare className="w-5 h-5 text-[#1E3A8A]" />
              <h1 className="text-lg font-semibold text-gray-900">Send Message</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto bg-white rounded-lg border border-[#E2E8F0] p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">Parent/Guardian of Student #{studentId}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{user?.name || "Teacher"}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Enter message subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="flex gap-3">
                {(["NORMAL", "HIGH", "LOW"] as const).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setComposeForm({ ...composeForm, priority })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      composeForm.priority === priority
                        ? priority === "HIGH" 
                          ? "bg-red-100 text-red-800 border-2 border-red-300"
                          : priority === "LOW"
                            ? "bg-gray-100 text-gray-800 border-2 border-gray-300"
                            : "bg-blue-100 text-blue-800 border-2 border-blue-300"
                        : "bg-white border border-[#E2E8F0] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {priority === "HIGH" ? "🔴 High" : priority === "LOW" ? "⚪ Low" : "🔵 Normal"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Message <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Write your message to the parent/guardian..."
                value={composeForm.message}
                onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#1E3A8A] resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowComposeForm(false)}
                className="px-4 py-2 border border-[#E2E8F0] text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: show communication history
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#1E3A8A]" />
            <h1 className="text-lg font-semibold text-gray-900">Communication History</h1>
            <span className="text-sm text-gray-500">({mockCommunications.length} total)</span>
          </div>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 text-sm">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#1E3A8A]" />
          </div>

          <div className="relative">
            <button onClick={() => { setTeacherDropdownOpen(!teacherDropdownOpen); setDateDropdownOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${selectedTeacher ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50" : "border-[#E2E8F0] text-gray-700"}`}>
              <User className="w-4 h-4" /> {selectedTeacher || "Filter by Teacher"} <ChevronDown className="w-4 h-4" />
            </button>
            {teacherDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10">
                <button onClick={() => { setSelectedTeacher(""); setTeacherDropdownOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC]">All Teachers</button>
                {teachers.map(t => (
                  <button key={t.id} onClick={() => { setSelectedTeacher(t.name); setTeacherDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC] ${selectedTeacher === t.name ? "bg-blue-50 text-[#1E3A8A]" : ""}`}>{t.name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setDateDropdownOpen(!dateDropdownOpen); setTeacherDropdownOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${dateRange !== "all" ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50" : "border-[#E2E8F0] text-gray-700"}`}>
              <Calendar className="w-4 h-4" /> {dateRange === "all" ? "Filter by Date" : dateRange} <ChevronDown className="w-4 h-4" />
            </button>
            {dateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10">
                {(["all", "today", "week", "month", "custom"] as DateRange[]).map(r => (
                  <button key={r} onClick={() => { setDateRange(r); setDateDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F8FAFC] ${dateRange === r ? "bg-blue-50 text-[#1E3A8A]" : ""}`}>
                    {r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "Custom Range"}
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

          {(selectedTeacher || dateRange !== "all" || searchQuery) && (
            <button onClick={() => { setSelectedTeacher(""); setDateRange("all"); setStartDate(""); setEndDate(""); setSearchQuery(""); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /> Clear</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-full md:w-[400px] border-r border-[#E2E8F0] bg-white overflow-y-auto">
          {filteredCommunications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" /><p className="text-gray-500 text-sm">No communications found</p>
            </div>
          ) : (
            filteredCommunications.map(comm => (
              <button key={comm.id} onClick={() => setSelectedCommunication(comm)}
                className={`w-full p-4 border-b border-[#E2E8F0] text-left hover:bg-[#F8FAFC] ${selectedCommunication?.id === comm.id ? "bg-[#F8FAFC] border-l-4 border-l-[#1E3A8A]" : ""}`}>
                <div className="flex items-center justify-between mb-2"><span className="font-medium text-sm">{comm.subject}</span><StatusBadge status={comm.status} /></div>
                <div className="flex items-center gap-2 mb-2"><User className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">{comm.teacherName}</span></div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{comm.message}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{formatDate(comm.createdAt)}</div>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6">
          {selectedCommunication ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
                <div><h2 className="text-lg font-semibold mb-1">{selectedCommunication.subject}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><User className="w-4 h-4" />{selectedCommunication.teacherName}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(selectedCommunication.createdAt)}</span>
                  </div>
                </div>
                <StatusBadge status={selectedCommunication.status} />
              </div>
              <div className="mb-6"><h3 className="text-sm font-medium text-gray-700 mb-2">Message</h3>
                <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]">
                  <div className="flex items-center gap-2 mb-2"><span className="font-medium text-sm">{selectedCommunication.teacherName}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Teacher</span>
                  </div>
                  <p className="text-sm text-gray-700">{selectedCommunication.message}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-400"><Clock className="w-3 h-3" />{formatDate(selectedCommunication.createdAt)} at {formatTime(selectedCommunication.createdAt)}</div>
                </div>
              </div>
              {selectedCommunication.replies.length > 0 && (
                <div><h3 className="text-sm font-medium text-gray-700 mb-3">Responses ({selectedCommunication.replies.length})</h3>
                  <div className="space-y-4">
                    {selectedCommunication.replies.map(reply => (
                      <div key={reply.id} className={`rounded-lg p-4 border ${reply.sender?.role === "Teacher" ? "bg-blue-50 border-blue-100" : "bg-white border-[#E2E8F0]"}`}>
                        <div className="flex items-center gap-2 mb-2"><span className="font-medium text-sm">{reply.sender?.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${reply.sender?.role === "Teacher" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>{reply.sender?.role}</span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.message}</p>
                        <div className="flex items-center gap-1 mt-3 text-xs text-gray-400"><Clock className="w-3 h-3" />{formatDate(reply.createdAt)} at {formatTime(reply.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4"><MessageSquare className="w-10 h-10 text-gray-400" /></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a communication</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">Choose a conversation from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function StudentCommunicationsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <CommunicationsContent studentId={params.id} />
    </Suspense>
  );
}
