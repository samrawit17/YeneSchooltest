"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parentsAPI } from "@/lib/api/people";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import FormModal from "@/components/FormModal";
import TableSearch from "@/components/TableSearch";
import { useDebounce } from "@/hooks/useDebounce";
import Pagination from "@/components/Pagination";

// Shadcn/ui Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Icons
import {
  Users,
  UserPlus,
  Eye,
  Edit2,
  Trash2,
  Link2,
  Upload,
  Search,
  Phone,
  CheckCircle,
  XCircle,
  UserCircle,
} from "lucide-react";

type LinkedChild = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  relation: string;
  isPrimary: boolean;
  emergencyContact: boolean;
};

type Parent = {
  id: string;
  userId: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  isActive: boolean;
  children: LinkedChild[];
  createdAt: string;
};

const ParentListPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [modalType, setModalType] = useState<"create" | "update">("create");
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // Debounce the search query
  const debouncedSearch = useDebounce(searchInput, 500);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [childrenFilter, setChildrenFilter] = useState("");

  // Fetch parents data
  useEffect(() => {
    const fetchParents = async () => {
      try {
        setLoading(true);
        const response = await parentsAPI.getAll({
          search: debouncedSearch,
          page: currentPage,
          limit,
        });

        const result = response?.data;
        const raw = result?.data || [];
        const totalCount = result?.total || raw.length;
        const calculatedTotalPages = result?.totalPages || Math.ceil(totalCount / limit);

        setTotal(totalCount);
        setTotalPages(calculatedTotalPages || 1);

        const normalized: Parent[] = Array.isArray(raw)
          ? raw.map((p: any) => ({
              id: p.id,
              userId: p.userId ?? p.user?.id,
              name: p.user?.name ?? p.user?.email ?? "",
              email: p.user?.email ?? p.email ?? "",
              username: p.user?.email?.split('@')[0] ?? p.username ?? "",
              phone: p.user?.phone ?? p.phone ?? "",
              address: p.address ?? p.user?.address ?? "",
              occupation: p.occupation ?? "",
              isActive: p.user?.isActive ?? true,
              children: (p.children || []).map((c: any) => ({
                id: c.id,
                studentId: c.studentId,
                studentName: c.student?.className ?? c.student?.studentCode ?? "Unknown",
                studentCode: c.student?.studentCode ?? "",
                relation: c.relation,
                isPrimary: c.isPrimary,
                emergencyContact: c.emergencyContact,
              })),
              createdAt: p.createdAt,
            }))
          : [];

        setParents(normalized);
      } catch (error: any) {
        console.error("Failed to fetch parents:", error);
        toast.error("Failed to fetch parents from server");
        setParents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParents();
  }, [debouncedSearch, currentPage, limit]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, childrenFilter]);

  // Filter parents locally
  const filteredParents = parents.filter((parent) => {
    if (statusFilter === "Active" && !parent.isActive) return false;
    if (statusFilter === "Inactive" && parent.isActive) return false;
    if (childrenFilter === "With Children" && parent.children.length === 0) return false;
    if (childrenFilter === "Without Children" && parent.children.length > 0) return false;
    return true;
  });

  const handleDeleteParent = async (parentId: string) => {
    if (window.confirm("Are you sure you want to delete this parent?")) {
      try {
        await parentsAPI.delete(parentId);
        setParents(parents.filter((p) => p.id !== parentId));
        toast.success("Parent deleted successfully");
      } catch (error) {
        console.error("Failed to delete parent:", error);
        toast.error("Failed to delete parent");
      }
    }
  };

  const handleEditParent = (parent: Parent) => {
    setSelectedParent(parent);
    setModalType("update");
    setIsModalOpen(true);
  };

  const handleLinkChild = (parent: Parent) => {
    setSelectedParent(parent);
    setShowLinkModal(true);
  };

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
        <div className="w-full">
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors w-full">
      <div className="p-4 md:p-6 w-full min-w-0 max-w-full">
        <div className="space-y-6 w-full min-w-0">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full min-w-0">
            <h1 className="text-2xl font-bold text-black">Parents</h1>
            <div className="flex items-center gap-3">
            </div>
          </div>

          {/* Filters Section */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1">
                  <TableSearch
                    search={searchInput}
                    setSearch={setSearchInput}
                    placeholder="Search by name, email, or phone..."
                    className="w-full"
                  />
                </div>

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
                    value={childrenFilter}
                    onChange={(e) => setChildrenFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">All Parents</option>
                    <option value="With Children">With Children</option>
                    <option value="Without Children">Without Children</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Data Table */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              {filteredParents.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-semibold">No parents found</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    {statusFilter || childrenFilter
                      ? "Try adjusting your filters or search query"
                      : "Start by adding your first parent"}
                  </p>
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                    <TableRow className="border-b border-gray-100 dark:border-slate-700">
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Photo</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Parent Name</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">ID</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Phone</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Children</TableHead>
                      <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</TableHead>
                      <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="w-full">
                    {filteredParents.map((parent) => (
                      <TableRow
                        key={parent.id}
                        className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <TableCell className="px-4 py-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm">
                              {getInitials(parent.name || "?")}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{parent.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{parent.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                            {parent.username}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {parent.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{parent.phone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {parent.children.length > 0 ? (
                              <>
                                {parent.children.slice(0, 2).map((child, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {child.studentName}
                                    {child.isPrimary && " ★"}
                                  </Badge>
                                ))}
                                {parent.children.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{parent.children.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">No children linked</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusBadge(parent.isActive)}`}
                          >
                            {parent.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {parent.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/list/parents/${parent.id}`}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>

          {/* Bottom - Pagination */}
          {filteredParents.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startItem}–{endItem} of {total} parents
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

      {/* Create/Update Modal */}
      <FormModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        title={modalType === "create" ? "Add New Parent" : "Edit Parent"}
        type={modalType}
        table="parent"
        data={selectedParent}
      />

      {/* Link Child Modal */}
      <FormModal
        isOpen={showLinkModal}
        setIsOpen={setShowLinkModal}
        title="Link Child to Parent"
        type="create"
        table="parent_child_link"
        data={selectedParent}
      />
    </div>
  );
};

export default ParentListPage;
