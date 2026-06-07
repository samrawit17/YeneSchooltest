"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { parentsAPI } from "@/lib/api/people";
import { toast } from "sonner";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import { useTranslations } from "@/hooks/useTranslations";
import { resolveAssetUrl } from "@/lib/asset-url";
import useDebounce from "@/hooks/useDebounce";

// Shadcn/ui Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Icons
import {
  Users,
  Phone,
  CheckCircle,
  XCircle,
} from "lucide-react";

type LinkedChild = {
  id: string;
  studentId: string;
  studentUserId?: string;
  studentName: string;
  studentCode: string;
  className?: string;
  section?: string;
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
  avatarUrl?: string;
  isActive: boolean;
  children: LinkedChild[];
  createdAt: string;
};

const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );

const ParentListPage = () => {
  const { t } = useTranslations<any>("peopleLists");
  const router = useRouter();
  const hasLoadedRef = useRef(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [childrenFilter, setChildrenFilter] = useState("");

  // Fetch parents data
  useEffect(() => {
    const fetchParents = async () => {
      try {
        if (!hasLoadedRef.current) {
          setLoading(true);
        }
        const response = await parentsAPI.getAll({
          search: debouncedSearch || undefined,
          page: currentPage,
          limit,
          status: statusFilter || undefined,
          children: childrenFilter || undefined,
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
              username: p.user?.username ?? p.username ?? "",
              phone: p.user?.phone ?? p.phone ?? "",
              address: p.address ?? p.user?.address ?? "",
              occupation: p.occupation ?? "",
              avatarUrl: p.user?.img ?? p.user?.avatarUrl ?? "",
              isActive: p.user?.isActive ?? true,
              children: (p.children || []).map((c: any) => ({
                id: c.id,
                studentId: c.studentId,
                studentUserId: c.student?.user?.id ?? "",
                studentName: c.student?.user?.name ?? c.studentName ?? c.student?.studentCode ?? "Unknown",
                studentCode: c.student?.studentCode ?? "",
                className: c.student?.className ?? c.className ?? c.grade ?? "",
                section: c.student?.section ?? c.section ?? "",
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
        toast.error(t.messages.fetchParentsFailed);
        setParents([]);
      } finally {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    };

    fetchParents();
  }, [debouncedSearch, currentPage, limit, statusFilter, childrenFilter, t.messages.fetchParentsFailed]);

  const updateSearch = (value: string) => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const updateChildrenFilter = (value: string) => {
    setChildrenFilter(value);
    setCurrentPage(1);
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
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 w-full min-w-0">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">{t.titles.parents}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.subtitles.parents}
              </p>
            </div>
          </div>

          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-row flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <TableSearch
                    search={searchInput}
                    setSearch={updateSearch}
                    placeholder={t.placeholders.parentSearch}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-row flex-wrap gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => updateStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{t.filters.allStatus}</option>
                    <option value="Active">{t.status.active}</option>
                    <option value="Inactive">{t.status.inactive}</option>
                  </select>

                  <select
                    value={childrenFilter}
                    onChange={(e) => updateChildrenFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{t.filters.allParents}</option>
                    <option value="With Children">{t.filters.withChildren}</option>
                    <option value="Without Children">{t.filters.withoutChildren}</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              {parents.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-semibold">{t.empty.noParents}</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    {statusFilter || childrenFilter
                      ? t.empty.adjustFilters
                      : debouncedSearch
                      ? formatMessage(t.empty.noParentSearch, { query: debouncedSearch })
                      : t.empty.addFirstParent}
                  </p>
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                    <TableRow className="border-b border-gray-100 dark:border-slate-700">
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.photo}</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.parentName}</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.phone}</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.children}</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.grade}</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.section}</TableHead>
                      <TableHead className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">{t.table.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="w-full">
                    {parents.map((parent) => (
                      <TableRow
                        key={parent.id}
                        className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/list/parents/${parent.id}`)}
                      >
                        <TableCell className="px-4 py-3">
                          <Avatar className="w-10 h-10">
                            {parent.avatarUrl ? (
                              <AvatarImage src={resolveAssetUrl(parent.avatarUrl) || parent.avatarUrl} alt={parent.name} />
                            ) : (
                              <AvatarFallback className="text-sm">
                                {getInitials(parent.name || "?")}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{parent.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{parent.email}</p>
                          </div>
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
                              <span className="text-sm text-gray-400">{t.empty.noChildrenLinked}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {parent.children.length > 0 ? (
                              <>
                                {parent.children.slice(0, 2).map((child, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {child.className || "—"}
                                  </Badge>
                                ))}
                                {parent.children.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{parent.children.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {parent.children.length > 0 ? (
                              <>
                                {parent.children.slice(0, 2).map((child, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {child.section || "—"}
                                  </Badge>
                                ))}
                                {parent.children.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{parent.children.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
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
                            {parent.isActive ? t.status.active : t.status.inactive}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>

          {/* Bottom - Pagination */}
          {parents.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatMessage(t.pagination.parents, { start: startItem, end: endItem, total })}
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

export default ParentListPage;
