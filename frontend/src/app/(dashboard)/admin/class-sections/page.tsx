"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  classesAPI,
  sectionsAPI,
  subjectsAPI,
  academicYearsAPI,
  schoolSettingsAPI,
} from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import FormModal from "@/components/FormModal";
import { toast } from "sonner";
import {
  School,
  BookOpen,
  Layers,
  GraduationCap,
  Plus,
  Loader2,
  MoreHorizontal,
  ChevronRight,
  Users,
  Hash,
  DoorOpen,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ===================== TYPES =====================

type ClassData = {
  id: string;
  name: string;
  grade: number;
  section: string;
  academicYearId: string;
  academicYear?: { id: string; name: string };
  sections: { 
    id: string; 
    name: string; 
    capacity: number; 
    roomNumber?: string;
    homeroomTeacher?: { id: string; name: string; email?: string } | null;
  }[];
  homeroomTeacher?: { id: string; name: string; email?: string } | null;
};

type SectionData = {
  id: string;
  name: string;
  capacity: number;
  roomNumber?: string;
  class?: { id: string; name: string; grade: number };
  homeroomTeacher?: { id: string; name: string; email?: string } | null;
  _count?: { studentClasses: number };
};

type SubjectData = {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
  description?: string;
  grade?: number;
};

const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function getGradeSortValue(section: SectionData) {
  const explicitGrade = section.class?.grade;
  if (typeof explicitGrade === "number" && Number.isFinite(explicitGrade)) {
    return explicitGrade;
  }

  const match = section.class?.name?.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function sortSectionsByGradeAndName(left: SectionData, right: SectionData) {
  const gradeDelta = getGradeSortValue(left) - getGradeSortValue(right);
  if (gradeDelta !== 0) return gradeDelta;

  const classDelta = naturalSorter.compare(left.class?.name || "", right.class?.name || "");
  if (classDelta !== 0) return classDelta;

  return naturalSorter.compare(left.name || "", right.name || "");
}

function EntityActions({
  entityLabel,
  formTable,
  data,
  onDelete,
}: {
  entityLabel: string;
  formTable: "class" | "section" | "subject";
  data: any;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label={`${entityLabel} actions`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full cursor-default select-none items-center rounded-xl px-3 py-2 text-sm text-red-600 outline-none transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {entityLabel}</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this {entityLabel.toLowerCase()}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormModal
        table={formTable}
        type="update"
        data={data}
        title={`Update ${entityLabel}`}
        isOpen={editOpen}
        setIsOpen={setEditOpen}
      />
    </div>
  );
}

// ===================== MAIN PAGE =====================

export default function AcademicStructurePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("classes");
  const [searchTerm, setSearchTerm] = useState("");
  const [academicYearId, setAcademicYearId] = useState<string>("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: queryKeys.academicYears.all,
    queryFn: async () => {
      const resp = await academicYearsAPI.getAll();
      return resp.data?.data || resp.data || [];
    },
    enabled: isAuthenticated,
  });

  // Set default academic year
  useEffect(() => {
    if (academicYears?.length && !academicYearId) {
      const active = academicYears.find((y: any) => y.isActive);
      setAcademicYearId(active?.id || academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  // Fetch school settings for section capacity
  const { data: sectionCapacitySetting } = useQuery({
    queryKey: queryKeys.school.setting("DEFAULT_SECTION_CAPACITY", user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return null;
      const resp = await schoolSettingsAPI.get(user.schoolId, "DEFAULT_SECTION_CAPACITY");
      return resp.data?.value || 30; // Default to 30 if not set
    },
    enabled: !!user?.schoolId,
  });

  // Fetch grade system levels for this school
  const { data: gradeLevels = [] } = useQuery({
    queryKey: queryKeys.school.gradeLevels(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return [];
      const resp = await classesAPI.getGrades();
      return (resp.data || []) as number[];
    },
    enabled: !!user?.schoolId,
  });

  // Sync section capacity from school settings
  const handleSyncCapacity = async () => {
    try {
      const resp = await sectionsAPI.syncCapacity();
      toast.success(resp.data?.message || "Section capacities synced successfully");
      refetchSections();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to sync section capacities");
    }
  };

  // Fetch classes
  const {
    data: classes = [],
    isLoading: classesLoading,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: queryKeys.classSections.academicClasses(academicYearId),
    queryFn: async () => {
      const resp = await classesAPI.getAll(
        academicYearId ? { academicYearId } : undefined
      );
      return (resp.data || []) as ClassData[];
    },
    enabled: isAuthenticated,
  });

  const gradeFilteredClasses = gradeLevels.length
    ? classes.filter((cls) => cls.grade !== null && gradeLevels.includes(cls.grade))
    : classes;

  const dedupedGradeFilteredClasses = gradeFilteredClasses.filter((cls) => {
    const isEmptyDefaultClass =
      cls.section === "" && (!cls.sections || cls.sections.length === 0);
    if (!isEmptyDefaultClass) return true;

    return !gradeFilteredClasses.some(
      (candidate) =>
        candidate.id !== cls.id &&
        candidate.academicYearId === cls.academicYearId &&
        candidate.name === cls.name &&
        (candidate.section !== "" ||
          (candidate.sections && candidate.sections.length > 0)),
    );
  });

  // Fetch sections
  const {
    data: sections = [],
    isLoading: sectionsLoading,
    refetch: refetchSections,
  } = useQuery({
    queryKey: queryKeys.classSections.academicSections,
    queryFn: async () => {
      const resp = await sectionsAPI.getAll();
      return (resp.data || []) as SectionData[];
    },
    enabled: isAuthenticated,
  });

  // Fetch subjects
  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    refetch: refetchSubjects,
  } = useQuery({
    queryKey: queryKeys.subjects.academic,
    queryFn: async () => {
      const resp = await subjectsAPI.getAll();
      return (resp.data || []) as SubjectData[];
    },
    enabled: isAuthenticated,
  });

  const handleRefresh = useCallback(() => {
    refetchClasses();
    refetchSections();
    refetchSubjects();
    toast.success("Data refreshed");
  }, [refetchClasses, refetchSections, refetchSubjects]);

  // Debounced search term for server-side search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Server-side search for classes
  const {
    data: searchedClasses = [],
    isLoading: searchClassesLoading,
    refetch: refetchSearchClasses,
  } = useQuery({
    queryKey: queryKeys.classSections.classSearch(debouncedSearch, academicYearId),
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        return [];
      }
      const resp = await classesAPI.search({ 
        q: debouncedSearch, 
        academicYearId: academicYearId || undefined 
      });
      return (resp.data || []) as ClassData[];
    },
    enabled: isAuthenticated && debouncedSearch.length >= 2,
  });

  const gradeFilteredSearchedClasses = gradeLevels.length
    ? searchedClasses.filter((cls) => cls.grade !== null && gradeLevels.includes(cls.grade))
    : searchedClasses;

  const dedupedGradeFilteredSearchedClasses = gradeFilteredSearchedClasses.filter((cls) => {
    const isEmptyDefaultClass =
      cls.section === "" && (!cls.sections || cls.sections.length === 0);
    if (!isEmptyDefaultClass) return true;

    return !gradeFilteredSearchedClasses.some(
      (candidate) =>
        candidate.id !== cls.id &&
        candidate.academicYearId === cls.academicYearId &&
        candidate.name === cls.name &&
        (candidate.section !== "" ||
          (candidate.sections && candidate.sections.length > 0)),
    );
  });

  // Server-side search for sections
  const {
    data: searchedSections = [],
    isLoading: searchSectionsLoading,
  } = useQuery({
    queryKey: queryKeys.classSections.sectionSearch(debouncedSearch),
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        return [];
      }
      const resp = await sectionsAPI.search({ search: debouncedSearch });
      return (resp.data || []) as SectionData[];
    },
    enabled: isAuthenticated && debouncedSearch.length >= 2,
  });

  // Delete handlers
  const handleDeleteClass = async (id: string) => {
    try {
      await classesAPI.delete(id);
      toast.success("Class deleted");
      refetchClasses();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete class");
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      await sectionsAPI.delete(id);
      toast.success("Section deleted");
      refetchSections();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete section");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await subjectsAPI.delete(id);
      toast.success("Subject deleted");
      refetchSubjects();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete subject");
    }
  };

  // Filtered data - use server-side search if available, otherwise use client-side filtering
  const filteredClasses = debouncedSearch.length >= 2 
    ? dedupedGradeFilteredSearchedClasses 
    : dedupedGradeFilteredClasses.filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          c.name?.toLowerCase().includes(term) ||
          String(c.grade).includes(term) ||
          c.section?.toLowerCase().includes(term)
        );
      });

  const filteredSections = debouncedSearch.length >= 2
    ? searchedSections
    : sections.filter((s) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          s.name?.toLowerCase().includes(term) ||
          s.class?.name?.toLowerCase().includes(term) ||
          s.roomNumber?.toLowerCase().includes(term)
        );
      });

  const sortedFilteredSections = useMemo(
    () => [...filteredSections].sort(sortSectionsByGradeAndName),
    [filteredSections],
  );

  const filteredSubjects = subjects.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.code?.toLowerCase().includes(term)
    );
  });

  const totalSections = sections.length;
  const totalCapacity = sections.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const activeSubjects = subjects.filter((s) => s.isActive).length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="w-full px-6 py-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-black">
                  All Classes and Sections
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage classes, sections, and subjects in one place
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[720px] xl:items-end">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto xl:justify-end">
                  <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
                    <TabsTrigger value="classes" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm dark:text-gray-400 dark:data-[state=active]:text-[var(--brand-color,#e35336)]">
                      <School className="w-4 h-4" /> Classes ({gradeFilteredClasses.length})
                    </TabsTrigger>
                    <TabsTrigger value="sections" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm dark:text-gray-400 dark:data-[state=active]:text-[var(--brand-color,#e35336)]">
                      <Layers className="w-4 h-4" /> Sections ({totalSections})
                    </TabsTrigger>
                    <TabsTrigger value="subjects" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm dark:text-gray-400 dark:data-[state=active]:text-[var(--brand-color,#e35336)]">
                      <BookOpen className="w-4 h-4" /> Subjects ({subjects.length})
                    </TabsTrigger>
                  </TabsList>
                  <Select value={academicYearId} onValueChange={setAcademicYearId}>
                    <SelectTrigger className="h-8 w-full sm:w-44 dark:bg-slate-900 dark:border-slate-700">
                      <SelectValue placeholder="Academic Year" />
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
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* ========== CLASSES TAB ========== */}
          <TabsContent value="classes">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <School className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">All Classes</h2>
              </div>
              {classesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)]" />
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="text-center py-12">
                  <School className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 font-medium">No classes found</p>
                  <p className="text-sm text-gray-400">Create a class to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b dark:border-slate-700">
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Class Name</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Grade</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Academic Year</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">Sections</TableHead>
                        <TableHead className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClasses.map((cls) => (
                        <TableRow
                          key={cls.id}
                          className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="py-3 px-4">
                            <div 
                              onClick={() => window.location.href = `/admin/class-sections/${cls.id}`}
                              className="flex items-center gap-2 cursor-pointer hover:underline"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(var(--brand-color-rgb),0.12)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
                                <School className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {cls.name || `Grade ${cls.grade}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell">
                            <Badge variant="outline" className="dark:border-slate-600">{cls.grade}</Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell text-gray-600 dark:text-gray-400">
                            {cls.academicYear?.name || "—"}
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden lg:table-cell">
                            <div className="flex gap-1 flex-wrap">
                              {cls.sections?.length > 0 ? (
                                cls.sections.map((sec) => (
                                  <span
                                    key={sec.id}
                                    onClick={() => window.location.href = `/admin/class-sections/${cls.id}`}
                                    className="rounded px-2 py-0.5 text-xs font-medium cursor-pointer hover:underline bg-[rgba(var(--brand-color-rgb),0.1)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]"
                                  >
                                    {sec.name} ({sec.capacity})
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">No sections</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <EntityActions
                              entityLabel="Class"
                              formTable="class"
                              data={cls}
                              onDelete={() => handleDeleteClass(cls.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========== SECTIONS TAB ========== */}
          <TabsContent value="sections">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <Layers className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">All Sections</h2>
              </div>
              {sectionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)]" />
                </div>
              ) : sortedFilteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 font-medium">No sections found</p>
                  <p className="text-sm text-gray-400">Create a section to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b dark:border-slate-700">
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Section</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Class</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Capacity</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Room</TableHead>
                        <TableHead className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFilteredSections.map((sec) => (
                        <TableRow
                          key={sec.id}
                          className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="py-3 px-4">
                            <div 
                              onClick={() => window.location.href = `/admin/class-sections/${sec.class?.id}`}
                              className="flex items-center gap-2 cursor-pointer hover:underline"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(var(--brand-color-rgb),0.12)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
                                <Layers className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{sec.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell">
                            <div 
                              onClick={() => window.location.href = `/admin/class-sections/${sec.class?.id}`}
                              className="cursor-pointer text-gray-600 hover:text-[var(--brand-color,#e35336)] hover:underline dark:text-gray-400"
                            >
                              {sec.class?.name || `Grade ${sec.class?.grade}`}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {sec._count?.studentClasses || 0} / {sec.capacity}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell">
                            {sec.roomNumber ? (
                              <div className="flex items-center gap-1.5">
                                <DoorOpen className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{sec.roomNumber}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <EntityActions
                              entityLabel="Section"
                              formTable="section"
                              data={sec}
                              onDelete={() => handleDeleteSection(sec.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========== SUBJECTS TAB ========== */}
          <TabsContent value="subjects">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">All Subjects</h2>
                </div>
                <FormModal table="subject" type="create" />
              </div>
              {subjectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)]" />
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No subjects found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Create a subject to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b dark:border-slate-700">
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Subject Name</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Code</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Status</TableHead>
                        <TableHead className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">Description</TableHead>
                        <TableHead className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((sub) => (
                        <TableRow
                          key={sub.id}
                          className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(var(--brand-color-rgb),0.12)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
                                <BookOpen className="w-4 h-4 text-[var(--brand-color,#e35336)]" />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {sub.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell">
                            {sub.code ? (
                              <span className="font-mono text-gray-600 dark:text-gray-400">{sub.code}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden md:table-cell">
                            {sub.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                Inactive
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 hidden lg:table-cell text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                            {sub.description || <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <EntityActions
                              entityLabel="Subject"
                              formTable="subject"
                              data={sub}
                              onDelete={() => handleDeleteSubject(sub.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
