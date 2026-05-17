"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Eye,
  Search,
} from "lucide-react";

type StaffRole = "ADMIN" | "TEACHER" | "IT_MANAGER" | "REGISTRAR" | "FINANCE";

interface StaffUser {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: StaffRole;
  schoolId: string;
  isActive: boolean;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  teacherProfile?: {
    employeeId?: string | null;
    designation?: string | null;
    specialization?: string | null;
  } | null;
}

interface UsersResponse {
  data: StaffUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STAFF_ROLES: StaffRole[] = ["ADMIN", "TEACHER", "IT_MANAGER", "REGISTRAR", "FINANCE"];

const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );

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
  const { t } = useTranslations<any>("peopleLists");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["users", "staff", page, searchInput, selectedRole],
    queryFn: async () => {
      const response = await authAPI.getUsers({
        roles: selectedRole ? [selectedRole] : STAFF_ROLES,
        page,
        limit: 10,
        search: searchInput || undefined,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const updateSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const staffList = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="p-4 md:p-6">
          <div className="w-full">
            <Card className="dark:border-slate-700 dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-red-500">{t.messages.loadStaffFailed}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{(error as any).message}</p>
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
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
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
        <div className="w-full space-y-6">
          {/* Top Section - Title and Buttons */}
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white">{t.titles.staff}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.subtitles.staff}
              </p>
            </div>
            <div className="flex items-center gap-3">
            </div>
          </div>

          {/* Filters Section */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-row flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <TableSearch
                    search={searchInput}
                    setSearch={updateSearch}
                    placeholder={t.placeholders.staffSearch}
                    className="w-full"
                  />
                </div>
                <div className="flex-shrink-0">
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-w-[140px]"
                  >
                    <option value="">{t.filters.allRoles}</option>
                    <option value="ADMIN">{t.roles.ADMIN}</option>
                    <option value="TEACHER">{t.roles.TEACHER}</option>
                    <option value="IT_MANAGER">{t.roles.IT_MANAGER}</option>
                    <option value="REGISTRAR">{t.roles.REGISTRAR}</option>
                    <option value="FINANCE">{t.roles.FINANCE}</option>
                  </select>
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
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.staff}</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.role}</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.usernameStaffId}</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.phone}</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.status}</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            {item.avatarUrl ? (
                              <AvatarFallback className="text-sm">
                                {getInitials(item.name)}
                              </AvatarFallback>
                            ) : (
                              <AvatarFallback className="text-sm">
                                {getInitials(item.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.email || "-"}</p>
                            {item.role === "TEACHER" && item.teacherProfile?.specialization ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{item.teacherProfile.specialization}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {t.roles[item.role] ?? item.role.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {item.username || item.teacherProfile?.employeeId || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.phone || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(item.isActive)}`}>
                          {item.isActive ? t.status.active : t.status.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/list/staff/${item.id}`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title={t.actions.view}
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staffList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {t.empty.noStaff}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {searchInput
                      ? formatMessage(t.empty.noStaffSearch, { query: searchInput })
                      : selectedRole
                      ? t.empty.noStaffRole
                      : t.empty.noStaffRecords}
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
                  ? formatMessage(t.pagination.staffSearch, { start: startItem, end: Math.min(endItem, total), total, query: searchInput })
                  : formatMessage(t.pagination.staff, { start: startItem, end: endItem, total })}
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

      </div>
    </div>
  );
}
