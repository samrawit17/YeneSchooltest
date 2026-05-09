"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Table from "@/components/Table";
import Pagination from "@/components/Pagination";
import FormModal from "@/components/FormModal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle,
  Edit2,
  Phone,
  Search,
  Shield,
  Trash2,
  UserPlus,
  XCircle,
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

export default function StaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "update">("create");
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  const canManageStaff = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["staff-users", page, search, selectedRole],
    queryFn: async () => {
      const response = await authAPI.getUsers({
        roles: selectedRole ? [selectedRole] : STAFF_ROLES,
        page,
        limit: 10,
        search: search || undefined,
      });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => authAPI.deleteUser(id),
    onSuccess: () => {
      toast.success("Staff user deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete staff user");
    },
  });

  const columns = [
    { header: "Staff", accessor: "staff" },
    { header: "Role", accessor: "role", className: "hidden md:table-cell" },
    { header: "Phone", accessor: "phone", className: "hidden lg:table-cell" },
    { header: "Status", accessor: "status", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "actions", className: "w-24" },
  ];

  const renderRow = (item: StaffUser) => (
    <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center">
            <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{item.email}</p>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <Badge variant="outline" className={roleBadgeClass[item.role]}>
          {item.role.replace("_", " ")}
        </Badge>
      </td>
      <td className="hidden lg:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Phone className="w-4 h-4" />
          <span>{item.phone || "-"}</span>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <div className="flex items-center gap-2">
          {item.isActive ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700 dark:text-green-400 font-medium">Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 dark:text-red-400 font-medium">Inactive</span>
            </>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1">
          {canManageStaff && (
            <>
              <button
                className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                title="Edit"
                onClick={() => {
                  setSelectedUser(item);
                  setModalType("update");
                  setIsModalOpen(true);
                }}
              >
                <Edit2 className="w-4 h-4 text-yellow-600" />
              </button>
              <button
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete"
                onClick={() => {
                  if (window.confirm(`Delete ${item.name}? This action cannot be undone.`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Staff Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage teachers, IT managers, registrars, and finance staff.
          </p>
        </div>
        {canManageStaff && (
          <button
            onClick={() => {
              setSelectedUser(null);
              setModalType("create");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Staff</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search staff by name or email"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium dark:bg-slate-700 dark:text-gray-100"
            >
              <option value="">All Staff</option>
              <option value="TEACHER">Teacher</option>
              <option value="IT_MANAGER">IT Manager</option>
              <option value="REGISTRAR">Registrar</option>
              <option value="FINANCE">Finance</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse">
            {/* Search & Filter Skeleton */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex flex-wrap gap-4 items-center">
                <Skeleton className="h-10 w-72 rounded-lg" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            </div>
            {/* Table Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <div className="flex gap-8">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20 hidden md:block" />
                <Skeleton className="h-4 w-20 hidden lg:block" />
                <Skeleton className="h-4 w-16 hidden md:block" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            {/* Table Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 rounded-full hidden md:block" />
                <Skeleton className="h-4 w-28 hidden lg:block" />
                <Skeleton className="h-4 w-16 hidden md:block" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">Error loading staff</p>
          </div>
        ) : !data?.data.length ? (
          <div className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {canManageStaff ? "No staff found. Create your first staff user." : "No staff available"}
            </p>
          </div>
        ) : (
          <Table columns={columns} renderRow={renderRow} data={data.data} />
        )}
      </div>

      {data && data.totalPages > 1 && (
        <Pagination page={page} setPage={setPage} totalPages={data.totalPages} />
      )}

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
    </div>
  );
}
