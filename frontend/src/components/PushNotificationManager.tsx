"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  PUSH_NOTIFICATIONS_DISABLED_KEY,
  getBrowserNotificationPermission,
  isPushSupported,
  registerNotificationServiceWorker,
  requestAndEnablePushNotifications,
  syncPushSubscription,
} from "@/lib/push-notifications";

const PUSH_PROMPT_STORAGE_KEY = "push_notifications_prompted";

export default function PushNotificationManager() {
  const { isAuthenticated, user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const syncingRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const payload = event.data.payload;
        
        toast(payload.title, {
          description: payload.body,
        });

        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["communications-unread-count"] });
        queryClient.invalidateQueries({ queryKey: ["communications-navbar"] });
        queryClient.invalidateQueries({ queryKey: ["announcement-count"] });
        queryClient.invalidateQueries({ queryKey: ["communication-stats-menu"] });
        queryClient.invalidateQueries({ queryKey: ["announcements-count-menu"] });
        queryClient.invalidateQueries({ queryKey: ["events-count-menu"] });
        queryClient.invalidateQueries({ queryKey: ["notification-categories"] });
        queryClient.invalidateQueries({ queryKey: ["messaging-messages"] });
        queryClient.invalidateQueries({ queryKey: ["messaging-conversations"] });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !user || !isOnline || !isPushSupported()) {
      return;
    }

    const syncSubscription = async () => {
      if (syncingRef.current) {
        return;
      }

      if (localStorage.getItem(PUSH_NOTIFICATIONS_DISABLED_KEY) === "true") {
        return;
      }

      syncingRef.current = true;

      try {
        const registration = await registerNotificationServiceWorker();

        // Force-check for an updated SW and wait for it to activate
        if (registration) {
          await registration.update();
        }

        if (getBrowserNotificationPermission() === "granted") {
          await syncPushSubscription();
          return;
        }

        if (
          getBrowserNotificationPermission() === "default" &&
          !localStorage.getItem(PUSH_PROMPT_STORAGE_KEY)
        ) {
          localStorage.setItem(PUSH_PROMPT_STORAGE_KEY, "true");
          const result = await requestAndEnablePushNotifications();

          if (result.enabled) {
            toast.success("Browser notifications enabled");
          }
        }
      } catch (error) {
        console.error("Failed to sync push notifications", error);
      } finally {
        syncingRef.current = false;
      }
    };

    void syncSubscription();
  }, [isAuthenticated, isOnline, user]);

  return null;
}
