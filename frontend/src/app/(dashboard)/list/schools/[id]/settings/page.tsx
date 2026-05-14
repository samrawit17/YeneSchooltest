"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { schoolSettingsAPI, schoolsAPI, academicYearsAPI } from '@/lib/api';
import { subscriptionAPI } from '@/lib/api/admin';
import { getCurrentEthiopianYear } from '@/lib/calendar-utils';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import { 
  Loader2, 
  Image as ImageIcon, 
  GraduationCap,
  Calendar,
  Users,
  DollarSign,
  Shield,
  Clock,
  Settings as SettingsIcon,
  BookOpen,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimePicker } from '@/components/ui/TimePicker';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PlanTier = 'CORE' | 'STANDARD' | 'ULTIMATE';

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'time' | 'color';
  category: string;
  systemDefault?: any;
  options?: { value: string; label: string }[] | string[];
  requiredFeature?: string;
  requiredTier?: PlanTier;
  validation?: {
    min?: number;
    max?: number;
  };
}

const SETTINGS_CONFIG: SettingItem[] = [
  // Academic Settings
  {
    key: 'calendar_type',
    label: 'Calendar Type',
    description: 'Choose Ethiopian or Gregorian calendar system.',
    type: 'select',
    category: 'academic',
    systemDefault: 'ETHIOPIAN',
    options: [
      { value: 'GREGORIAN', label: 'Gregorian Calendar' },
      { value: 'ETHIOPIAN', label: 'Ethiopian Calendar' },
    ],
  },
  {
    key: 'curriculum_type',
    label: 'Curriculum System',
    description: 'Choose semester, quarter, or term system for grading.',
    type: 'select',
    category: 'academic',
    systemDefault: 'SEMESTER',
    options: [
      { value: 'SEMESTER', label: 'Semester (2 terms)' },
      { value: 'QUARTER', label: 'Quarter (4 terms)' },
      { value: 'TERM', label: 'Term (3 terms)' },
    ],
  },
  {
    key: 'grade_system',
    label: 'Grade System',
    description: 'Grade range for your school. Automatically manages Grade Levels.',
    type: 'select',
    category: 'academic',
    systemDefault: '',
    options: [
      { value: '1-8', label: 'Grades 1-8' },
      { value: '1-10', label: 'Grades 1-10' },
      { value: '1-12', label: 'Grades 1-12' },
      { value: 'K-8', label: 'Kindergarten to Grade 8' },
      { value: 'K-12', label: 'Kindergarten to Grade 12' },
      { value: 'PRE-K-12', label: 'Pre-K to Grade 12' },
      { value: '9-12', label: 'Grades 9-12 (High School)' },
    ],
  },

  // Attendance Settings
  {
    key: 'ATTENDANCE_TRACKING',
    label: 'Attendance Tracking',
    description: 'Enable student attendance tracking for this school',
    type: 'boolean',
    category: 'attendance',
    systemDefault: true,
  },
  {
    key: 'ATTENDANCE_CUTOFF_TIME',
    label: 'Attendance Cutoff Time',
    description: 'Time after which missing attendance is marked (24-hour format)',
    type: 'time',
    category: 'attendance',
    systemDefault: '03:00',
  },

  // Exam Settings
  {
    key: 'EXAM_ENABLED',
    label: 'Exams Enabled',
    description: 'Enable exam management and scheduling for this school',
    type: 'boolean',
    category: 'exams',
    systemDefault: true,
  },

  // Finance Settings
  {
    key: 'PARENT_VIEW_GRADES',
    label: 'Parent View Grades',
    description: 'Allow parents to view their children\'s grades',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
  },

  // Communication Settings
  {
    key: 'ANNOUNCEMENTS_ENABLED',
    label: 'Announcements Enabled',
    description: 'Allow administrators to create school announcements',
    type: 'boolean',
    category: 'communication',
    systemDefault: true,
  },
  {
    key: 'SELF_ENROLLMENT_ACTIVE',
    label: 'Self Enrollment Active',
    description: 'Currently accept new self-enrollments',
    type: 'boolean',
    category: 'enrollment',
    systemDefault: false,
  },

  // Access Settings
  {
    key: 'TEACHER_PORTAL_ACCESS',
    label: 'Teacher Portal Access',
    description: 'Allow teachers to access the teacher portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
  },
  {
    key: 'STUDENT_PORTAL_ACCESS',
    label: 'Student Portal Access',
    description: 'Allow students to access the student portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
  },
  {
    key: 'PARENT_PORTAL_ACCESS',
    label: 'Parent Portal Access',
    description: 'Allow parents to access the parent portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
  },
  {
    key: 'FINANCE_PORTAL_ACCESS',
    label: 'Finance Portal Access',
    description: 'Allow finance staff to access the finance portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
  },
  {
    key: 'REGISTRAR_PORTAL_ACCESS',
    label: 'Registrar Portal Access',
    description: 'Allow registrars to access the registrar portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
  },

  // Class Settings
  {
    key: 'DEFAULT_SECTION_CAPACITY',
    label: 'Section Capacity',
    description: 'Maximum number of students per section',
    type: 'number',
    category: 'classes',
    systemDefault: 20,
    validation: {
      min: 1,
      max: 200,
    },
  },

  // Schedule Settings
  {
    key: 'SCHOOL_START_TIME',
    label: 'School Start Time',
    description: 'Default school day start time',
    type: 'time',
    category: 'schedule',
    systemDefault: '08:00',
  },
  {
    key: 'SCHOOL_END_TIME',
    label: 'School End Time',
    description: 'Default school day end time',
    type: 'time',
    category: 'schedule',
    systemDefault: '15:00',
  },

  // Advanced Settings (Ultimate only)
  {
    key: 'CUSTOM_BRANDING',
    label: 'Custom Branding',
    description: 'Enable custom branding and white-label options',
    type: 'boolean',
    category: 'advanced',
    systemDefault: false,
    requiredTier: 'ULTIMATE',
  },

  // Branding Settings
  {
    key: 'theme_color',
    label: 'Brand Color',
    description: 'Primary brand color for buttons, highlights, and accent surfaces',
    type: 'color',
    category: 'branding',
    systemDefault: '#e35336',
  },
  {
    key: 'BRAND_COLOR_IN_NAVIGATION',
    label: 'Use Brand Color In Navigation',
    description: 'Apply the brand accent tint to the navbar and sidebar menu',
    type: 'boolean',
    category: 'branding',
    systemDefault: false,
  },
];

const CATEGORY_CONFIG = {
  academic: {
    label: 'Academic',
    icon: GraduationCap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  attendance: {
    label: 'Attendance',
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  exams: {
    label: 'Exams',
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  finance: {
    label: 'Finance',
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  enrollment: {
    label: 'Enrollment',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  access: {
    label: 'Access Control',
    icon: Shield,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  classes: {
    label: 'Classes',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  schedule: {
    label: 'Schedule',
    icon: Clock,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  advanced: {
    label: 'Advanced',
    icon: SettingsIcon,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  branding: {
    label: 'Branding',
    icon: SettingsIcon,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
};

const TIER_LEVELS: Record<PlanTier, number> = {
  CORE: 1,
  STANDARD: 2,
  ULTIMATE: 3,
};

export default function SchoolSettingsPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const schoolId = params.id as string;
  const { user, updateUser } = useAuth();
  const { setItems } = useBreadcrumb();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [draftSettings, setDraftSettings] = useState<Record<string, any>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('academic');
  const [error, setError] = useState<string | null>(null);

  // School info state
  const [schoolInfo, setSchoolInfo] = useState<{
    name: string;
    code: string | null;
    email: string;
    address: string | null;
    logoUrl: string | null;
  } | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [savingSchoolCode, setSavingSchoolCode] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);

  // Academic Year state
  const [academicYears, setAcademicYears] = useState<{
    id: string;
    name: string;
    isActive: boolean;
    calendarType: string;
  }[]>([]);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);

  // Plan state
  const [schoolPlan, setSchoolPlan] = useState<{
    id: string;
    name: string;
    tier: PlanTier;
    features: string[];
  } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Check if setting should be visible
  const isSettingVisible = useCallback((setting: SettingItem): boolean => {
    // Super admin sees everything
    if (user?.role?.toLowerCase() === 'super_admin') return true;

    // Check subscription features
    if (setting.requiredFeature && schoolPlan) {
      const hasFeature = schoolPlan.features?.includes(setting.requiredFeature);
      if (!hasFeature) return false;
    }

    // Check subscription tier
    if (setting.requiredTier && schoolPlan) {
      const currentLevel = TIER_LEVELS[schoolPlan.tier] || 0;
      const requiredLevel = TIER_LEVELS[setting.requiredTier] || 0;
      if (currentLevel < requiredLevel) return false;
    }

    return true;
  }, [user?.role, schoolPlan]);

  // Get current calendar type from settings
  const calendarType = draftSettings['calendar_type'] || 'ETHIOPIAN';

  // Filter academic years based on calendar type
  const filteredAcademicYears = academicYears.filter(
    (year) => year.calendarType === calendarType || !year.calendarType
  );

  // Get current active academic year
  const currentAcademicYear = filteredAcademicYears.find((y) => y.isActive) || filteredAcademicYears[0];

  // Group settings by category
  const groupedSettings = SETTINGS_CONFIG.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SettingItem[]>);

  // Filter visible categories
  const visibleCategories = Object.keys(groupedSettings).filter(category =>
    groupedSettings[category].some(setting => isSettingVisible(setting))
  );

  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoadingAcademicYears(true);
      const response = await academicYearsAPI.getAll({ schoolId });
      setAcademicYears(response.data);
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    } finally {
      setLoadingAcademicYears(false);
    }
  }, [schoolId]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await schoolSettingsAPI.getAll(schoolId);
      setSettings(response.data);
      setDraftSettings(response.data);
      setNumberDrafts((prev) => {
        const next = { ...prev };
        for (const setting of SETTINGS_CONFIG) {
          if (setting.type !== 'number') continue;
          const rawValue = response.data[setting.key];
          const resolvedValue =
            rawValue !== undefined && rawValue !== null && rawValue !== ''
              ? String(rawValue)
              : String(setting.systemDefault ?? '');
          next[setting.key] = resolvedValue;
        }
        return next;
      });
    } catch (err: any) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchSchoolInfo = useCallback(async () => {
    try {
      const response = await schoolsAPI.getById(schoolId);
      setSchoolInfo(response.data);
      setSchoolLogo(response.data.logoUrl || '');
      if (!response.data.code) {
        setIsEditingCode(true);
      }
      setSchoolCode(response.data.code || '');
    } catch (err: any) {
      console.error('Failed to load school info:', err);
    }
  }, [schoolId]);

  const fetchSchoolPlan = useCallback(async () => {
    try {
      setLoadingPlan(true);
      const response = await subscriptionAPI.getSchoolPlan(schoolId);
      setSchoolPlan(response.data);
    } catch (err) {
      console.error('Failed to fetch school plan:', err);
      setSchoolPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSettings();
    fetchSchoolInfo();
    fetchAcademicYears();
    fetchSchoolPlan();
  }, [schoolId, fetchSettings, fetchSchoolInfo, fetchAcademicYears, fetchSchoolPlan]);

  // Set breadcrumb with school name
  useEffect(() => {
    if (schoolInfo?.name) {
      setItems([
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Schools' },
        { label: schoolInfo.name, href: `/list/schools/${schoolId}` },
        { label: 'Settings', isCurrent: true },
      ]);
    }
  }, [schoolInfo?.name, schoolId, setItems]);

  useEffect(() => {
    if (calendarType) {
      fetchAcademicYears();
    }
  }, [calendarType, fetchAcademicYears]);

  const handleLogoSave = async () => {
    try {
      setSavingLogo(true);
      if (selectedLogoFile) {
        const result = await schoolsAPI.uploadLogo(schoolId, selectedLogoFile);
        setSchoolLogo(result.url || '');
        toast.success('School logo uploaded successfully!');
      } else {
        const response = await schoolsAPI.update(schoolId, { logoUrl: schoolLogo });
        toast.success('School logo updated successfully!');
      }
      setIsEditingLogo(false);
      setSelectedLogoFile(null);
      const schoolResponse = await schoolsAPI.getById(schoolId);
      setSchoolInfo(schoolResponse.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update school logo';
      toast.error(errorMessage);
    } finally {
      setSavingLogo(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      setSelectedLogoFile(file);
      setIsEditingLogo(true);
    }
  };

  const handleSchoolCodeSave = async () => {
    try {
      setSavingSchoolCode(true);
      const response = await schoolsAPI.update(schoolId, { code: schoolCode });
      toast.success('School code updated successfully!');
      setIsEditingCode(false);
      const schoolResponse = await schoolsAPI.getById(schoolId);
      setSchoolInfo(schoolResponse.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update school code';
      toast.error(errorMessage);
    } finally {
      setSavingSchoolCode(false);
    }
  };

  const handleSettingChange = async (key: string, value: any, setting: SettingItem) => {
    // Validate number inputs
    if (setting.type === 'number') {
      if (setting.validation) {
        const num = Number(value);
        if (setting.validation.min !== undefined && num < setting.validation.min) {
          toast.error(`Value must be at least ${setting.validation.min}`);
          return;
        }
        if (setting.validation.max !== undefined && num > setting.validation.max) {
          toast.error(`Value must be at most ${setting.validation.max}`);
          return;
        }
      }
    }

    // Validate time inputs
    if (setting.type === 'time') {
      const isValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value));
      if (!isValid) {
        toast.error('Please enter a valid time in HH:mm format');
        return;
      }
    }

    try {
      setSaving(key);
      setError(null);
      await schoolSettingsAPI.set(schoolId, key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      queryClient.setQueryData(queryKeys.school.setting(key, schoolId), {
        key,
        value,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.school.setting(key, schoolId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.school.settings(schoolId) });

      if (key === 'theme_color' || key === 'BRAND_COLOR_IN_NAVIGATION') {
        queryClient.invalidateQueries({ queryKey: queryKeys.school.setting('theme_color', schoolId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.school.setting('BRAND_COLOR_IN_NAVIGATION', schoolId) });
      }
      
      // Update user session for calendar type change
      if (key === 'calendar_type' && user) {
        updateUser({ ...user, calendarType: value });
      }

      toast.success(`${setting.label} updated successfully`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update setting';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(null);
    }
  };

  const updateDraftSetting = (key: string, value: any) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const getEffectiveSettingValue = (
    source: Record<string, any>,
    key: string,
    setting: SettingItem,
  ) => {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    if (setting.type === 'boolean') {
      return setting.systemDefault ?? true;
    }
    if (setting.type === 'number') {
      return setting.systemDefault ?? '';
    }
    return '';
  };

  const areValuesEqual = (left: any, right: any, setting: SettingItem) => {
    if (setting.type === 'number') {
      return Number(left) === Number(right);
    }
    if (setting.type === 'boolean') {
      return Boolean(left) === Boolean(right);
    }
    return String(left ?? '') === String(right ?? '');
  };

  const handleResetSetting = async (key: string, setting: SettingItem) => {
    try {
      setSaving(key);
      setError(null);
      await schoolSettingsAPI.delete(schoolId, key);
      setSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setDraftSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (setting.type === 'number') {
        setNumberDrafts((prev) => ({
          ...prev,
          [key]: String(setting.systemDefault ?? ''),
        }));
      }
      queryClient.removeQueries({ queryKey: queryKeys.school.setting(key, schoolId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.school.settings(schoolId) });

      if (key === 'theme_color') {
        queryClient.invalidateQueries({ queryKey: queryKeys.school.setting('theme_color', schoolId) });
      }

      if (key === 'calendar_type' && user && setting.systemDefault) {
        updateUser({ ...user, calendarType: setting.systemDefault });
      }

      toast.success(`${setting.label} reset to default`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to reset setting';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(null);
    }
  };

  const getSettingValue = (key: string, setting: SettingItem) => {
    return getEffectiveSettingValue(draftSettings, key, setting);
  };

  const commitNumberSetting = async (setting: SettingItem) => {
    const draft = numberDrafts[setting.key]?.trim();
    const fallbackValue = String(setting.systemDefault ?? '');
    const nextDraft = draft === '' ? fallbackValue : draft;
    const nextValue = Number(nextDraft);

    if (Number.isNaN(nextValue)) {
      toast.error('Please enter a valid number');
      setNumberDrafts((prev) => ({ ...prev, [setting.key]: fallbackValue }));
      return;
    }

    if (setting.validation?.min !== undefined && nextValue < setting.validation.min) {
      toast.error(`Value must be at least ${setting.validation.min}`);
      setNumberDrafts((prev) => ({
        ...prev,
        [setting.key]: String(getSettingValue(setting.key, setting)),
      }));
      return;
    }

    if (setting.validation?.max !== undefined && nextValue > setting.validation.max) {
      toast.error(`Value must be at most ${setting.validation.max}`);
      setNumberDrafts((prev) => ({
        ...prev,
        [setting.key]: String(getSettingValue(setting.key, setting)),
      }));
      return;
    }

    const currentValue = Number(getEffectiveSettingValue(draftSettings, setting.key, setting));
    if (currentValue === nextValue && String(currentValue) === nextDraft) {
      return;
    }

    setNumberDrafts((prev) => ({ ...prev, [setting.key]: String(nextValue) }));
    updateDraftSetting(setting.key, nextValue);
  };

  const hasSettingChanged = (setting: SettingItem) => {
    const currentValue = getEffectiveSettingValue(settings, setting.key, setting);
    const draftValue =
      setting.type === 'number'
        ? numberDrafts[setting.key] ?? String(getEffectiveSettingValue(draftSettings, setting.key, setting))
        : getEffectiveSettingValue(draftSettings, setting.key, setting);

    return !areValuesEqual(currentValue, draftValue, setting);
  };

  const hasUnsavedChanges = SETTINGS_CONFIG.some((setting) => hasSettingChanged(setting));

  const handleSaveAllChanges = async () => {
    const changedSettings = SETTINGS_CONFIG.filter((setting) => hasSettingChanged(setting));
    if (changedSettings.length === 0) return;

    try {
      setSavingAll(true);
      setError(null);

      for (const setting of changedSettings) {
        let nextValue: any =
          setting.type === 'number'
            ? Number(numberDrafts[setting.key] ?? getEffectiveSettingValue(draftSettings, setting.key, setting))
            : getEffectiveSettingValue(draftSettings, setting.key, setting);

        if (setting.type === 'select' && nextValue === '__select__') {
          nextValue = '';
        }

        const rawCurrentValue = settings[setting.key];
        const shouldResetToDefault =
          rawCurrentValue !== undefined &&
          rawCurrentValue !== null &&
          rawCurrentValue !== '' &&
          areValuesEqual(nextValue, setting.systemDefault ?? '', setting);

        if (shouldResetToDefault) {
          await schoolSettingsAPI.delete(schoolId, setting.key);
          setSettings((prev) => {
            const next = { ...prev };
            delete next[setting.key];
            return next;
          });
          continue;
        }

        await handleSettingChange(setting.key, nextValue, setting);
      }

      toast.success('School settings saved successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingAll(false);
    }
  };

  const renderSettingInput = (setting: SettingItem) => {
    const value = getSettingValue(setting.key, setting);
    const isSaving = saving === setting.key || savingAll;
    const hasCustomValue =
      settings[setting.key] !== undefined &&
      settings[setting.key] !== null &&
      settings[setting.key] !== '';

    // Render upgrade badge for hidden features
    if (!isSettingVisible(setting)) {
      return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            Upgrade Required
          </Badge>
        </div>
      );
    }

    if (setting.type === 'boolean') {
      return (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <Switch
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => updateDraftSetting(setting.key, checked)}
            disabled={isSaving}
          />
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs">Unsaved</Badge>}
        </div>
      );
    }

    if (setting.type === 'select') {
      const options = Array.isArray(setting.options) 
        ? setting.options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
        : [];

      return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Select
            value={String(value || '')}
            onValueChange={(val) => updateDraftSetting(setting.key, val === '__select__' ? '' : val)}
            disabled={isSaving}
          >
            <SelectTrigger className="w-full bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white sm:w-48">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800">
              <SelectItem value="__select__">Select an option...</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs">Unsaved</Badge>}
        </div>
      );
    }

    if (setting.type === 'number') {
      return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="number"
            value={numberDrafts[setting.key] ?? String(value)}
            min={setting.validation?.min}
            max={setting.validation?.max}
            onChange={(e) =>
              setNumberDrafts((prev) => ({
                ...prev,
                [setting.key]: e.target.value,
              }))
            }
            onBlur={() => void commitNumberSetting(setting)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitNumberSetting(setting);
              }
            }}
            disabled={isSaving}
            className="w-full sm:w-24"
          />
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs">Unsaved</Badge>}
        </div>
      );
    }

    if (setting.type === 'time') {
      const useTimePicker = setting.key === 'SCHOOL_START_TIME' || setting.key === 'SCHOOL_END_TIME';

      return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {useTimePicker ? (
            <TimePicker
              value={value || setting.systemDefault || '08:00'}
              onChange={(time) => updateDraftSetting(setting.key, time)}
              disabled={isSaving}
              className="sm:w-40"
            />
          ) : (
            <Input
              type="time"
              value={value || setting.systemDefault || '08:00'}
              onChange={(e) => updateDraftSetting(setting.key, e.target.value)}
              disabled={isSaving}
              className="w-full sm:w-32"
            />
          )}
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs">Unsaved</Badge>}
        </div>
      );
    }

    if (setting.type === 'color') {
      return (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
          <div className="relative">
            <input
              type="color"
              value={value || setting.systemDefault || '#e35336'}
              onChange={(e) => updateDraftSetting(setting.key, e.target.value)}
              disabled={isSaving}
              className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer disabled:opacity-50"
            />
          </div>
          <Input
            type="text"
            value={value || setting.systemDefault || '#e35336'}
            onChange={(e) => {
              const val = e.target.value;
              updateDraftSetting(setting.key, val);
            }}
            disabled={isSaving}
            className="w-24 font-mono text-sm sm:w-28"
          />
          {setting.key === 'theme_color' && hasCustomValue && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                updateDraftSetting(setting.key, setting.systemDefault ?? '');
              }}
              disabled={isSaving}
              className="h-10 shrink-0 text-xs"
            >
              Use Default
            </Button>
          )}
          {hasSettingChanged(setting) && <Badge variant="outline" className="shrink-0 text-xs">Unsaved</Badge>}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-full space-y-6 overflow-x-hidden p-3 sm:p-4 md:p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
      {/* School Header */}
      {schoolInfo && (
        <Card className="mb-6 max-w-full overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="min-w-0 p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              {/* Logo */}
              <div className="shrink-0">
                {isEditingLogo ? (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Upload</span>
                      </label>
                    </div>
                  </div>
                ) : schoolInfo.logoUrl ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                    <Image
                      src={schoolInfo.logoUrl}
                      alt={schoolInfo.name || "School Logo"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-[#e35336] flex items-center justify-center">
                    <span className="text-white font-bold text-3xl">
                      {schoolInfo.name?.charAt(0) || "S"}
                    </span>
                  </div>
                )}
              </div>

              {/* Name and Code */}
              <div className="flex-1 min-w-0">
                <h1 className="break-words text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{schoolInfo.name}</h1>
                <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  {isEditingCode ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        placeholder="School Code"
                        className="h-8 w-full font-mono text-sm bg-white dark:bg-slate-700 sm:w-32"
                        disabled={savingSchoolCode}
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        onClick={handleSchoolCodeSave} 
                        disabled={savingSchoolCode || !schoolCode}
                        className="h-8 px-2"
                      >
                        {savingSchoolCode ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setIsEditingCode(false);
                          setSchoolCode(schoolInfo.code || '');
                        }}
                        disabled={savingSchoolCode}
                        className="h-8 px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex min-w-0 flex-wrap items-center gap-2 cursor-pointer group"
                      onClick={() => setIsEditingCode(true)}
                      title="Click to edit school code"
                    >
                      <span className="text-sm text-slate-500 dark:text-slate-400">Code:</span>
                      {schoolInfo.code ? (
                        <span className="max-w-full break-all font-mono font-medium text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                          {schoolInfo.code}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600 hover:underline">Add school code</span>
                      )}
                    </div>
                  )}
                  {schoolPlan && (
                    <Badge className={`max-w-full whitespace-normal break-words ${
                      schoolPlan.tier === 'CORE' ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300' :
                      schoolPlan.tier === 'STANDARD' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300'
                    }`}>
                      {schoolPlan.tier} Plan
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                {isEditingLogo && selectedLogoFile && (
                  <>
                    <Button onClick={handleLogoSave} disabled={savingLogo} size="sm">
                      {savingLogo ? 'Saving...' : 'Save Logo'}
                    </Button>
                    <Button variant="ghost" onClick={() => {
                      setSelectedLogoFile(null);
                      setIsEditingLogo(false);
                    }} size="sm">
                      Cancel
                    </Button>
                  </>
                )}
                {!isEditingLogo && (
                  <Button variant="outline" onClick={() => setIsEditingLogo(true)} size="sm">
                    {schoolInfo.logoUrl ? 'Change Logo' : 'Add Logo'}
                  </Button>
                )}
              </div>
            </div>

            {/* Academic Year Display */}
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300">Current Academic Year:</span>
                <span className="break-words font-medium">
                  {loadingAcademicYears ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    currentAcademicYear?.name || 'Not set'
                  )}
                </span>
                <Badge variant="outline" className="text-xs">
                  {calendarType === 'ETHIOPIAN' ? 'Ethiopian' : 'Gregorian'}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchAcademicYears}>
                <RefreshCw className={`w-4 h-4 ${loadingAcademicYears ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 max-w-full">
        <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="min-w-0 text-lg font-semibold text-slate-900 dark:text-white">School Settings</h2>
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <Button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={!hasUnsavedChanges || savingAll}
              className="w-full sm:w-auto"
            >
              {savingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
            <div className="-mx-4 max-w-[100vw] overflow-x-auto overflow-y-hidden px-4 pb-2 md:mx-0 md:max-w-full md:px-0 lg:w-auto">
              <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
                {visibleCategories.slice(0, 6).map((category) => {
                  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                  const Icon = config?.icon || SettingsIcon;
                  return (
                    <TabsTrigger key={category} value={category} className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                      <Icon className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                      <span>{config?.label || category}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>
        </div>

        {visibleCategories.map((category) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          const Icon = config?.icon || SettingsIcon;
          const settings = groupedSettings[category] || [];

          return (
            <TabsContent key={category} value={category} className="mt-4 min-w-0 max-w-full">
              <Card className="max-w-full overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="min-w-0">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className={`h-10 w-10 shrink-0 rounded-lg ${config?.bgColor || 'bg-gray-100'} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config?.color || 'text-gray-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="break-words text-slate-900 dark:text-white">{config?.label || category}</CardTitle>
                      <CardDescription className="break-words text-slate-500 dark:text-slate-400">
                        Configure {config?.label?.toLowerCase() || category} settings for your school
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                  {settings.map((setting) => (
                    <div
                      key={setting.key}
                      className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:justify-between ${
                        setting.key === 'theme_color' ? 'sm:items-center' : 'sm:items-start'
                      } ${
                        !isSettingVisible(setting) 
                          ? 'bg-slate-50 dark:bg-slate-700/50 opacity-60' 
                          : 'bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 sm:pr-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h4 className="break-words font-medium text-slate-900 dark:text-white">{setting.label}</h4>
                          {setting.requiredTier && (
                            <Badge variant="outline" className="whitespace-normal break-words text-xs">
                              {setting.requiredTier}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">{setting.description}</p>
                        {!isSettingVisible(setting) && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Requires {setting.requiredFeature ? `${setting.requiredFeature} feature` : `${setting.requiredTier} plan`}
                          </p>
                        )}
                      </div>
                      <div className={`min-w-0 w-full sm:w-auto sm:shrink-0 ${
                        setting.key === 'theme_color' ? 'sm:flex sm:justify-end' : ''
                      }`}>
                        {renderSettingInput(setting)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* All Settings View (if more than 6 categories) */}
      {visibleCategories.length > 6 && (
        <Card className="mt-4 max-w-full overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="min-w-0">
            <CardTitle className="text-slate-900 dark:text-white">All Settings</CardTitle>
            <CardDescription className="break-words text-slate-500 dark:text-slate-400">Complete list of all configurable settings</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              {SETTINGS_CONFIG.filter(s => isSettingVisible(s)).map((setting) => (
                <div
                  key={setting.key}
                  className="min-w-0 rounded-lg border bg-white p-3 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-medium text-slate-900 dark:text-white">{setting.label}</h4>
                      <p className="break-words text-xs text-slate-500 dark:text-slate-400">{setting.description}</p>
                    </div>
                    <div className="min-w-0 sm:ml-2">
                      {renderSettingInput(setting)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
