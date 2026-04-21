"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { lessonsAPI, CreateLessonDto } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Upload,
} from "lucide-react";

// Shadcn/ui Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types for form data
interface FormDataType {
  title: string;
  objective: string;
  lessonContent: string;
  homework: string;
  grade: number | null;
  section: string;
  stream: string;
  academicYearId: string;
  semesterId: string;
  subjectId: string;
  lessonDate: string;
  periodNumber: number | null;
  status: "DRAFT" | "PUBLISHED";
}

interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  classId: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface Period {
  value: number;
  label: string;
}

interface FormDataResponse {
  academicYears: AcademicYear[];
  activeAcademicYearId: string | null;
  terms: Term[];
  grades: number[];
  sectionsByGrade: Record<number, Section[]>;
  allSubjects: Subject[];
  teacherSubjects: Subject[];
  periods: Period[];
}

const CreateLessonPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const [loading, setLoading] = useState(false);
  const [formDataLoading, setFormDataLoading] = useState(true);
  const [formDataResponse, setFormDataResponse] = useState<FormDataResponse | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Lesson Plans", href: "/teacher/lessons", isCurrent: false },
      { label: "Create Lesson", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);
  
  const [formData, setFormData] = useState<FormDataType>({
    title: "",
    objective: "",
    lessonContent: "",
    homework: "",
    grade: null,
    section: "",
    stream: "",
    academicYearId: "",
    semesterId: "",
    subjectId: "",
    lessonDate: new Date().toISOString().split("T")[0],
    periodNumber: null,
    status: "DRAFT",
  });

  // Fetch form data on mount
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const response = await lessonsAPI.getFormData();
        setFormDataResponse(response.data);
        
        // Set default values from fetched data
        const data = response.data;
        
        // Set active academic year as default (ensure it's a string)
        const academicYearId = data.activeAcademicYearId || (data.academicYears && data.academicYears.length > 0 ? data.academicYears[0].id : "") || "";
        setFormData(prev => ({ ...prev, academicYearId }));
        
        // Set first grade as default if available
        if (data.grades && data.grades.length > 0) {
          setFormData(prev => ({ ...prev, grade: data.grades[0] }));
        }
        
        // Set first period as default
        if (data.periods && data.periods.length > 0) {
          setFormData(prev => ({ ...prev, periodNumber: data.periods[0].value }));
        }
      } catch (error) {
        console.error("Failed to fetch form data:", error);
        toast.error("Failed to load form data");
      } finally {
        setFormDataLoading(false);
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchFormData();
    }
  }, [isAuthenticated, authLoading]);

  // Update section when grade changes
  useEffect(() => {
    if (formData.grade && formDataResponse?.sectionsByGrade) {
      const sectionsForGrade = formDataResponse.sectionsByGrade[formData.grade];
      if (sectionsForGrade && sectionsForGrade.length > 0) {
        // Only reset section if current section is not valid for the new grade
        const isCurrentSectionValid = sectionsForGrade.some(s => s.name === formData.section);
        if (!isCurrentSectionValid) {
          setFormData(prev => ({ ...prev, section: sectionsForGrade[0].name }));
        }
      }
    }
  }, [formData.grade, formDataResponse]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (publish: boolean = false) => {
    if (!formData.title || !formData.subjectId || !formData.grade || !formData.section || !formData.academicYearId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      
      const lessonData: CreateLessonDto = {
        title: formData.title,
        objective: formData.objective || undefined,
        lessonContent: formData.lessonContent || undefined,
        homework: formData.homework || undefined,
        grade: formData.grade as number,
        section: formData.section,
        stream: formData.stream || undefined,
        academicYearId: formData.academicYearId,
        semesterId: formData.semesterId || undefined,
        subjectId: formData.subjectId,
        lessonDate: new Date(formData.lessonDate).toISOString(),
        periodNumber: formData.periodNumber || 1,
        status: publish ? "PUBLISHED" : "DRAFT",
      };
      
      await lessonsAPI.create(lessonData);
      toast.success(publish ? "Lesson published successfully!" : "Lesson saved as draft!");
      router.push("/teacher/lessons");
    } catch (error: any) {
      console.error("Failed to create lesson:", error);
      toast.error(error.response?.data?.message || "Failed to create lesson");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormDataType, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get sections for current grade
  const currentGradeSections = formData.grade && formDataResponse?.sectionsByGrade
    ? formDataResponse.sectionsByGrade[formData.grade] || []
    : [];

  // Determine which subjects to show (teacher's subjects if teacher, all subjects if admin)
  const userRole = user?.role;
  const displaySubjects = userRole === 'TEACHER' && formDataResponse?.teacherSubjects?.length
    ? formDataResponse.teacherSubjects
    : formDataResponse?.allSubjects || [];

  if (authLoading || formDataLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">
            Create Lesson Plan
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create a new lesson plan for your class
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
              <CardDescription>Enter the basic information for your lesson</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter lesson title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                />
              </div>

              {/* Objective */}
              <div className="space-y-2">
                <Label htmlFor="objective">Learning Objective</Label>
                <Textarea
                  id="objective"
                  placeholder="What will students learn from this lesson?"
                  value={formData.objective}
                  onChange={(e) => handleChange("objective", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Lesson Content */}
              <div className="space-y-2">
                <Label htmlFor="lessonContent">Lesson Content</Label>
                <Textarea
                  id="lessonContent"
                  placeholder="Detailed lesson content and activities..."
                  value={formData.lessonContent}
                  onChange={(e) => handleChange("lessonContent", e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-gray-500">
                  You can use HTML formatting for rich content
                </p>
              </div>

              {/* Homework */}
              <div className="space-y-2">
                <Label htmlFor="homework">Homework</Label>
                <Textarea
                  id="homework"
                  placeholder="Assignments for students..."
                  value={formData.homework}
                  onChange={(e) => handleChange("homework", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Attachment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>Add files and resources for this lesson</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop files here, or click to browse
                </p>
                <Button variant="outline" size="sm">
                  Upload Files
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, DOC, PPT, Images up to 10MB
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Class Info */}
          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Academic Year */}
              <div className="space-y-2">
                <Label>Academic Year *</Label>
                <Select
                  value={formData.academicYearId}
                  onValueChange={(value) => handleChange("academicYearId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.academicYears || []).map((year: AcademicYear) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.isActive && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select
                  value={formData.grade?.toString() || ""}
                  onValueChange={(value) => handleChange("grade", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.grades || []).map((g: number) => (
                      <SelectItem key={g} value={g.toString()}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section */}
              <div className="space-y-2">
                <Label>Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => handleChange("section", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {(currentGradeSections || []).map((s: Section) => (
                      <SelectItem key={s.id} value={s.name}>
                        Section {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stream (for Grade 11-12) */}
              {formData.grade && formData.grade >= 11 && (
                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Select
                    value={formData.stream}
                    onValueChange={(value) => handleChange("stream", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Natural">Natural</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => handleChange("subjectId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {(displaySubjects || []).map((subject: Subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} {subject.code && `(${subject.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Semester/Term */}
              <div className="space-y-2">
                <Label>Semester/Term</Label>
                <Select
                  value={formData.semesterId}
                  onValueChange={(value) => handleChange("semesterId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.terms || []).map((term: Term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Lesson Date</Label>
                <Input
                  type="date"
                  value={formData.lessonDate}
                  onChange={(e) => handleChange("lessonDate", e.target.value)}
                />
              </div>

              {/* Period */}
              <div className="space-y-2">
                <Label>Period Number</Label>
                <Select
                  value={formData.periodNumber?.toString() || ""}
                  onValueChange={(value) => handleChange("periodNumber", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formDataResponse?.periods || []).map((p: Period) => (
                      <SelectItem key={p.value} value={p.value.toString()}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                className="w-full bg-[#e35336] hover:bg-[#d4482f]"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                Publish Lesson
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateLessonPage;

