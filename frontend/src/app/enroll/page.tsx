'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enrollmentAPI, schoolsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useThemeStore } from '@/lib/themeStore';
import { 
  GraduationCap, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Calendar, 
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Home,
  BookOpen,
  Shield,
  Heart
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  code: string;
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

export default function EnrollmentPage() {
  const router = useRouter();
  const { resolvedTheme } = useThemeStore();
  const [currentStep, setCurrentStep] = useState<FormStep>('school');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolData, setSelectedSchoolData] = useState<{id: string; name: string; academicYearId: string; academicYearName: string} | null>(null);
  const [availableGrades, setAvailableGrades] = useState<GradeCapacity[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<{isOpen: boolean; message: string} | null>(null);

  const [formData, setFormData] = useState({
    schoolId: '',
    // Student info
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
    // Parent info
    parentFirstName: '',
    parentLastName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelation: '',
    // Enrollment preferences
    requestedGrade: 1,
  });

  const steps: { key: FormStep; label: string; icon: React.ReactNode }[] = [
    { key: 'school', label: 'School', icon: <Building2 className="w-5 h-5" /> },
    { key: 'student', label: 'Student', icon: <User className="w-5 h-5" /> },
    { key: 'guardian', label: 'Guardian', icon: <Heart className="w-5 h-5" /> },
    { key: 'review', label: 'Review', icon: <CheckCircle className="w-5 h-5" /> },
  ];

  const stepIndex = steps.findIndex(s => s.key === currentStep);

  // Load schools
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const response = await schoolsAPI.getAll();
        setSchools(response.data || []);
      } catch (error) {
        console.error('Failed to load schools:', error);
        toast.error('Failed to load schools');
      }
    };
    loadSchools();
  }, []);

  // Load school data with active academic year and available grades
  useEffect(() => {
    if (!formData.schoolId) return;

    const loadSchoolData = async () => {
      try {
        // Get enrollment status (includes academic year info)
        const statusResponse = await enrollmentAPI.getStatus(formData.schoolId);
        const status = statusResponse.data?.data;
        setEnrollmentStatus(status);

        // Load available grades
        const gradesResponse = await enrollmentAPI.getAvailableGrades(formData.schoolId);
        setAvailableGrades(gradesResponse.data?.data || []);

        // Set academic year from enrollment status
        setSelectedSchoolData({
          id: formData.schoolId,
          name: schools.find(s => s.id === formData.schoolId)?.name || '',
          academicYearId: status?.academicYearId || '',
          academicYearName: status?.academicYearName || '',
        });
      } catch (error) {
        console.error('Failed to load school data:', error);
      }
    };
    loadSchoolData();
  }, [formData.schoolId, schools]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    // Don't allow proceeding if enrollment is closed
    if (enrollmentStatus && !enrollmentStatus.isOpen) {
      return false;
    }

    switch (currentStep) {
      case 'school':
        return formData.schoolId && formData.requestedGrade;
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
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
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

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Enrollment Submitted!</h1>
            <p className="text-gray-600 mb-6">
              Your enrollment request has been submitted successfully.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="text-2xl font-bold text-gray-900">{referenceNumber}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Please save this reference number. You will be notified once your enrollment is reviewed.
            </p>
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Enrollment</h1>
              <p className="text-gray-500">Complete the form below to apply for admission</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    index <= stepIndex 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    index <= stepIndex ? 'text-blue-600' : 'text-gray-500'
                  }`}>{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    index < stepIndex ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={((stepIndex + 1) / steps.length) * 100} className="h-2" />
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {steps[stepIndex].icon}
              {steps[stepIndex].label} Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* School Selection */}
            {currentStep === 'school' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select School *</Label>
                  <Select value={formData.schoolId} onValueChange={(v) => {
                    updateFormData('schoolId', v);
                    setEnrollmentStatus(null);
                    setAvailableGrades([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map(school => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.schoolId && enrollmentStatus && !enrollmentStatus.isOpen && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-900">Enrollment Closed</h3>
                        <p className="text-sm text-red-700">{enrollmentStatus.message}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/sign-in')} className="w-full">
                      Already enrolled? Sign in here
                    </Button>
                  </div>
                )}

                {formData.schoolId && enrollmentStatus?.isOpen && (
                  <>
                    {/* Active Academic Year - Read Only */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Academic Year</p>
                          <p className="font-semibold text-blue-900">
                            {selectedSchoolData?.academicYearName || 'Loading...'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Grade Applying For *</Label>
                      <Select value={String(formData.requestedGrade)} onValueChange={(v) => updateFormData('requestedGrade', parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGrades.map(grade => (
                            <SelectItem key={grade.grade} value={String(grade.grade)}>
                              Grade {grade.grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Section will be assigned automatically based on availability
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Student Information */}
            {currentStep === 'student' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input 
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input 
                      value={formData.middleName}
                      onChange={(e) => updateFormData('middleName', e.target.value)}
                      placeholder="Middle name (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input 
                      value={formData.lastName}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input 
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateFormData('gender', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input 
                      value={formData.nationality}
                      onChange={(e) => updateFormData('nationality', e.target.value)}
                      placeholder="Your nationality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="+251..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="student@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input 
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    placeholder="Full address"
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Previous School (if any)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>School Name</Label>
                      <Input 
                        value={formData.previousSchool}
                        onChange={(e) => updateFormData('previousSchool', e.target.value)}
                        placeholder="Previous school name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grade Completed</Label>
                      <Select 
                        value={formData.previousGrade ? String(formData.previousGrade) : ''} 
                        onValueChange={(v) => updateFormData('previousGrade', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Guardian Information */}
            {currentStep === 'guardian' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">
                  Please provide information about the parent or guardian who will be contacted regarding enrollment.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Parent First Name *</Label>
                    <Input 
                      value={formData.parentFirstName}
                      onChange={(e) => updateFormData('parentFirstName', e.target.value)}
                      placeholder="Parent's first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Last Name *</Label>
                    <Input 
                      value={formData.parentLastName}
                      onChange={(e) => updateFormData('parentLastName', e.target.value)}
                      placeholder="Parent's last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input 
                      type="tel"
                      value={formData.parentPhone}
                      onChange={(e) => updateFormData('parentPhone', e.target.value)}
                      placeholder="+251..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship *</Label>
                    <Select value={formData.parentRelation} onValueChange={(v) => updateFormData('parentRelation', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARENT_RELATIONS.map(rel => (
                          <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => updateFormData('parentEmail', e.target.value)}
                    placeholder="parent@email.com"
                  />
                </div>
              </div>
            )}

            {/* Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Review Your Application</h3>
                  <p className="text-sm text-blue-700">
                    Please review all information before submitting. Once submitted, you will receive a reference number.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> School Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-500">School:</p>
                      <p className="font-medium">{selectedSchoolData?.name}</p>
                      <p className="text-gray-500">Academic Year:</p>
                      <p className="font-medium">{selectedSchoolData?.academicYearName}</p>
                      <p className="text-gray-500">Grade:</p>
                      <p className="font-medium">Grade {formData.requestedGrade}</p>
                      {formData.requestedSection && (
                        <>
                          <p className="text-gray-500">Preferred Section:</p>
                          <p className="font-medium">Section {formData.requestedSection}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> Student Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-500">Name:</p>
                      <p className="font-medium">
                        {formData.firstName} {formData.middleName} {formData.lastName}
                      </p>
                      <p className="text-gray-500">Date of Birth:</p>
                      <p className="font-medium">{formData.dateOfBirth}</p>
                      <p className="text-gray-500">Gender:</p>
                      <p className="font-medium">{formData.gender}</p>
                      {formData.phone && (
                        <>
                          <p className="text-gray-500">Phone:</p>
                          <p className="font-medium">{formData.phone}</p>
                        </>
                      )}
                      {formData.email && (
                        <>
                          <p className="text-gray-500">Email:</p>
                          <p className="font-medium">{formData.email}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4" /> Guardian Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-500">Name:</p>
                      <p className="font-medium">
                        {formData.parentFirstName} {formData.parentLastName}
                      </p>
                      <p className="text-gray-500">Phone:</p>
                      <p className="font-medium">{formData.parentPhone}</p>
                      <p className="text-gray-500">Relationship:</p>
                      <p className="font-medium">{formData.parentRelation}</p>
                      {formData.parentEmail && (
                        <>
                          <p className="text-gray-500">Email:</p>
                          <p className="font-medium">{formData.parentEmail}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={stepIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {currentStep === 'review' ? (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
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
                <Button onClick={nextStep} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Need help? Contact the school administration for assistance.
        </div>
      </div>
    </div>
  );
}
