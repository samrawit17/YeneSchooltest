"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registrarAPI } from "@/lib/api";
import { toast } from "sonner";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Wand2, 
  AlertCircle,
  FileText,
  ChevronDown,
  Calendar,
  GraduationCap
} from "lucide-react";

// Types for enrollment data
interface Enrollment {
  id: string;
  studentId: string;
  schoolId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITLISTED";
  academicYear: string;
  grade: number;
  rejectionReason?: string;
  documents?: any[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  studentProfile?: {
    id: string;
    gender?: string;
    address?: string;
    phone?: string;
  };
}

interface EnrollmentsResponse {
  data: Enrollment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function EnrollmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "PENDING";
  
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [approvalData, setApprovalData] = useState({
    className: "",
    section: "",
    rollNumber: "",
  });
  const queryClient = useQueryClient();

  // Reset page when search or status changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // Fetch enrollments from API
  const { data: enrollmentsResponse, isLoading, error } = useQuery({
    queryKey: ["enrollments", page, statusFilter],
    queryFn: async () => {
      const response = await registrarAPI.getEnrollments(statusFilter, page);
      return response.data as EnrollmentsResponse;
    },
  });

  const enrollments = enrollmentsResponse?.data || [];
  const totalPages = enrollmentsResponse?.totalPages || 1;

  // Auto-approve mutation
  const autoApproveMutation = useMutation({
    mutationFn: async (id: string) => {
      await registrarAPI.autoApproveEnrollment(id);
    },
    onSuccess: () => {
      toast.success("Enrollment auto-approved and class assigned!");
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to auto-approve enrollment");
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof approvalData }) => {
      await registrarAPI.approveEnrollment(id, data);
    },
    onSuccess: () => {
      toast.success("Enrollment approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      setShowApprovalModal(false);
      setSelectedEnrollment(null);
      setApprovalData({ className: "", section: "", rollNumber: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve enrollment");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await registrarAPI.rejectEnrollment(id, reason);
    },
    onSuccess: () => {
      toast.success("Enrollment rejected!");
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject enrollment");
    },
  });

  const handleApprove = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    // Pre-fill with grade from enrollment
    setApprovalData({
      className: `Grade ${enrollment.grade}`,
      section: "",
      rollNumber: "",
    });
    setShowApprovalModal(true);
  };

  const handleConfirmApprove = () => {
    if (selectedEnrollment) {
      approveMutation.mutate({
        id: selectedEnrollment.id,
        data: approvalData,
      });
    }
  };

  const handleReject = (id: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const columns = [
    {
      header: "Student",
      accessor: "student",
      className: "flex-1",
    },
    {
      header: "Academic Year",
      accessor: "academicYear",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden lg:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
      className: "hidden lg:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
      className: "w-24",
    },
  ];

  const renderRow = (item: Enrollment) => (
    <tr
      key={item.id}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{item.user?.name || "-"}</p>
            <p className="text-sm text-gray-600">{item.user?.email || "-"}</p>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">{item.academicYear || "-"}</span>
        </div>
      </td>
      <td className="hidden lg:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-700">
          <GraduationCap className="w-4 h-4" />
          <span className="font-medium">Grade {item.grade || "-"}</span>
        </div>
      </td>
      <td className="hidden lg:table-cell p-4">
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${
          item.status === "APPROVED"
            ? "bg-green-100 text-green-700 border border-green-200"
            : item.status === "PENDING"
            ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
            : "bg-red-100 text-red-700 border border-red-200"
        }`}>
          {item.status === "APPROVED" && <CheckCircle className="w-3 h-3" />}
          {item.status === "PENDING" && <Clock className="w-3 h-3" />}
          {item.status === "REJECTED" && <XCircle className="w-3 h-3" />}
          <span>{item.status}</span>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          {item.status === "PENDING" && (
            <>
              <button
                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                title="Auto-Approve & Assign Class"
                onClick={() => autoApproveMutation.mutate(item.id)}
              >
                <Wand2 className="w-4 h-4 text-green-600" />
              </button>
              <button
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Approve"
                onClick={() => handleApprove(item)}
              >
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </button>
              <button
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject"
                onClick={() => handleReject(item.id)}
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
            onClick={() => router.push(`/list/students/${item.user?.id}`)}
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Enrollment Applications</h1>
          <p className="text-gray-600 mt-1 font-medium">
            {statusFilter === "PENDING" 
              ? "Review and process pending enrollment applications"
              : statusFilter === "APPROVED"
              ? "View approved enrollment applications"
              : statusFilter === "REJECTED"
              ? "View rejected enrollment applications"
              : "Manage all enrollment applications"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap gap-4 items-center">
          <TableSearch />
          <div className="relative inline-block">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-2.5 px-4 pr-10 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-gray-300 transition-colors"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="WAITLISTED">Waitlisted</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{enrollments?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-gray-900">
                {enrollments?.filter((e) => e.status === "PENDING").length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-xl font-bold text-gray-900">
                {enrollments?.filter((e) => e.status === "APPROVED").length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-xl font-bold text-gray-900">
                {enrollments?.filter((e) => e.status === "REJECTED").length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4 font-semibold">Loading enrollments...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold">Error loading enrollments</p>
          </div>
        ) : enrollments?.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">
              {statusFilter ? `No ${statusFilter.toLowerCase()} enrollments found` : "No enrollments found"}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {statusFilter 
                ? "Try changing your filter or check back later"
                : "Start by enrolling new students or check if enrollments are pending"}
            </p>
          </div>
        ) : (
          <Table columns={columns} renderRow={renderRow} data={enrollments || []} />
        )}
      </div>

      {/* Pagination */}
      {enrollments && enrollments.length > 0 && (
        <Pagination
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Approve Enrollment</h2>
            <p className="text-gray-600 mb-4">
              Approving enrollment for <strong>{selectedEnrollment.user?.name}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={approvalData.className}
                  onChange={(e) => setApprovalData({ ...approvalData, className: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grade 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  value={approvalData.section}
                  onChange={(e) => setApprovalData({ ...approvalData, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={approvalData.rollNumber}
                  onChange={(e) => setApprovalData({ ...approvalData, rollNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 01"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedEnrollment(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
