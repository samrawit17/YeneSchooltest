'use client';

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { enrollmentAPI } from '@/lib/api/enrollment';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useThemeStore } from '@/lib/themeStore';
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
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  accentColor?: string | null;
}

interface GradeCapacity {
  grade: number;
  available: number;
}

type FormStep = 'school' | 'student' | 'guardian' | 'review';

const PARENT_RELATIONS = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'OTHER', label: 'Other' },
];

const STEP_ICONS: Record<FormStep, ReactNode> = {
  school: <School className="w-5 h-5" />,
  student: <UserCircle className="w-5 h-5" />,
  guardian: <Heart className="w-5 h-5" />,
  review: <CheckCircle className="w-5 h-5" />,
};

const STEP_LABELS: Record<FormStep, string> = {
  school: 'School & Grade',
  student: 'Student Details',
  guardian: 'Parent / Guardian',
  review: 'Review & Submit',
};

const STEPS: FormStep[] = ['school', 'student', 'guardian', 'review'];

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
  const { resolvedTheme } = useThemeStore();
  const [currentStep, setCurrentStep] = useState<FormStep>('school');
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolData, setSelectedSchoolData] = useState<{ id: string; name: string; academicYearId: string; academicYearName: string } | null>(null);
  const [availableGrades, setAvailableGrades] = useState<GradeCapacity[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<{ isOpen: boolean; message: string } | null>(null);
  const { schoolId: preselectedSchoolId, enrollmentKey } = useEnrollmentContext();

  const [formData, setFormData] = useState({
    schoolId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
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
  });

  const stepIndex = STEPS.indexOf(currentStep);
  const selectedSchool = schools.find((school) => school.id === formData.schoolId) || null;
  const brandColor = normalizeBrandColor(selectedSchool?.accentColor);
  const brandColorRgb = hexToRgb(brandColor);
  const schoolLogoUrl = resolveMediaUrl(selectedSchool?.logoUrl);
  const pageStyle = {
    '--enroll-brand': brandColor,
    '--enroll-brand-rgb': `${brandColorRgb.r}, ${brandColorRgb.g}, ${brandColorRgb.b}`,
  } as CSSProperties;

  useEffect(() => {
    const resolveSchool = async () => {
      if (preselectedSchoolId) {
        setFormData((prev) => ({ ...prev, schoolId: preselectedSchoolId }));
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
          toast.error(response.data?.message || 'Failed to resolve school');
        }
      } catch {
        toast.error('Failed to resolve school');
      }
    };

    resolveSchool();
  }, [enrollmentKey, preselectedSchoolId]);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const response = await enrollmentAPI.getSchools();
        const loaded = response.data?.data || [];
        setSchools(loaded);
        if (!preselectedSchoolId && !enrollmentKey && loaded.length === 1) {
          setFormData((prev) => ({ ...prev, schoolId: loaded[0].id }));
        }
      } catch {
        toast.error('Failed to load schools');
      }
    };
    loadSchools();
  }, [enrollmentKey, preselectedSchoolId]);

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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (enrollmentStatus && !enrollmentStatus.isOpen) return false;

    switch (currentStep) {
      case 'school':
        return Boolean(formData.schoolId && formData.requestedGrade);
      case 'student':
        return formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender && formData.phone;
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
        toast.error('Academic year not found. Please select a school.');
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
      });

      setSubmitted(true);
      setReferenceNumber(response.data?.data?.referenceNumber || '');
      toast.success('Enrollment submitted successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit enrollment');
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Enrollment Submitted!</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                Your application has been received. Please save your reference number for future correspondence.
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-5 mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Reference Number</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{referenceNumber}</p>
              </div>
              <Button
                onClick={() => router.push('/sign-in')}
                className="w-full h-11 text-white shadow-lg shadow-slate-200/80 dark:shadow-slate-900/80"
                style={{ backgroundColor: 'var(--enroll-brand)' }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 ${resolvedTheme === 'dark' ? 'dark' : ''}`}
      style={pageStyle}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md"
              style={{ backgroundColor: 'var(--enroll-brand)' }}
            >
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Student Enrollment</p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {selectedSchool?.name || 'Admission Request'}
              </h1>
            </div>
          </motion.div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Complete the form below to submit an enrollment request. Fields marked with * are required.
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
                      {STEP_LABELS[step]}
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
                      Step {stepIndex + 1} of {STEPS.length}
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
                        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">No School Selected</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Open this page from the selected school&apos;s home page, or make sure exactly one public school is available so it can be selected automatically.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `rgba(var(--enroll-brand-rgb), 0.12)` }}
                            >
                              <Building2 className="w-5 h-5" style={{ color: 'var(--enroll-brand)' }} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">School</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {selectedSchool?.name || 'Loading...'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {enrollmentStatus && !enrollmentStatus.isOpen && (
                          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-5">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                              <div>
                                <h3 className="font-semibold text-red-900 dark:text-red-200 text-sm">Enrollment Closed</h3>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{enrollmentStatus.message}</p>
                                <Button
                                  variant="outline"
                                  onClick={() => router.push('/sign-in')}
                                  className="mt-3 h-9 text-xs border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                                >
                                  Already enrolled? Sign in
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
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Academic Year</p>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {selectedSchoolData?.academicYearName || 'Loading...'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grade Applying For *</Label>
                              <Select
                                value={String(formData.requestedGrade)}
                                onValueChange={(v) => updateFormData('requestedGrade', parseInt(v))}
                              >
                                <SelectTrigger className="h-11 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableGrades.map((grade) => (
                                    <SelectItem key={grade.grade} value={String(grade.grade)}>
                                      Grade {grade.grade}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-400 dark:text-slate-500">Sections are assigned based on availability</p>
                            </div>
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
                        <Label>First Name *</Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => updateFormData('firstName', e.target.value)}
                          placeholder="First name"
                          className="h-11"
                        />
                      </Field>
                      <Field>
                        <Label>Middle Name</Label>
                        <Input
                          value={formData.middleName}
                          onChange={(e) => updateFormData('middleName', e.target.value)}
                          placeholder="Optional"
                          className="h-11"
                        />
                      </Field>
                      <Field>
                        <Label>Last Name *</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => updateFormData('lastName', e.target.value)}
                          placeholder="Last name"
                          className="h-11"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>Date of Birth *</Label>
                        <Input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                          className="h-11"
                        />
                      </Field>
                      <Field>
                        <Label>Gender *</Label>
                        <Select value={formData.gender} onValueChange={(v) => updateFormData('gender', v)}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>Nationality</Label>
                        <Input
                          value={formData.nationality}
                          onChange={(e) => updateFormData('nationality', e.target.value)}
                          placeholder="Your nationality"
                          className="h-11"
                        />
                      </Field>
                      <Field>
                        <Label>Phone Number *</Label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateFormData('phone', e.target.value)}
                          placeholder="+251..."
                          className="h-11"
                        />
                      </Field>
                    </div>

                    <Field>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        placeholder="student@email.com"
                        className="h-11"
                      />
                    </Field>

                    <Field>
                      <Label>Address</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => updateFormData('address', e.target.value)}
                        placeholder="Full address"
                        className="h-11"
                      />
                    </Field>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        Previous School (if applicable)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field>
                          <Label>School Name</Label>
                          <Input
                            value={formData.previousSchool}
                            onChange={(e) => updateFormData('previousSchool', e.target.value)}
                            placeholder="Previous school name"
                            className="h-11"
                          />
                        </Field>
                        <Field>
                          <Label>Grade Completed</Label>
                          <Select
                            value={formData.previousGrade ? String(formData.previousGrade) : ''}
                            onValueChange={(v) => updateFormData('previousGrade', parseInt(v))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                                <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
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
                      Provide contact information for the parent or guardian responsible for this student.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>First Name *</Label>
                        <Input
                          value={formData.parentFirstName}
                          onChange={(e) => updateFormData('parentFirstName', e.target.value)}
                          placeholder="Parent's first name"
                          className="h-11"
                        />
                      </Field>
                      <Field>
                        <Label>Last Name *</Label>
                        <Input
                          value={formData.parentLastName}
                          onChange={(e) => updateFormData('parentLastName', e.target.value)}
                          placeholder="Parent's last name"
                          className="h-11"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label>Phone Number *</Label>
                        <Input
                          type="tel"
                          value={formData.parentPhone}
                          onChange={(e) => updateFormData('parentPhone', e.target.value)}
                          placeholder="+251..."
                          className="h-11"
                        />
                      </Field>
                      <Field>
                        <Label>Relationship *</Label>
                        <Select value={formData.parentRelation} onValueChange={(v) => updateFormData('parentRelation', v)}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {PARENT_RELATIONS.map(rel => (
                              <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => updateFormData('parentEmail', e.target.value)}
                        placeholder="parent@email.com"
                        className="h-11"
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
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review Your Application</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Please double-check all details. You will receive a reference number after submission.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <ReviewSection
                        icon={<Building2 className="w-4 h-4" />}
                        title="School Information"
                      >
                        <ReviewRow label="School" value={selectedSchoolData?.name} />
                        <ReviewRow label="Academic Year" value={selectedSchoolData?.academicYearName} />
                        <ReviewRow label="Grade" value={`Grade ${formData.requestedGrade}`} />
                      </ReviewSection>

                      <ReviewSection
                        icon={<User className="w-4 h-4" />}
                        title="Student Information"
                      >
                        <ReviewRow
                          label="Full Name"
                          value={`${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`}
                        />
                        <ReviewRow label="Date of Birth" value={formData.dateOfBirth} />
                        <ReviewRow label="Gender" value={formData.gender} />
                        {formData.phone && <ReviewRow label="Phone" value={formData.phone} />}
                        {formData.email && <ReviewRow label="Email" value={formData.email} />}
                        {formData.nationality && <ReviewRow label="Nationality" value={formData.nationality} />}
                      </ReviewSection>

                      <ReviewSection
                        icon={<Heart className="w-4 h-4" />}
                        title="Guardian Information"
                      >
                        <ReviewRow label="Name" value={`${formData.parentFirstName} ${formData.parentLastName}`} />
                        <ReviewRow label="Phone" value={formData.parentPhone} />
                        <ReviewRow label="Relationship" value={formData.parentRelation} />
                        {formData.parentEmail && <ReviewRow label="Email" value={formData.parentEmail} />}
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
                    Back
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
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Application
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
                      Next
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
          Need assistance? Contact the school administration for help.
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

function useEnrollmentContext(): { schoolId: string | null; enrollmentKey: string | null } {
  const [context, setContext] = useState<{ schoolId: string | null; enrollmentKey: string | null }>({
    schoolId: null,
    enrollmentKey: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContext({
      schoolId: params.get('schoolId') || null,
      enrollmentKey: params.get('key') || null,
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

function resolveMediaUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return path;
  try {
    return new URL(path, apiUrl).toString();
  } catch {
    return path;
  }
}
