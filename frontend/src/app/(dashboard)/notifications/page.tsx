"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notificationsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { localizeNotificationText } from "@/lib/notification-display";
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
  actionUrl?: string;
  type?: string;
}

const formatTimeAgo = (dateString: string, _t: any) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface NotificationsMessages {
  title: string;
  subtitle: string;
  markAllRead: string;
  enabling: string;
  enableNotifications: string;
  syncing: string;
  syncBrowser: string;
  disable: string;
  pushTitle: string;
  pushDescription: string;
  noNotifications: string;
  justNow: string;
  minAgo: string;
  hoursAgo: string;
  daysAgo: string;
  toasts: Record<string, string>;
}

const NotificationsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, language } = useTranslations<NotificationsMessages>("notifications");
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [pushActionLoading, setPushActionLoading] = useState(false);

  useEffect(() => {
    setPushPermission(getBrowserNotificationPermission());
  }, []);

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading, refetch } = useQuery({
    queryKey: queryKeys.notifications.allPage(user?.id, user?.schoolId),
    queryFn: async () => {
      const response = await notificationsAPI.getAll({ limit: "100" });
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
      await notificationsAPI.markRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await notificationsAPI.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
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
        toast.success(t.toasts.enabled);
      } else if (result.permission === "denied") {
        toast.error(t.toasts.blocked);
      } else {
        toast.error(t.toasts.notAvailable);
      }
    } catch (error) {
      console.error("Failed to enable push notifications", error);
      toast.error(t.toasts.enableFailed);
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
        toast.success(t.toasts.synced);
      } else {
        toast.error(t.toasts.notAvailable);
      }
    } catch (error) {
      console.error("Failed to sync push notifications", error);
      toast.error(t.toasts.syncFailed);
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushActionLoading(true);
    try {
      await disablePushNotifications();
      setPushPermission(getBrowserNotificationPermission());
      toast.success(t.toasts.disabled);
    } catch (error) {
      console.error("Failed to disable push notifications", error);
      toast.error(t.toasts.disableFailed);
    } finally {
      setPushActionLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-3 sm:p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white">{t.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="w-full sm:w-auto"
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              {t.markAllRead}
            </Button>
          )}
        </div>
      </div>

      {isPushSupported() && (
        <Card className="mb-4 md:mb-6 border-orange-200 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/30">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 h-5 w-5 text-orange-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  {t.pushTitle}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t.pushDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pushPermission !== "granted" ? (
                <Button onClick={handleEnablePush} disabled={pushActionLoading} className="w-full sm:w-auto">
                  {pushActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {pushActionLoading ? t.enabling : t.enableNotifications}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSyncPush}
                    disabled={pushActionLoading}
                    className="w-full sm:w-auto"
                  >
                    {pushActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {pushActionLoading ? t.syncing : t.syncBrowser}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDisablePush}
                    disabled={pushActionLoading}
                    className="w-full sm:w-auto"
                  >
                    {t.disable}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
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
            <div className="text-center py-8 sm:py-12">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">{t.noNotifications}</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)] sm:h-[calc(100vh-240px)] md:h-[calc(100vh-280px)]">
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const localized = localizeNotificationText(notification, language);
                  return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    className={`p-3 sm:p-4 rounded-lg border ${
                      notification.isRead
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                    } cursor-pointer transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] dark:hover:bg-slate-800`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm sm:text-base break-words ${!notification.isRead ? "font-semibold" : "font-medium"} text-gray-900 dark:text-gray-100`}>
                            {localized.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {formatTimeAgo(notification.createdAt, t)}
                            </span>
                          </div>
                        </div>
                        {localized.message && (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {localized.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
