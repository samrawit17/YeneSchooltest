"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Volume2 } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { playSirenAudio, unlockSirenAudio } from "@/lib/siren-audio";
import {
  PUSH_NOTIFICATIONS_DISABLED_KEY,
  getBrowserNotificationPermission,
  isPushSupported,
  registerNotificationServiceWorker,
  requestAndEnablePushNotifications,
  syncPushSubscription,
} from "@/lib/push-notifications";

const PUSH_PROMPT_STORAGE_KEY = "push_notifications_prompted";
const SIREN_AUDIO_ENABLED_KEY = "sirenAudioEnabled";

export default function PushNotificationManager() {
  const { isAuthenticated, user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const syncingRef = useRef(false);
  const queryClient = useQueryClient();
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAudioEnabled(localStorage.getItem(SIREN_AUDIO_ENABLED_KEY) === "true");
  }, []);

  const unlockAudio = async () => {
    try {
      await unlockSirenAudio();
      localStorage.setItem(SIREN_AUDIO_ENABLED_KEY, "true");
      setAudioEnabled(true);
      toast.success("Siren audio enabled");
    } catch {
      toast.error("Unable to enable siren audio in this browser");
    }
  };

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const payload = event.data.payload;

        if (payload.type === "SIREN_ALERT") {
          if (audioEnabled) {
            void (async () => {
              try {
                await playSirenAudio();
              } catch (error) {
                console.error("Failed to play siren audio", error);
              }
            })();
          }

          toast.error(payload.title || "School Siren Alert", {
            description: payload.body,
            duration: 10000,
          });
        } else {
          toast(payload.title, {
            description: payload.body,
          });
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.menu.communicationsUnread });
        queryClient.invalidateQueries({ queryKey: queryKeys.menu.communicationsNavbar });
        queryClient.invalidateQueries({ queryKey: queryKeys.announcements.activeCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.menu.communicationStats() });
        queryClient.invalidateQueries({ queryKey: queryKeys.announcements.menuCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.events.menuCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.categories });
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.messagesRoot });
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversationsRoot });
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
  }, [audioEnabled, queryClient]);

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

  const canEnableAudio =
    isAuthenticated &&
    (user?.role === "TEACHER" ||
      user?.role === "ADMIN" ||
      user?.role === "IT_MANAGER");

  return (
    <>
      {canEnableAudio && !audioEnabled && (
        <button
          onClick={unlockAudio}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
        >
          <Volume2 className="h-4 w-4" />
          Enable Siren Audio
        </button>
      )}
    </>
  );
}
