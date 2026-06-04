"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api/content";
import { syncService } from "@/lib/db/sync-service";
import { schoolSettingsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import Pagination from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateAnnouncementForm from "@/components/announcement/CreateAnnouncementForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Users,
  AlertTriangle,
  Info,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bell,
  User,
  GraduationCap,
  BookOpen,
  X,
  Globe2
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { formatDateByCalendarType, formatDateTimeByCalendarType } from "@/lib/calendar-utils";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";

type AudienceFilter = "all" | "students" | "parents" | "staff";
type StatusFilter = "all" | "active" | "scheduled" | "expired";

const AnnouncementListPage = () => {
  const { t } = useTranslations<any>("announcements");
  const { user } = useAuth();
  const isAdmin = (user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'IT_MANAGER') || user?.role?.toUpperCase() === 'REGISTRAR';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    syncService.startAutoSync();
    return () => syncService.stopAutoSync();
  }, []);

  const { data: announcements, isLoading } = useQuery({
    queryKey: queryKeys.announcements.list(user?.role),
    queryFn: async () => {
      const response = await announcementsAPI.getAll({ role: user?.role });
      return response.data;
    },
    enabled: !!user,
  });
  const { data: announcementsSetting } = useQuery({
    queryKey: ["school-setting", user?.schoolId, "ANNOUNCEMENTS_ENABLED"],
    queryFn: async () => {
      const response = await schoolSettingsAPI.get(
        user!.schoolId!,
        "ANNOUNCEMENTS_ENABLED",
      );
      return response.data?.value;
    },
    enabled: !!user?.schoolId,
  });
  const announcementsEnabled = announcementsSetting !== false;

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];

    return announcements.filter((announcement) => {
      // Search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          announcement.title.toLowerCase().includes(searchLower) ||
          announcement.content.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Audience filter
      if (audienceFilter !== "all" && announcement.visibleTo) {
        const audienceMap = {
          students: ["student"],
          parents: ["parent"],
          staff: ["admin", "teacher", "registrar"]
        };
        const hasMatch = audienceMap[audienceFilter].some(aud => 
          announcement.visibleTo?.some(v => v.toLowerCase().includes(aud))
        );
        if (!hasMatch) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const now = new Date();
        const startDate = parseISO(announcement.startDate);
        const endDate = announcement.endDate ? parseISO(announcement.endDate) : null;

        if (statusFilter === "active") {
          const isActive = isBefore(startDate, now) && (endDate ? isAfter(endDate, now) : true);
          if (!isActive) return false;
        } else if (statusFilter === "scheduled") {
          if (!isAfter(startDate, now)) return false;
        } else if (statusFilter === "expired") {
          if (!(endDate && isBefore(endDate, now))) return false;
        }
      }

      return true;
    });
  }, [announcements, searchQuery, audienceFilter, statusFilter]);

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
      case "MEDIUM": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
      default: return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800";
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    const now = new Date();
    const startDate = parseISO(announcement.startDate);
    const endDate = announcement.endDate ? parseISO(announcement.endDate) : null;

    if (isAfter(startDate, now)) {
      return { label: t.scheduled, className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" };
    }
    if (endDate && isBefore(endDate, now)) {
      return { label: t.expired, className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" };
    }
    return { label: t.active, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" };
  };

  const clearFilters = () => {
    setSearchQuery("");
    setAudienceFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || audienceFilter !== "all" || statusFilter !== "all";

  return (
    <div className="p-4 md:p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-black">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>
        {isAdmin && announcementsEnabled && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t.create}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[82vh] w-[min(94vw,900px)] max-w-none overflow-hidden p-0">
              <DialogHeader className="border-b bg-[rgba(var(--brand-color-rgb),0.08)] px-5 py-4 dark:border-slate-700">
                <DialogTitle className="text-gray-900 dark:text-white">{t.createTitle}</DialogTitle>
                <DialogDescription className="text-gray-500 dark:text-gray-400">
                  {t.createDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[calc(82vh-88px)] overflow-y-auto px-5 py-4">
                <CreateAnnouncementForm
                  onSuccess={() => setShowCreateModal(false)}
                  onCancel={() => setShowCreateModal(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {isAdmin && !announcementsEnabled && (
          <Button size="sm" className="gap-2" disabled title={t.disabledTitle}>
            <Plus className="h-4 w-4" />
            {t.create}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-row flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        
        <Select
          value={audienceFilter}
          onValueChange={(value: AudienceFilter) => {
            setAudienceFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[120px] sm:w-32">
            <SelectValue placeholder={t.audience} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.all}</SelectItem>
            <SelectItem value="students">{t.students}</SelectItem>
            <SelectItem value="parents">{t.parents}</SelectItem>
            <SelectItem value="staff">{t.staff}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[120px] sm:w-32">
            <SelectValue placeholder={t.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.all}</SelectItem>
            <SelectItem value="active">{t.active}</SelectItem>
            <SelectItem value="scheduled">{t.scheduled}</SelectItem>
            <SelectItem value="expired">{t.expired}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="sm" className="gap-1 shrink-0">
            <X className="h-4 w-4" />
            {t.clear}
          </Button>
        )}
      </div>

      {/* Announcement List */}
      <div className="space-y-3">
        {isLoading ? (
          // Card-level skeleton - simple centered spinner
          <div className="flex items-center justify-center py-12 border rounded-lg bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
          </div>
        ) : paginatedAnnouncements.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">{t.empty}</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                {t.clearFilters}
              </Button>
            )}
          </div>
        ) : (
          paginatedAnnouncements.map((announcement) => {
            const statusInfo = getStatusBadge(announcement);
            
            return (
              <div
                key={announcement.id}
                className="border rounded-xl bg-card p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority === "HIGH" ? t.urgent : announcement.priority === "MEDIUM" ? t.important : t.normal}
                      </span>
                      
                      {isAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-muted">
                          {announcement.visibleTo?.length ? 
                            announcement.visibleTo.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(", ") : 
                            t.all
                          }
                        </span>
                      )}
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>

                      {announcement.isPublic && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800">
                          Public
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium mb-1">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {announcement.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{announcement.createdBy?.name || t.system}</span>
                      <span>{formatDateByCalendarType(announcement.startDate, user?.calendarType || 'ETHIOPIAN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/list/announcements/${announcement.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{t.view}</span>
                    </Link>
                    
                    {isAdmin && (
                      <>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors">
                          <Edit2 className="h-4 w-4" />
                          <span>{t.edit}</span>
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4" />
                          <span>{t.delete}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filteredAnnouncements.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            {t.showing
              .replace("{start}", String((currentPage - 1) * itemsPerPage + 1))
              .replace("{end}", String(Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)))
              .replace("{total}", String(filteredAnnouncements.length))}
          </p>
          <Pagination
            page={currentPage}
            setPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      )}
    </div>
  );
};

export default AnnouncementListPage;
