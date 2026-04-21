"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { 
  Megaphone, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Info,
  ChevronRight,
  Loader2,
  Pin
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, isAfter, isBefore } from "date-fns";

interface AnnouncementListProps {
  limit?: number;
  showViewAll?: boolean;
}

const AnnouncementList = ({ limit, showViewAll = true }: AnnouncementListProps) => {
  const { user } = useAuth();
  
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", user?.role],
    queryFn: async () => {
      const response = await announcementsAPI.getAll({ role: user?.role });
      return response.data;
    },
    enabled: !!user,
  });

  const displayAnnouncements = limit ? announcements?.slice(0, limit) : announcements;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "LOW":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (roleId: string): string => {
    const roleNames: Record<string, string> = {
      admin: 'Admin',
      teacher: 'Teachers', 
      student: 'Students',
      parent: 'Parents',
      registrar: 'Registrars',
      finance: 'Finance',
      hr: 'HR',
    };
    return roleNames[roleId.toLowerCase()] || roleId;
  };

  const isAnnouncementActive = (announcement: Announcement) => {
    const now = new Date();
    const startDate = parseISO(announcement.startDate);
    const endDate = announcement.endDate ? parseISO(announcement.endDate) : null;
    
    if (isBefore(startDate, now)) {
      return endDate ? isAfter(endDate, now) : true;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p>No announcements available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayAnnouncements?.map((announcement) => (
        <div
          key={announcement.id}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {announcement.priority === "HIGH" && (
                  <span className="flex items-center gap-1">
                    <Pin className="w-3 h-3 text-red-500" />
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                  {getPriorityIcon(announcement.priority)}
                  {announcement.priority}
                </span>
                {announcement.visibleTo && announcement.visibleTo.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    {announcement.visibleTo.map(role => getRoleDisplayName(role)).join(', ')}
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2 line-clamp-2">
                {announcement.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                {announcement.content}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(announcement.startDate), "MMM d, yyyy")}
                </span>
                {announcement.endDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Until {format(parseISO(announcement.endDate), "MMM d, yyyy")}
                  </span>
                )}
                {announcement.createdBy && (
                  <span className="flex items-center gap-1">
                    <Megaphone className="w-3.5 h-3.5" />
                    {announcement.createdBy.name}
                  </span>
                )}
              </div>
            </div>
            
            <Link
              href={`/list/announcements/${announcement.id}`}
              className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </Link>
          </div>
        </div>
      ))}
      
      {showViewAll && limit && announcements.length > limit && (
        <Link
          href="/list/announcements"
          className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2"
        >
          View all {announcements.length} announcements
        </Link>
      )}
    </div>
  );
};

export default AnnouncementList;
