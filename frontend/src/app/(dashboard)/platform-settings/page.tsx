"use client";

import { useState, useEffect } from 'react';
import { platformSettingsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Building2,
  Mail,
  MessageSquare,
  CreditCard,
  Shield,
  Wrench,
  Palette,
  Globe,
  Bell,
  Loader2,
  FileJson,
  BookOpen,
  Truck,
  Database,
  Lock,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  category: string;
  icon: React.ReactNode;
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
  },
  {
    key: 'MAINTENANCE_MODE',
    label: 'Maintenance Mode',
    description: 'Put the entire platform in maintenance mode',
    type: 'boolean',
    category: 'platform',
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    key: 'PLATFORM_VERSION',
    label: 'Platform Version',
    description: 'Current version of the platform',
    type: 'string',
    category: 'platform',
    icon: <Database className="w-5 h-5" />,
  },

  // Branding
  {
    key: 'SAAS_NAME',
    label: 'Platform Name',
    description: 'Name of the SaaS platform displayed to users',
    type: 'string',
    category: 'branding',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    key: 'SAAS_LOGO_URL',
    label: 'Logo URL',
    description: 'URL of the platform logo',
    type: 'string',
    category: 'branding',
    icon: <Palette className="w-5 h-5" />,
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

  // Security
  {
    key: 'DEFAULT_PERMISSIONS_TEMPLATE',
    label: 'Default Permissions',
    description: 'Default permission template for new schools',
    type: 'json',
    category: 'security',
    icon: <Shield className="w-5 h-5" />,
  },
];

const CATEGORIES = [
  { id: 'platform', label: 'Platform', icon: <Settings className="w-4 h-4" /> },
  { id: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Settings className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
];

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('platform');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await platformSettingsAPI.getAll();
      setSettings(response.data || {});
    } catch (err: any) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    try {
      setSaving(key);
      setError(null);
      await platformSettingsAPI.set(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('Setting updated successfully');
    } catch (err: any) {
      setError(`Failed to update: ${err.message}`);
      toast.error('Failed to update setting');
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

    if (setting.type === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
            disabled={isSaving}
          />
          {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
      );
    }

    if (setting.type === 'number') {
      return (
        <div className="relative">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const numValue = e.target.value === '' ? '' : parseInt(e.target.value);
              if (!isNaN(numValue as number)) {
                handleSettingChange(setting.key, numValue);
              }
            }}
            disabled={isSaving}
            className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          {isSaving && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      );
    }

    if (setting.type === 'json') {
      return (
        <div className="relative">
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const jsonValue = JSON.parse(e.target.value);
                handleSettingChange(setting.key, jsonValue);
              } catch {
                handleSettingChange(setting.key, e.target.value);
              }
            }}
            disabled={isSaving}
            rows={4}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 font-mono text-sm dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
          />
          {isSaving && (
            <div className="absolute right-3 top-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          disabled={isSaving}
          className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        {isSaving && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
              <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
                  <p className="text-blue-100 text-sm">Global configuration for the entire platform</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                Super Admin Only
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === category.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
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
            <Card key={setting.key} className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400">{setting.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{setting.label}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
                      <code className="inline-block mt-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                        {setting.key}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
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
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Settings</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">No settings in this category</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
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