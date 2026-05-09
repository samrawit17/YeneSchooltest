"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import FormModal from "@/components/FormModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  Shield,
  UserPlus,
  Search,
} from "lucide-react";

type StaffRole = "TEACHER" | "IT_MANAGER" | "REGISTRAR" | "FINANCE";

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  schoolId: string;
  isActive: boolean;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: StaffUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STAFF_ROLES: StaffRole[] = ["TEACHER", "IT_MANAGER", "REGISTRAR", "FINANCE"];

const roleBadgeClass: Record<StaffRole, string> = {
  TEACHER: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  IT_MANAGER: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700",
  REGISTRAR: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700",
  FINANCE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
};

const getStatusBadge = (isActive: boolean) => {
  if (isActive) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function StaffPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "update">("create");
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  const canManageStaff = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["staff-users", page, searchInput, selectedRole],
    queryFn: async () => {
      const response = await authAPI.getUsers({
        roles: selectedRole ? [selectedRole] : STAFF_ROLES,
        page,
        limit: 10,
        search: searchInput || undefined,
      });
      return response.data;
    },
  });

  const staffList = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-red-500">Failed to load staff. Please try again later.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{(error as any).message}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && staffList.length === 0 && !searchInput) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">No staff found.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardContent className="p-0">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const startItem = (page - 1) * 10 + 1;
  const endItem = Math.min(page * 10, total);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-black">Staff Management</h1>
            <div className="flex items-center gap-3">
              {canManageStaff && (
                <Button
                  style={{ backgroundColor: "#1E3A8A" }}
                  onClick={() => {
                    setSelectedUser(null);
                    setModalType("create");
                    setIsModalOpen(true);
                  }}
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
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="w-full lg:flex-1">
                  <TableSearch
                    search={searchInput}
                    setSearch={setSearchInput}
                    placeholder="Search by name or email..."
                    className="w-full"
                  />
                </div>
                <div className="w-full lg:w-auto">
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={selectedRole}
                      onChange={(e) => {
                        setSelectedRole(e.target.value);
                        setPage(1);
                      }}
                      className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-w-[140px]"
                    >
                      <option value="">All Roles</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="IT_MANAGER">IT Manager</option>
                      <option value="REGISTRAR">Registrar</option>
                      <option value="FINANCE">Finance</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Data Table */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Staff</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Phone</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            {item.avatarUrl ? (
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">
                                {getInitials(item.name)}
                              </AvatarFallback>
                            ) : (
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">
                                {getInitials(item.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={roleBadgeClass[item.role]}>
                          {item.role.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.phone || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(item.isActive)}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/list/staff/${item.id}`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-[#e35336]" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staffList.length === 0 && searchInput && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    No staff found
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No staff match "{searchInput}". Try different keywords.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Bottom - Pagination */}
          {staffList.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchInput
                  ? `Showing ${startItem}–${Math.min(endItem, total)} of ${total} staff for "${searchInput}"`
                  : `Showing ${startItem}–${endItem} of ${total} staff`}
              </p>
              <Pagination
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                className="flex-wrap"
              />
            </div>
          )}
        </div>

        {canManageStaff && (
          <FormModal
            isOpen={isModalOpen}
            setIsOpen={setIsModalOpen}
            title={modalType === "create" ? "Add Staff User" : "Update Staff User"}
            type={modalType}
            table="staff"
            data={selectedUser || undefined}
            id={selectedUser?.id}
          />
        )}
      </div>
    </div>
  );
}
