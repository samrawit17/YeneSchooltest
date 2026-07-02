"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api/core';
import { schoolSettingsAPI, schoolsAPI, academicYearsAPI } from '@/lib/api';
import { subscriptionAPI } from '@/lib/api/subscription';
import { resolveAssetUrl } from '@/lib/asset-url';
import { getCurrentEthiopianYear, normalizeCalendarType } from '@/lib/calendar-utils';
import { writeCachedSchoolLoginContext } from '@/lib/school-resolver';
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
  Bell,
  RefreshCw,
  Copy,
  ExternalLink,
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
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { useTranslations } from '@/hooks/useTranslations';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PlanTier = 'CORE' | 'STANDARD' | 'ULTIMATE';

const ONE_TIME_LOCKED_SETTING_KEYS = new Set([
  'calendar_type',
  'curriculum_type',
  'grade_system',
]);

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'time' | 'color' | 'date' | 'json';
  category: string;
  systemDefault?: any;
  options?: { value: string; label: string }[] | string[];
  requiredFeature?: string;
  requiredTier?: PlanTier;
  validation?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

interface SchoolSettingsMessages {
  title: string;
  allSettings: string;
  allSettingsDescription: string;
  configurePrefix: string;
  configureSuffix: string;
  actions: Record<string, string>;
  badges: Record<string, string>;
  labels: Record<string, string>;
  messages: Record<string, string>;
  categories: Record<string, string>;
  settings: Record<string, string>;
  options: Record<string, string>;
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
  {
    key: 'SCHOOL_STARTS_AT',
    label: 'School Starts Date',
    description: 'The date the academic year begins. Shown as a countdown on the public landing page.',
    type: 'date',
    category: 'academic',
    systemDefault: '',
  },
  {
    key: 'REGISTRATION_STARTS_AT',
    label: 'Registration Starts Date',
    description: 'The date enrollment/registration opens. Shown as a countdown on the public landing page.',
    type: 'date',
    category: 'academic',
    systemDefault: '',
  },
  {
    key: 'PROMOTION_MIN_AVERAGE_GRADE',
    label: 'Promotion Min Average Grade',
    description: 'Minimum average grade (0-100) a student needs to be promoted',
    type: 'number',
    category: 'academic',
    systemDefault: 50,
    validation: { min: 0, max: 100 },
  },
  {
    key: 'PROMOTION_MIN_ATTENDANCE',
    label: 'Promotion Min Attendance',
    description: 'Minimum attendance percentage (0-100) required for promotion',
    type: 'number',
    category: 'academic',
    systemDefault: 75,
    validation: { min: 0, max: 100 },
  },
  {
    key: 'PROMOTION_ALLOW_FAILED_SUBJECTS',
    label: 'Promotion Allow Failed Subjects',
    description: 'Maximum number of failed subjects a student can still be promoted with',
    type: 'number',
    category: 'academic',
    systemDefault: 2,
    validation: { min: 0, max: 20 },
  },

  // Attendance Settings
  {
    key: 'ATTENDANCE_TRACKING',
    label: 'Attendance Tracking',
    description: 'Enable student attendance tracking for this school',
    type: 'boolean',
    category: 'attendance',
    systemDefault: true,
    requiredFeature: 'ATTENDANCE_TRACKING',
  },
  // Finance Settings
  {
    key: 'parent_view_grades',
    label: 'Parent View Grades',
    description: 'Allow parents to view their children\'s grades',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
    requiredFeature: 'REPORT_CARDS',
  },
  {
    key: 'fee_structure_mode',
    label: 'Billing Schedule',
    description: 'Choose how annual school fees are split for collection and parent fee summaries.',
    type: 'select',
    category: 'finance',
    systemDefault: 'TERM',
    requiredFeature: 'FINANCE_MANAGEMENT',
    options: [
      { value: 'MONTHLY', label: 'Monthly (12 payments)' },
      { value: 'QUARTERLY', label: 'Quarterly (4 payments)' },
      { value: 'SEMESTER', label: 'Semester (2 payments)' },
      { value: 'TERM', label: 'Term (3 payments)' },
      { value: 'YEARLY', label: 'Yearly (1 payment)' },
    ],
  },
  {
    key: 'fee_payment_due_day',
    label: 'Payment Deadline Day',
    description: 'Day of the billing period when payment is due before penalty.',
    type: 'number',
    category: 'finance',
    systemDefault: 15,
    requiredFeature: 'FINANCE_MANAGEMENT',
    validation: {
      min: 1,
      max: 31,
    },
  },
  {
    key: 'fee_daily_penalty_amount',
    label: 'Daily Penalty Price',
    description: 'ETB amount charged to parents for each day after the payment deadline. Use 0 if the school does not charge a penalty.',
    type: 'number',
    category: 'finance',
    systemDefault: 0,
    requiredFeature: 'FINANCE_MANAGEMENT',
    validation: {
      min: 0,
      step: 0.01,
    },
  },
  {
    key: 'family_discount_enabled',
    label: 'Family Discount',
    description: 'Automatically discount fees for families with multiple enrolled children.',
    type: 'boolean',
    category: 'finance',
    systemDefault: false,
    requiredFeature: 'FINANCE_MANAGEMENT',
  },
  {
    key: 'family_discount_min_students',
    label: 'Family Discount Minimum Children',
    description: 'Number of approved enrolled children required before the discount starts.',
    type: 'number',
    category: 'finance',
    systemDefault: 3,
    requiredFeature: 'FINANCE_MANAGEMENT',
    validation: {
      min: 2,
      max: 20,
    },
  },
  {
    key: 'family_discount_percent',
    label: 'Family Discount Percent',
    description: 'Percentage discount applied from the qualifying child onward.',
    type: 'number',
    category: 'finance',
    systemDefault: 20,
    requiredFeature: 'FINANCE_MANAGEMENT',
    validation: {
      min: 0,
      max: 100,
      step: 0.01,
    },
  },
  {
    key: 'family_discount_fee_types',
    label: 'Family Discount Fee Types',
    description: 'Fee categories that receive the family discount.',
    type: 'select',
    category: 'finance',
    systemDefault: 'TUITION',
    requiredFeature: 'FINANCE_MANAGEMENT',
    options: [
      { value: 'TUITION', label: 'Tuition only' },
      { value: 'ALL', label: 'All fee types' },
    ],
  },

  // Communication Settings
  {
    key: 'ANNOUNCEMENTS_ENABLED',
    label: 'Announcements Enabled',
    description: 'Allow administrators to create school announcements',
    type: 'boolean',
    category: 'communication',
    systemDefault: true,
    requiredFeature: 'ANNOUNCEMENTS',
  },
  {
    key: 'SELF_ENROLLMENT_ACTIVE',
    label: 'Self Enrollment Active',
    description: 'Currently accept new self-enrollments',
    type: 'boolean',
    category: 'enrollment',
    systemDefault: false,
    requiredFeature: 'ENROLLMENT_MANAGEMENT',
  },

  // Access Settings
  {
    key: 'TEACHER_PORTAL_ACCESS',
    label: 'Teacher Portal Access',
    description: 'Allow teachers to access the teacher portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
    requiredFeature: 'USER_MANAGEMENT',
  },
  {
    key: 'STUDENT_PORTAL_ACCESS',
    label: 'Student Portal Access',
    description: 'Allow students to access the student portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
    requiredFeature: 'USER_MANAGEMENT',
  },
  {
    key: 'PARENT_PORTAL_ACCESS',
    label: 'Parent Portal Access',
    description: 'Allow parents to access the parent portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
    requiredFeature: 'PARENT_PORTAL',
  },
  {
    key: 'FINANCE_PORTAL_ACCESS',
    label: 'Finance Portal Access',
    description: 'Allow finance staff to access the finance portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
    requiredFeature: 'FINANCE_MANAGEMENT',
  },
  {
    key: 'REGISTRAR_PORTAL_ACCESS',
    label: 'Registrar Portal Access',
    description: 'Allow registrars to access the registrar portal',
    type: 'boolean',
    category: 'access',
    systemDefault: true,
    requiredFeature: 'ENROLLMENT_MANAGEMENT',
  },

  // Class Settings
  {
    key: 'DEFAULT_SECTION_CAPACITY',
    label: 'Section Capacity',
    description: 'Maximum number of students per section',
    type: 'number',
    category: 'classes',
    systemDefault: 20,
    requiredFeature: 'ACADEMIC_STRUCTURE',
    validation: {
      min: 1,
      max: 200,
    },
  },
  {
    key: 'MAX_PERIODS_PER_DAY',
    label: 'Max Periods Per Day',
    description: 'Maximum number of class periods allowed in one school day',
    type: 'number',
    category: 'classes',
    systemDefault: 7,
    requiredFeature: 'ACADEMIC_STRUCTURE',
    validation: {
      min: 1,
      max: 12,
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
    requiredFeature: 'TIMETABLE_MANAGEMENT',
  },
  {
    key: 'SCHOOL_END_TIME',
    label: 'School End Time',
    description: 'Default school day end time',
    type: 'time',
    category: 'schedule',
    systemDefault: '15:00',
    requiredFeature: 'TIMETABLE_MANAGEMENT',
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
    requiredFeature: 'CUSTOM_BRANDING',
  },
  {
    key: 'BRAND_COLOR_IN_NAVIGATION',
    label: 'Use Brand Color In Navigation',
    description: 'Apply the brand accent tint to the navbar and sidebar menu',
    type: 'boolean',
    category: 'branding',
    systemDefault: false,
    requiredFeature: 'CUSTOM_BRANDING',
  },
  {
    key: 'MAINTENANCE_MODE',
    label: 'Maintenance Mode',
    description: 'When enabled, only staff with bypass access or admins can access the school portal.',
    type: 'boolean',
    category: 'advanced',
    systemDefault: false,
  },

  // Notification Provider Settings
  {
    key: 'IN_APP_NOTIFICATIONS_ENABLED',
    label: 'App Notifications',
    description: 'Show in-app notifications to parents, teachers, and staff',
    type: 'boolean',
    category: 'notifications',
    systemDefault: true,
  },
  {
    key: 'EMAIL_NOTIFICATIONS_ENABLED',
    label: 'Email Notifications',
    description: 'Send email notifications to parents, teachers, and staff',
    type: 'boolean',
    category: 'notifications',
    systemDefault: false,
  },
  {
    key: 'SMS_NOTIFICATIONS_ENABLED',
    label: 'SMS Notifications',
    description: 'Send SMS notifications to parents, teachers, and staff',
    type: 'boolean',
    category: 'notifications',
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
  notifications: {
    label: 'Notifications',
    icon: Bell,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
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
  const { t } = useTranslations<SchoolSettingsMessages>('schoolSettings');
  const settingText = useCallback((value: string) => t.settings?.[value] ?? value, [t.settings]);
  const optionText = useCallback((value: string) => t.options?.[value] ?? value, [t.options]);
  const categoryText = useCallback((value: string) => t.categories?.[value] ?? value, [t.categories]);
  const actionText = useCallback((value: string, fallback: string) => t.actions?.[value] ?? fallback, [t.actions]);
  const badgeText = useCallback((value: string, fallback: string) => t.badges?.[value] ?? fallback, [t.badges]);
  const messageText = useCallback((value: string, fallback: string) => t.messages?.[value] ?? fallback, [t.messages]);
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
    publicUrlSlug: string;
    email: string;
    address: string | null;
    logoUrl: string | null;
  } | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [savingSchoolCode, setSavingSchoolCode] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [publicUrlSlug, setPublicUrlSlug] = useState('');
  const [savingPublicUrlSlug, setSavingPublicUrlSlug] = useState(false);
  const [isEditingPublicUrlSlug, setIsEditingPublicUrlSlug] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState('');
  const schoolLogoSrc = resolveAssetUrl(schoolLogo);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [selectedLoginImageFile, setSelectedLoginImageFile] = useState<File | null>(null);
  const [selectedLoginImagePreview, setSelectedLoginImagePreview] = useState('');
  const [savingLoginImage, setSavingLoginImage] = useState(false);
  const loginImageUrl = String(draftSettings.login_image_url || '');
  const loginImageSrc = resolveAssetUrl(loginImageUrl);

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
    const isSubscriptionGated = Boolean(setting.requiredFeature || setting.requiredTier);
    if (isSubscriptionGated && loadingPlan) return false;
    if (isSubscriptionGated && !schoolPlan) return false;

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
  }, [loadingPlan, schoolPlan]);

  // Get current calendar type from settings
  const calendarType = draftSettings['calendar_type'] || 'ETHIOPIAN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSettingsReadOnly = isSuperAdmin;

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

  // Filter visible categories. Branding has its own login-image control, so it
  // stays visible even when subscription-gated brand-color settings are hidden.
  const visibleCategories = Object.keys(groupedSettings).filter((category) =>
    category === 'branding' || groupedSettings[category].some((setting) => isSettingVisible(setting))
  );

  const fetchAcademicYears = useCallback(async () => {
    if (isSettingsReadOnly) {
      setAcademicYears([]);
      setLoadingAcademicYears(false);
      return;
    }

    try {
      setLoadingAcademicYears(true);
      const response = await academicYearsAPI.getAll({ schoolId });
      setAcademicYears(response.data);
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    } finally {
      setLoadingAcademicYears(false);
    }
  }, [isSettingsReadOnly, schoolId]);

  const fetchSettings = useCallback(async () => {
    if (isSettingsReadOnly) {
      setSettings({});
      setDraftSettings({});
      setNumberDrafts({});
      setLoading(false);
      return;
    }

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
      setError(messageText('loadFailed', 'Failed to load settings'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isSettingsReadOnly, schoolId, messageText]);

  const fetchSchoolInfo = useCallback(async () => {
    try {
      const response = await schoolsAPI.getById(schoolId);
      setSchoolInfo(response.data);
      setSchoolLogo(response.data.logoUrl || '');
      if (!response.data.code) {
        setIsEditingCode(true);
      }
      setSchoolCode(response.data.code || '');
      setPublicUrlSlug(response.data.publicUrlSlug || '');
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

  useEffect(() => {
    if (!selectedLoginImageFile) {
      setSelectedLoginImagePreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(selectedLoginImageFile);
    setSelectedLoginImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedLoginImageFile]);

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

  const syncSchoolCaches = (schoolPatch: Record<string, any>) => {
    const updateSchool = (current: any) =>
      current ? { ...current, ...schoolPatch } : current;

    queryClient.setQueryData(queryKeys.school.layout(schoolId), updateSchool);
    queryClient.setQueryData(queryKeys.school.detail(schoolId), updateSchool);
    queryClient.setQueryData(queryKeys.schools.detail(schoolId), updateSchool);
    queryClient.invalidateQueries({ queryKey: queryKeys.schools.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.school.layout(schoolId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.school.detail(schoolId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.schools.detail(schoolId) });
  };

  const syncSchoolSettingsCaches = (
    nextSettings: Record<string, any>,
    keys: string[],
    options?: { remove?: boolean },
  ) => {
    queryClient.setQueryData(queryKeys.school.settings(schoolId), (current: any) => {
      const currentSettings = current && typeof current === 'object' ? current : {};
      const merged = { ...currentSettings, ...nextSettings };

      if (options?.remove) {
        keys.forEach((key) => {
          delete merged[key];
        });
      }

      return merged;
    });

    keys.forEach((key) => {
      if (options?.remove) {
        queryClient.removeQueries({ queryKey: queryKeys.school.setting(key, schoolId) });
      } else {
        queryClient.setQueryData(queryKeys.school.setting(key, schoolId), {
          key,
          value: nextSettings[key],
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.school.setting(key, schoolId) });
    });

    queryClient.invalidateQueries({ queryKey: queryKeys.school.settings(schoolId) });
  };

  const syncCachedLoginContext = (
    schoolPatch: Partial<{
      code: string | null;
      publicUrlSlug: string | null;
      logoUrl: string | null;
      loginImageUrl: string | null;
      accentColor: string | null;
    }>,
  ) => {
    if (!schoolInfo?.name) return;

    writeCachedSchoolLoginContext({
      id: schoolId,
      name: schoolInfo.name,
      code: schoolPatch.code ?? schoolInfo.code ?? null,
      publicUrlSlug: schoolPatch.publicUrlSlug ?? schoolInfo.publicUrlSlug ?? null,
      logoUrl: schoolPatch.logoUrl ?? schoolInfo.logoUrl ?? null,
      accentColor:
        schoolPatch.accentColor ??
        (typeof draftSettings.theme_color === 'string' ? draftSettings.theme_color : null),
      loginImageUrl:
        schoolPatch.loginImageUrl ??
        (typeof draftSettings.login_image_url === 'string' ? draftSettings.login_image_url : null),
    });
  };

  const handleLogoSave = async () => {
    try {
      setSavingLogo(true);
      let nextLogoUrl = schoolLogo || null;

      if (selectedLogoFile) {
        const result = await schoolsAPI.uploadLogo(schoolId, selectedLogoFile);
        nextLogoUrl = result?.url || null;
        setSchoolLogo(nextLogoUrl || '');
        setSchoolInfo(prev => prev ? { ...prev, logoUrl: nextLogoUrl } : prev);
        toast.success(messageText('logoUploadSuccess', 'School logo uploaded successfully!'));
      } else {
        await schoolsAPI.update(schoolId, { logoUrl: schoolLogo });
        setSchoolInfo(prev => prev ? { ...prev, logoUrl: nextLogoUrl } : prev);
        toast.success(messageText('logoUpdateSuccess', 'School logo updated successfully!'));
      }

      syncSchoolCaches({ logoUrl: nextLogoUrl });
      syncCachedLoginContext({ logoUrl: nextLogoUrl });
      setIsEditingLogo(false);
      setSelectedLogoFile(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || messageText('logoUpdateFailed', 'Failed to update school logo');
      toast.error(errorMessage);
    } finally {
      setSavingLogo(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(messageText('imageFile', 'Please select an image file'));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(messageText('imageSize', 'Image size must be less than 2MB'));
        return;
      }
      setSelectedLogoFile(file);
      setIsEditingLogo(true);
    }
  };

  const handleLoginImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(messageText('imageFile', 'Please select an image file'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Login image size must be less than 5MB');
      return;
    }
    setSelectedLoginImageFile(file);
  };

  const handleLoginImageSave = async () => {
    if (isSettingsReadOnly) {
      toast.error('Super Admin can manage school identity and public URLs here. School academic settings are managed by the school owner.');
      return;
    }
    if (!selectedLoginImageFile) {
      toast.error(messageText('imageFile', 'Please select an image file'));
      return;
    }

    try {
      setSavingLoginImage(true);
      const result = await schoolSettingsAPI.uploadLoginImage(schoolId, selectedLoginImageFile);
      const url = result?.url || '';
      setSettings((prev) => ({ ...prev, login_image_url: url }));
      setDraftSettings((prev) => ({ ...prev, login_image_url: url }));
      syncSchoolSettingsCaches({ login_image_url: url }, ['login_image_url']);
      syncCachedLoginContext({ loginImageUrl: url });
      toast.success('Login image updated successfully');
      setSelectedLoginImageFile(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update login image';
      toast.error(errorMessage);
    } finally {
      setSavingLoginImage(false);
    }
  };

  const handleLoginImageReset = async () => {
    if (isSettingsReadOnly) return;
    try {
      setSavingLoginImage(true);
      await schoolSettingsAPI.delete(schoolId, 'login_image_url');
      setSettings((prev) => {
        const next = { ...prev };
        delete next.login_image_url;
        return next;
      });
      setDraftSettings((prev) => {
        const next = { ...prev };
        delete next.login_image_url;
        return next;
      });
      setSelectedLoginImageFile(null);
      syncSchoolSettingsCaches({}, ['login_image_url'], { remove: true });
      syncCachedLoginContext({ loginImageUrl: null });
      toast.success('Login image reset to default');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset login image';
      toast.error(errorMessage);
    } finally {
      setSavingLoginImage(false);
    }
  };

  const handleSchoolCodeSave = async () => {
    try {
      setSavingSchoolCode(true);
      const response = await schoolsAPI.update(schoolId, { code: schoolCode });
      const nextCode = response.data?.code ?? schoolCode;
      toast.success(messageText('codeUpdateSuccess', 'School code updated successfully!'));
      setIsEditingCode(false);
      setSchoolInfo(prev => prev ? { ...prev, code: nextCode } : response.data);
      setSchoolCode(nextCode || '');
      syncSchoolCaches({ code: nextCode });
      syncCachedLoginContext({ code: nextCode || null });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || messageText('codeUpdateFailed', 'Failed to update school code');
      toast.error(errorMessage);
    } finally {
      setSavingSchoolCode(false);
    }
  };

  const normalizePublicUrlSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

  const handlePublicUrlSlugSave = async () => {
    const normalizedSlug = normalizePublicUrlSlug(publicUrlSlug);
    if (!normalizedSlug) {
      toast.error('Public URL is required');
      return;
    }

    try {
      setSavingPublicUrlSlug(true);
      const response = await schoolsAPI.update(schoolId, { publicUrlSlug: normalizedSlug });
      const nextSlug = response.data?.publicUrlSlug || normalizedSlug;
      setSchoolInfo(prev => prev ? { ...prev, publicUrlSlug: nextSlug } : response.data);
      setPublicUrlSlug(nextSlug);
      syncSchoolCaches({ publicUrlSlug: nextSlug });
      syncCachedLoginContext({ publicUrlSlug: nextSlug });
      setIsEditingPublicUrlSlug(false);
      toast.success('Public school URL updated successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update public school URL';
      toast.error(errorMessage);
    } finally {
      setSavingPublicUrlSlug(false);
    }
  };

  const handleCopyPublicUrl = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSettingChange = async (key: string, value: any, setting: SettingItem) => {
    if (isSettingsReadOnly) {
      toast.error('Super Admin can manage school identity and public URLs here. School academic settings are managed by the school owner.');
      return;
    }

    if (isSettingLocked(key)) {
      toast.error(`${settingText(setting.label)} ${messageText('lockedAfterSet', 'is locked after it is set once')}`);
      return;
    }

    // Validate number inputs
    if (setting.type === 'number') {
      if (setting.validation) {
        const num = Number(value);
        if (setting.validation.min !== undefined && num < setting.validation.min) {
          toast.error(`${messageText('valueAtLeast', 'Value must be at least')} ${setting.validation.min}`);
          return;
        }
        if (setting.validation.max !== undefined && num > setting.validation.max) {
          toast.error(`${messageText('valueAtMost', 'Value must be at most')} ${setting.validation.max}`);
          return;
        }
      }
    }

    // Validate time inputs
    if (setting.type === 'time') {
      const isValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value));
      if (!isValid) {
        toast.error(messageText('validTime', 'Please enter a valid time in HH:mm format'));
        return;
      }

      if (key === 'SCHOOL_START_TIME' || key === 'SCHOOL_END_TIME') {
        const startTime = String(
          key === 'SCHOOL_START_TIME'
            ? value
            : draftSettings.SCHOOL_START_TIME || settings.SCHOOL_START_TIME || '08:00',
        );
        const endTime = String(
          key === 'SCHOOL_END_TIME'
            ? value
            : draftSettings.SCHOOL_END_TIME || settings.SCHOOL_END_TIME || '15:00',
        );
        if (startTime >= endTime) {
          toast.error('School start time must be before school end time');
          return;
        }
      }
    }

    try {
      setSaving(key);
      setError(null);
      await schoolSettingsAPI.set(schoolId, key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      syncSchoolSettingsCaches({ [key]: value }, [key]);

      if (key === 'theme_color') {
        syncCachedLoginContext({ accentColor: value });
      }
      
      // Update user session for calendar type change
      if (key === 'calendar_type' && user) {
        updateUser({ ...user, calendarType: value });
      }

      toast.success(`${settingText(setting.label)} ${messageText('updatedSuccessfully', 'updated successfully')}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || messageText('settingUpdateFailed', 'Failed to update setting');
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
    if (setting.type === 'json') {
      return setting.systemDefault ?? null;
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
    if (setting.type === 'json') {
      return JSON.stringify(left) === JSON.stringify(right);
    }
    return String(left ?? '') === String(right ?? '');
  };

  const handleResetSetting = async (key: string, setting: SettingItem) => {
    if (isSettingLocked(key)) {
      toast.error(`${settingText(setting.label)} ${messageText('lockedAfterSet', 'is locked after it is set once')}`);
      return;
    }

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
      syncSchoolSettingsCaches({}, [key], { remove: true });

      if (key === 'theme_color') {
        syncCachedLoginContext({ accentColor: null });
      }

      if (key === 'calendar_type' && user && setting.systemDefault) {
        updateUser({ ...user, calendarType: setting.systemDefault });
      }

      toast.success(`${settingText(setting.label)} ${messageText('resetToDefault', 'reset to default')}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || messageText('resetFailed', 'Failed to reset setting');
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(null);
    }
  };

  const getSettingValue = (key: string, setting: SettingItem) => {
    return getEffectiveSettingValue(draftSettings, key, setting);
  };

  const isSettingLocked = (key: string) => {
    return (
      ONE_TIME_LOCKED_SETTING_KEYS.has(key) &&
      settings[key] !== undefined &&
      settings[key] !== null &&
      settings[key] !== ''
    );
  };

  const commitNumberSetting = async (setting: SettingItem) => {
    const draft = numberDrafts[setting.key]?.trim();
    const fallbackValue = String(setting.systemDefault ?? '');
    const nextDraft = draft === '' ? fallbackValue : draft;
    const nextValue = Number(nextDraft);

    if (Number.isNaN(nextValue)) {
      toast.error(messageText('validNumber', 'Please enter a valid number'));
      setNumberDrafts((prev) => ({ ...prev, [setting.key]: fallbackValue }));
      return;
    }

    if (setting.validation?.min !== undefined && nextValue < setting.validation.min) {
      toast.error(`${messageText('valueAtLeast', 'Value must be at least')} ${setting.validation.min}`);
      setNumberDrafts((prev) => ({
        ...prev,
        [setting.key]: String(getSettingValue(setting.key, setting)),
      }));
      return;
    }

    if (setting.validation?.max !== undefined && nextValue > setting.validation.max) {
      toast.error(`${messageText('valueAtMost', 'Value must be at most')} ${setting.validation.max}`);
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
    return nextValue;
  };

  const saveNumberSetting = async (setting: SettingItem) => {
    const nextValue = await commitNumberSetting(setting);
    if (nextValue === undefined) return;
    await handleSettingChange(setting.key, nextValue, setting);
  };

  const hasSettingChanged = (setting: SettingItem) => {
    const currentValue = getEffectiveSettingValue(settings, setting.key, setting);
    const draftValue =
      setting.type === 'number'
        ? numberDrafts[setting.key] ?? String(getEffectiveSettingValue(draftSettings, setting.key, setting))
        : getEffectiveSettingValue(draftSettings, setting.key, setting);

    return !areValuesEqual(currentValue, draftValue, setting);
  };

  const hasUnsavedChanges = SETTINGS_CONFIG.some(
    (setting) => !isSettingsReadOnly && hasSettingChanged(setting) && !isSettingLocked(setting.key),
  );
  const hasPendingPageChanges =
    hasUnsavedChanges ||
    Boolean(selectedLogoFile) ||
    Boolean(selectedLoginImageFile) ||
    (isEditingCode && schoolCode !== (schoolInfo?.code || '')) ||
    (isEditingPublicUrlSlug && publicUrlSlug !== (schoolInfo?.publicUrlSlug || ''));

  useEffect(() => {
    if (!hasPendingPageChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingPageChanges]);

  const handleSaveAllChanges = async () => {
    if (isSettingsReadOnly) {
      toast.error('Super Admin can manage school identity and public URLs here. School academic settings are managed by the school owner.');
      return;
    }

    const changedSettings = SETTINGS_CONFIG.filter(
      (setting) => hasSettingChanged(setting) && !isSettingLocked(setting.key),
    );
    if (changedSettings.length === 0) return;

    try {
      setSavingAll(true);
      setError(null);
      const updatePayload: Record<string, any> = {};
      const resetSettings: SettingItem[] = [];

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
          resetSettings.push(setting);
          continue;
        }

        updatePayload[setting.key] = nextValue;
      }

      if (Object.keys(updatePayload).length > 0) {
        await schoolSettingsAPI.batchUpdate(schoolId, updatePayload);
        setSettings((prev) => ({ ...prev, ...updatePayload }));
        setDraftSettings((prev) => ({ ...prev, ...updatePayload }));
        syncSchoolSettingsCaches(updatePayload, Object.keys(updatePayload));

        if (Object.prototype.hasOwnProperty.call(updatePayload, 'theme_color')) {
          syncCachedLoginContext({ accentColor: updatePayload.theme_color });
        }

        if (Object.prototype.hasOwnProperty.call(updatePayload, 'calendar_type') && user) {
          updateUser({ ...user, calendarType: updatePayload.calendar_type });
        }
      }

      for (const setting of resetSettings) {
        await schoolSettingsAPI.delete(schoolId, setting.key);
        setSettings((prev) => {
          const next = { ...prev };
          delete next[setting.key];
          return next;
        });
        setDraftSettings((prev) => {
          const next = { ...prev };
          delete next[setting.key];
          return next;
        });
        syncSchoolSettingsCaches({}, [setting.key], { remove: true });

        if (setting.key === 'theme_color') {
          syncCachedLoginContext({ accentColor: null });
        }
      }

      toast.success(messageText('settingsSaveSuccess', 'School settings saved successfully'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || messageText('settingsSaveFailed', 'Failed to save settings');
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
    const isLocked = isSettingLocked(setting.key);
    const isControlDisabled = isSaving || isLocked || isSettingsReadOnly;

    // Render upgrade badge for hidden features
    if (!isSettingVisible(setting)) {
      return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            {badgeText('upgradeRequired', 'Upgrade Required')}
          </Badge>
        </div>
      );
    }

    if (setting.type === 'boolean') {
      return (
        <div className="flex items-center gap-2 sm:gap-3">
          <Switch
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => updateDraftSetting(setting.key, checked)}
            disabled={isControlDisabled}
          />
          {isLocked && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('locked', 'Locked')}</Badge>}
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('unsaved', 'Unsaved')}</Badge>}
        </div>
      );
    }

    if (setting.type === 'select') {
      const options = Array.isArray(setting.options) 
        ? setting.options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
        : [];

      return (
        <div className="flex items-center gap-2">
          <Select
            value={String(value || '')}
            onValueChange={(val) => updateDraftSetting(setting.key, val === '__select__' ? '' : val)}
            disabled={isControlDisabled}
          >
            <SelectTrigger className="w-48 bg-white dark:bg-[#222222] border-gray-200 dark:border-[#333333] text-gray-900 dark:text-white">
              <SelectValue placeholder={actionText('selectOption', 'Select an option...')} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1A1A1A]">
              <SelectItem value="__select__">{actionText('selectOption', 'Select an option...')}</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {optionText(opt.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLocked && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('locked', 'Locked')}</Badge>}
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('unsaved', 'Unsaved')}</Badge>}
        </div>
      );
    }

    if (setting.type === 'number') {
      const isPenaltyAmount = setting.key === 'fee_daily_penalty_amount';
      const isDiscountPercent = setting.key === 'family_discount_percent';
      const isPaymentDueDay = setting.key === 'fee_payment_due_day';
      const draftValue = numberDrafts[setting.key] ?? String(value);
      const numericDraftValue = Number(draftValue || 0);

      return (
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2">
            {isPenaltyAmount && (
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 dark:border-[#333333] dark:bg-[#222222] dark:text-[#CCCCCC]">
                ETB
              </span>
            )}
            <Input
              type="number"
              value={draftValue}
              min={setting.validation?.min}
              max={setting.validation?.max}
              step={setting.validation?.step}
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
                  void saveNumberSetting(setting);
                }
              }}
              disabled={isControlDisabled}
              className={isPenaltyAmount ? "w-32" : isDiscountPercent ? "w-24" : "w-24"}
            />
            {isDiscountPercent && (
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 dark:border-[#333333] dark:bg-[#222222] dark:text-[#CCCCCC]">
                %
              </span>
            )}
            {isPaymentDueDay && (
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 dark:border-[#333333] dark:bg-[#222222] dark:text-[#CCCCCC]">
                day
              </span>
            )}
            {isLocked && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('locked', 'Locked')}</Badge>}
            {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('unsaved', 'Unsaved')}</Badge>}
          </div>

        </div>
      );
    }

    if (setting.type === 'date') {
      const dateValue = typeof value === 'string' && value ? new Date(value + 'T00:00:00') : undefined;
      return (
        <div className="flex items-center gap-2">
          <CalendarDatePicker
            value={dateValue}
            onChange={(date) => {
              const str = date
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                : '';
              updateDraftSetting(setting.key, str);
            }}
            disabled={isControlDisabled}
            placeholder="Month Day, Year"
            className="w-56"
          />
          {isLocked && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('locked', 'Locked')}</Badge>}
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('unsaved', 'Unsaved')}</Badge>}
        </div>
      );
    }

    if (setting.type === 'time') {
      return (
        <div className="flex items-center gap-2">
          <TimePicker
            value={value || setting.systemDefault || '08:00'}
            onChange={(time) => updateDraftSetting(setting.key, time)}
            onCommit={(time) => handleSettingChange(setting.key, time, setting)}
            disabled={isControlDisabled}
            calendarType={normalizeCalendarType(calendarType)}
            allowedEthiopianPeriods={setting.key === 'SCHOOL_END_TIME' ? ['afternoon', 'evening'] : ['morning', 'afternoon']}
            defaultEthiopianPeriod={setting.key === 'SCHOOL_END_TIME' ? 'afternoon' : 'morning'}
            className="w-56"
          />
          {isLocked && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('locked', 'Locked')}</Badge>}
          {hasSettingChanged(setting) && <Badge variant="outline" className="text-xs whitespace-nowrap">{badgeText('unsaved', 'Unsaved')}</Badge>}
        </div>
      );
    }

    if (setting.type === 'json') {
      const rawValue = getEffectiveSettingValue(draftSettings, setting.key, setting);
      const config: Record<string, string> =
        typeof rawValue === 'object' && rawValue !== null ? rawValue : {};

      if (setting.key === 'EMAIL_PROVIDER' || setting.key === 'SMS_PROVIDER') {
        return null;
      }

      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Unknown JSON setting
        </div>
      );
    }

    if (setting.type === 'color') {
      return (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <input
              type="color"
              value={value || setting.systemDefault || '#e35336'}
              onChange={(e) => updateDraftSetting(setting.key, e.target.value)}
              disabled={isControlDisabled}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-[#333333] cursor-pointer disabled:opacity-50"
            />
          </div>
          <Input
            type="text"
            value={value || setting.systemDefault || '#e35336'}
            onChange={(e) => {
              const val = e.target.value;
              updateDraftSetting(setting.key, val);
            }}
            disabled={isControlDisabled}
            className="w-24 sm:w-28 font-mono text-sm"
          />
          {setting.key === 'theme_color' && hasCustomValue && !isLocked && !isSettingsReadOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                updateDraftSetting(setting.key, setting.systemDefault ?? '');
              }}
              disabled={isSaving}
              className="h-10 shrink-0 text-xs"
            >
              {actionText('useDefault', 'Use Default')}
            </Button>
          )}
          {isLocked && <Badge variant="outline" className="shrink-0 text-xs whitespace-nowrap">{badgeText('locked', 'Locked')}</Badge>}
          {hasSettingChanged(setting) && <Badge variant="outline" className="shrink-0 text-xs whitespace-nowrap">{badgeText('unsaved', 'Unsaved')}</Badge>}
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

  const effectivePublicUrlSlug = schoolInfo?.publicUrlSlug || publicUrlSlug;
  const schoolLoginUrl =
    typeof window !== 'undefined' && effectivePublicUrlSlug
      ? `${window.location.origin}/schools/${encodeURIComponent(effectivePublicUrlSlug)}/login`
      : '';
  const publicLinks = schoolLoginUrl
    ? [
        { label: 'School Login', url: schoolLoginUrl },
        {
          label: 'Enrollment',
          url: `${window.location.origin}/enroll?school=${encodeURIComponent(effectivePublicUrlSlug)}`,
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
      {/* Page Title */}
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Configure all school-specific settings below. Changes take effect immediately after saving.
      </p>

      {/* School Header */}
      {schoolInfo && (
        <Card className="mb-6 overflow-hidden border-gray-200 bg-white dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative shrink-0">
                  {isEditingLogo ? (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-[#222222]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload" className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-full text-center">
                        <ImageIcon className="mb-0.5 h-4 w-4 text-gray-400" />
                        <span className="text-[10px] text-gray-500">{actionText('upload', 'Upload')}</span>
                      </label>
                    </div>
                  ) : schoolLogoSrc ? (
                    <div className="group relative h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm dark:border-[#333333] dark:bg-[#222222]">
                      <img
                        src={schoolLogoSrc}
                        alt={schoolInfo.name || "School Logo"}
                        className="h-full w-full object-cover"
                      />
                      <div
                        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setIsEditingLogo(true)}
                      >
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-color,#e35336)] text-xl font-bold text-white shadow-sm transition-opacity hover:opacity-80"
                      onClick={() => setIsEditingLogo(true)}
                      title={messageText('clickToAddLogo', 'Click to add logo')}
                    >
                      {schoolInfo.name?.charAt(0) || "S"}
                    </div>
                  )}
                  {isEditingLogo && selectedLogoFile && (
                    <div className="mt-2 flex gap-1.5">
                      <Button onClick={handleLogoSave} disabled={savingLogo} size="sm" className="h-7 px-2 text-xs">
                        {savingLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : actionText('saveLogo', 'Save Logo')}
                      </Button>
                      <Button variant="ghost" onClick={() => { setSelectedLogoFile(null); setIsEditingLogo(false); }} size="sm" className="h-7 px-2 text-xs">
                        {actionText('cancel', 'Cancel')}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                    {schoolInfo.name}
                  </h1>
                  {!isSuperAdmin && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.labels?.code ?? 'Code'}:</span>
                      {isEditingCode ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Input
                            value={schoolCode}
                            onChange={(e) => setSchoolCode(e.target.value)}
                            placeholder={t.labels?.schoolCode ?? 'School Code'}
                            className="h-7 w-28 font-mono text-xs"
                            disabled={savingSchoolCode}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={handleSchoolCodeSave}
                            disabled={savingSchoolCode || !schoolCode}
                            className="h-7 px-2 text-xs"
                          >
                            {savingSchoolCode ? <Loader2 className="h-3 w-3 animate-spin" /> : actionText('save', 'Save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingCode(false);
                              setSchoolCode(schoolInfo.code || '');
                            }}
                            disabled={savingSchoolCode}
                            className="h-7 px-2 text-xs"
                          >
                            {actionText('cancel', 'Cancel')}
                          </Button>
                        </div>
                      ) : schoolInfo.code ? (
                        <span
                          className="cursor-pointer rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-[#222222] dark:text-gray-300 dark:hover:bg-[#333333]"
                          onClick={() => setIsEditingCode(true)}
                          title={messageText('clickToEdit', 'Click to edit')}
                        >
                          {schoolInfo.code}
                        </span>
                      ) : (
                        <button
                          onClick={() => setIsEditingCode(true)}
                          className="text-xs font-medium text-amber-600 hover:underline"
                        >
                          {actionText('addSchoolCode', 'Add school code')}
                        </button>
                      )}
                    </div>
                  )}
                  {isSuperAdmin && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#2A2A2A] dark:bg-[#111111]/50">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Public School URL
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Use these links when connecting this school&apos;s dedicated website to the management system.
                          </p>
                        </div>
                        {isEditingPublicUrlSlug ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Input
                              value={publicUrlSlug}
                              onChange={(e) => setPublicUrlSlug(e.target.value)}
                              placeholder="green-new-generation"
                              className="h-8 w-56 font-mono text-xs"
                              disabled={savingPublicUrlSlug}
                            />
                            <Button
                              size="sm"
                              onClick={handlePublicUrlSlugSave}
                              disabled={savingPublicUrlSlug || !publicUrlSlug.trim()}
                              className="h-8 px-2 text-xs"
                            >
                              {savingPublicUrlSlug ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingPublicUrlSlug(false);
                                setPublicUrlSlug(schoolInfo.publicUrlSlug || '');
                              }}
                              disabled={savingPublicUrlSlug}
                              className="h-8 px-2 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingPublicUrlSlug(true)}
                            className="h-8 shrink-0 px-2 text-xs"
                          >
                            Edit URL
                          </Button>
                        )}
                      </div>

                      {effectivePublicUrlSlug && (
                        <div className="mt-3 grid gap-2 lg:grid-cols-3">
                          {publicLinks.map((link) => (
                            <div
                              key={link.label}
                              className="min-w-0 rounded-md border border-gray-200 bg-white p-2 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {link.label}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleCopyPublicUrl(link.label, link.url)}
                                    title={`Copy ${link.label}`}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    asChild
                                    title={`Open ${link.label}`}
                                  >
                                    <a href={link.url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                              <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                                {link.url}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {schoolPlan && (
                <Badge variant="outline" className="w-fit shrink-0 text-xs">
                  {schoolPlan.tier}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      {!isSettingsReadOnly && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 max-w-full">
          <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <div className="-mx-4 max-w-[100vw] overflow-x-auto overflow-y-hidden px-4 pb-2 md:mx-0 md:max-w-full md:px-0 lg:w-full">
                <TabsList className="flex h-auto w-full min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
                  {visibleCategories.map((category) => {
                    const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                    const Icon = config?.icon || SettingsIcon;
                    return (
                      <TabsTrigger key={category} value={category} className="flex-1 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm">
                        <Icon className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                        <span>{categoryText(category)}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
          </div>

          {visibleCategories.map((category) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          const Icon = config?.icon || SettingsIcon;
          const settings = (groupedSettings[category] || []).filter(isSettingVisible);

          return (
            <TabsContent key={category} value={category} className="mt-4 min-w-0 max-w-full">
              <Card className="max-w-full overflow-hidden bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#2A2A2A]">
                <CardHeader className="min-w-0">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-[var(--brand-color,#e35336)]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="break-words text-gray-900 dark:text-white">{categoryText(category)}</CardTitle>
                      <CardDescription className="break-words text-gray-500 dark:text-gray-400">
                        {t.configurePrefix} {categoryText(category).toLowerCase()} {t.configureSuffix}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
                  {category === 'branding' && (
                    <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 dark:bg-[#1A1A1A]/50 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 sm:pr-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h4 className="break-words font-medium text-gray-900 dark:text-white">Login Image</h4>
                        </div>
                        <p className="mt-0.5 break-words text-sm text-gray-500 dark:text-gray-400">
                          Image shown on the left side of this school&apos;s login page.
                        </p>
                        <div className="mt-3 h-32 w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-[#2A2A2A] dark:bg-[#111111]">
                          {selectedLoginImagePreview ? (
                            <img
                              src={selectedLoginImagePreview}
                              alt="Selected login image preview"
                              className="h-full w-full object-cover"
                            />
                          ) : loginImageSrc ? (
                            <img
                              src={loginImageSrc}
                              alt="Login image preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                              Default login image
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:w-64">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLoginImageFileChange}
                          disabled={savingLoginImage}
                          className="bg-white dark:bg-[#222222]"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleLoginImageSave}
                            disabled={!selectedLoginImageFile || savingLoginImage}
                            className="flex-1"
                          >
                            {savingLoginImage ? <Loader2 className="h-4 w-4 animate-spin" /> : actionText('save', 'Save')}
                          </Button>
                          {loginImageUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleLoginImageReset}
                              disabled={savingLoginImage}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {settings.map((setting) => (
                    <div
                      key={setting.key}
                      className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                        !isSettingVisible(setting) 
                          ? 'bg-gray-50 dark:bg-[#222222]/50 opacity-60' 
                          : 'bg-white dark:bg-[#1A1A1A]/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 sm:pr-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h4 className="break-words font-medium text-gray-900 dark:text-white">{settingText(setting.label)}</h4>
                          {setting.requiredTier && (
                            <Badge variant="outline" className="whitespace-normal break-words text-xs">
                              {setting.requiredTier}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-sm text-gray-500 dark:text-gray-400">{settingText(setting.description)}</p>
                        {isSettingLocked(setting.key) && (
                          <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {messageText('lockedAfterSetup', 'Locked after first setup to protect existing academic records.')}
                          </p>
                        )}
                        {!isSettingVisible(setting) && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {messageText('requires', 'Requires')} {setting.requiredFeature ? `${setting.requiredFeature} ${messageText('feature', 'feature')}` : `${setting.requiredTier} ${messageText('plan', 'plan')}`}
                          </p>
                        )}
                      </div>
                      <div className="sm:w-auto sm:flex-shrink-0">
                        {renderSettingInput(setting)}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={handleSaveAllChanges}
                      disabled={!hasUnsavedChanges || savingAll}
                    >
                      {savingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {actionText('saveChanges', 'Save Changes')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
          })}
        </Tabs>
      )}

    </div>
  );

}

