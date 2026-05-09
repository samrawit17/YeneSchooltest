"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { authAPI, schoolsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import { Eye, Edit2, Trash2, UserPlus, Users, Building2, Phone, CheckCircle, XCircle } from "lucide-react";

// Types for user data
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId: string;
  isActive: boolean;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Types for school data
interface School {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
}

const UsersPage = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
  
  // Set default filter to show only ADMINS for SUPER_ADMIN
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");

  const queryClient = useQueryClient();

  // Set default role filter based on user role - SUPER_ADMIN only sees admins
  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      setSelectedRole("ADMIN");
    }
  }, [user?.role]);

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: queryKeys.users.list(page, selectedRole),
    queryFn: async () => {
      const response = await authAPI.getUsers(selectedRole);
      return response.data as User[];
    },
  });

  // Fetch schools (only for super admin)
  const { data: schoolsData } = useQuery({
    queryKey: queryKeys.schools.all,
    queryFn: async () => {
      const response = await schoolsAPI.getAll();
      return response.data as School[];
    },
    enabled: user?.role === "SUPER_ADMIN",
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authAPI.deleteUser(id);
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
    },
  });

  // Role options based on current user role - SUPER_ADMIN restricted to admins only
  const getRoleOptions = () => {
    if (user?.role === "SUPER_ADMIN") {
      return [
        { value: "ADMIN", label: "Admin" },
        { value: "IT_MANAGER", label: "IT Manager" },
      ];
    } else if (user?.role === "ADMIN") {
      return [
        { value: "", label: "All Users" },
        { value: "TEACHER", label: "Teacher" },
        { value: "IT_MANAGER", label: "IT Manager" },
        { value: "STUDENT", label: "Student" },
        { value: "PARENT", label: "Parent" },
        { value: "REGISTRAR", label: "Registrar" },
        { value: "FINANCE", label: "Finance" },
      ];
    }
    return [];
  };

  const columns = [
    {
      header: "User Info",
      accessor: "userInfo",
      className: "flex-1",
    },
    {
      header: "Role",
      accessor: "role",
      className: "hidden md:table-cell",
    },
    {
      header: "School",
      accessor: "school",
      className: "hidden lg:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden xl:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
      className: "hidden md:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
      className: "w-24",
    },
  ];

  const canManageUsers = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const renderRow = (item: User) => (
    <tr
      key={item.id}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <span className="text-blue-700 font-semibold text-sm">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{item.name}</p>
            <p className="text-sm text-gray-600">{item.email}</p>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <span className="text-gray-700 font-medium">
          {item.role.charAt(0) + item.role.slice(1).toLowerCase().replace('_', ' ')}
        </span>
      </td>
      <td className="hidden lg:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Building2 className="w-4 h-4" />
          <span>{schoolsData?.find(school => school.id === item.schoolId)?.name || "-"}</span>
        </div>
      </td>
      <td className="hidden xl:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{item.phone || "-"}</span>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <div className="flex items-center gap-2">
          {item.isActive ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700 font-medium">Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 font-medium">Inactive</span>
            </>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </button>
          {canManageUsers && (
            <>
              <button
                className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
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
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
                onClick={() => {
                  setSelectedUser(item);
                  setModalType("delete");
                  setIsModalOpen(true);
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

  const handleDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
      setIsModalOpen(false);
    }
  };

  const canCreateUsers = canManageUsers;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Users Management</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === "SUPER_ADMIN" 
              ? "Manage all admin users in the system"
              : "Manage all school staff and users"
            }
          </p>
        </div>
        {canCreateUsers && (
          <button
            onClick={() => {
              setSelectedUser(null);
              setModalType("create");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Filters */}
      {canCreateUsers && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <TableSearch />
            
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Role:</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                {getRoleOptions().map(option => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading users...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">Error loading users</p>
          </div>
        ) : usersData?.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              {canCreateUsers 
                ? "No users found. Create your first user." 
                : "No users available"
              }
            </p>
            {canCreateUsers && (
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setModalType("create");
                  setIsModalOpen(true);
                }}
                className="mt-4 text-blue-600 hover:underline font-medium"
              >
                Add your first user
              </button>
            )}
          </div>
        ) : (
          <Table columns={columns} renderRow={renderRow} data={usersData || []} />
        )}
      </div>

      {/* Pagination */}
      {usersData && usersData.length > 0 && (
        <Pagination
          page={page}
          setPage={setPage}
          totalPages={5}
        />
      )}

      {/* Create/Update Modal */}
      {canCreateUsers && (
        <FormModal
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          title={
            modalType === "create" ? "Add New User" :
            modalType === "update" ? "Update User" : "Delete User"
          }
          type={modalType}
          table="user"
          data={selectedUser}
          id={selectedUser?.id}
        />
      )}
    </div>
  );
};

export default UsersPage;
