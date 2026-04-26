"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { playSirenAudio, unlockSirenAudio } from "@/lib/siren-audio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodTimeManagement } from "./period-time";
import { SirenScheduleManagement } from "./siren-schedule";
import { SirenHardwareConfig } from "./hardware-config";
import { Clock, Bell, Zap, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SirenManagementPage() {
  const { user } = useAuth();
  const [ringing, setRinging] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sirenAudioEnabled");
    if (saved === "true") setAudioEnabled(true);
  }, []);

  const unlockAudio = async () => {
    try {
      await unlockSirenAudio();
      setAudioEnabled(true);
      localStorage.setItem("sirenAudioEnabled", "true");
      toast.success("Audio enabled successfully");
    } catch {
      toast.error("Failed to enable audio");
    }
  };

  const handleRing = async () => {
    if (!user?.schoolId) {
      toast.error("School is not available for this user");
      return;
    }

    setRinging(true);

    try {
      await api.post(
        "/api/siren/trigger",
        {
          schoolId: user.schoolId,
          type: "MANUAL_RING",
        },
        { skipAuthErrorRedirect: true }
      );

      if (audioEnabled) {
        try {
          await playSirenAudio();
        } catch {
          toast.info("Browser blocked audio playback");
        }
      }

      toast.success("Siren triggered");
    } catch {
      toast.error("Failed to trigger siren");
    } finally {
      setRinging(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Siren Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure period times, static schedules, and hardware integration for
            school sirens
          </p>
        </div>

        <Button onClick={handleRing} disabled={ringing} className="gap-2 self-start">
          {ringing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          Ring
        </Button>
        {!audioEnabled && (
          <Button variant="outline" onClick={unlockAudio} className="gap-2 self-start">
            <Volume2 className="h-4 w-4" />
            Enable Audio
          </Button>
        )}
      </div>

      <Tabs defaultValue="periods" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="periods" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Periods</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Schedules</span>
          </TabsTrigger>
          <TabsTrigger value="hardware" className="gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Hardware</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="mt-6">
          <PeriodTimeManagement />
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <SirenScheduleManagement />
        </TabsContent>

        <TabsContent value="hardware" className="mt-6">
          <SirenHardwareConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
