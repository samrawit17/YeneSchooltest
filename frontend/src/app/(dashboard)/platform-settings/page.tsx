"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { platformSettingsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { 
  Settings,
  AlertCircle,
  Building2,
  Mail,
  Wrench,
  Bell,
  Cloud,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'json' | 'select';
  category: string;
  icon: React.ReactNode;
  placeholder?: string;
  requiresConfirmation?: boolean;
  options?: { value: string; label: string }[];
}

const PLATFORM_SETTINGS_CONFIG: SettingItem[] = [
  // Platform Settings
  {
    key: 'MAX_SCHOOLS_ALLOWED',
    label: 'Max Schools Allowed',
    description: 'Maximum number of schools that can be created on the platform',
    type: 'number',
    category: 'platform',
    icon: <Building2 className="w-5 h-5" />,
    placeholder: 'Unlimited',
  },
  {
    key: 'MAINTENANCE_MODE',
    label: 'Maintenance Mode',
    description: 'Put the entire platform in maintenance mode',
    type: 'boolean',
    category: 'platform',
    icon: <Wrench className="w-5 h-5" />,
    requiresConfirmation: true,
  },
  // Integrations
  {
    key: 'EMAIL_PROVIDER',
    label: 'Email Provider',
    description: 'Email service configuration (JSON)',
    type: 'json',
    category: 'integrations',
    icon: <Mail className="w-5 h-5" />,
  },
  {
    key: 'SMS_PROVIDER',
    label: 'SMS Provider',
    description: 'SMS service configuration (JSON)',
    type: 'json',
    category: 'integrations',
    icon: <Bell className="w-5 h-5" />,
  },
  // Storage
  {
    key: 'STORAGE_TYPE',
    label: 'Storage Type',
    description: 'File storage backend (Local, S3, or MinIO)',
    type: 'select',
    category: 'storage',
    icon: <Cloud className="w-5 h-5" />,
    options: [
      { value: 'local', label: 'Local Filesystem' },
      { value: 's3', label: 'Amazon S3' },
      { value: 'minio', label: 'MinIO' },
    ],
  },
  {
    key: 'STORAGE_CONFIG',
    label: 'Storage Config',
    description: 'Provider-specific configuration as JSON (bucket, region, keys, endpoint)',
    type: 'json',
    category: 'storage',
    icon: <Cloud className="w-5 h-5" />,
  },
];

const CATEGORIES = [
  { id: 'platform', label: 'Platform', icon: <Settings className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Settings className="w-4 h-4" /> },
  { id: 'storage', label: 'Storage', icon: <Cloud className="w-4 h-4" /> },
];

const formatDraftValue = (setting: SettingItem, value: unknown) => {
  if (setting.type === 'number') {
    return value === null || value === undefined ? '' : String(value);
  }

  if (setting.type === 'json') {
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? {}, null, 2);
  }

  return value === null || value === undefined ? '' : String(value);
};

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('platform');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      router.push('/sign-in');
      return;
    }
    if (user?.role?.toLowerCase() !== 'super_admin') {
      setLoading(false);
      toast.error('Access denied. Super Admin only.');
      router.push('/dashboard');
      return;
    }
    void fetchSettings();
  }, [authLoading, isAuthenticated, router, user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      setFieldErrors({});
      const response = await platformSettingsAPI.getAll();
      const nextSettings = response.data || {};
      setSettings(nextSettings);
      setDrafts(
        Object.fromEntries(
          PLATFORM_SETTINGS_CONFIG
            .filter((setting) => setting.type !== 'boolean')
            .map((setting) => [
              setting.key,
              formatDraftValue(setting, nextSettings[setting.key]),
            ]),
        ),
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(key);
    setError(null);
    const response = await platformSettingsAPI.set(key, value);
    const savedValue = response.data?.value ?? value;
    setSettings((prev) => ({ ...prev, [key]: savedValue }));
    return savedValue;
  };

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateSetting(key, value);
      toast.success('Setting updated successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Failed to update setting';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const handleBooleanChange = async (setting: SettingItem, checked: boolean) => {
    if (setting.requiresConfirmation) {
      const toastId = toast.warning(
        checked
          ? 'Enable maintenance mode for the whole platform?'
          : 'Disable maintenance mode and reopen the platform?',
        {
          description: checked
            ? 'Users may be blocked from normal access until maintenance mode is disabled.'
            : 'Normal users will be able to access the platform again.',
          duration: 10000,
          action: {
            label: checked ? 'Enable' : 'Disable',
            onClick: () => {
              toast.dismiss(toastId);
              void handleSettingChange(setting.key, checked);
            },
          },
          cancel: {
            label: 'Cancel',
            onClick: () => toast.dismiss(toastId),
          },
        },
      );
      return;
    }

    await handleSettingChange(setting.key, checked);
  };

  const handleDraftChange = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveDraft = async (setting: SettingItem) => {
    const rawValue = drafts[setting.key] ?? '';
    let parsedValue: unknown = rawValue;

    if (setting.type === 'number') {
      if (rawValue.trim() === '') {
        parsedValue = null;
      } else {
        const numericValue = Number(rawValue);
        if (!Number.isInteger(numericValue) || numericValue < 1) {
          setFieldErrors((prev) => ({
            ...prev,
            [setting.key]: 'Enter a positive whole number, or leave blank for unlimited.',
          }));
          return;
        }
        parsedValue = numericValue;
      }
    }

    if (setting.type === 'json') {
      try {
        parsedValue = JSON.parse(rawValue || '{}');
      } catch {
        setFieldErrors((prev) => ({
          ...prev,
          [setting.key]: 'Enter valid JSON before saving.',
        }));
        return;
      }

      if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        setFieldErrors((prev) => ({
          ...prev,
          [setting.key]: 'This setting must be a JSON object.',
        }));
        return;
      }
    }

    try {
      const savedValue = await updateSetting(setting.key, parsedValue);
      setDrafts((prev) => ({
        ...prev,
        [setting.key]: formatDraftValue(setting, savedValue),
      }));
      toast.success('Setting updated successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Failed to update setting';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const filteredSettings = PLATFORM_SETTINGS_CONFIG.filter(
    (s) => s.category === activeTab,
  );

  const renderSettingInput = (setting: SettingItem) => {
    const value = settings[setting.key] ?? '';
    const isSaving = saving === setting.key;
    const draftValue = drafts[setting.key] ?? formatDraftValue(setting, value);
    const savedDraftValue = formatDraftValue(setting, value);
    const isDirty = draftValue !== savedDraftValue;

    if (setting.type === 'select') {
      return (
        <div className="space-y-2">
          <Select
            value={String(value || 'local')}
            onValueChange={(newValue) => handleDraftChange(setting.key, newValue)}
            disabled={isSaving}
          >
            <SelectTrigger className="dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors[setting.key] ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors[setting.key]}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleSaveDraft(setting)}
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      );
    }

    if (setting.type === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => handleBooleanChange(setting, checked)}
            disabled={isSaving}
          />
          {isSaving && <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-color,#e35336)]" />}
        </div>
      );
    }

    if (setting.type === 'number') {
      return (
        <div className="space-y-2">
          <Input
            type="number"
            value={draftValue}
            onChange={(e) => handleDraftChange(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            disabled={isSaving}
            className="dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white"
          />
          {fieldErrors[setting.key] ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors[setting.key]}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleSaveDraft(setting)}
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      );
    }

    if (setting.type === 'json') {
      return (
        <div className="space-y-2">
          <textarea
            value={draftValue}
            onChange={(e) => handleDraftChange(setting.key, e.target.value)}
            disabled={isSaving}
            rows={4}
            className="w-full rounded-lg border border-gray-300 dark:border-[#2A2A2A] px-4 py-2.5 font-mono text-sm dark:bg-[#2A2A2A] dark:text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-500 focus:outline-none disabled:bg-gray-100"
          />
          {fieldErrors[setting.key] ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors[setting.key]}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleSaveDraft(setting)}
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Input
          type="text"
          value={draftValue}
          onChange={(e) => handleDraftChange(setting.key, e.target.value)}
          disabled={isSaving}
          className="dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => handleSaveDraft(setting)}
            disabled={isSaving || !isDirty}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111111]">
        <div className="p-4 md:p-6 space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 dark:bg-[#2A2A2A] rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-48 bg-gray-200 dark:bg-[#2A2A2A] rounded-xl"></div>
              <div className="h-48 bg-gray-200 dark:bg-[#2A2A2A] rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111111]">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--brand-color,#e35336)]/10 rounded-xl flex items-center justify-center">
              <Settings className="w-8 h-8 text-[var(--brand-color,#e35336)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Global configuration for the entire platform</p>
            </div>
          </div>
          <Badge className="bg-[var(--brand-color,#e35336)]/10 text-[var(--brand-color,#e35336)] border-0">
            Super Admin Only
          </Badge>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                <Button variant="ghost" size="sm" onClick={fetchSettings} className="ml-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-[#2A2A2A]">
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === category.id
                    ? 'border-gray-900 text-gray-900 dark:text-gray-300 dark:border-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSettings.map((setting) => (
            <Card key={setting.key} className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[var(--brand-color,#e35336)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--brand-color,#e35336)]">{setting.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{setting.label}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
                      <code className="inline-block mt-2 text-xs bg-gray-100 dark:bg-[#2A2A2A] px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                        {setting.key}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {setting.type}
                    </span>
                  </div>
                  <div className="mt-2">
                    {renderSettingInput(setting)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSettings.length === 0 && (
          <Card className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Settings</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">No settings in this category</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Card className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-4 h-4" />
              <p>Changes to platform settings affect all schools and users globally.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
