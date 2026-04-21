"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hrAPI } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";

// Shadcn/ui Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  Users,
  UserPlus,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Search,
  Phone,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  Briefcase,
  Building,
} from "lucide-react";

type Staff = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  role: string;
  position?: string;
  designation?: string;
  department?: {
    name: string;
  };
  joiningDate?: string;
  employeeId?: string;
  createdAt: string;
};

const StaffListPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Fetch staff data
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const response = await hrAPI.getEmployees({
          search: searchQuery,
          page: currentPage,
          limit,
        });

        const data = response?.data;
        const raw = data?.data || [];
        const totalCount = data?.meta?.total || raw.length;
        const calculatedTotalPages = data?.meta?.totalPages || Math.ceil(totalCount / limit);

        setTotal(totalCount);
        setTotalPages(calculatedTotalPages || 1);

        const normalized: Staff[] = Array.isArray(raw)
          ? raw.map((s: any) => ({
              id: s.id,
              userId: s.userId ?? s.user?.id,
              name: s.user?.name ?? s.name ?? "",
              email: s.user?.email ?? s.email ?? "",
              phone: s.user?.phone ?? s.phone ?? "",
              address: s.user?.address ?? s.address ?? "",
              isActive: s.user?.isActive ?? true,
              role: s.user?.role ?? s.hrProfile?.designation ?? "STAFF",
              designation: s.designation ?? s.hrProfile?.designation ?? "",
              department: s.department ?? s.hrProfile?.department ?? null,
              joiningDate: s.joiningDate ?? s.hrProfile?.joiningDate ?? "",
              employeeId: s.employeeId ?? s.hrProfile?.employeeId ?? "",
              createdAt: s.createdAt,
            }))
          : [];

        setStaff(normalized);
      } catch (error: any) {
        console.error("Failed to fetch staff:", error);
        toast.error("Failed to fetch staff from server");
        setStaff([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [searchQuery, currentPage, limit]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter]);

  // Filter staff locally
  const filteredStaff = staff.filter((member) => {
    if (statusFilter === "Active" && !member.isActive) return false;
    if (statusFilter === "Inactive" && member.isActive) return false;
    if (departmentFilter && member.department?.name !== departmentFilter) return false;
    return true;
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  // Get unique departments for filter
  const departments = Array.from(new Set(staff.map((s) => s.department?.name).filter((d): d is string => !!d)));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-[#e35336]">Staff Management</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Upload className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              {user?.role === "ADMIN" && (
                <Button
                  style={{ backgroundColor: "#e35336" }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <TableSearch
                  search={searchQuery}
                  setSearch={setSearchQuery}
                  placeholder="Search by name, email, phone, employee ID..."
                  className="flex-1"
                />

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Data Table */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              {filteredStaff.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-semibold">No staff members found</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    {statusFilter || departmentFilter
                      ? "Try adjusting your filters or search query"
                      : "Start by adding your first staff member"}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Photo</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Employee ID</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Role</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Department</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Designation</th>
                      <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</th>
                      <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm">
                              {getInitials(member.name || "?")}
                            </AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {member.id ? (
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                              {member.id}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {member.role ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {member.role}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {member.department?.name ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {member.department.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {member.designation ? (
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {member.designation}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusBadge(member.isActive)}`}
                          >
                            {member.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {member.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/list/staff/${member.id}`}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Bottom - Pagination */}
          {filteredStaff.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startItem}–{endItem} of {total} staff members
              </p>
              <Pagination
                page={currentPage}
                setPage={setCurrentPage}
                totalPages={totalPages}
                className="flex-wrap"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffListPage;
