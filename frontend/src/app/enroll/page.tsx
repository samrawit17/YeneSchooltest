'use client';

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { enrollmentAPI } from '@/lib/api/enrollment';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { useThemeStore } from '@/lib/themeStore';
import { AppLanguage, useLanguageStore } from '@/lib/languageStore';
import { useTranslations } from '@/hooks/useTranslations';
import { resolveAssetUrl } from '@/lib/asset-url';
import {
  GraduationCap,
  User,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Heart,
  School,
  Phone,
  Mail,
  Globe,
  MapPin,
  BookOpen,
  UserCircle,
  ChevronRight,
  Check,
  Sparkles,
  Languages,
  Moon,
  Sun,
  LogIn,
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  code: string;
  publicUrlSlug?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
}

interface GradeCapacity {
  grade: number;
  available: number;
}

type FormStep = 'school' | 'student' | 'guardian' | 'review';

const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ" },
  { value: "om", label: "Afaan Oromo" },
  { value: "so", label: "Soomaali" },
  { value: "ar", label: "العربية" },
];

const STEP_ICONS: Record<FormStep, ReactNode> = {
  school: <School className="w-5 h-5" />,
  student: <UserCircle className="w-5 h-5" />,
  guardian: <Heart className="w-5 h-5" />,
  review: <CheckCircle className="w-5 h-5" />,
};

const STEP_LABELS: Record<FormStep, string> = {
  school: 'stepSchool',
  student: 'stepStudent',
  guardian: 'stepGuardian',
  review: 'stepReview',
};

const STEPS: FormStep[] = ['school', 'student', 'guardian', 'review'];

const accentControlClassName =
  'border bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white focus:ring-2 focus:ring-offset-2 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900';

const accentControlStyle: CSSProperties = {
  borderColor: 'rgba(var(--enroll-brand-rgb), 0.45)',
  '--tw-ring-color': 'rgba(var(--enroll-brand-rgb), 0.35)',
} as CSSProperties;

const brandedFieldClassName =
  'border-slate-200 bg-white transition-colors focus:border-[var(--enroll-brand)] focus-visible:ring-2 focus-visible:ring-[rgba(var(--enroll-brand-rgb),0.28)] dark:border-slate-600 dark:bg-slate-800';

const brandedFieldTriggerClassName = `h-11 ${brandedFieldClassName}`;
const brandedDatePickerClassName = `${brandedFieldTriggerClassName} text-slate-900 hover:border-[var(--enroll-brand)] hover:bg-white focus-visible:border-[var(--enroll-brand)] dark:text-slate-100 dark:hover:bg-slate-800 [&_svg]:text-[var(--enroll-brand)]`;

const parseDateValue = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const toDateInputValue = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export default function EnrollmentPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useThemeStore();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const { t } = useTranslations<any>('enrollment');
  const [currentStep, setCurrentStep] = useState<FormStep>('school');
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolData, setSelectedSchoolData] = useState<{ id: string; name: string; academicYearId: string; academicYearName: string } | null>(null);
  const [availableGrades, setAvailableGrades] = useState<GradeCapacity[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<{ isOpen: boolean; message: string } | null>(null);
  const { schoolId: preselectedSchoolId, enrollmentKey, schoolSlug } = useEnrollmentContext();
  const initialDocumentTitleRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    schoolId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    faydaNumber: '',
    nationality: '',
    email: '',
    phone: '',
    address: '',
    previousSchool: '',
    previousGrade: undefined as number | undefined,
    transferCertificate: false,
    parentFirstName: '',
    parentLastName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelation: '',
    requestedGrade: 1,
    requestedStream: '',
  });

  const stepIndex = STEPS.indexOf(currentStep);
  const selectedSchool = schools.find((school) => school.id === formData.schoolId) || null;
  const selectedSchoolSlug = selectedSchool?.publicUrlSlug || schoolSlug || null;
  const schoolSignInHref = selectedSchoolSlug
    ? `/schools/${encodeURIComponent(selectedSchoolSlug)}/login`
    : formData.schoolId
      ? `/sign-in?schoolId=${encodeURIComponent(formData.schoolId)}`
      : '/sign-in';
  const brandColor = normalizeBrandColor(selectedSchool?.accentColor);
  const brandColorRgb = hexToRgb(brandColor);
  const schoolLogoUrl = resolveAssetUrl(selectedSchool?.logoUrl);
  const enrollmentPageTitle = selectedSchool?.name
    ? `${selectedSchool.name} - ${t.title}`
    : `${t.titleFallback} - ${t.title}`;
  const pageStyle = {
    '--enroll-brand': brandColor,
    '--enroll-brand-rgb': `${brandColorRgb.r}, ${brandColorRgb.g}, ${brandColorRgb.b}`,
    '--brand-color': brandColor,
  } as CSSProperties;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    initialDocumentTitleRef.current ??= document.title;
    document.title = enrollmentPageTitle;

    return () => {
      if (initialDocumentTitleRef.current) {
        document.title = initialDocumentTitleRef.current;
      }
    };
  }, [enrollmentPageTitle]);

  useEffect(() => {
    if (typeof document === 'undefined' || !schoolLogoUrl) return;

    const faviconHref = `${schoolLogoUrl}${schoolLogoUrl.includes('?') ? '&' : '?'}school-favicon=${encodeURIComponent(formData.schoolId || 'selected')}`;
    const existingLinks = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]'));
    const previousLinks = existingLinks.map((link) => link.cloneNode(true) as HTMLLinkElement);
    existingLinks.forEach((link) => link.remove());

    const iconLink = document.createElement('link');
    const shortcutIconLink = document.createElement('link');

    iconLink.rel = 'icon';
    iconLink.href = faviconHref;
    iconLink.setAttribute('data-school-favicon', 'true');

    shortcutIconLink.rel = 'shortcut icon';
    shortcutIconLink.href = faviconHref;
    shortcutIconLink.setAttribute('data-school-favicon', 'true');

    document.head.prepend(iconLink, shortcutIconLink);

    return () => {
      iconLink.remove();
      shortcutIconLink.remove();
      previousLinks.reverse().forEach((link) => document.head.prepend(link));
    };
  }, [formData.schoolId, schoolLogoUrl]);

  useEffect(() => {
    const resolveSchool = async () => {
      if (preselectedSchoolId) {
        setFormData((prev) => ({ ...prev, schoolId: preselectedSchoolId }));
        return;
      }

      if (schoolSlug) {
        try {
          const response = await enrollmentAPI.getSchoolByUrlSlug(schoolSlug);
          const resolvedSchoolId = response.data?.data?.id;
          if (resolvedSchoolId) {
            setFormData((prev) => ({ ...prev, schoolId: resolvedSchoolId }));
          } else {
            toast.error(response.data?.message || t.failedToResolve);
          }
        } catch {
          toast.error(t.failedToResolve);
        }
        return;
      }

      if (!enrollmentKey) {
        return;
      }

      try {
        const response = await enrollmentAPI.resolveSchoolByKey(enrollmentKey);
        const resolvedSchoolId = response.data?.school?.id;
        if (resolvedSchoolId) {
          setFormData((prev) => ({ ...prev, schoolId: resolvedSchoolId }));
        } else {
            toast.error(response.data?.message || t.failedToResolve);
          }
        } catch {
          toast.error(t.failedToResolve);
        }
      };

    resolveSchool();
  }, [enrollmentKey, preselectedSchoolId, schoolSlug]);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const response = await enrollmentAPI.getSchools();
        const loaded = response.data?.data || [];
        setSchools(loaded);
        if (!preselectedSchoolId && !enrollmentKey && !schoolSlug && loaded.length === 1) {
          setFormData((prev) => ({ ...prev, schoolId: loaded[0].id }));
        }
      } catch {
        toast.error(t.failedToLoadSchools);
      }
    };
    loadSchools();
  }, [enrollmentKey, preselectedSchoolId, schoolSlug]);

  useEffect(() => {
    if (!formData.schoolId) return;

    const loadSchoolData = async () => {
      try {
        const statusResponse = await enrollmentAPI.getStatus(formData.schoolId);
        const status = statusResponse.data?.data;
        setEnrollmentStatus(status);

        const gradesResponse = await enrollmentAPI.getAvailableGrades(formData.schoolId);
        setAvailableGrades(gradesResponse.data?.data || []);

        setSelectedSchoolData({
          id: formData.schoolId,
          name: schools.find(s => s.id === formData.schoolId)?.name || '',
          academicYearId: status?.academicYearId || '',
          academicYearName: status?.academicYearName || '',
        });
      } catch {
        console.error('Failed to load school data');
      }
    };
    loadSchoolData();
  }, [formData.schoolId, schools]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      if (field === 'requestedGrade') {
        const grade = Number(value);
        return {
          ...prev,
          requestedGrade: grade,
          requestedStream: [11, 12].includes(grade) ? prev.requestedStream : '',
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const canProceed = () => {
    if (enrollmentStatus && !enrollmentStatus.isOpen) return false;

    switch (currentStep) {
      case 'school':
        return Boolean(
          formData.schoolId &&
          formData.requestedGrade &&
          (![11, 12].includes(formData.requestedGrade) || formData.requestedStream)
        );
      case 'student':
        return formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender && /^\d{12}$/.test(formData.faydaNumber.replace(/\D/g, '')) && formData.phone;
      case 'guardian':
        return formData.parentFirstName && formData.parentLastName && formData.parentPhone && formData.parentRelation;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setDirection(1);
      setCurrentStep(STEPS[nextIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setDirection(-1);
      setCurrentStep(STEPS[prevIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!selectedSchoolData?.academicYearId) {
        toast.error(t.academicYearNotFound);
        setIsSubmitting(false);
        return;
      }

      const response = await enrollmentAPI.submitRequest({
        schoolId: formData.schoolId,
        academicYearId: selectedSchoolData.academicYearId,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender.toUpperCase(),
        faydaNumber: formData.faydaNumber.replace(/\D/g, ''),
        nationality: formData.nationality || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        previousSchool: formData.previousSchool || undefined,
        previousGrade: formData.previousGrade,
        transferCertificate: formData.transferCertificate,
        parentFirstName: formData.parentFirstName,
        parentLastName: formData.parentLastName,
        parentPhone: formData.parentPhone,
        parentEmail: formData.parentEmail || undefined,
        parentRelation: formData.parentRelation,
        requestedGrade: formData.requestedGrade,
        requestedStream: formData.requestedStream || undefined,
      });

      setSubmitted(true);
      setReferenceNumber(response.data?.data?.referenceNumber || '');
      toast.success(t.submittedSuccess);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t.failedToSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4"
        style={pageStyle}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80 overflow-hidden dark:bg-slate-800">
            <div
              className="h-2 w-full"
              style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}88)` }}
            />
            <CardContent className="pt-10 pb-8 px-8 text-center">
              <div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: `rgba(var(--enroll-brand-rgb), 0.1)` }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: 'var(--enroll-brand)' }}
                >
                  <Check className="w-7 h-7" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.submittedTitle}</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                {t.submittedDesc}
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-5 mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{t.referenceNumber}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{referenceNumber}</p>
              </div>
              <Button
                onClick={() => router.push(schoolSignInHref)}
                className="w-full h-11 text-white shadow-lg shadow-slate-200/80 dark:shadow-slate-900/80"
                style={{ backgroundColor: 'var(--enroll-brand)' }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t.goToSignIn}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 ${resolvedTheme === 'dark' ? 'dark' : ''} relative`}
      style={pageStyle}
    >
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Select value={language} onValueChange={(value) => setLanguage(value as AppLanguage)}>
          <SelectTrigger
            className={`h-10 w-[132px] rounded-full ${accentControlClassName}`}
            style={accentControlStyle}
          >
            <Languages className="mr-2 h-4 w-4" style={{ color: 'var(--enroll-brand)' }} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {languageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={`w-10 h-10 rounded-full ${accentControlClassName}`}
          style={accentControlStyle}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" style={{ color: 'var(--enroll-brand)' }} />
          ) : (
            <Moon className="h-5 w-5" style={{ color: 'var(--enroll-brand)' }} />
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(schoolSignInHref)}
          className={`h-10 rounded-full px-4 ${accentControlClassName}`}
          style={accentControlStyle}
        >
          <LogIn className="h-4 w-4 mr-1.5" style={{ color: 'var(--enroll-brand)' }} />
          <span style={{ color: 'var(--enroll-brand)' }}>Sign In</span>
        </Button>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            {schoolLogoUrl ? (
              <img src={schoolLogoUrl} alt={selectedSchool?.name || t.schoolAlt} className="h-32 w-32 object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--enroll-brand)' }}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t.title}</p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {selectedSchool?.name || t.titleFallback}
              </h1>
            </div>
          </motion.div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const active = index === stepIndex;
              const completed = index < stepIndex;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
                        completed
                          ? 'border-transparent text-white shadow-md'
                          : active
                            ? 'border-current shadow-md'
                            : 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600'
                      }`}
                      style={{
                        backgroundColor: completed ? 'var(--enroll-brand)' : active ? 'white' : undefined,
                        color: active ? 'var(--enroll-brand)' : undefined,
                        borderColor: active ? 'var(--enroll-brand)' : undefined,
                      }}
                    >
                      {completed ? <Check className="w-4 h-4 text-white" /> : index + 1}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium hidden sm:block ${
                        active ? 'text-slate-900 dark:text-slate-100' : completed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                      style={{ color: active ? 'var(--enroll-brand)' : undefined }}
                    >
                      {t[STEP_LABELS[step]]}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-3 mt-[-1.5rem] hidden sm:block">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          height: 2,
                          backgroundColor: completed ? 'var(--enroll-brand)' : 'var(--enroll-brand)',
                          opacity: completed ? 1 : 0.15,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Card className="border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-200/40 dark:shadow-slate-900/60 overflow-hidden dark:bg-slate-800">
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}44)` }}
              />
              <CardContent className="p-6 sm:p-8">
                {/* Step Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: 'var(--enroll-brand)' }}
                  >
                    {STEP_ICONS[currentStep]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {t.stepOf.replace('{step}', String(stepIndex + 1)).replace('{total}', String(STEPS.length))}
                    </p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{STEP_LABELS[currentStep]}</h2>
                  </div>
                </div>

                {/* ===== School Selection ===== */}
                {currentStep === 'school' && (
                  <div className="space-y-6">
                    {!formData.schoolId ? (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-6 text-center">
                        <Building2 className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">{t.noSchoolTitle}</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {t.noSchoolDesc}
                        </p>
                      </div>
                    ) : (
                      <>
                        {enrollmentStatus && !enrollmentStatus.isOpen && (
                          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-5">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                              <div>
                                <h3 className="font-semibold text-red-900 dark:text-red-200 text-sm">{t.enrollmentClosed}</h3>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{enrollmentStatus.message}</p>
                                <Button
                                  variant="outline"
                                  onClick={() => router.push(schoolSignInHref)}
                                  className="mt-3 h-9 text-xs border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                                >
                                  {t.alreadyEnrolled}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {enrollmentStatus?.isOpen && (
                          <>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: `rgba(var(--enroll-brand-rgb), 0.1)` }}
                                >
                                  <Calendar className="w-4 h-4" style={{ color: 'var(--enroll-brand)' }} />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.academicYear}</p>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {selectedSchoolData?.academicYearName || t.loading}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.gradeApplying}</Label>
                              <Select
                                value={String(formData.requestedGrade)}
                                onValueChange={(v) => updateFormData('requestedGrade', parseInt(v))}
                              >
                                <SelectTrigger className={brandedFieldTriggerClassName}>
                                  <SelectValue placeholder={t.selectGrade} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableGrades.map((grade) => (
                                    <SelectItem key={grade.grade} value={String(grade.grade)}>
                                      {t.gradeLabel.replace('{grade}', String(grade.grade))}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{t.sectionsAvailability}</p>
                            </div>
                            {[11, 12].includes(formData.requestedGrade) && (
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.stream}</Label>
                                <Select
                                  value={formData.requestedStream}
                                  onValueChange={(v) => updateFormData('requestedStream', v)}
                                >
                                  <SelectTrigger className={brandedFieldTriggerClassName}>
                                    <SelectValue placeholder={t.selectStream} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SOCIAL">{t.socialScience}</SelectItem>
                                    <SelectItem value="NATURAL">{t.naturalScience}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ===== Student Information ===== */}
                {currentStep === 'student' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field>
                        <Label>{t.firstName}</Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => updateFormData('firstName', e.target.value)}
                          placeholder={t.firstNamePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                      <Field>
                        <Label>{t.middleName}</Label>
                        <Input
                          value={formData.middleName}
                          onChange={(e) => updateFormData('middleName', e.target.value)}
                          placeholder={t.middleNamePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                      <Field>
                        <Label>{t.lastName}</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => updateFormData('lastName', e.target.value)}
                          placeholder={t.lastNamePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>{t.dateOfBirth}</Label>
                        <CalendarDatePicker
                          value={parseDateValue(formData.dateOfBirth)}
                          onChange={(date) => updateFormData('dateOfBirth', toDateInputValue(date))}
                          placeholder={t.dateOfBirth}
                          className={brandedDatePickerClassName}
                          brandColor={brandColor}
                          maxYear={new Date().getFullYear()}
                        />
                      </Field>
                      <Field>
                        <Label>{t.gender}</Label>
                        <Select value={formData.gender} onValueChange={(v) => updateFormData('gender', v)}>
                          <SelectTrigger className={brandedFieldTriggerClassName}>
                            <SelectValue placeholder={t.selectGender} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">{t.male}</SelectItem>
                            <SelectItem value="FEMALE">{t.female}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <Label>{t.faydaNumber}</Label>
                      <Input
                        value={formData.faydaNumber}
                        onChange={(e) => updateFormData('faydaNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder={t.faydaPlaceholder}
                        inputMode="numeric"
                        pattern="[0-9]{12}"
                        className={brandedFieldTriggerClassName}
                      />
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.faydaHint}</p>
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>{t.nationality}</Label>
                        <Input
                          value={formData.nationality}
                          onChange={(e) => updateFormData('nationality', e.target.value)}
                          placeholder={t.nationalityPlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                      <Field>
                        <Label>{t.phoneNumber}</Label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateFormData('phone', e.target.value)}
                          placeholder={t.phonePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                    </div>

                    <Field>
                      <Label>{t.email} <span className="font-normal text-slate-400">({t.optional || 'Optional'})</span></Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        placeholder={t.emailPlaceholder}
                        className={brandedFieldTriggerClassName}
                      />
                    </Field>

                    <Field>
                      <Label>{t.address}</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => updateFormData('address', e.target.value)}
                        placeholder={t.addressPlaceholder}
                        className={brandedFieldTriggerClassName}
                      />
                    </Field>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        {t.previousSchool}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field>
                          <Label>{t.previousSchoolName}</Label>
                          <Input
                            value={formData.previousSchool}
                            onChange={(e) => updateFormData('previousSchool', e.target.value)}
                            placeholder={t.previousSchoolPlaceholder}
                            className={brandedFieldTriggerClassName}
                          />
                        </Field>
                        <Field>
                          <Label>{t.gradeCompleted}</Label>
                          <Select
                            value={formData.previousGrade ? String(formData.previousGrade) : ''}
                            onValueChange={(v) => updateFormData('previousGrade', parseInt(v))}
                          >
                            <SelectTrigger className={brandedFieldTriggerClassName}>
                              <SelectValue placeholder={t.selectGradeShort} />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                                <SelectItem key={g} value={String(g)}>{t.gradeLabel.replace('{grade}', String(g))}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== Guardian Information ===== */}
                {currentStep === 'guardian' && (
                  <div className="space-y-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                      {t.guardianInfo}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>{t.parentFirstName}</Label>
                        <Input
                          value={formData.parentFirstName}
                          onChange={(e) => updateFormData('parentFirstName', e.target.value)}
                          placeholder={t.parentFirstNamePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                      <Field>
                        <Label>{t.parentLastName}</Label>
                        <Input
                          value={formData.parentLastName}
                          onChange={(e) => updateFormData('parentLastName', e.target.value)}
                          placeholder={t.parentLastNamePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>{t.parentPhone}</Label>
                        <Input
                          type="tel"
                          value={formData.parentPhone}
                          onChange={(e) => updateFormData('parentPhone', e.target.value)}
                          placeholder={t.parentPhonePlaceholder}
                          className={brandedFieldTriggerClassName}
                        />
                      </Field>
                      <Field>
                        <Label>{t.relationship}</Label>
                        <Select value={formData.parentRelation} onValueChange={(v) => updateFormData('parentRelation', v)}>
                          <SelectTrigger className={brandedFieldTriggerClassName}>
                            <SelectValue placeholder={t.selectRelationship} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FATHER">{t.father}</SelectItem>
                            <SelectItem value="MOTHER">{t.mother}</SelectItem>
                            <SelectItem value="GUARDIAN">{t.guardian}</SelectItem>
                            <SelectItem value="OTHER">{t.other}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <Label>{t.parentEmail} <span className="font-normal text-slate-400">({t.optional || 'Optional'})</span></Label>
                      <Input
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => updateFormData('parentEmail', e.target.value)}
                        placeholder={t.parentEmailPlaceholder}
                        className={brandedFieldTriggerClassName}
                      />
                    </Field>
                  </div>
                )}

                {/* ===== Review ===== */}
                {currentStep === 'review' && (
                  <div className="space-y-6">
                    <div
                      className="rounded-xl border p-4 flex items-start gap-3"
                      style={{
                        borderColor: `rgba(var(--enroll-brand-rgb), 0.2)`,
                        backgroundColor: `rgba(var(--enroll-brand-rgb), 0.05)`,
                      }}
                    >
                      <Sparkles className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--enroll-brand)' }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.reviewTitle}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t.reviewDesc}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <ReviewSection
                        icon={<Building2 className="w-4 h-4" />}
                        title={t.schoolInfo}
                      >
                        <ReviewRow label={t.school} value={selectedSchoolData?.name} />
                        <ReviewRow label={t.academicYear} value={selectedSchoolData?.academicYearName} />
                        <ReviewRow label={t.grade} value={`${t.gradeLabel.replace('{grade}', String(formData.requestedGrade))}`} />
                        {[11, 12].includes(formData.requestedGrade) && (
                          <ReviewRow label={t.streamLabel} value={formData.requestedStream === 'NATURAL' ? t.naturalScience : formData.requestedStream === 'SOCIAL' ? t.socialScience : '-'} />
                        )}
                      </ReviewSection>

                      <ReviewSection
                        icon={<User className="w-4 h-4" />}
                        title={t.studentInfo}
                      >
                        <ReviewRow
                          label={t.fullName}
                          value={`${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`}
                        />
                        <ReviewRow label={t.dateOfBirth} value={formData.dateOfBirth} />
                        <ReviewRow label={t.gender} value={formData.gender === 'MALE' ? t.male : formData.gender === 'FEMALE' ? t.female : formData.gender} />
                        <ReviewRow label={t.faydaLabel} value={formData.faydaNumber.replace(/\D/g, '')} />
                        {formData.phone && <ReviewRow label={t.phone} value={formData.phone} />}
                        {formData.email && <ReviewRow label={t.email} value={formData.email} />}
                        {formData.nationality && <ReviewRow label={t.nationalityLabel} value={formData.nationality} />}
                      </ReviewSection>

                      <ReviewSection
                        icon={<Heart className="w-4 h-4" />}
                        title={t.guardianInfoTitle}
                      >
                        <ReviewRow label={t.name} value={`${formData.parentFirstName} ${formData.parentLastName}`} />
                        <ReviewRow label={t.phone} value={formData.parentPhone} />
                        <ReviewRow label={t.relationship} value={formData.parentRelation === 'FATHER' ? t.father : formData.parentRelation === 'MOTHER' ? t.mother : formData.parentRelation === 'GUARDIAN' ? t.guardian : formData.parentRelation === 'OTHER' ? t.other : formData.parentRelation} />
                        {formData.parentEmail && <ReviewRow label={t.email} value={formData.parentEmail} />}
                      </ReviewSection>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={stepIndex === 0}
                    className="rounded-lg h-11 px-5 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.back}
                  </Button>

                  {currentStep === 'review' ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="rounded-lg h-11 px-6 text-white shadow-lg"
                      style={{
                        backgroundColor: 'var(--enroll-brand)',
                        boxShadow: `0 4px 16px rgba(var(--enroll-brand-rgb), 0.3)`,
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.submitting}
                        </>
                      ) : (
                        <>
                          {t.submit}
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="rounded-lg h-11 px-6 text-white shadow-lg"
                      style={{
                        backgroundColor: 'var(--enroll-brand)',
                        boxShadow: `0 4px 16px rgba(var(--enroll-brand-rgb), 0.3)`,
                      }}
                    >
                      {t.next}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
          {t.footer}
        </p>
      </div>
    </div>
  );
}

function Field({ children }: { children: ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function ReviewSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {title}
      </h4>
      <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 divide-y divide-slate-100 dark:divide-slate-700">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right">{value || '—'}</span>
    </div>
  );
}

function useEnrollmentContext(): { schoolId: string | null; enrollmentKey: string | null; schoolSlug: string | null } {
  const [context, setContext] = useState<{ schoolId: string | null; enrollmentKey: string | null; schoolSlug: string | null }>({
    schoolId: null,
    enrollmentKey: null,
    schoolSlug: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContext({
      schoolId: params.get('schoolId') || null,
      enrollmentKey: params.get('key') || null,
      schoolSlug: params.get('school') || params.get('slug') || null,
    });
  }, []);
  return context;
}

function normalizeBrandColor(color?: string | null) {
  if (!color) return '#e35336';
  const normalized = color.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#e35336';
}

function hexToRgb(hex: string) {
  const value = normalizeBrandColor(hex).replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}
