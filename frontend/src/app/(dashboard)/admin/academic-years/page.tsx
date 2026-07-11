"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, MoreHorizontal, Plus } from "lucide-react";
import { academicYearsAPI, schoolSettingsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/hooks/useTranslations";

interface Term {
  id: string;
  name: string;
  order: number;
  percentageWeight: number;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  curriculumType: "SEMESTER" | "QUARTER" | "TERM" | "CUSTOM";
  calendarType: "GREGORIAN" | "ETHIOPIAN";
  terms: Term[];
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

const CURRICULUM_TYPES = [
  {
    value: "SEMESTER",
    label: "Semester System",
    description: "2 periods (Semester 1, Semester 2)",
  },
  {
    value: "TERM",
    label: "Term System",
    description: "3 periods (Term 1, Term 2, Term 3)",
  },
  {
    value: "QUARTER",
    label: "Quarter System",
    description: "4 periods (Q1, Q2, Q3, Q4)",
  },
  {
    value: "CUSTOM",
    label: "Custom Periods",
    description: "Define your own number of periods",
  },
];

const CALENDAR_TYPES = [
  {
    value: "GREGORIAN",
    label: "Gregorian",
    description: "Standard international calendar",
  },
  {
    value: "ETHIOPIAN",
    label: "Ethiopian",
    description: "Traditional Ethiopian calendar (13 months)",
  },
];

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as any)?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
};

const isValidDate = (value: string) => {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
};

const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA <= endB && endA >= startB;

export default function AcademicYearsPage() {
  const { t } = useTranslations<any>("academicYears");
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState(user?.schoolId || "");

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termPendingDelete, setTermPendingDelete] = useState<Term | null>(null);
  const [yearPendingDelete, setYearPendingDelete] =
    useState<AcademicYear | null>(null);
  const [schoolCurriculumType, setSchoolCurriculumType] =
    useState<string>("QUARTER");
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (
      user.permissions?.includes("*") ||
      user.permissions?.includes(permission)
    ) {
      return true;
    }
    return (
      !user.permissions?.length && ["ADMIN", "IT_MANAGER"].includes(user.role)
    );
  };

  const canCreateAcademicYear =
    !!user &&
    ["ADMIN", "IT_MANAGER"].includes(user.role) &&
    hasPermission("academic_year:create");
  const canUpdateAcademicYear =
    !!user &&
    ["ADMIN", "IT_MANAGER"].includes(user.role) &&
    hasPermission("academic_year:update");
  const canDeleteAcademicYear =
    !!user &&
    ["ADMIN", "IT_MANAGER"].includes(user.role) &&
    hasPermission("academic_year:delete");
  const usesCustomPeriodWeights = selectedYear?.curriculumType === "CUSTOM";
  const isPastAcademicYear = selectedYear
    ? new Date(selectedYear.endDate) < new Date(new Date().toDateString())
    : false;

  const needsNewAcademicYear =
    canCreateAcademicYear &&
    academicYears.length > 0 &&
    !academicYears.some((y) => {
      const now = new Date();
      const end = new Date(y.endDate);
      const start = new Date(y.startDate);
      return (y.isActive && now <= end) || (now >= start && now <= end);
    });

  // Fetch school settings to get the curriculum type that controls period creation.
  useEffect(() => {
    const fetchSchoolSettings = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await schoolSettingsAPI.getAll(user.schoolId, {
          skipAuthErrorRedirect: true,
        });
        const curriculumType = response.data?.curriculum_type;
        if (curriculumType) {
          setSchoolCurriculumType(String(curriculumType).toUpperCase());
        }
      } catch (error) {
        console.error("Error fetching school settings:", error);
      }
    };
    fetchSchoolSettings();
  }, [user?.schoolId]);

  // Form states
  const [newYear, setNewYear] = useState({
    name: "",
    startDate: "",
    endDate: "",
    curriculumType: "",
  });

  const [newTerm, setNewTerm] = useState({
    name: "",
    order: 1,
    percentageWeight: 0,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (user?.schoolId) {
      setSchoolId(user.schoolId);
      fetchAcademicYears(user.schoolId);
      return;
    }
    setAcademicYears([]);
    setSelectedYear(null);
    setLoading(false);
  }, [authLoading, user?.schoolId, user?.calendarType]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calendarType = user?.calendarType || "ETHIOPIAN";

  const refreshAcademicContext = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.academicYears.list(schoolId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.academicYears.active(user?.schoolId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.terms.current(user?.schoolId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.school.settings(user?.schoolId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.academicYears.currentState,
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.currentRoot }),
    ]);
  };

  const fetchAcademicYears = async (sid: string) => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await academicYearsAPI.getAll({ schoolId: sid });
      setAcademicYears(response.data);
      // Select first year matching calendar type, or first available year
      const filteredYears = response.data.filter(
        (year: AcademicYear) =>
          year.calendarType === calendarType || !year.calendarType,
      );
      const yearsToConsider =
        filteredYears.length > 0 ? filteredYears : response.data;
      if (yearsToConsider.length > 0) {
        if (selectedYear) {
          const updatedSelectedYear = response.data.find(
            (y: AcademicYear) => y.id === selectedYear.id,
          );
          if (updatedSelectedYear) {
            setSelectedYear(updatedSelectedYear);
          } else {
            setSelectedYear(yearsToConsider[0]);
          }
        } else {
          setSelectedYear(yearsToConsider[0]);
        }
      } else {
        setSelectedYear(null);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
      const message = getApiErrorMessage(error, t.messages.loadFailed);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const validateAcademicYearForm = () => {
    if (!schoolId) return "School context is required.";
    if (!newYear.name.trim()) return "Academic year name is required.";
    if (!isValidDate(newYear.startDate) || !isValidDate(newYear.endDate)) {
      return "Start and end dates are required.";
    }
    if (new Date(newYear.startDate) >= new Date(newYear.endDate)) {
      return "Start date must be before end date.";
    }
    return null;
  };

  const validateTermForm = () => {
    if (!selectedYear) return "Select an academic year first.";
    const termName = newTerm.name.trim();
    if (!termName) return "Period name is required.";
    if (!Number.isInteger(newTerm.order) || newTerm.order < 1) {
      return "Order must be a positive whole number.";
    }
    if (usesCustomPeriodWeights) {
      if (
        typeof newTerm.percentageWeight !== "number" ||
        Number.isNaN(newTerm.percentageWeight) ||
        newTerm.percentageWeight < 0 ||
        newTerm.percentageWeight > 100
      ) {
        return "Weight must be between 0 and 100.";
      }
    }
    if (!isValidDate(newTerm.startDate) || !isValidDate(newTerm.endDate)) {
      return "Start and end dates are required.";
    }

    const startDate = new Date(newTerm.startDate);
    const endDate = new Date(newTerm.endDate);
    const yearStart = new Date(selectedYear.startDate);
    const yearEnd = new Date(selectedYear.endDate);

    if (startDate >= endDate) return "Start date must be before end date.";
    if (startDate < yearStart || endDate > yearEnd) {
      return "Period dates must be within the selected academic year.";
    }

    const duplicateName = selectedYear.terms.some(
      (term) =>
        term.id !== editingTerm?.id &&
        term.name.trim().toLowerCase() === termName.toLowerCase(),
    );
    if (duplicateName) return "A period with this name already exists.";

    const duplicateOrder = selectedYear.terms.some(
      (term) => term.id !== editingTerm?.id && term.order === newTerm.order,
    );
    if (duplicateOrder) return "A period with this order already exists.";

    const overlappingTerm = selectedYear.terms.find(
      (term) =>
        term.id !== editingTerm?.id &&
        rangesOverlap(
          startDate,
          endDate,
          new Date(term.startDate),
          new Date(term.endDate),
        ),
    );
    if (overlappingTerm) {
      return `Period dates overlap with ${overlappingTerm.name}.`;
    }

    if (usesCustomPeriodWeights) {
      const totalWeight =
        selectedYear.terms
          .filter((term) => term.id !== editingTerm?.id)
          .reduce((sum, term) => sum + term.percentageWeight, 0) +
        newTerm.percentageWeight;
      if (totalWeight > 100.01)
        return "Total period weight cannot exceed 100%.";
    }

    return null;
  };

  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateAcademicYear) {
      toast.error("You do not have permission to create academic years.");
      return;
    }
    const validationError = validateAcademicYearForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.create({
        name: newYear.name.trim(),
        startDate: newYear.startDate,
        endDate: newYear.endDate,
        schoolId,
        curriculumType: schoolCurriculumType || undefined,
        calendarType: user?.calendarType || "ETHIOPIAN",
      });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setShowCreateModal(false);
      setNewYear({ name: "", startDate: "", endDate: "", curriculumType: "" });
      toast.success(t.messages.yearCreated);
    } catch (error) {
      console.error("Error creating academic year:", error);
      toast.error(getApiErrorMessage(error, t.messages.yearCreateFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCurriculumType = async (curriculumType: string) => {
    if (!selectedYear) return;
    if (!canUpdateAcademicYear) {
      toast.error("You do not have permission to update academic years.");
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.updateCurriculumType(selectedYear.id, {
        curriculumType: curriculumType as any,
      });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      const updated = academicYears.find((y) => y.id === selectedYear.id);
      if (updated)
        setSelectedYear({ ...updated, curriculumType: curriculumType as any });
      toast.success(t.messages.curriculumUpdated);
    } catch (error) {
      console.error("Error updating curriculum type:", error);
      toast.error(getApiErrorMessage(error, t.messages.curriculumLocked));
    } finally {
      setSaving(false);
    }
  };

  const handleActivateYear = async (id: string) => {
    if (!canUpdateAcademicYear) {
      toast.error("You do not have permission to activate academic years.");
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.activate(id);
      await fetchAcademicYears(schoolId);
      setSelectedYear((prev) =>
        prev
          ? {
              ...prev,
              isActive: prev.id === id,
            }
          : prev,
      );
      await refreshAcademicContext();
      toast.success(t.messages.yearActivated);
    } catch (error) {
      console.error("Error activating academic year:", error);
      toast.error(getApiErrorMessage(error, t.messages.yearActivateFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear) return;
    if (!canUpdateAcademicYear) {
      toast.error("You do not have permission to update academic years.");
      return;
    }
    if (!usesCustomPeriodWeights) {
      toast.error(
        "Additional periods are only available for custom academic years.",
      );
      return;
    }
    const validationError = validateTermForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.createTerm(selectedYear.id, {
        ...newTerm,
        name: newTerm.name.trim(),
      });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setShowTermModal(false);
      setNewTerm({
        name: "",
        order: 1,
        percentageWeight: 0,
        startDate: "",
        endDate: "",
      });
      toast.success(t.messages.periodCreated);
    } catch (error) {
      console.error("Error creating term:", error);
      toast.error(getApiErrorMessage(error, t.messages.periodCreateFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;
    if (!canUpdateAcademicYear) {
      toast.error("You do not have permission to update academic years.");
      return;
    }
    const validationError = validateTermForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      setSaving(true);
      const termPayload = usesCustomPeriodWeights
        ? {
            ...newTerm,
            name: newTerm.name.trim(),
          }
        : {
            name: newTerm.name.trim(),
            order: newTerm.order,
            startDate: newTerm.startDate,
            endDate: newTerm.endDate,
          };
      await academicYearsAPI.updateTerm(editingTerm.id, {
        ...termPayload,
      });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setEditingTerm(null);
      setShowTermModal(false);
      toast.success(t.messages.periodUpdated);
    } catch (error) {
      console.error("Error updating term:", error);
      toast.error(getApiErrorMessage(error, t.messages.periodUpdateFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleLockTerm = async (termId: string, isLocked: boolean) => {
    if (!canUpdateAcademicYear) {
      toast.error("You do not have permission to update academic years.");
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.lockTerm(termId, !isLocked);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      toast.success(
        !isLocked ? t.messages.periodLocked : t.messages.periodUnlocked,
      );
    } catch (error) {
      console.error("Error locking term:", error);
      toast.error(
        getApiErrorMessage(
          error,
          !isLocked
            ? t.messages.periodLockFailed
            : t.messages.periodUnlockFailed,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!canDeleteAcademicYear) {
      toast.error("You do not have permission to delete periods.");
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.deleteTerm(termId);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setTermPendingDelete(null);
      toast.success(t.messages.periodDeleted);
    } catch (error) {
      console.error("Error deleting term:", error);
      toast.error(getApiErrorMessage(error, t.messages.periodDeleteFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAcademicYear = async () => {
    if (!yearPendingDelete) return;
    if (!canDeleteAcademicYear) {
      toast.error("You do not have permission to delete academic years.");
      return;
    }
    try {
      setSaving(true);
      await academicYearsAPI.delete(yearPendingDelete.id, {
        skipAuthErrorRedirect: true,
      });
      setYearPendingDelete(null);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      toast.success(t.messages.yearDeleted);
    } catch (error) {
      console.error("Error deleting academic year:", error);
      toast.error(getApiErrorMessage(error, t.messages.yearDeleteFailed));
    } finally {
      setSaving(false);
    }
  };

  const openEditTerm = (term: Term) => {
    setEditingTerm(term);
    setNewTerm({
      name: term.name,
      order: term.order,
      percentageWeight: term.percentageWeight,
      startDate: term.startDate.split("T")[0],
      endDate: term.endDate.split("T")[0],
    });
    setShowTermModal(true);
  };

  const openAddTerm = () => {
    if (!selectedYear) return;
    const nextOrder =
      selectedYear.terms.reduce((max, term) => Math.max(max, term.order), 0) +
      1;
    const remainingWeight = Math.max(0, 100 - getTotalWeight());
    setEditingTerm(null);
    setNewTerm({
      name: "",
      order: nextOrder,
      percentageWeight: Number(remainingWeight.toFixed(2)),
      startDate: "",
      endDate: "",
    });
    setShowTermModal(true);
  };

  const getTotalWeight = () => {
    if (!selectedYear) return 0;
    return selectedYear.terms.reduce(
      (sum, term) => sum + term.percentageWeight,
      0,
    );
  };

  const getYearStatus = (year: AcademicYear) => {
    const now = new Date();
    const end = new Date(year.endDate);
    if (year.isActive && now <= end) return t.active;
    const start = new Date(year.startDate);
    if (now >= start && now <= end) return t.current;
    if (now < start) return t.upcoming;
    return t.past;
  };

  const getTermStatus = (term: Term) => {
    const now = new Date();
    const start = new Date(term.startDate);
    const end = new Date(term.endDate);
    if (term.isLocked) return t.locked;
    if (now >= start && now <= end) return t.active;
    if (now < start) return t.upcoming;
    return t.completed;
  };

  const getTermStatusColor = (status: string) => {
    switch (status) {
      case t.active:
        return "bg-[rgba(var(--brand-color-rgb),0.1)] dark:bg-[rgba(var(--brand-color-rgb),0.18)] text-[var(--brand-color)]";
      case t.locked:
        return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400";
      case t.completed:
        return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400";
      default:
        return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6 px-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-6 border dark:border-[#2A2A2A]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-full md:w-64" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-6 border dark:border-[#2A2A2A]">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="px-4">
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h1 className="text-base font-semibold">
                School context required
              </h1>
              <p className="mt-1 text-sm">
                Academic years are managed per school. Sign in as a school admin
                or IT manager to manage this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-4">
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h1 className="text-base font-semibold">
                  Failed to load academic years
                </h1>
                <p className="mt-1 text-sm">{loadError}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fetchAcademicYears(schoolId)}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-black">{t.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
        </div>
        {canCreateAcademicYear && (
          <Button type="button" onClick={() => setShowCreateModal(true)} className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg" style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}>
            <Plus className="h-4 w-4" />
            {t.newAcademicYear.replace(/^\+\s*/, "")}
          </Button>
        )}
      </div>

      {needsNewAcademicYear && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Academic year has ended
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                The current academic year has ended. Create a new academic year
                to continue managing classes, enrollments, and grading.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                Create New Academic Year
              </Button>
            </div>
          </div>
        </div>
      )}

      {!selectedYear && academicYears.length === 0 && (
        <div className="flex min-h-[55vh] items-center justify-center">
          <p className="text-center text-lg font-medium text-gray-500 dark:text-gray-400">
            {t.empty}
          </p>
        </div>
      )}

      {selectedYear && (
        <>
          {/* Periods/Terms */}
          <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-6 border dark:border-[#2A2A2A]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold dark:text-white">
                  {t.periods} (
                  {selectedYear.curriculumType || schoolCurriculumType})
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t.periodDescription}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[340px] md:flex-row">
                <select
                  value={selectedYear?.id || ""}
                  onChange={(e) => {
                    const year = academicYears.find(
                      (y) => y.id === e.target.value,
                    );
                    setSelectedYear(year || null);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/35 dark:border-gray-600 dark:bg-[#1A1A1A] dark:text-white"
                >
                  {academicYears.map((year) => {
                    const status = getYearStatus(year);
                    return (
                      <option key={year.id} value={year.id}>
                        {year.name} ({year.calendarType || "ETHIOPIAN"}) -{" "}
                        {status}
                      </option>
                    );
                  })}
                </select>
                {canUpdateAcademicYear &&
                  usesCustomPeriodWeights &&
                  getTotalWeight() < 100 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={openAddTerm}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      {t.addPeriod}
                    </Button>
                  )}
              </div>
            </div>

            {/* Terms Table */}
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-[#1A1A1A]">
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.periodName}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.order}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.startDate}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.endDate}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.status}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-[#2A2A2A]">
                  {[...selectedYear.terms]
                    .sort((a, b) => a.order - b.order)
                    .map((term) => {
                      const status = getTermStatus(term);
                      const isCurrent = status === t.active;
                      const canShowActions =
                        canUpdateAcademicYear || canDeleteAcademicYear;
                      return (
                        <TableRow
                          key={term.id}
                          className={`${term.isLocked ? "bg-gray-50 dark:bg-[#1A1A1A]" : "dark:hover:bg-[#1A1A1A]/50"} ${isCurrent ? "ring-2 ring-inset ring-[var(--brand-color)]" : ""}`}
                        >
                          <TableCell className="px-4 py-3 font-medium dark:text-white">
                            <div className="flex items-center gap-2">
                              {term.name}
                              {isCurrent && (
                                <span className="flex h-2 w-2 rounded-full bg-[var(--brand-color)] animate-pulse" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 dark:text-gray-300">
                            {term.order}
                          </TableCell>
                          <TableCell className="px-4 py-3 dark:text-gray-300">
                            <FormattedDate date={term.startDate} />
                          </TableCell>
                          <TableCell className="px-4 py-3 dark:text-gray-300">
                            <FormattedDate date={term.endDate} />
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${getTermStatusColor(status)}`}
                            >
                              {status}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {canShowActions ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-[#1A1A1A] dark:hover:text-gray-200"
                                    aria-label={t.actions}
                                    disabled={saving}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canUpdateAcademicYear && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => openEditTerm(term)}
                                        disabled={term.isLocked}
                                      >
                                        {t.edit}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleLockTerm(term.id, term.isLocked)
                                        }
                                      >
                                        {term.isLocked ? t.unlock : t.lock}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {canDeleteAcademicYear && (
                                    <DropdownMenuItem
                                      onClick={() => setTermPendingDelete(term)}
                                      disabled={term.isLocked}
                                      className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                    >
                                      {t.delete}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {selectedYear.terms.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t.noPeriods}
              </p>
            )}
          </div>

          {/* Activate Button */}
          {!selectedYear.isActive && canUpdateAcademicYear && (
            <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-6 border dark:border-[#2A2A2A]">
              <button
                onClick={() => handleActivateYear(selectedYear.id)}
                disabled={saving || getTotalWeight() !== 100}
                className="rounded-lg bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs px-6 py-2 disabled:opacity-50"
                style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
              >
                {t.activate}
              </button>
              {getTotalWeight() !== 100 && (
                <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                  {t.weightWarning}
                </p>
              )}
            </div>
          )}

          {/* Delete Academic Year */}
          {canDeleteAcademicYear && !isPastAcademicYear && (
            <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-6 border border-red-200 dark:border-red-900/60">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                Delete Academic Year
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will permanently delete this academic year along with all
                its classes, terms, assessments, enrollments, fees, and
                timetable slots. This action cannot be undone.
              </p>
              <button
                onClick={() => setYearPendingDelete(selectedYear)}
                disabled={saving}
                className="rounded-lg bg-red-600 px-6 py-2 text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                Delete This Academic Year
              </button>
            </div>
          )}

          {canDeleteAcademicYear && isPastAcademicYear && (
            <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-6 border border-gray-200 dark:border-[#2A2A2A]">
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Past Academic Year
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                This academic year has ended. Past academic years cannot be
                deleted to preserve historical records.
              </p>
              <button
                disabled
                className="rounded-lg bg-gray-400 px-6 py-2 text-white cursor-not-allowed"
              >
                Delete This Academic Year
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Academic Year Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md border dark:border-[#2A2A2A] dark:bg-[#111111]">
          <DialogHeader>
            <DialogTitle>{t.createYear}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAcademicYear} className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              {t.curriculumNotice} <strong>{schoolCurriculumType}</strong>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.name}
              </label>
              <input
                type="text"
                value={newYear.name}
                onChange={(e) =>
                  setNewYear({ ...newYear, name: e.target.value })
                }
                placeholder="2025-2026"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.startDate}
                </label>
                <CalendarDatePicker
                  value={
                    newYear.startDate ? new Date(newYear.startDate) : undefined
                  }
                  onChange={(date) =>
                    setNewYear({
                      ...newYear,
                      startDate: date ? date.toISOString() : "",
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.endDate}
                </label>
                <CalendarDatePicker
                  value={
                    newYear.endDate ? new Date(newYear.endDate) : undefined
                  }
                  onChange={(date) =>
                    setNewYear({
                      ...newYear,
                      endDate: date ? date.toISOString() : "",
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={saving || !canCreateAcademicYear}
                    className="rounded-lg bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs px-4 py-2"
                    style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
              >
                {saving ? t.creating : t.create}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Term Modal */}
      {showTermModal &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#111111] rounded-lg p-6 w-full max-w-md border dark:border-[#2A2A2A]">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">
                {editingTerm ? t.editPeriod : t.addPeriod}
              </h3>
              <form
                onSubmit={editingTerm ? handleUpdateTerm : handleCreateTerm}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.periodName}
                  </label>
                  <input
                    type="text"
                    value={newTerm.name}
                    onChange={(e) =>
                      setNewTerm({ ...newTerm, name: e.target.value })
                    }
                    placeholder={
                      selectedYear?.curriculumType === "QUARTER"
                        ? "Quarter 1"
                        : "Semester 1"
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                  />
                </div>
                <div
                  className={
                    usesCustomPeriodWeights ? "grid grid-cols-2 gap-4" : ""
                  }
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.order}
                    </label>
                    <input
                      type="number"
                      value={newTerm.order}
                      onChange={(e) =>
                        setNewTerm({
                          ...newTerm,
                          order: parseInt(e.target.value),
                        })
                      }
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                    />
                  </div>
                  {usesCustomPeriodWeights && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Advanced grading weight %
                      </label>
                      <input
                        type="number"
                        value={newTerm.percentageWeight}
                        onChange={(e) =>
                          setNewTerm({
                            ...newTerm,
                            percentageWeight: parseFloat(e.target.value),
                          })
                        }
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.startDate}
                    </label>
                    <CalendarDatePicker
                      value={
                        newTerm.startDate
                          ? new Date(newTerm.startDate)
                          : undefined
                      }
                      onChange={(date) =>
                        setNewTerm({
                          ...newTerm,
                          startDate: date ? date.toISOString() : "",
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.endDate}
                    </label>
                    <CalendarDatePicker
                      value={
                        newTerm.endDate ? new Date(newTerm.endDate) : undefined
                      }
                      onChange={(date) =>
                        setNewTerm({
                          ...newTerm,
                          endDate: date ? date.toISOString() : "",
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTermModal(false);
                      setEditingTerm(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-300"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !canUpdateAcademicYear}
                className="rounded-lg bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs px-4 py-2"
                style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                  >
                    {saving ? t.saving : editingTerm ? t.update : t.create}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      <AlertDialog
        open={!!termPendingDelete}
        onOpenChange={(open) => {
          if (!open) setTermPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete period</AlertDialogTitle>
            <AlertDialogDescription>
              {termPendingDelete
                ? `Delete ${termPendingDelete.name}? This is only allowed when the period is unlocked and has no grades.`
                : t.messages.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !termPendingDelete}
              onClick={(event) => {
                event.preventDefault();
                if (termPendingDelete) {
                  handleDeleteTerm(termPendingDelete.id);
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? t.saving : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!yearPendingDelete}
        onOpenChange={(open) => {
          if (!open) setYearPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.messages.yearDeleteConfirm || "Delete Academic Year"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {yearPendingDelete
                ? `Are you sure you want to delete ${yearPendingDelete.name}? This will permanently delete this academic year along with all its classes, terms, assessments, enrollments, fees, and timetable slots. This action cannot be undone.`
                : t.messages.yearDeleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !yearPendingDelete}
              onClick={(event) => {
                event.preventDefault();
                handleDeleteAcademicYear();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? t.saving : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
