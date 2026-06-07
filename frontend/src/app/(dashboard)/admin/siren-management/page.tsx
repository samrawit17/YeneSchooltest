"use client";

import { useState, useEffect } from "react";
import { sirenControlAPI } from "@/lib/api/siren-control";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { playSirenAudio, unlockSirenAudio } from "@/lib/siren-audio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodTimeManagement } from "./period-time";
import { SirenScheduleManagement } from "./siren-schedule";
import { SirenHardwareConfig } from "./hardware-config";
import { Bell, Clock, Zap, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/hooks/useTranslations";

export default function SirenManagementPage() {
  const { user } = useAuth();
  const { t } = useTranslations<any>("sirenManagement");
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
      toast.success(t.toasts.audioEnabled);
    } catch {
      toast.error(t.toasts.audioFailed);
    }
  };

  const handleRing = async () => {
    if (!user?.schoolId) {
      toast.error(t.toasts.schoolUnavailable);
      return;
    }

    setRinging(true);

    try {
      await sirenControlAPI.trigger({
        schoolId: user.schoolId,
        type: "MANUAL_RING",
      });

      if (audioEnabled) {
        try {
          await playSirenAudio();
        } catch {
          toast.info(t.toasts.browserBlocked);
        }
      }

      toast.success(t.toasts.triggered);
    } catch {
      toast.error(t.toasts.triggerFailed);
    } finally {
      setRinging(false);
    }
  };

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-6 p-3 sm:p-4 md:p-8">
      <div className="mb-8 flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight md:text-3xl">{t.title}</h1>
          <p className="mt-2 break-words text-muted-foreground">
            {t.description}
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 md:w-auto md:shrink-0 md:justify-end">
          <Button onClick={handleRing} disabled={ringing} className="gap-2">
            {ringing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {t.ring}
          </Button>
          {!audioEnabled && (
            <Button variant="outline" onClick={unlockAudio} className="gap-2">
              <Volume2 className="h-4 w-4" />
              {t.enableAudio}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="schedules" className="w-full min-w-0 max-w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0 md:grid md:w-full md:grid-cols-3">
          <TabsTrigger
            value="periods"
            className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>{t.tabs.periods}</span>
          </TabsTrigger>
          <TabsTrigger
            value="schedules"
            className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span>{t.tabs.schedules}</span>
          </TabsTrigger>
          <TabsTrigger
            value="hardware"
            className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm"
          >
            <Zap className="h-4 w-4 shrink-0" />
            <span>{t.tabs.hardware}</span>
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="periods" className="mt-6 min-w-0 max-w-full">
          <PeriodTimeManagement />
        </TabsContent>

        <TabsContent value="schedules" className="mt-6 min-w-0 max-w-full">
          <SirenScheduleManagement />
        </TabsContent>

        <TabsContent value="hardware" className="mt-6 min-w-0 max-w-full">
          <SirenHardwareConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
