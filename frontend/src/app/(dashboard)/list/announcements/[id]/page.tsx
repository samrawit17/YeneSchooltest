"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api/content";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "nextjs-toast-notify";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Info,
  Loader2,
  Trash2,
  Edit2,
  Megaphone,
  Users,
  FileText,
  Download,
  CheckCircle,
  Eye,
  Bell,
  Send
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { formatDateByCalendarType, formatDateTimeByCalendarType } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface AnnouncementPageProps {
  params: {
    id: string;
  };
}

const AnnouncementPage = ({ params }: AnnouncementPageProps) => {
  const { id } = params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = (user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'IT_MANAGER') || user?.role?.toUpperCase() === 'REGISTRAR';
  const [hasRead, setHasRead] = useState(false);

  const { data: announcement, isLoading } = useQuery({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: async () => {
      const response = await announcementsAPI.getById(id);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await announcementsAPI.delete(id);
    },
    onSuccess: () => {
      showToast.success("Announcement deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      window.location.href = "/list/announcements";
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || "Failed to delete announcement");
    },
  });

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

  const getAudienceBadge = (visibleTo: string[] | null) => {
    if (!visibleTo || visibleTo.length === 0) return "All";
    
    const audiences = visibleTo.map(v => {
      const vLower = v.toLowerCase();
      if (vLower.includes("student")) return "Students";
      if (vLower.includes("parent")) return "Parents";
      if (vLower.includes("teacher") || vLower.includes("admin") || vLower.includes("registrar")) return "Staff";
      return v;
    });
    
    return Array.from(new Set(audiences)).join(", ");
  };

  const handleMarkAsRead = () => {
    setHasRead(true);
    showToast.success("Marked as read");
  };

  // Loading state with skeletons matching the exact structure
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="w-full">
          {/* Header Skeleton */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="h-6 w-px bg-gray-300" />
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Announcement Card Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                    <Skeleton className="h-9 w-32" />
                  </div>
                </div>

                {/* Comments Section Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="mb-6">
                    <Skeleton className="h-24 w-full mb-2" />
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-32" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Skeleton */}
              <div className="space-y-6">
                {/* Quick Info Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <Skeleton className="h-5 w-24 mb-4" />
                  <div className="space-y-4">
                    <div>
                      <Skeleton className="h-3 w-12 mb-2" />
                      <Skeleton className="h-7 w-20 rounded-full" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-12 mb-2" />
                      <Skeleton className="h-7 w-20 rounded-full" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-16 mb-2" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-20 mb-2" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Actions Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <Skeleton className="h-5 w-16 mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-gray-50 dark:bg-gray-900">
        <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Announcement not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">The announcement you're looking for doesn't exist or has been deleted.</p>
        <Link href="/list/announcements">
          <Button className="bg-[#e35336] hover:bg-[#1e3a8a]/90">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Announcements
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusBadge(announcement);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900">
      {/* Main Content - Full Width */}
      <div className="w-full">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#E2E8F0] dark:border-gray-700 px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/list/announcements" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Announcement Details</h1>
            </div>
            
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-[#e35336] text-[#e35336] dark:border-[#e35336] dark:text-[#e35336]">
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Announcement Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority === 'HIGH' && '⚠️ '}{announcement.priority === 'MEDIUM' ? 'Important' : announcement.priority === 'HIGH' ? 'Urgent' : 'Normal'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                      <Users className="w-3 h-3" />
                      {getAudienceBadge(announcement.visibleTo)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-[#e35336] mb-4">
                  {announcement.title}
                </h1>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <span className="flex items-center gap-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={(announcement.createdBy as any)?.avatarUrl || ''} />
                      <AvatarFallback className="text-xs">
                        {announcement.createdBy?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {announcement.createdBy?.name || "Unknown"}
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

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{announcement.content}</p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Info</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priority</label>
                    <p className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority === 'HIGH' ? 'Urgent' : announcement.priority === 'MEDIUM' ? 'Important' : 'Normal'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
                    <p className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${statusInfo.className}`}>
                      {statusInfo.label}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Audience</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{getAudienceBadge(announcement.visibleTo)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created By</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(announcement.createdBy as any)?.avatarUrl || ''} />
                        <AvatarFallback>
                          {announcement.createdBy?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{announcement.createdBy?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{announcement.createdBy?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start dark:border-gray-600 dark:text-gray-300">
                    <Download className="w-4 h-4 mr-2" />
                    Download as PDF
                  </Button>
                  <Button variant="outline" className="w-full justify-start dark:border-gray-600 dark:text-gray-300">
                    <Bell className="w-4 h-4 mr-2" />
                    Get Notifications
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPage;
