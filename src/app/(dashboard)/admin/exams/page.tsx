"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import api, { termsAPI } from "@/lib/api";
import { academicYearsAPI, assessmentsAPI, sectionsAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AssessmentType = "QUIZ" | "TEST" | "MID" | "FINAL" | "ATTENDANCE";

interface LookupItem {
  id: string;
  name: string;
}

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  status: string;
  academicYear?: { id: string; name: string };
  term?: { id: string; name: string } | null;
  subjects: Array<{
    id: string;
    maxScore: number;
    class?: { name: string };
    section?: { name: string } | null;
    subject?: { name: string };
  }>;
}


const DEFAULT_WEIGHTS = {
  QUIZ: 15,
  TEST: 25,
  MID: 20,
  FINAL: 30,
  ATTENDANCE: 10,
};

export default function AdminAssessmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { currentAcademicYear, curriculumType, getAllAcademicYears, getTermsForYear } = useAcademicYear();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [academicYears, setAcademicYears] = useState<LookupItem[]>([]);
  const [terms, setTerms] = useState<LookupItem[]>([]);
  const [classes, setClasses] = useState<LookupItem[]>([]);
  const [subjects, setSubjects] = useState<LookupItem[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, LookupItem[]>>({});
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "MID" as AssessmentType,
    academicYearId: "",
    termId: "",
    startDate: "",
    endDate: "",
  });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [globalMaxScore, setGlobalMaxScore] = useState<number>(100);
  const [gradeRange, setGradeRange] = useState<string>("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadAcademicYears = useCallback(async () => {
    try {
      const years = await getAllAcademicYears();
      setAcademicYears(years);
      return years;
    } catch (error) {
      console.error("Failed to load academic years:", error);
      return [];
    }
  }, [getAllAcademicYears]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "")) {
      initialize();
    }
  }, [isLoading, isAuthenticated, user?.role]);

  const initialize = async () => {
    try {
      setLoading(true);
      
      // Load academic years using centralized context
      const yearData = await loadAcademicYears();
      
      const [classRes, subjectRes, weightRes] = await Promise.all([
        api.get("/classes"),
        api.get("/subjects"),
        assessmentsAPI.getWeights(),
      ]);

      const classData = Array.isArray(classRes.data) ? classRes.data : classRes.data?.data || [];
      const subjectData = Array.isArray(subjectRes.data) ? subjectRes.data : subjectRes.data?.data || [];

      setClasses(classData);
      setSubjects(subjectData);

      const normalizedWeights = { ...DEFAULT_WEIGHTS };
      for (const item of weightRes.data || []) {
        normalizedWeights[item.type as AssessmentType] = item.percentage;
      }
      setWeights(normalizedWeights);

      // Use current academic year from context as default
      const defaultYear = currentAcademicYear?.id || yearData.find((row: any) => row.isActive)?.id || yearData[0]?.id || "";
      setSelectedYear(defaultYear || "all");
      setForm((current) => ({ ...current, academicYearId: defaultYear, termId: "" }));

      if (defaultYear) {
        await loadTerms(defaultYear);
      }
      await loadAssessments(defaultYear, "", "all");
    } catch (error) {
      console.error(error);
      toast.error("Failed to load assessment module");
    } finally {
      setLoading(false);
    }
  };

  const loadTerms = async (academicYearId: string) => {
    // Use centralized context to get terms
    const termData = await getTermsForYear(academicYearId);
    setTerms(termData);
    return termData;
  };

  const loadAssessments = async (academicYearId?: string, termId?: string, type?: string) => {
    const response = await assessmentsAPI.list({
      academicYearId: academicYearId || undefined,
      termId: termId || undefined,
      type: type && type !== "all" ? type : undefined,
    });
    setAssessments(response.data || []);
  };

  const ensureSections = async (classId: string) => {
    if (!classId || sectionsByClass[classId]) return;
    const response = await sectionsAPI.getAll({ classId });
    const sectionData = Array.isArray(response.data) ? response.data : response.data?.data || [];
    setSectionsByClass((current) => ({ ...current, [classId]: sectionData }));
  };

  const filteredAssessments = useMemo(
    () =>
      assessments.filter((assessment) => {
        if (selectedTerm !== "all" && assessment.term?.id !== selectedTerm) return false;
        if (selectedType !== "all" && assessment.type !== selectedType) return false;
        return true;
      }),
    [assessments, selectedTerm, selectedType],
  );

  const createAssessment = async () => {
    if (selectedClasses.length === 0 || selectedSubjects.length === 0) {
      toast.error("Please select at least one class and one subject.");
      return;
    }

    try {
      const generatedSubjects = selectedClasses.flatMap((classId) =>
        selectedSubjects.map((subjectId) => ({
          classId: classId,
          subjectId: subjectId,
          maxScore: Number(globalMaxScore),
        }))
      );

      const payload = {
        title: form.title,
        type: form.type,
        academicYearId: form.academicYearId,
        termId: form.termId || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        subjects: generatedSubjects,
      };

      await assessmentsAPI.create(payload);
      toast.success("Assessment created");
      setIsCreateOpen(false);
      setForm((current) => ({
        ...current,
        title: "",
        startDate: "",
        endDate: "",
      }));
      setSelectedClasses([]);
      setSelectedSubjects([]);
      setGlobalMaxScore(100);
      setGradeRange("");
      await loadAssessments(selectedYear === "all" ? undefined : selectedYear, selectedTerm === "all" ? undefined : selectedTerm, selectedType);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to create assessment");
    }
  };

  const saveWeights = async () => {
    try {
      await assessmentsAPI.updateWeights(
        Object.entries(weights).map(([type, percentage]) => ({
          type,
          percentage,
        })),
      );
      toast.success("Assessment weights updated");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save weights");
    }
  };

  const lockAssessment = async (assessmentId: string) => {
    try {
      await assessmentsAPI.lock(assessmentId);
      toast.success("Assessment locked");
      await loadAssessments(selectedYear === "all" ? undefined : selectedYear, selectedTerm === "all" ? undefined : selectedTerm, selectedType);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to lock assessment");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Assessment Management</h1>
          <p className="text-sm text-slate-500">
            One unified workflow for quizzes, tests, mid exams, and final exams.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Assessment</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl dark:bg-slate-900">
            <DialogHeader className="dark:bg-slate-800/50">
              <DialogTitle className="dark:text-white">Create Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Type</Label>
                  <Select value={form.type} onValueChange={(value: AssessmentType) => setForm((current) => ({ ...current, type: value }))}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUIZ">Quiz</SelectItem>
                      <SelectItem value="TEST">Test</SelectItem>
                      <SelectItem value="MID">Mid Exam</SelectItem>
                      <SelectItem value="FINAL">Final Exam</SelectItem>
                      <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Academic Year</Label>
                  <Select
                    value={form.academicYearId}
                    onValueChange={async (value) => {
                      setForm((current) => ({ ...current, academicYearId: value, termId: "" }));
                      await loadTerms(value);
                    }}
                  >
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"><SelectValue placeholder="Select academic year" /></SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Term</Label>
                  <Select value={form.termId} onValueChange={(value) => setForm((current) => ({ ...current, termId: value }))}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"><SelectValue placeholder="Select term" /></SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Start Date</Label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-gray-200">End Date</Label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm((current) => ({ ...current, endDate: e.target.value }))} className="dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-4 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold dark:text-white">Classes & Grades</h3>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Range (e.g. 5-12)"
                        value={gradeRange}
                        onChange={(e) => setGradeRange(e.target.value)}
                        className="w-36 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                      <Button variant="outline" size="sm" onClick={() => {
                        const match = gradeRange.match(/(\d+)\s*-\s*(\d+)/);
                        if (match) {
                          const min = parseInt(match[1]);
                          const max = parseInt(match[2]);
                          const matchedClasses = classes.filter(c => {
                            const numMatch = c.name.match(/\d+/);
                            if (numMatch) {
                              const num = parseInt(numMatch[0]);
                              return num >= min && num <= max;
                            }
                            return false;
                          }).map(c => c.id);
                          setSelectedClasses(Array.from(new Set([...selectedClasses, ...matchedClasses])));
                        } else {
                          toast.error("Invalid range format. Use e.g. 5-12");
                        }
                      }}>Apply</Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (selectedClasses.length === classes.length && classes.length > 0) {
                          setSelectedClasses([]);
                        } else {
                          setSelectedClasses(classes.map(c => c.id));
                        }
                      }}>
                        {selectedClasses.length === classes.length && classes.length > 0 ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {classes.map(c => (
                      <label key={c.id} className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedClasses([...selectedClasses, c.id]);
                            else setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                          }}
                        />
                        <span className="text-sm truncate dark:text-gray-200" title={c.name}>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold dark:text-white">Subjects</h3>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (selectedSubjects.length === subjects.length && subjects.length > 0) {
                        setSelectedSubjects([]);
                      } else {
                        setSelectedSubjects(subjects.map(s => s.id));
                      }
                    }}>
                      {selectedSubjects.length === subjects.length && subjects.length > 0 ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {subjects.map(s => (
                      <label key={s.id} className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSubjects([...selectedSubjects, s.id]);
                            else setSelectedSubjects(selectedSubjects.filter(id => id !== s.id));
                          }}
                        />
                        <span className="text-sm truncate dark:text-gray-200" title={s.name}>{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="pt-2 flex items-center gap-4">
                    <Label className="font-semibold dark:text-gray-200">Global Max Score</Label>
                    <Input
                      type="number"
                      className="w-24 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={globalMaxScore}
                      onChange={(e) => setGlobalMaxScore(Number(e.target.value) || 0)}
                      min={1}
                      max={100}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={createAssessment}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b pb-6 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e35336] text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  <path d="M8 7h8"></path>
                  <path d="M8 11h6"></path>
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-white">Assessment List</CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                  Filter by academic year, term, and assessment type.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#e35336]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Filter Assessments</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  value={selectedYear}
                  onValueChange={async (value) => {
                    setSelectedYear(value);
                    if (value !== "all") await loadTerms(value);
                    await loadAssessments(value === "all" ? undefined : value, selectedTerm === "all" ? undefined : selectedTerm, selectedType);
                  }}
                  >
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedTerm}
                  onValueChange={async (value) => {
                    setSelectedTerm(value);
                    await loadAssessments(selectedYear === "all" ? undefined : selectedYear, value === "all" ? undefined : value, selectedType);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"><SelectValue placeholder="Term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedType}
                  onValueChange={async (value) => {
                    setSelectedType(value);
                    await loadAssessments(selectedYear === "all" ? undefined : selectedYear, selectedTerm === "all" ? undefined : selectedTerm, value);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                    <SelectItem value="TEST">Test</SelectItem>
                    <SelectItem value="MID">Mid</SelectItem>
                    <SelectItem value="FINAL">Final</SelectItem>
                    <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                    <TableHead className="font-semibold dark:text-gray-200">Title</TableHead>
                    <TableHead className="font-semibold dark:text-gray-200">Type</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell dark:text-gray-200">Grade / Class</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell dark:text-gray-200">Subjects</TableHead>
                    <TableHead className="font-semibold dark:text-gray-200">Status</TableHead>
                    <TableHead className="font-semibold dark:text-gray-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <TableCell>
                        <div className="font-medium dark:text-white">{assessment.title}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">
                          {assessment.academicYear?.name} {assessment.term?.name ? `• ${assessment.term.name}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={assessment.type === 'FINAL' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800' : assessment.type === 'MID' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' : assessment.type === 'TEST' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800' : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800'}
                        >
                          {assessment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell dark:text-gray-300">
                        {assessment.subjects[0]?.class?.name || "-"}
                        {assessment.subjects[0]?.section?.name ? ` - ${assessment.subjects[0]?.section?.name}` : ""}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-slate-100 text-sm font-medium">
                          {assessment.subjects.length}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={assessment.status === "LOCKED" ? "destructive" : "secondary"}>
                          {assessment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setSelectedAssessment(assessment)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                          </Button>
                          <Button
                            size="sm"
                            disabled={assessment.status === "LOCKED"}
                            onClick={() => lockAssessment(assessment.id)}
                            className="text-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Lock
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b pb-6 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e35336] text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-white">Term Weighting</CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                  Configure how quizzes, tests, mid, and final exams contribute to the term result.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["QUIZ", "TEST", "MID", "FINAL", "ATTENDANCE"] as AssessmentType[]).map((type) => (
              <div key={type} className="space-y-2">
                <Label className="dark:text-gray-200">{type === 'ATTENDANCE' ? 'Attendance' : type}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[type]}
                  onChange={(e) =>
                    setWeights((current) => ({
                      ...current,
                      [type]: Number(e.target.value),
                    }))
                  }
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            ))}
            <Button className="w-full" onClick={saveWeights}>
              Save Weights
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedAssessment)} onOpenChange={(open) => !open && setSelectedAssessment(null)}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader className="-mx-6 -mt-6 px-6 py-4 border-b dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e35336] text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  <path d="M8 7h8"></path>
                  <path d="M8 11h6"></path>
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">{selectedAssessment?.title}</DialogTitle>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                  {selectedAssessment?.academicYear?.name} • {selectedAssessment?.term?.name || "All Terms"} • {selectedAssessment?.type}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[50vh] pr-2">
            <div className="flex items-center justify-between pb-2 border-b dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Subjects ({selectedAssessment?.subjects.length || 0})</span>
            </div>
            {selectedAssessment?.subjects.map((subject, index) => (
              <div key={subject.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e35336]/10 text-[#e35336] text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">{subject.subject?.name}</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                          {subject.class?.name}
                        </span>
                        {subject.section?.name && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            {subject.section.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-[#e35336]/10 text-[#e35336] border-[#e35336]/20">
                    Max: {subject.maxScore}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
