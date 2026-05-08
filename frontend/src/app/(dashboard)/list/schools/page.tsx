"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Loader2,
  Users,
  School as SchoolIcon,
  Hash
} from "lucide-react";

// Types for school data
interface School {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

const SchoolsPage = () => {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");

  const queryClient = useQueryClient();

  // Fetch schools
  const { data: schoolsData, isLoading, error } = useQuery({
    queryKey: queryKeys.schools.list(page),
    queryFn: async () => {
      const response = await schoolsAPI.getAll();
      return response.data as School[];
    },
  });

  // Delete school mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await schoolsAPI.delete(id);
    },
    onSuccess: () => {
      toast.success("School deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete school");
    },
  });

  const columns = [
    {
      header: "School Information",
      accessor: "name",
      className: "flex-1",
    },
    {
      header: "Contact",
      accessor: "email",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden xl:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
      className: "w-28",
    },
  ];

  const renderRow = (item: School) => (
    <tr
      key={item.id}
      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">ID: {item.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Mail className="w-4 h-4" />
          <span className="font-medium truncate max-w-[180px]">{item.email}</span>
        </div>
      </td>
      <td className="hidden lg:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Phone className="w-4 h-4" />
          <span className="font-medium">{item.phone || "-"}</span>
        </div>
      </td>
      <td className="hidden xl:table-cell p-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <MapPin className="w-4 h-4" />
          <span className="font-medium truncate max-w-[200px]">{item.address || "-"}</span>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
          <button
            className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
            title="Edit School"
            onClick={() => {
              setSelectedSchool(item);
              setModalType("update");
              setIsModalOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </button>
          <button
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete School"
            onClick={() => {
              setSelectedSchool(item);
              setModalType("delete");
              setIsModalOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </td>
    </tr>
  );

  const handleDelete = () => {
    if (selectedSchool) {
      deleteMutation.mutate(selectedSchool.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e35336]">Schools Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">Manage all educational institutions in the system</p>
          </div>
          <button
            onClick={() => {
              setSelectedSchool(null);
              setModalType("create");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Add School</span>
          </button>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Schools</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{schoolsData?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl border border-green-200 dark:border-green-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Institutions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{schoolsData?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 rounded-lg flex items-center justify-center">
                <SchoolIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Registered Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{schoolsData?.length * 50 || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <TableSearch />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600 dark:text-gray-400 mt-4 font-semibold">Loading schools data...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 font-semibold">Error loading schools</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Please check your connection and try again</p>
            </div>
          ) : schoolsData?.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-semibold">No schools found in the system</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Start by adding your first educational institution</p>
              <button
                onClick={() => {
                  setSelectedSchool(null);
                  setModalType("create");
                  setIsModalOpen(true);
                }}
                className="mt-4 text-blue-600 hover:underline font-semibold"
              >
                Add your first school
              </button>
            </div>
          ) : (
            <Table columns={columns} renderRow={renderRow} data={schoolsData || []} />
          )}
        </div>

        {/* Pagination */}
        {schoolsData && schoolsData.length > 0 && (
          <Pagination
            page={page}
            setPage={setPage}
            totalPages={5}
          />
        )}

        {/* Modal */}
        <FormModal
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          title={
            modalType === "create" ? "Add New School" :
            modalType === "update" ? "Update School" : "Delete School"
          }
          type={modalType}
          table="school"
          data={selectedSchool}
          id={selectedSchool?.id}
        >
          {modalType === "delete" && selectedSchool && (
            <div className="p-6 flex flex-col gap-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Delete School?
                </p>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{selectedSchool.name}</span>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  This action will permanently remove all associated data including users, students, and records.
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete School
                </button>
              </div>
            </div>
          )}
        </FormModal>
      </div>
    </div>
  );
};

export default SchoolsPage;
