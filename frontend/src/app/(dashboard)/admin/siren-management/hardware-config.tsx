"use client";

import { useCallback, useState, useEffect } from "react";
import { sirenHardwareAPI } from "@/lib/api/siren-hardware";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Zap,
  Save,
  AlertCircle,
  Loader2,
  TestTube,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/hooks/useTranslations";

interface HardwareConfig {
  id: string;
  webhookUrl: string;
  isEnabled: boolean;
  timeout: number;
}

export function SirenHardwareConfig() {
  const { user } = useAuth();
  const { t } = useTranslations<any>("sirenManagement");
  const [config, setConfig] = useState<HardwareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    webhookUrl: "",
    isEnabled: false,
    timeout: 5000,
  });

  const schoolId = user?.schoolId;

  // Fetch config
  const fetchConfig = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await sirenHardwareAPI.get(schoolId);
      const data = res.data;
      if (!data) {
        setConfig(null);
        return;
      }
      setConfig(data);
      setForm({
        webhookUrl: data.webhookUrl || "",
        isEnabled: data.isEnabled || false,
        timeout: data.timeout || 5000,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        setConfig(null);
        return;
      }
      toast.error(t.hardware.toasts.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t.hardware.toasts.loadFailed]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!form.webhookUrl) {
      toast.error(t.hardware.toasts.webhookRequired);
      return;
    }

    try {
      new URL(form.webhookUrl);
    } catch {
      toast.error(t.hardware.toasts.invalidWebhook);
      return;
    }

    if (!schoolId) {
      toast.error(t.hardware.toasts.schoolNotFound);
      return;
    }
    setSaving(true);
    try {
      if (config) {
        await sirenHardwareAPI.update(config.id, { schoolId, ...form });
      } else {
        await sirenHardwareAPI.create({ schoolId, ...form });
      }
      toast.success(t.hardware.toasts.saved);
      await fetchConfig();
    } catch (error) {
      toast.error(t.hardware.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!form.webhookUrl) {
      toast.error(t.hardware.toasts.configureFirst);
      return;
    }

    setTesting(true);
    try {
      await sirenHardwareAPI.test({ webhookUrl: form.webhookUrl, timeout: form.timeout });
      toast.success(t.hardware.toasts.testSuccess);
    } catch (error) {
      toast.error(t.hardware.toasts.testFailed);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
        <Card className="max-w-full overflow-hidden">
          <CardHeader className="min-w-0">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardContent>
        </Card>
        <Card className="max-w-full overflow-hidden">
          <CardHeader className="min-w-0">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-9 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {/* Main Configuration */}
      <Card className="max-w-full overflow-hidden">
        <CardHeader className="min-w-0">
          <CardTitle className="flex min-w-0 items-center gap-2 break-words">
            <Zap className="h-5 w-5 shrink-0" />
            {t.hardware.title}
          </CardTitle>
          <CardDescription className="break-words">
            {t.hardware.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.hardware.howItWorks}</AlertTitle>
            <AlertDescription>
              {t.hardware.howItWorksDescription}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">{t.hardware.webhookUrl}</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder={t.hardware.webhookPlaceholder}
                value={form.webhookUrl}
                onChange={(e) =>
                  setForm({ ...form, webhookUrl: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t.hardware.webhookHelp}
              </p>
            </div>

            <div>
              <Label htmlFor="timeout">{t.hardware.timeout}</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="30000"
                step="1000"
                value={form.timeout}
                onChange={(e) =>
                  setForm({ ...form, timeout: parseInt(e.target.value) })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t.hardware.timeoutHelp}
              </p>
            </div>

            <div>
              <Label>{t.hardware.status}</Label>
              <div className="mt-2 flex flex-col gap-3 rounded-md border bg-muted/50 p-3 sm:flex-row sm:items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({ ...form, isEnabled: !form.isEnabled })
                  }
                  className="gap-2"
                >
                  {form.isEnabled ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-green-600" />
                      {t.hardware.enabled}
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                      {t.hardware.disabled}
                    </>
                  )}
                </Button>
                <p className="break-words text-sm text-muted-foreground">
                  {form.isEnabled
                    ? t.hardware.activeDescription
                    : t.hardware.inactiveDescription}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {t.hardware.saveConfiguration}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestWebhook}
              disabled={testing || !form.webhookUrl}
              className="gap-2"
            >
              {testing && <Loader2 className="w-4 h-4 animate-spin" />}
              <TestTube className="w-4 h-4" />
              {t.hardware.testWebhook}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Format Reference */}
      <Card className="max-w-full overflow-hidden">
        <CardHeader className="min-w-0">
          <CardTitle className="text-lg">{t.hardware.formatReference}</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t.hardware.activationRequest}</h4>
            <pre className="max-w-full overflow-x-auto rounded bg-muted p-3 text-xs">
              {`POST {webhookUrl}/on`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t.hardware.deactivationRequest}</h4>
            <pre className="max-w-full overflow-x-auto rounded bg-muted p-3 text-xs">
              {`POST {webhookUrl}/off`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t.hardware.expectedResponse}</h4>
            <pre className="max-w-full overflow-x-auto rounded bg-muted p-3 text-xs">
              {`HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "message": "${t.hardware.responseMessage}",
  "timestamp": "2026-04-26T14:30:00Z"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Safety Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t.hardware.safetyTitle}</AlertTitle>
        <AlertDescription>
          {t.hardware.safetyDescription}
        </AlertDescription>
      </Alert>
    </div>
  );
}
