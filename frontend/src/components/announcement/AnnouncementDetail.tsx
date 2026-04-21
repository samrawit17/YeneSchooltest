"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface AnnouncementDetailProps {
  id: string;
}

interface ReadReceipt {
  id: string;
  userName: string;
  userEmail: string;
  readAt: string;
  avatarUrl?: string;
}

const mockReadReceipts: ReadReceipt[] = [
  { id: "1", userName: "John Smith", userEmail: "john@example.com", readAt: "2024-01-15T10:30:00Z" },
  { id: "2", userName: "Sarah Johnson", userEmail: "sarah@example.com", readAt: "2024-01-15T11:45:00Z" },
  { id: "3", userName: "Michael Brown", userEmail: "michael@example.com", readAt: "2024-01-15T14:20:00Z" },
];

const AnnouncementDetail = ({ id }: AnnouncementDetailProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'REGISTRAR';
  const [comment, setComment] = useState("");
  const [hasRead, setHasRead] = useState(false);
  const [comments, setComments] = useState<{ id: string; userName: string; content: string; createdAt: string }[]>([
    { id: "1", userName: "Parent User", content: "Thank you for the update. Will this affect the upcoming exams?", createdAt: "2024-01-15T09:30:00Z" }
  ]);

  const { data: announcement, isLoading } = useQuery({
    queryKey: ["announcement", id],
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
      toast.success("Announcement deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      window.location.href = "/list/announcements";
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete announcement");
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
    toast.success("Marked as read");
  };

  const handlePostComment = () => {
    if (!comment.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      userName: user?.name || "Anonymous",
      content: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setComments([newComment, ...comments]);
    setComment("");
    toast.success("Comment posted");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Announcement not found</h2>
        <p className="text-muted-foreground mb-4">The announcement you're looking for doesn't exist.</p>
        <Link href="/list/announcements">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Announcements
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusBadge(announcement);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link href="/list/announcements" className="inline-block mb-4">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      {/* Main Card */}
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
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
              {getAudienceBadge(announcement.visibleTo)}
            </span>

            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl md:text-2xl font-semibold mb-3">
            {announcement.title}
          </h1>
          
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Megaphone className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {announcement.createdBy?.name || "System"}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateByCalendarType(announcement.createdAt, user?.calendarType || 'ETHIOPIAN')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTimeByCalendarType(announcement.createdAt, user?.calendarType || 'ETHIOPIAN').split(' ').slice(-2).join(' ')}
            </span>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Link href={`/list/announcements/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this announcement? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap">
              {announcement.content}
            </p>
          </div>

          {/* Attachments */}
          <div className="mt-5 pt-5 border-t">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Attachments
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">School_Calendar_2024.pdf</p>
                    <p className="text-xs text-muted-foreground">2.4 MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acknowledgment */}
      <div className="mt-4 border rounded-lg bg-card p-5">
        <h3 className="text-base font-medium mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          Acknowledgment
        </h3>
        
        {!hasRead ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">Please acknowledge that you have read this announcement.</p>
            <Button onClick={handleMarkAsRead} size="sm" className="gap-1">
              <CheckCircle className="h-4 w-4" />
              Mark as Read
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">You have acknowledged this announcement</span>
          </div>
        )}

        {/* Read By List (Admin Only) */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Read by ({mockReadReceipts.length})
            </h4>
            <div className="space-y-2">
              {mockReadReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {receipt.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{receipt.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{receipt.userEmail}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDateTimeByCalendarType(receipt.readAt, user?.calendarType || 'ETHIOPIAN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="mt-4 border rounded-lg bg-card p-5">
        <h3 className="text-base font-medium mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Comments
        </h3>
        
        {/* Comment Input */}
        <div className="mb-4">
          <Textarea
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <Button 
              onClick={handlePostComment}
              disabled={!comment.trim()}
              size="sm"
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              Post
            </Button>
          </div>
        </div>

        {/* Existing Comments */}
        <div className="space-y-3">
          {comments.length > 0 ? (
            comments.map((c) => (
              <div key={c.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-muted text-xs">
                        {c.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{c.userName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeByCalendarType(c.createdAt, user?.calendarType || 'ETHIOPIAN')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground pl-8">{c.content}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;