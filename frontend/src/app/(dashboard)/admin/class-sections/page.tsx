"use client";

import { useState, useEffect, useCallback } from "react";
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
  Search,
  RefreshCw,
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
    ? gradeFilteredSearchedClasses 
    : gradeFilteredClasses.filter((c) => {
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">

              <div>
                <h1 className="text-2xl font-bold text-black">
                  All Classes and Sections
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage classes, sections, and subjects in one place
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: School,
              label: "Classes",
              value: gradeFilteredClasses.length,
              color: "text-blue-500",
              bg: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              icon: Layers,
              label: "Sections",
              value: totalSections,
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-950/30",
            },

            {
              icon: Users,
              label: "Total Capacity",
              value: `${totalCapacity}`,
              color: "text-orange-500",
              bg: "bg-orange-50 dark:bg-orange-950/30",
            },
            {
              icon: Hash,
              label: "Section Capacity",
              value: sectionCapacitySetting || 30,
              color: "text-cyan-500",
              bg: "bg-cyan-50 dark:bg-cyan-950/30",
            },
          ].map((stat) => (
            <Card key={stat.label} className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-xl font-bold dark:text-white">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search classes, sections, or subjects..."
              className="pl-9 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger className="w-full md:w-52 dark:bg-slate-900 dark:border-slate-700">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto p-1 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
            <TabsTrigger value="classes" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
              <School className="w-4 h-4" /> Classes ({gradeFilteredClasses.length})
            </TabsTrigger>
            <TabsTrigger value="sections" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4" /> Sections ({totalSections})
            </TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
              <BookOpen className="w-4 h-4" /> Subjects ({subjects.length})
            </TabsTrigger>
          </TabsList>

          {/* ========== CLASSES TAB ========== */}
          <TabsContent value="classes">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <School className="w-5 h-5 text-blue-500" /> All Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
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
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                                  <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                                      className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded text-xs font-medium hover:underline cursor-pointer"
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== SECTIONS TAB ========== */}
          <TabsContent value="sections">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="w-5 h-5 text-emerald-500" /> All Sections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sectionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : filteredSections.length === 0 ? (
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
                        {filteredSections.map((sec) => (
                          <TableRow
                            key={sec.id}
                            className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <TableCell className="py-3 px-4">
                              <div 
                                onClick={() => window.location.href = `/admin/class-sections/${sec.class?.id}`}
                                className="flex items-center gap-2 cursor-pointer hover:underline"
                              >
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{sec.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 hidden md:table-cell">
                              <div 
                                onClick={() => window.location.href = `/admin/class-sections/${sec.class?.id}`}
                                className="text-gray-600 dark:text-gray-400 hover:underline hover:text-blue-600 cursor-pointer"
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== SUBJECTS TAB ========== */}
          <TabsContent value="subjects">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-5 h-5 text-purple-500" /> All Subjects
                </CardTitle>
                <FormModal table="subject" type="create" />
              </CardHeader>
              <CardContent>
                {subjectsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
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
                                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
