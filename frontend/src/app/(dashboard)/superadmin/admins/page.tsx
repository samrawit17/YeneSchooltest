"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { superadminAPI } from "@/lib/api/superadmin";
import { toast } from "sonner";
import TableSearch from "@/components/TableSearch";
import { 
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Building,
  Mail,
  Phone,
  Calendar,
  Shield,
  MoreHorizontal,
  UserCog,
  RefreshCw,
  X
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SchoolAdminForm from "@/components/forms/SchoolAdminForm";

// Shadcn/ui Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId: string;
  schoolName?: string;
  phone?: string;
  createdAt: string;
  isActive: boolean;
}

const SuperAdminAdminsPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      if (user?.role?.toLowerCase() !== 'super_admin') {
        toast.error('Access denied. Super Admin only.');
        router.push('/dashboard');
        return;
      }
      fetchAdmins();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await superadminAPI.getAdmins();
      // Backend returns paginated format: { data: [...], total, page, limit, totalPages }
      setAdmins(response.data?.data || []);
    } catch (error: any) {
      console.error('Failed to fetch admins:', error);
      toast.error('Failed to load admins');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = (Array.isArray(admins) ? admins : []).filter(admin =>
    admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (admin.schoolName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Computed values for stats (safe access)
  const adminsArray = Array.isArray(admins) ? admins : [];
  const activeAdminsCount = adminsArray.filter(a => a.isActive).length;
  const schoolsWithAdminsCount = new Set(adminsArray.map(a => a.schoolId)).size;

  // Loading State
  if (loading || authLoading) {
    return (
      <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2 dark:bg-gray-700" />
            <Skeleton className="h-4 w-64 dark:bg-gray-700" />
          </div>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2 dark:bg-gray-700" />
              <Skeleton className="h-4 w-48 dark:bg-gray-700" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/superadmin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">School Admins</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage all school administrators across the platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200" onClick={fetchAdmins}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button className="gap-2" onClick={() => {
              setSelectedAdmin(null);
              setModalType("create");
              setIsModalOpen(true);
            }}>
              <Plus className="w-4 h-4" />
              Add Admin
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Admins</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{adminsArray.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeAdminsCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Admins Table */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <UserCog className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              All School Admins
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              View and manage all registered school administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <TableSearch
              search={searchQuery}
              setSearch={setSearchQuery}
              placeholder="Search by name, email, or school..."
              className="mb-6"
            />

            {/* Table */}
            {filteredAdmins.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No admins found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Admins will appear here once registered'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3 font-medium">Admin</th>
                      <th className="px-4 py-3 font-medium">School</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                {admin.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{admin.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {admin.schoolName || admin.schoolId || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Mail className="w-3 h-3" />
                              {admin.email}
                            </div>
                            {admin.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Phone className="w-3 h-3" />
                                {admin.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Calendar className="w-3 h-3" />
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={admin.isActive ? 'default' : 'secondary'}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="dark:hover:bg-gray-700">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                              <DropdownMenuLabel className="dark:text-white">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="dark:bg-gray-700" />
                              <DropdownMenuItem className="dark:text-gray-200 dark:hover:bg-gray-700">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Admin Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700">
            <SchoolAdminForm
              mode={modalType === "create" ? "create" : "update"}
              initialData={selectedAdmin}
              onSuccess={() => {
                setIsModalOpen(false);
                fetchAdmins();
              }}
              onCancel={() => setIsModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SuperAdminAdminsPage;
