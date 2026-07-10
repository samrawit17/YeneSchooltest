"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bell, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playSirenAudio, unlockSirenAudio } from "@/lib/siren-audio";

interface SirenEvent {
  type: string;
  triggerType: string;
  timestamp: string;
}

export function SirenListener() {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("sirenAudioEnabled");
    if (saved === "true") setAudioEnabled(true);
  }, []);

  const unlockAudio = async () => {
    try {
      await unlockSirenAudio();
      setAudioEnabled(true);
      audioEnabledRef.current = true;
      localStorage.setItem("sirenAudioEnabled", "true");
      toast.success("Audio enabled successfully");
    } catch {
      toast.error("Failed to enable audio");
    }
  };

  useEffect(() => {
    if (!user?.schoolId) return;

    const backendUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL)
      : new URL(window.location.origin);
    const wsProtocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${backendUrl.host}/api/siren/ws?schoolId=${user.schoolId}`;

    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Siren listener connected");
        };

        ws.onmessage = (event) => {
          try {
            const sirenEvent: SirenEvent = JSON.parse(event.data);
            handleSirenEvent(sirenEvent);
          } catch (error) {
            console.error("Failed to parse siren event:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("Siren listener disconnected, reconnecting in 5s...");
          reconnectTimeout = setTimeout(connect, 5000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Failed to connect to siren WebSocket:", error);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.schoolId]);

  const handleSirenEvent = async (event: SirenEvent) => {
    const message =
      event.triggerType === "DYNAMIC"
        ? `Period ${event.type.split("_")[1].toLowerCase()}`
        : event.type;

    // Play audio notification
    if (audioEnabledRef.current) {
      try {
        await playSirenAudio();
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    }

    // Show toast notification
    toast.info(`🔔 Siren: ${message}`, {
      icon: <Bell className="w-4 h-4" />,
      duration: 5000,
    });

    // Request push notification permission if not already granted
    if (
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("School Siren", {
        body: `${message} siren triggered`,
        icon: "/bell-icon.png",
        badge: "/bell-icon.png",
      });
    }
  };

  return (
    <>
      {/* Enable Audio Button */}
      {!audioEnabled && (
        <button
          onClick={unlockAudio}
          className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-opacity"
        >
          <Volume2 className="w-4 h-4" />
          Enable Audio
        </button>
      )}
    </>
  );
}
