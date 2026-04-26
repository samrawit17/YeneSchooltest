"use client";

import { useCallback, useState, useEffect } from "react";
import api from "@/lib/api";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface HardwareConfig {
  id: string;
  webhookUrl: string;
  isEnabled: boolean;
  timeout: number;
}

export function SirenHardwareConfig() {
  const { user } = useAuth();
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
      const res = await api.get('/api/siren/hardware', {
        params: { schoolId },
        skipAuthErrorRedirect: true,
      });
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
      toast.error("Failed to load hardware config");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!form.webhookUrl) {
      toast.error("Webhook URL is required");
      return;
    }

    try {
      new URL(form.webhookUrl);
    } catch {
      toast.error("Invalid webhook URL");
      return;
    }

    setSaving(true);
    try {
      if (config) {
        await api.put(
          `/api/siren/hardware/${config.id}`,
          { schoolId, ...form },
          { skipAuthErrorRedirect: true }
        );
      } else {
        await api.post(
          '/api/siren/hardware',
          { schoolId, ...form },
          { skipAuthErrorRedirect: true }
        );
      }
      toast.success("Hardware config saved");
      await fetchConfig();
    } catch (error) {
      toast.error("Failed to save hardware config");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!form.webhookUrl) {
      toast.error("Please configure webhook URL first");
      return;
    }

    setTesting(true);
    try {
      await api.post(
        '/api/siren/hardware/test',
        { webhookUrl: form.webhookUrl, timeout: form.timeout },
        { skipAuthErrorRedirect: true }
      );
      toast.success("Webhook test successful");
    } catch (error) {
      toast.error("Webhook test failed - check URL and connectivity");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Electric Siren Configuration
          </CardTitle>
          <CardDescription>
            Configure webhook for electric siren integration via relay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              When a siren is triggered, we'll send HTTP requests to your
              webhook endpoint with POST /on (activate) and POST /off
              (deactivate) commands.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://your-relay-server.com/api/siren"
                value={form.webhookUrl}
                onChange={(e) =>
                  setForm({ ...form, webhookUrl: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be HTTPS. The endpoint will receive POST requests with
                {"{"}"action": "on" | "off"{"}"} body.
              </p>
            </div>

            <div>
              <Label htmlFor="timeout">Timeout (ms)</Label>
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
                Maximum time to wait for webhook response (default: 5000ms)
              </p>
            </div>

            <div>
              <Label>Status</Label>
              <div className="mt-2 flex items-center gap-3 p-3 border rounded-md bg-muted/50">
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
                      Enabled
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                      Disabled
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {form.isEnabled
                    ? "Hardware integration is active"
                    : "Hardware integration is inactive"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={handleTestWebhook}
              disabled={testing || !form.webhookUrl}
              className="gap-2"
            >
              {testing && <Loader2 className="w-4 h-4 animate-spin" />}
              <TestTube className="w-4 h-4" />
              Test Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Format Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook Format Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Activation Request</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">
              {`POST /api/siren
Content-Type: application/json

{
  "action": "on",
  "type": "PERIOD_START",
  "timestamp": "2026-04-26T14:30:00Z"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Deactivation Request</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">
              {`POST /api/siren
Content-Type: application/json

{
  "action": "off",
  "type": "PERIOD_END",
  "timestamp": "2026-04-26T14:30:30Z"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Expected Response</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">
              {`HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "message": "Siren turned on",
  "timestamp": "2026-04-26T14:30:00Z"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Safety Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Safety First</AlertTitle>
        <AlertDescription>
          Always test webhook connectivity before enabling production. Ensure
          your relay endpoint handles timeouts gracefully and never leaves
          sirens in activated state if connection fails.
        </AlertDescription>
      </Alert>
    </div>
  );
}
