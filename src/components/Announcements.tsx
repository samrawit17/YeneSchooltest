'use client';

import { useQuery } from '@tanstack/react-query';
import { announcementsAPI, Announcement } from '@/lib/api';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';

const Announcements = () => {
  // Fetch 4 newest announcements for parent role
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements-sidebar'],
    queryFn: async () => {
      const response = await announcementsAPI.getAll({ role: 'PARENT' });
      return response.data.slice(0, 4); // Get only first 4
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
      case 'MEDIUM':
        return 'bg-lamaYellowLight dark:bg-yellow-900/20 border-l-4 border-yellow-500';
      case 'LOW':
      default:
        return 'bg-lamaSkyLight dark:bg-blue-900/20 border-l-4 border-blue-500';
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4 dark:text-white">Announcements</h1>
        <Link 
          href="/list/announcements" 
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex flex-col gap-3 mt-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          ))
        ) : announcements && announcements.length > 0 ? (
          announcements.map((announcement: Announcement) => (
            <div
              key={announcement.id}
              className={`${getPriorityColor(announcement.priority)} rounded-md p-3`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-sm line-clamp-1 dark:text-white">{announcement.title}</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#334155] rounded-md px-2 py-1 flex-shrink-0">
                  {new Date(announcement.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {announcement.content}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
            <p className="text-sm">No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
