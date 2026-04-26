"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  BellRing,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  disablePushNotifications,
  getBrowserNotificationPermission,
  isPushSupported,
  requestAndEnablePushNotifications,
  syncPushSubscription,
} from "@/lib/push-notifications";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

const NotificationsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [pushActionLoading, setPushActionLoading] = useState(false);

  useEffect(() => {
    setPushPermission(getBrowserNotificationPermission());
  }, []);

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading, refetch } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: async () => {
      const response = await api.get('/notifications', { params: { limit: "100" } });
      return response.data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Get unread count
  const unreadCount = notificationsData?.filter(n => !n.isRead).length || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
    },
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const notifications = notificationsData || [];

  const handleEnablePush = async () => {
    setPushActionLoading(true);
    try {
      const result = await requestAndEnablePushNotifications();
      setPushPermission(getBrowserNotificationPermission());

      if (result.enabled) {
        toast.success("Browser notifications enabled");
      } else if (result.permission === "denied") {
        toast.error("Browser notifications were blocked");
      } else {
        toast.error("Push notifications are not available right now");
      }
    } catch (error) {
      console.error("Failed to enable push notifications", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleSyncPush = async () => {
    setPushActionLoading(true);
    try {
      const result = await syncPushSubscription();
      setPushPermission(getBrowserNotificationPermission());
      if (result.enabled) {
        toast.success("Push notifications synced");
      } else {
        toast.error("Push notifications are not available right now");
      }
    } catch (error) {
      console.error("Failed to sync push notifications", error);
      toast.error("Failed to sync push notifications");
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushActionLoading(true);
    try {
      await disablePushNotifications();
      setPushPermission(getBrowserNotificationPermission());
      toast.success("Push notifications disabled on this browser");
    } catch (error) {
      console.error("Failed to disable push notifications", error);
      toast.error("Failed to disable push notifications");
    } finally {
      setPushActionLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Notifications</h1>
          <p className="text-muted-foreground">View and manage all your notifications</p>
        </div>
      </div>

      {isPushSupported() && (
        <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/30">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Browser push notifications
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Teachers, parents, and staff can receive attendance alerts,
                  communication book updates, messages, announcements, and
                  other notifications when this browser reconnects to the
                  internet.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pushPermission !== "granted" ? (
                <Button onClick={handleEnablePush} disabled={pushActionLoading}>
                  {pushActionLoading ? "Enabling..." : "Enable Notifications"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSyncPush}
                    disabled={pushActionLoading}
                  >
                    {pushActionLoading ? "Syncing..." : "Sync This Browser"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDisablePush}
                    disabled={pushActionLoading}
                  >
                    Disable
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardContent className="p-6">
          {notificationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-muted-foreground">You have no notifications</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.isRead
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"} text-gray-900 dark:text-gray-100`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        {notification.message && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
