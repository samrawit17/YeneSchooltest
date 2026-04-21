"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  Users, 
  Save, 
  Settings2, 
  Eye, 
  Shuffle, 
  Printer,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  UserCheck,
  RotateCcw,
  Trash2,
  Plus,
  Minus,
  FileText,
  Calendar
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AccessDenied from "@/components/AccessDenied";
import { FeatureGuard } from "@/components/FeatureGuard";

interface Exam {
  id: string;
  title: string;
  type: string;
  date: string;
  subject: { name: string };
  class: { name: string; grade: number | null };
}

interface ExamTypeInfo {
  type: string;
  label: string;
  exams: Exam[];
}

interface SeatingPlan {
  id: string;
  examType: string;
  mode: 'GRADE_RANGE';
  fromGrade: number;
  toGrade: number;
  examCapacity: number;
  shuffle: boolean;
  createdAt: string;
}

interface SectionWithStudents {
  sectionId: string;
  sectionName: string;
  className: string;
  grade: number | null;
  capacity: number;
  examCapacity: number;
  assignedStudents: number;
  students: {
    orderIndex: number;
    studentId: string;
    studentName: string;
    studentEmail: string | null;
    originalSection: string | null;
    originalGrade: number | null;
  }[];
}

interface SeatingOverview {
  plan: SeatingPlan;
  totalStudents: number;
  totalSections: number;
  totalCapacity: number;
  sections: SectionWithStudents[];
}

const EXAM_TYPES = [
  { value: 'MID_TERM', label: 'Mid Term Exams' },
  { value: 'FINAL', label: 'Final Exams' },
  { value: 'QUIZ', label: 'Quiz/Test' },
];

export default function ExamSeatingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [examTypes, setExamTypes] = useState<ExamTypeInfo[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>({});
  
  // Form state
  const [fromGrade, setFromGrade] = useState<number>(1);
  const [toGrade, setToGrade] = useState<number>(12);
  const [examCapacity, setExamCapacity] = useState<number>(30);
  const [shuffle, setShuffle] = useState<boolean>(true);
  const [generateNew, setGenerateNew] = useState<boolean>(false);
  
  // Seating plan state
  const [seatingPlan, setSeatingPlan] = useState<SeatingPlan | null>(null);
  const [seatingOverview, setSeatingOverview] = useState<SeatingOverview | null>(null);
  
  // UI state
  const [generating, setGenerating] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
    if (isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
      fetchExamTypes();
      fetchSchoolSettings();
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (selectedExamType) {
      fetchSeatingPlan(selectedExamType);
    }
  }, [selectedExamType]);

  const fetchSchoolSettings = async () => {
    try {
      const res = await api.get('/schools/settings/all');
      const settings: Record<string, any> = {};
      res.data?.forEach((s: any) => {
        settings[s.key] = s.value;
      });
      setSchoolSettings(settings);
      
      const gradeSystem = settings.grade_system || '1-12';
      const range = getGradeRangeFromSystem(gradeSystem);
      setFromGrade(range.min);
      setToGrade(range.max);
    } catch (e) {
      console.error(e);
    }
  };

  const getGradeRangeFromSystem = (system: string) => {
    const gradeSystems: Record<string, { min: number; max: number }> = {
      '1-8': { min: 1, max: 8 },
      '1-10': { min: 1, max: 10 },
      '1-12': { min: 1, max: 12 },
      'K-8': { min: 1, max: 8 },
      'K-12': { min: 1, max: 12 },
      'PRE-K-12': { min: 1, max: 12 },
      '9-12': { min: 9, max: 12 },
    };
    return gradeSystems[system] || { min: 1, max: 12 };
  };

  const fetchExamTypes = async () => {
    try {
      const res = await api.get('/exams');
      const allExams = res.data || [];
      
      // Group exams by type
      const groupedByType = allExams.reduce((acc: Record<string, Exam[]>, exam: Exam) => {
        const type = exam.type || 'OTHER';
        if (!acc[type]) acc[type] = [];
        acc[type].push(exam);
        return acc;
      }, {});
      
      // Only include types that have exams with future dates
      const types: ExamTypeInfo[] = EXAM_TYPES
        .filter(et => groupedByType[et.value]?.some((e: Exam) => new Date(e.date) >= new Date()))
        .map(et => ({
          type: et.value,
          label: et.label,
          exams: groupedByType[et.value]?.filter((e: Exam) => new Date(e.date) >= new Date()) || []
        }));
      
      setExamTypes(types);
      if (types.length > 0) {
        setSelectedExamType(types[0].type);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load exams');
    }
  };

  const fetchSeatingPlan = async (examType: string) => {
    try {
      const res = await api.get(`/exams/seating/type/${examType}/seating-plan`);
      if (res.data) {
        setSeatingPlan(res.data);
        setFromGrade(res.data.fromGrade);
        setToGrade(res.data.toGrade);
        setExamCapacity(res.data.examCapacity || 30);
        setShuffle(res.data.shuffle);
        fetchSeatingOverview(res.data.id);
      } else {
        setSeatingPlan(null);
        setSeatingOverview(null);
      }
    } catch (e) {
      setSeatingPlan(null);
      setSeatingOverview(null);
    }
  };

  const fetchSeatingOverview = async (planId: string) => {
    setLoadingOverview(true);
    try {
      const res = await api.get(`/exams/seating/plan/${planId}`);
      setSeatingOverview(res.data);
      if (res.data?.sections) {
        setExpandedSections(new Set(res.data.sections.map((s: any) => s.sectionId)));
      }
    } catch (e) {
      setSeatingOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  };

  const createAndGenerateSeating = async () => {
    if (!selectedExamType) {
      toast.warning('Please select an exam type');
      return;
    }

    if (fromGrade > toGrade) {
      toast.warning('From grade must be less than or equal to To grade');
      return;
    }

    setGenerating(true);
    try {
      // Create seating plan for this exam type
      const createRes = await api.post(`/exams/seating/type/${selectedExamType}/seating-plan`, {
        mode: 'GRADE_RANGE',
        fromGrade,
        toGrade,
        examCapacity: examCapacity || 30,
        shuffle,
      });
      
      const plan = createRes.data;
      setSeatingPlan(plan);
      
      // Generate seating
      const genRes = await api.post(`/exams/seating/plan/${plan.id}/generate`);
      setSeatingOverview(genRes.data);
      
      if (genRes.data?.sections) {
        setExpandedSections(new Set(genRes.data.sections.map((s: any) => s.sectionId)));
      }
      
      toast.success('Seating arrangement generated successfully!');
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to create seating');
    } finally {
      setGenerating(false);
    }
  };

  const regenerateSeating = async () => {
    if (!seatingPlan) return;

    setGenerating(true);
    try {
      // Delete existing seating first
      await api.delete(`/exams/seating/plan/${seatingPlan.id}/students`);
      
      // Generate new seating
      const res = await api.post(`/exams/seating/plan/${seatingPlan.id}/generate`);
      setSeatingOverview(res.data);
      
      if (res.data?.sections) {
        setExpandedSections(new Set(res.data.sections.map((s: any) => s.sectionId)));
      }
      
      toast.success('Seating regenerated successfully!');
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to regenerate seating');
    } finally {
      setGenerating(false);
    }
  };

  const deleteSeatingPlan = async () => {
    if (!seatingPlan || !confirm('Are you sure you want to delete this seating plan?')) return;

    try {
      await api.delete(`/exams/seating/plan/${seatingPlan.id}`);
      setSeatingPlan(null);
      setSeatingOverview(null);
      toast.success('Seating plan deleted');
    } catch (e) {
      toast.error('Failed to delete seating plan');
    }
  };

  const handlePrint = async () => {
    if (!seatingPlan) {
      toast.warning('No seating plan to print');
      return;
    }

    try {
      const response = await api.get(`/exams/seating/plan/${seatingPlan.id}/print`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `seating-plan-${seatingPlan.examType}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (e) {
      toast.error('Failed to download PDF');
    }
  };

  const handleExportExcel = async () => {
    if (!seatingPlan) {
      toast.warning('No seating plan to export');
      return;
    }

    try {
      const response = await api.get(`/exams/seating/plan/${seatingPlan.id}/excel`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `seating-plan-${seatingPlan.examType}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel file downloaded successfully');
    } catch (e) {
      toast.error('Failed to download Excel');
    }
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const selectedTypeInfo = examTypes.find(et => et.type === selectedExamType);

  if (isLoading) return null;

  const hasPermission = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  if (!hasPermission) {
    return <AccessDenied />;
  }

  return (
    <FeatureGuard feature="EXAM_SEATING" showUpgradePrompt={false} fallback={<AccessDenied />}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Exam Seating Arrangement</h1>
          <p className="text-gray-500">Configure and generate seating for students across multiple grades</p>
        </div>
        {seatingOverview && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary bg-primary/5">
              <UserCheck className="w-3 h-3 mr-1" />
              {seatingOverview.totalStudents} Students
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
              <LayoutGrid className="w-3 h-3 mr-1" />
              {seatingOverview.totalSections} Sections
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Seating Configuration
              </CardTitle>
              <CardDescription>Select exam type and set capacity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Exam Type Selection */}
              <div className="space-y-2">
                <Label>Exam Type <span className="text-red-500">*</span></Label>
                <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.length === 0 ? (
                      <div className="p-2 text-center text-gray-500 text-sm">No exams available</div>
                    ) : (
                      examTypes.map(et => (
                        <SelectItem key={et.type} value={et.type}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {et.label}
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {et.exams.length} exam{et.exams.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedTypeInfo && (
                  <div className="text-xs text-gray-500 pt-1 space-y-1">
                    {selectedTypeInfo.exams.slice(0, 3).map(exam => (
                      <div key={exam.id} className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {exam.subject.name} - {new Date(exam.date).toLocaleDateString()}
                      </div>
                    ))}
                    {selectedTypeInfo.exams.length > 3 && (
                      <div className="text-gray-400">+ {selectedTypeInfo.exams.length - 3} more exams</div>
                    )}
                  </div>
                )}
              </div>

              {/* Grade Range */}
              <div className="space-y-3">
                <Label className="font-medium">Grade Range for Exam</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">From Grade</Label>
                    <Select 
                      value={String(fromGrade)} 
                      onValueChange={(v) => setFromGrade(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                          <SelectItem key={g} value={String(g)} disabled={g > toGrade}>
                            Grade {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">To Grade</Label>
                    <Select 
                      value={String(toGrade)} 
                      onValueChange={(v) => setToGrade(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                          <SelectItem key={g} value={String(g)} disabled={g < fromGrade}>
                            Grade {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Students in Grades {fromGrade} to {toGrade} will be seated together
                </p>
              </div>

              {/* Exam Capacity */}
              <div className="space-y-2">
                <Label>Students per Section/Room</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setExamCapacity(Math.max(1, examCapacity - 5))}
                    type="button"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={examCapacity}
                    onChange={(e) => setExamCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center"
                    min={1}
                    max={100}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setExamCapacity(Math.min(100, examCapacity + 5))}
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Each exam room/section will hold up to {examCapacity} students
                </p>
              </div>

              {/* Shuffle Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-primary" />
                  <div>
                    <Label className="font-medium">Shuffle Students</Label>
                    <p className="text-xs text-gray-500">Mix students from different classes</p>
                  </div>
                </div>
                <Switch checked={shuffle} onCheckedChange={setShuffle} />
              </div>

              {/* Regenerate Option */}
              {seatingPlan && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <div>
                      <Label className="font-medium text-amber-800 dark:text-amber-300">Regenerate</Label>
                      <p className="text-xs text-amber-600">Recreate with new settings</p>
                    </div>
                  </div>
                  <Switch checked={generateNew} onCheckedChange={setGenerateNew} />
                </div>
              )}

              {/* Action Button */}
              <Button
                className="w-full"
                onClick={seatingPlan ? regenerateSeating : createAndGenerateSeating}
                disabled={!selectedExamType || generating}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {seatingPlan ? 'Regenerating...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Shuffle className="w-4 h-4 mr-2" />
                    {seatingPlan ? 'Regenerate Seating' : 'Generate Seating'}
                  </>
                )}
              </Button>

              {/* Delete & Print */}
              {seatingOverview && (
                <div className="space-y-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleExportExcel}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={deleteSeatingPlan}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          {seatingOverview && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">Seating Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Exam Type:</span>
                    <span className="font-medium">{EXAM_TYPES.find(t => t.value === seatingOverview.plan.examType)?.label || seatingOverview.plan.examType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Grade Range:</span>
                    <span className="font-medium">Grade {seatingOverview.plan.fromGrade} - {seatingOverview.plan.toGrade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Students:</span>
                    <span className="font-medium">{seatingOverview.totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sections/Rooms:</span>
                    <span className="font-medium">{seatingOverview.totalSections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Capacity/Section:</span>
                    <span className="font-medium">{seatingOverview.plan.examCapacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shuffle:</span>
                    <span className="font-medium">{seatingOverview.plan.shuffle ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-8">
          <Card className="h-full border shadow-sm">
            <CardHeader className="bg-white dark:bg-slate-950 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-500" />
                  Seating Overview
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedTypeInfo ? `${selectedTypeInfo.label} Seating Arrangement` : 'Select an exam type'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingOverview ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  Loading seating overview...
                </div>
              ) : !selectedExamType ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Users className="w-16 h-16 opacity-20 mb-4" />
                  <p>No exam type selected.</p>
                  <p className="text-sm mt-1">Select an exam type to generate seating.</p>
                </div>
              ) : !seatingOverview ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <LayoutGrid className="w-16 h-16 opacity-20 mb-4" />
                  <p>No seating arrangement yet.</p>
                  <p className="text-sm mt-1">Configure settings and click "Generate Seating"</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {seatingOverview.sections.map((section) => (
                    <Collapsible
                      key={section.sectionId}
                      open={expandedSections.has(section.sectionId)}
                      onOpenChange={() => toggleSectionExpanded(section.sectionId)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-3 border rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-3">
                            {expandedSections.has(section.sectionId) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-5 text-gray-500" />
                            )}
                            <div>
                              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                                {section.sectionName}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {section.className} • Grade {section.grade} • Capacity: {section.examCapacity}
                              </p>
                            </div>
                          </div>
                          <Badge variant={section.assignedStudents > section.examCapacity ? "destructive" : "secondary"}>
                            {section.assignedStudents} / {section.examCapacity} Students
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border border-t-0 rounded-b-lg overflow-hidden">
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">#</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Original Section</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {section.students.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                    No students assigned
                                  </TableCell>
                                </TableRow>
                              ) : (
                                section.students.map((student) => (
                                  <TableRow key={student.studentId}>
                                    <TableCell className="font-medium">{student.orderIndex}</TableCell>
                                    <TableCell>{student.studentName}</TableCell>
                                    <TableCell>Grade {student.originalGrade}</TableCell>
                                    <TableCell>{student.originalSection || 'N/A'}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </FeatureGuard>
  );
}