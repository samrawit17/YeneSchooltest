"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { toast } from "sonner";
import {
  BookOpen,
  Users,
  GraduationCap,
  Loader2,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  School,
  BookMarked,
  Mail,
  Grid,
  List,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Link,
  Search
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classesAPI, sectionsAPI, academicYearsAPI } from "@/lib/api/academics";
import { authAPI } from "@/lib/api/auth";
import { classSubjectsAPI } from "@/lib/api/admin";
import { Filters, useFilters } from "@/components/filters/Filters";

interface AssignmentCellTarget {
  classId: string;
  sectionId: string;
  subjectId: string;
  label: string;
  isVirtual: boolean;
  currentTeacherId?: string;
}

interface HomeroomTarget {
  classId: string;
  sectionId?: string;
  label: string;
  isVirtual: boolean;
}

const TeacherAssignmentPage = () => {
  const { t } = useTranslations<any>("assignments");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Data State
  const [matrixData, setMatrixData] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { selectedYear, setSelectedYear, selectedSearch, setSelectedSearch } = useFilters({ academicYear: true, search: true });

  // UI State
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  
  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHomeroomModal, setShowHomeroomModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<AssignmentCellTarget | null>(null);
  const [selectedHomeroomTarget, setSelectedHomeroomTarget] = useState<HomeroomTarget | null>(null);
  const [selectedSubjectTeacherId, setSelectedSubjectTeacherId] = useState<string>("");
  const [selectedHomeroomTeacherId, setSelectedHomeroomTeacherId] = useState<string>("");
  const [selectedBulkTeacherId, setSelectedBulkTeacherId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Bulk State
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchMatrix = useCallback(async (yearId: string) => {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const res = await classSubjectsAPI.getMatrix({ 
        schoolId: user.schoolId, 
        academicYearId: yearId 
      });
      setMatrixData(res.data);
    } catch (error) {
      console.error("Failed to fetch assignment matrix", error);
      toast.error(t.toasts.loadMatrixFailed);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [teachersRes, yearsRes] = await Promise.all([
        authAPI.getTeachers({ limit: "200" }),
        academicYearsAPI.getAll({ schoolId: user?.schoolId }),
      ]);
      const teachersData = Array.isArray(teachersRes.data) ? teachersRes.data : teachersRes.data?.data || [];
      const yearsData = Array.isArray(yearsRes.data) ? yearsRes.data : yearsRes.data?.data || [];
      setTeachers(teachersData);
      setAcademicYears(yearsData);

      if (!selectedYear && yearsData.length > 0) {
        const defaultYear = yearsData.find((year: any) => year.isActive)?.id || yearsData[0]?.id;
        if (defaultYear) {
          setSelectedYear(defaultYear);
        }
      }
    } catch (error) {
      console.error("Failed to fetch initial assignment data", error);
      toast.error(t.toasts.loadSetupFailed);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, setSelectedYear, user?.schoolId]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchInitialData();
    }
  }, [isAuthenticated, authLoading, fetchInitialData]);

  useEffect(() => {
    if (selectedYear) {
      fetchMatrix(selectedYear);
    }
  }, [selectedYear, fetchMatrix]);

  const openAssignModal = (sectionId: string, subjectId: string, teacherId?: string) => {
    const row = matrixData?.sections?.find((s: any) => s.id === sectionId);
    if (!row) return;

    setSelectedCell({
      classId: row.class?.id || row.classId || sectionId.replace(/^virtual-/, ""),
      sectionId,
      subjectId,
      label: row.class?.name || row.name || t.sectionClass,
      isVirtual: row.isVirtual === true,
      currentTeacherId: teacherId,
    });
    setSelectedSubjectTeacherId(teacherId || "none");
    setShowAssignModal(true);
  };

  const openHomeroomModal = (section: any) => {
    const isVirtual = section?.isVirtual === true;
    const classId = section?.class?.id || section?.classId || section?.id?.replace(/^virtual-/, "");
    if (!classId) return;

    setSelectedHomeroomTarget({
      classId,
      sectionId: isVirtual ? undefined : section.id,
      label: section?.class?.name || section?.name || t.sectionClass,
      isVirtual,
    });
    setSelectedHomeroomTeacherId(
      section?.homeroomTeacher?.id || section?.class?.homeroomTeacher?.id || "none"
    );
    setShowHomeroomModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedCell || !selectedYear || !user?.schoolId) return;

    try {
      setSaving(true);
      await classSubjectsAPI.bulkAssign({
        sectionIds: [selectedCell.sectionId],
        subjectIds: [selectedCell.subjectId],
        teacherId: selectedSubjectTeacherId === "none" ? null : selectedSubjectTeacherId,
        academicYearId: selectedYear,
        classId: selectedCell.classId
      });

      toast.success(t.toasts.assignmentUpdated);
      setShowAssignModal(false);
      setSelectedCell(null);
      fetchMatrix(selectedYear);
    } catch (error) {
      toast.error(t.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedSections.length === 0 || selectedSubjects.length === 0 || !selectedBulkTeacherId || selectedBulkTeacherId === "none") {
      toast.error(t.toasts.selectRequired);
      return;
    }

    try {
      setSaving(true);
      await classSubjectsAPI.bulkAssign({
        sectionIds: selectedSections,
        subjectIds: selectedSubjects,
        teacherId: selectedBulkTeacherId,
        academicYearId: selectedYear,
      });

      toast.success(t.toasts.bulkAssigned.replace("{sections}", String(selectedSections.length)).replace("{subjects}", String(selectedSubjects.length)));
      setShowBulkModal(false);
      setSelectedSections([]);
      setSelectedSubjects([]);
      setSelectedBulkTeacherId("");
      fetchMatrix(selectedYear);
    } catch (error) {
      toast.error(t.toasts.bulkFailed);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id: string) => {
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSaveHomeroomAssignment = async () => {
    if (!selectedHomeroomTarget) return;

    try {
      setSaving(true);
      const teacherId = selectedHomeroomTeacherId === "none" ? null : selectedHomeroomTeacherId;
      if (selectedHomeroomTarget.isVirtual) {
        await classesAPI.setHomeroomTeacher(selectedHomeroomTarget.classId, teacherId);
      } else if (selectedHomeroomTarget.sectionId) {
        await sectionsAPI.setHomeroomTeacher(selectedHomeroomTarget.sectionId, teacherId);
      }

      toast.success(t.toasts.homeroomUpdated);
      setShowHomeroomModal(false);
      setSelectedHomeroomTarget(null);
      if (selectedYear) {
        fetchMatrix(selectedYear);
      }
    } catch (error) {
      toast.error(t.toasts.homeroomFailed);
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (loading && !matrixData) {
    return (
        <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  const matrixSections = matrixData?.sections || [];
  const matrixSubjects = matrixData?.subjects || [];
  const filteredSections = matrixSections.filter((s: any) => {
    const term = selectedSearch.toLowerCase();
    return (
      (s.class?.name || "").toLowerCase().includes(term) ||
      (s.name || "").toLowerCase().includes(term) ||
      (s.isVirtual ? "no section" : "").includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-black">
            
            {t.title}
          </h1>
          <p className="text-slate-500 mt-1">{t.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="default" 
            className=""
            onClick={() => setShowBulkModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.bulkAssign}
          </Button>
        </div>
      </div>

      {/* MATRIX GRID VIEW */}
      <Card className="border-none bg-white dark:bg-slate-800 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg dark:text-white">{t.matrixTitle}</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={selectedSearch}
                  onChange={(e) => setSelectedSearch(e.target.value)}
                  className="pl-9 h-8 w-[500px] max-w-full dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-[160px] dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder={t.academicYear} />
                </SelectTrigger>
                <SelectContent>
                  {academicYears?.map((y: any) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name} {y.isActive ? "✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700 border-b">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-700 p-4 text-left font-semibold text-slate-700 dark:text-slate-300 border-r dark:border-slate-600 min-w-[220px]">
                    {t.sectionClass}
                  </th>
                  <th className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300 border-r min-w-[180px] bg-amber-50/30 dark:bg-amber-900/20">
                    {t.homeroomTeacher}
                  </th>
                  {matrixSubjects.map((sub: any) => (
                    <th key={sub.id} className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300 border-r dark:border-slate-700 min-w-[160px]">
                      {sub.name}
                      {sub.code && <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub.code}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSections.map((section: any) => (
                  <tr key={section.id} className="group border-b transition-colors hover:bg-[rgba(var(--brand-color-rgb),0.06)] dark:hover:bg-[rgba(var(--brand-color-rgb),0.1)]">
                    <td className="sticky left-0 z-10 border-r bg-white p-4 dark:border-slate-700 dark:bg-slate-800 group-hover:bg-[rgba(var(--brand-color-rgb),0.06)] dark:group-hover:bg-[rgba(var(--brand-color-rgb),0.1)]">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-white">
                          {section.class?.grade != null ? `${t.grade} ${section.class.grade}` : section.class?.name || section.name}
                          {!section.isVirtual && section.name ? ` - ${section.name}` : ""}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {section.isVirtual
                            ? t.noSectionYet
                            : `${t.cap}: ${section.capacity} | ${t.room}: ${section.roomNumber || t.nA}`}
                        </span>
                      </div>
                    </td>
                    
                    {/* HOMEROOM CELL */}
                    <td className="p-3 border-r bg-amber-50/10 text-center">
                       <button 
                        type="button"
                        onClick={() => openHomeroomModal(section)}
                        className="w-full h-full min-h-[40px] flex flex-col items-center justify-center p-2 rounded-lg transition-all border border-dashed border-transparent hover:border-amber-200 hover:bg-amber-100/50 cursor-pointer"
                       >
                        {section.homeroomTeacher || section.class?.homeroomTeacher ? (
                          <>
                            <span className="text-sm font-semibold text-amber-700">
                              {section.homeroomTeacher?.name || section.class?.homeroomTeacher?.name}
                            </span>
                            <span className="text-[10px] text-amber-600/70">{t.homeroom}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">{t.noHomeroom}</span>
                        )}
                      </button>
                    </td>

                    {/* SUBJECT CELLS */}
                    {matrixSubjects.map((sub: any) => {
                      const assignment = matrixData?.assignments?.find(
                        (a: any) => a.sectionId === section.id && a.subjectId === sub.id
                      );
                      const teacher = assignment?.teacher;

                      return (
                        <td key={sub.id} className="p-3 border-r">
                          <button 
                            type="button"
                            onClick={() => openAssignModal(section.id, sub.id, teacher?.id)}
                            className={`w-full h-full min-h-[50px] flex flex-col items-center justify-center p-2 rounded-lg transition-all border cursor-pointer ${teacher ? 'bg-[rgba(var(--brand-color-rgb),0.08)] border-[rgba(var(--brand-color-rgb),0.18)] hover:bg-[rgba(var(--brand-color-rgb),0.14)] hover:border-[rgba(var(--brand-color-rgb),0.28)]' : 'border-dashed border-slate-200 hover:border-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.04)]'}`}
                          >
                            {teacher ? (
                              <>
                                <span className="text-sm font-medium text-[var(--brand-color,#e35336)]">{teacher.name}</span>
                                <span className="text-[10px] text-[var(--brand-color,#e35336)]/80 truncate max-w-[120px]">{t.assigned}</span>
                              </>
                            ) : (
                              <Plus className="h-4 w-4 text-slate-300 group-hover:text-[var(--brand-color,#e35336)]" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ASSIGNMENT MODAL */}
      <Dialog open={showAssignModal} onOpenChange={(open) => { setShowAssignModal(open); if (!open) setSelectedCell(null); }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 z-[100]">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t.assignSubject}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {t.assignSubjectDesc.replace("{target}", selectedCell?.isVirtual ? t.thisClass : t.thisSection)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <Select value={selectedSubjectTeacherId} onValueChange={setSelectedSubjectTeacherId}>
              <SelectTrigger className="w-full h-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder={t.selectTeacher} />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="none" className="text-red-600 font-medium">{t.removeAssignment}</SelectItem>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={saving} className="dark:border-slate-600 dark:text-white">{t.cancel}</Button>
            <Button onClick={handleSaveAssignment} disabled={saving} className="min-w-[100px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HOMEROOM ASSIGNMENT MODAL */}
      <Dialog open={showHomeroomModal} onOpenChange={(open) => { setShowHomeroomModal(open); if (!open) setSelectedHomeroomTarget(null); }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t.assignHomeroom}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {t.assignHomeroomDesc.replace("{label}", selectedHomeroomTarget?.label || "").replace("{suffix}", selectedHomeroomTarget?.isVirtual ? t.classLevel : "")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <Select value={selectedHomeroomTeacherId} onValueChange={setSelectedHomeroomTeacherId}>
              <SelectTrigger className="w-full h-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder={t.selectTeacher} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-red-600 font-medium">{t.removeHomeroom}</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowHomeroomModal(false)} disabled={saving} className="dark:border-slate-600 dark:text-white">{t.cancel}</Button>
            <Button onClick={handleSaveHomeroomAssignment} disabled={saving} className="bg-amber-600 hover:bg-amber-700 min-w-[120px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.saveHomeroom}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK ASSIGN MODAL */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <Grid className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
              {t.bulkTitle}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">{t.bulkDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white border-b pb-2">{t.selectSections}</h4>
              <ScrollArea className="h-[300px] rounded-md border p-2 dark:border-slate-600">
                {filteredSections.map((s: any) => (
                  <div 
                    key={s.id} 
                    className={`flex items-center p-2 rounded cursor-pointer mb-1 text-sm ${
                      selectedSections.includes(s.id) ? 'bg-[rgba(var(--brand-color-rgb),0.1)] dark:bg-[rgba(var(--brand-color-rgb),0.18)] text-[var(--brand-color,#e35336)]' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => toggleSection(s.id)}
                  >
                    <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                      selectedSections.includes(s.id) ? 'bg-[var(--brand-color,#e35336)] border-[var(--brand-color,#e35336)]' : 'border-slate-300 dark:border-slate-500'
                    }`}>
                      {selectedSections.includes(s.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="dark:text-slate-200">{s.class?.name || s.name}{s.isVirtual ? "" : ` - ${s.name}`}</span>
                  </div>
                ))}
              </ScrollArea>
              <div className="flex gap-2">
                <Button variant="link" size="sm" onClick={() => setSelectedSections(filteredSections.map((s: any) => s.id))}>{t.selectAll}</Button>
                <Button variant="link" size="sm" onClick={() => setSelectedSections([])}>{t.clear}</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white border-b pb-2">{t.selectSubjects}</h4>
              <ScrollArea className="h-[300px] rounded-md border p-2 dark:border-slate-600">
                {matrixSubjects.map((sub: any) => (
                  <div 
                    key={sub.id} 
                    className={`flex items-center p-2 rounded cursor-pointer mb-1 text-sm ${
                      selectedSubjects.includes(sub.id) ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => toggleSubject(sub.id)}
                  >
                    <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                      selectedSubjects.includes(sub.id) ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-500'
                    }`}>
                      {selectedSubjects.includes(sub.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="dark:text-slate-200">{sub.name}</span>
                  </div>
                ))}
              </ScrollArea>
              <div className="flex gap-2">
                <Button variant="link" size="sm" onClick={() => setSelectedSubjects(matrixSubjects.map((s: any) => s.id))}>{t.selectAll}</Button>
                <Button variant="link" size="sm" onClick={() => setSelectedSubjects([])}>{t.clear}</Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-2">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{t.chooseTeacher}</h4>
            <Select value={selectedBulkTeacherId} onValueChange={setSelectedBulkTeacherId}>
              <SelectTrigger className="w-full h-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder={t.selectTeacher} />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6 bg-slate-50 dark:bg-slate-700 -mx-6 -mb-6 p-6 rounded-b-lg border-t dark:border-slate-600">
            <Button variant="ghost" onClick={() => setShowBulkModal(false)} disabled={saving}>{t.cancel}</Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={saving || selectedSections.length === 0 || selectedSubjects.length === 0 || !selectedBulkTeacherId} 
              className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
              {t.applyBulk}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAssignmentPage;
