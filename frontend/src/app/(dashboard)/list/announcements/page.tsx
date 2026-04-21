"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api";
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
  X
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { formatDateByCalendarType, formatDateTimeByCalendarType } from "@/lib/calendar-utils";
import Link from "next/link";

type AudienceFilter = "all" | "students" | "parents" | "staff";
type StatusFilter = "all" | "active" | "scheduled" | "expired";

const AnnouncementListPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'REGISTRAR';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", user?.role],
    queryFn: async () => {
      const response = await announcementsAPI.getAll({ role: user?.role });
      return response.data;
    },
    enabled: !!user,
  });

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
      return { label: "Scheduled", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" };
    }
    if (endDate && isBefore(endDate, now)) {
      return { label: "Expired", className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" };
    }
    return { label: "Active", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" };
  };

  const clearFilters = () => {
    setSearchQuery("");
    setAudienceFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || audienceFilter !== "all" || statusFilter !== "all";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#e35336]">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Latest news and updates</p>
        </div>
        {isAdmin && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Create an announcement visible to selected users
                </DialogDescription>
              </DialogHeader>
              <CreateAnnouncementForm 
                onSuccess={() => setShowCreateModal(false)}
                onCancel={() => setShowCreateModal(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
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
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="students">Students</SelectItem>
            <SelectItem value="parents">Parents</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="sm" className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Announcement List */}
      <div className="space-y-3">
        {isLoading ? (
          // Card-level skeleton - simple centered spinner
          <div className="flex items-center justify-center py-12 border rounded-lg bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedAnnouncements.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No announcements found</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          paginatedAnnouncements.map((announcement) => {
            const statusInfo = getStatusBadge(announcement);
            
            return (
              <div
                key={announcement.id}
                className="border rounded-lg bg-card p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority === "HIGH" ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <Info className="h-3 w-3" />
                        )}
                        {announcement.priority === "HIGH" ? "Urgent" : announcement.priority === "MEDIUM" ? "Important" : "Normal"}
                      </span>
                      
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-muted">
                        <Users className="h-3 w-3" />
                        {announcement.visibleTo?.length ? 
                          announcement.visibleTo.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(", ") : 
                          "All"
                        }
                      </span>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="font-medium mb-1 line-clamp-1">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {announcement.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {announcement.createdBy?.name || "System"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateByCalendarType(announcement.startDate, user?.calendarType || 'ETHIOPIAN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTimeByCalendarType(announcement.startDate, user?.calendarType || 'ETHIOPIAN').split(' ').slice(-2).join(' ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:flex-col sm:items-end">
                    <Link
                      href={`/list/announcements/${announcement.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm text-primary hover:bg-primary/5 rounded transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </Link>
                    
                    {isAdmin && (
                      <>
                        <button className="inline-flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors">
                          <Edit2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button className="inline-flex items-center gap-1 px-2 py-1 text-sm text-destructive hover:bg-destructive/5 rounded transition-colors">
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Delete</span>
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
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)} of{" "}
            {filteredAnnouncements.length}
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