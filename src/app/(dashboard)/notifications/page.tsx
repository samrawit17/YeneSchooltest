"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  BellRing,
  ClipboardCheck,
  GraduationCap,
  CalendarClock,
  MessageSquare,
  Megaphone,
  DollarSign,
  CreditCard,
  ShieldAlert,
  UserCog,
  Lock,
  FileText,
  FileCheck,
  FileX,
  Clock,
  BookMarked,
  Calendar,
  ClipboardList,
  AlertTriangle,
  Info,
  Check,
  CheckCheck,
  Filter,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface CategoryCount {
  total: number;
  unread: number;
}

interface Categories {
  all: CategoryCount;
  attendance: CategoryCount;
  enrollment: CategoryCount;
  academic: CategoryCount;
  schedule: CategoryCount;
  communication: CategoryCount;
  event: CategoryCount;
  finance: CategoryCount;
  system: CategoryCount;
}

const categoryInfo = [
  { id: "all", label: "All", icon: Bell, color: "text-gray-600" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, color: "text-blue-500" },
  { id: "enrollment", label: "Enrollment", icon: FileText, color: "text-amber-500" },
  { id: "academic", label: "Academic", icon: BookMarked, color: "text-purple-500" },
  { id: "schedule", label: "Schedule", icon: Calendar, color: "text-indigo-500" },
  { id: "communication", label: "Communication", icon: MessageSquare, color: "text-green-500" },
  { id: "event", label: "Events", icon: CalendarClock, color: "text-pink-500" },
  { id: "finance", label: "Finance", icon: DollarSign, color: "text-red-500" },
  { id: "system", label: "System", icon: ShieldAlert, color: "text-gray-600" },
];

const getNotificationIcon = (type: string | undefined) => {
  switch (type?.toUpperCase()) {
    // Attendance notifications
    case 'ATTENDANCE_MARKED':
    case 'ATTENDANCE_ABSENT':
    case 'ATTENDANCE_LATE':
    case 'ATTENDANCE_SESSION_OPENED':
    case 'ATTENDANCE_SESSION_SUBMITTED':
      return <ClipboardCheck className="w-5 h-5 text-blue-500" />;
    
    // Enrollment notifications
    case 'ENROLLMENT_SUBMITTED':
      return <FileText className="w-5 h-5 text-amber-500" />;
    case 'ENROLLMENT_APPROVED':
      return <FileCheck className="w-5 h-5 text-green-500" />;
    case 'ENROLLMENT_REJECTED':
      return <FileX className="w-5 h-5 text-red-500" />;
    case 'ENROLLMENT_PENDING':
      return <Clock className="w-5 h-5 text-amber-500" />;
    
    // Academic notifications
    case 'ASSIGNMENT_CREATED':
      return <BookMarked className="w-5 h-5 text-purple-500" />;
    case 'ASSIGNMENT_DUE':
      return <CalendarClock className="w-5 h-5 text-orange-500" />;
    case 'ASSIGNMENT_GRADED':
    case 'RESULT_PUBLISHED':
    case 'GRADE_UPDATED':
      return <GraduationCap className="w-5 h-5 text-green-600" />;
    
    // Schedule notifications
    case 'SCHEDULE_CHANGED':
    case 'CLASS_CANCELLED':
    case 'TIMETABLE_UPDATED':
      return <Calendar className="w-5 h-5 text-indigo-500" />;
    
    // Communication notifications
    case 'MESSAGE_RECEIVED':
      return <MessageSquare className="w-5 h-5 text-green-500" />;
    case 'ANNOUNCEMENT':
      return <Megaphone className="w-5 h-5 text-blue-500" />;
    case 'COMMUNICATION':
      return <ClipboardList className="w-5 h-5 text-teal-500" />;
    
    // Event notifications
    case 'EVENT':
    case 'EVENT_UPDATED':
    case 'EVENT_DELETED':
      return <CalendarClock className="w-5 h-5 text-pink-500" />;
    
    // Finance notifications
    case 'FEE_DUE':
      return <DollarSign className="w-5 h-5 text-red-500" />;
    case 'FEE_PAID':
    case 'PAYMENT_RECEIVED':
      return <CreditCard className="w-5 h-5 text-green-600" />;
    
    // System notifications
    case 'SYSTEM_ALERT':
      return <ShieldAlert className="w-5 h-5 text-red-500" />;
    case 'ACCOUNT_CREATED':
      return <UserCog className="w-5 h-5 text-blue-500" />;
    case 'PASSWORD_RESET':
      return <Lock className="w-5 h-5 text-amber-500" />;
    
    // General
    case 'ALERT':
    case 'WARNING':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'INFO':
    default:
      return <Info className="w-5 h-5 text-gray-500" />;
  }
};

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
  const [activeCategory, setActiveCategory] = useState("all");
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [pushActionLoading, setPushActionLoading] = useState(false);

  useEffect(() => {
    setPushPermission(getBrowserNotificationPermission());
  }, []);

  // Fetch categories with counts
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["notification-categories"],
    queryFn: async () => {
      const response = await api.get('/notifications/categories');
      return response.data.categories as Categories;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch notifications based on category
  const { data: notificationsData, isLoading: notificationsLoading, refetch } = useQuery({
    queryKey: ["notifications", activeCategory],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "50" };
      if (activeCategory !== "all") {
        params.category = activeCategory;
      }
      const response = await api.get('/notifications', { params });
      return response.data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-categories"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-categories"] });
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

  const categories = categoriesData || {
    all: { total: 0, unread: 0 },
    attendance: { total: 0, unread: 0 },
    enrollment: { total: 0, unread: 0 },
    academic: { total: 0, unread: 0 },
    schedule: { total: 0, unread: 0 },
    communication: { total: 0, unread: 0 },
    event: { total: 0, unread: 0 },
    finance: { total: 0, unread: 0 },
    system: { total: 0, unread: 0 },
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Notifications</h1>
          <p className="text-gray-500">View and manage all your notifications</p>
        </div>
        <Button
          variant="outline"
          onClick={handleMarkAllAsRead}
          disabled={categories.all.unread === 0 || markAllAsReadMutation.isPending}
          className="gap-2"
        >
          {markAllAsReadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck className="w-4 h-4" />
          )}
          Mark all as read
        </Button>
      </div>

      {isPushSupported() && (
        <Card className="mb-6 border-orange-200 bg-orange-50/70">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-slate-900">
                  Browser push notifications
                </p>
                <p className="text-sm text-slate-600">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-1 p-2">
                {categoryInfo.map((category) => {
                  const Icon = category.icon;
                  const count = categories[category.id as keyof Categories] as CategoryCount | undefined;
                  const unreadCount = count?.unread || 0;
                  const totalCount = count?.total || 0;

                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        activeCategory === category.id
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${category.color}`} />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                      {unreadCount === 0 && totalCount > 0 && (
                        <span className="text-xs text-gray-400">{totalCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryInfo.find((c) => c.id === activeCategory)?.label} Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications in this category</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        notification.isRead
                          ? "bg-white border-gray-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"} text-gray-900`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-2">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          {notification.message && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.type}
                            </Badge>
                            {notification.actionUrl && (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
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
    </div>
  );
};

export default NotificationsPage;
