"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api/content";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "nextjs-toast-notify";
import {
  ArrowLeft, Calendar, Clock, AlertTriangle, Loader2, Trash2, Edit2,
  Megaphone, Users, FileText, Download, Bell, Pin, Paperclip
} from "lucide-react";
import Link from "next/link";
import { parseISO, isAfter, isBefore } from "date-fns";
import { formatDateByCalendarType, formatDateTimeByCalendarType } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TranslatedText } from "@/components/translation/TranslatedText";
import type { AnnouncementAttachment } from "@/lib/api/content";

interface AnnouncementPageProps {
  params: { id: string };
}

const AnnouncementPage = ({ params }: AnnouncementPageProps) => {
  const { id } = params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'IT_MANAGER' || user?.role?.toUpperCase() === 'REGISTRAR';

  const { data: announcement, isLoading } = useQuery({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: async () => {
      const response = await announcementsAPI.getById(id);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await announcementsAPI.delete(id); },
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

  const getStatusBadge = (a: Announcement) => {
    const now = new Date();
    const start = parseISO(a.startDate);
    const end = a.endDate ? parseISO(a.endDate) : null;
    if (isAfter(start, now)) return { label: "Scheduled", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" };
    if (end && isBefore(end, now)) return { label: "Expired", className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" };
    return { label: "Active", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" };
  };

  const getAudienceBadge = (visibleTo: string[] | null) => {
    if (!visibleTo || visibleTo.length === 0) return "All";
    const audiences = visibleTo.map(v => {
      const vl = v.toLowerCase();
      if (vl.includes("student")) return "Students";
      if (vl.includes("parent")) return "Parents";
      if (vl.includes("teacher") || vl.includes("admin") || vl.includes("registrar")) return "Staff";
      return v;
    });
    return Array.from(new Set(audiences)).join(", ");
  };

  const parseAttachments = (): AnnouncementAttachment[] => {
    if (!announcement?.attachments) return [];
    try { return JSON.parse(announcement.attachments); } catch { return []; }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 w-full bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 mt-1" /></div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="p-4 md:p-6 w-full bg-gray-50 dark:bg-[#1a1a1a] flex flex-col items-center justify-center min-h-[400px] text-center">
        <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Announcement not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">The announcement you're looking for doesn't exist or has been deleted.</p>
        <Link href="/list/announcements">
          <Button className="rounded-xl bg-[var(--brand-color)] text-white hover:opacity-90">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Announcements
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusBadge(announcement);
  const attachments = parseAttachments();

  return (
    <div className="p-4 md:p-6 w-full bg-gray-50 dark:bg-[#1a1a1a]">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/list/announcements" className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--brand-color,#e35336)]/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-white">Announcement</h1>
              <p className="text-xs text-muted-foreground">View details</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-[#e35336] text-[#e35336] dark:border-[#e35336] dark:text-[#e35336]">
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Content card */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
            {announcement.priority === 'HIGH' ? 'Urgent' : announcement.priority === 'MEDIUM' ? 'Important' : 'Normal'}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
            <Users className="w-3 h-3" />
            {getAudienceBadge(announcement.visibleTo)}
          </span>
          {announcement.isPinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-[rgba(var(--brand-color-rgb),0.08)] text-[var(--brand-color,#e35336)] border-[var(--brand-color,#e35336)]/30">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </div>

        {/* Title */}
        <TranslatedText as="h1" text={announcement.title}
          textClassName="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
          className="mb-4" />

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={(announcement.createdBy as any)?.avatarUrl || ''} />
              <AvatarFallback className="text-xs">{announcement.createdBy?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            {announcement.createdBy?.name || "Unknown"}
          </span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateByCalendarType(announcement.startDate, user?.calendarType || 'ETHIOPIAN')}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTimeByCalendarType(announcement.startDate, user?.calendarType || 'ETHIOPIAN').split(' ').slice(-2).join(' ')}</span>
          {announcement.academicYear && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{announcement.academicYear.name}</span>
          )}
        </div>

        {/* Body */}
        <div className="prose prose-sm max-w-none">
          <TranslatedText text={announcement.content} textClassName="text-gray-700 dark:text-gray-300 leading-relaxed" />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <Paperclip className="w-4 h-4" />
              Attachments ({attachments.length})
            </h3>
            <div className="space-y-2">
              {attachments.map((att: AnnouncementAttachment, idx: number) => (
                <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <FileText className="w-5 h-5 text-[var(--brand-color,#e35336)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(att.size)}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-[var(--brand-color,#e35336)] shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementPage;
