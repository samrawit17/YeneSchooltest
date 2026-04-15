"use client";

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { schoolSettingsAPI, academicYearsAPI, termsAPI } from "@/lib/api";
import { CalendarType, formatAcademicYear, formatSchoolDate } from "@/utils/date";

export interface AcademicYear {
  id: string;
  name?: string; // from backend
  label?: string; // from utility
  ethiopianYear?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  curriculumType?: string;
  terms?: AcademicTerm[];
}

export interface SchoolSettings {
  calendarType: CalendarType;
  defaultAcademicYearId?: string;
  curriculumType?: string;
}

export interface AcademicTerm {
  id: string;
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
  academicYear?: AcademicYear | null;
}

interface AcademicYearContextValue {
  currentAcademicYear: AcademicYear | null;
  currentTerm: AcademicTerm | null;
  schoolCalendarType: CalendarType;
  curriculumType: string;
  periodLabel: string;
  periodLabelPlural: string;
  formattedYearLabel: string;
  displayTermName: string;
  isLoading: boolean;
  formatDate: (date: Date | string) => string;
  // Methods for fetching all academic years
  getAllAcademicYears: () => Promise<AcademicYear[]>;
  getTermsForYear: (academicYearId: string) => Promise<AcademicTerm[]>;
  getCurrentAcademicYearId: () => string | null;
}

const AcademicYearContext = createContext<AcademicYearContextValue | undefined>(undefined);

const normalizeCurriculumType = (value: unknown): string => {
  if (typeof value !== "string") {
    return "SEMESTER";
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string" && parsed.trim()) {
      return parsed.trim().toUpperCase();
    }
  } catch {
    // Use raw string value when it is not JSON encoded.
  }

  return value.trim().toUpperCase() || "SEMESTER";
};

const extractEntity = <T,>(payload: any): T | null => {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    return null;
  }

  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data as T;
  }

  return payload as T;
};

const extractList = <T,>(payload: any): T[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (Array.isArray(payload.data)) {
    return payload.data as T[];
  }

  return [];
};

const getDefaultPeriodLabel = (curriculumType: string) => (
  curriculumType === "QUARTER" ? "Quarter" : curriculumType === "TERM" ? "Term" : "Semester"
);

const matchesCurrentDate = (term: AcademicTerm, now: Date): boolean => {
  if (!term.startDate || !term.endDate) {
    return false;
  }

  const startDate = new Date(term.startDate);
  const endDate = new Date(term.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  return startDate <= now && endDate >= now;
};

export const AcademicYearProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["school-settings", user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return null;
      try {
        const response = await schoolSettingsAPI.getAll(user.schoolId);
        return response.data;
      } catch (err) {
        return null;
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: academicYearData, isLoading: isLoadingAcademicYear } = useQuery({
    queryKey: ["active-academic-year", user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return null;

      let activeYear: AcademicYear | null = null;
      try {
        const activeResponse = await academicYearsAPI.getActive({ schoolId: user.schoolId });
        activeYear = extractEntity<AcademicYear>(activeResponse.data);
      } catch (err) {
        activeYear = null;
      }

      if (activeYear) {
        return activeYear;
      }

      try {
        const allResponse = await academicYearsAPI.getAll({ schoolId: user.schoolId });
        const allYears = extractList<AcademicYear>(allResponse.data);
        return allYears[0] || null;
      } catch (err) {
        return null;
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000,
  });

  // Query for all academic years
  const { data: allAcademicYearsData } = useQuery({
    queryKey: ["all-academic-years", user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      try {
        const response = await academicYearsAPI.getAll({ schoolId: user.schoolId });
        return extractList<AcademicYear>(response.data);
      } catch (err) {
        return [];
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: currentTermData, isLoading: isLoadingCurrentTerm } = useQuery({
    queryKey: ["current-term", user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return null;
      try {
        const response = await termsAPI.getCurrent({ schoolId: user.schoolId });
        return extractEntity<AcademicTerm>(response.data);
      } catch (err) {
        return null;
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const schoolCalendarType: CalendarType = 
    (settingsData?.calendar_type || settingsData?.calendarType) === "GREGORIAN" 
      ? 'GREGORIAN' 
      : 'ETHIOPIAN';

  const curriculumType = normalizeCurriculumType(
    settingsData?.curriculum_type
      ?? settingsData?.CURRICULUM_TYPE
      ?? currentTermData?.academicYear?.curriculumType
      ?? academicYearData?.curriculumType
      ?? "SEMESTER",
  );
  const periodLabel = getDefaultPeriodLabel(curriculumType);
  const periodLabelPlural = curriculumType === "QUARTER" ? "Quarters" : curriculumType === "TERM" ? "Terms" : "Semesters";

  const currentAcademicYear: AcademicYear | null = academicYearData || currentTermData?.academicYear || null;
  const currentTerm = useMemo<AcademicTerm | null>(() => {
    const activeYearId = currentAcademicYear?.id;
    const activeYearTerms = currentAcademicYear?.terms || [];
    const currentTermYearId = currentTermData?.academicYear?.id;
    const hasMatchingCurrentTerm =
      !!currentTermData &&
      (!!activeYearId ? currentTermYearId === activeYearId : true);

    if (hasMatchingCurrentTerm) {
      return currentTermData;
    }

    if (activeYearTerms.length === 0) {
      return currentTermData || null;
    }

    const now = new Date();
    const activeTerm = activeYearTerms.find((term) => matchesCurrentDate(term, now));
    return activeTerm || activeYearTerms[0] || null;
  }, [currentAcademicYear, currentTermData]);

  const formattedYearLabel = useMemo(() => {
    // Fallback to currentTerm dates if no academic year
    if (!currentAcademicYear && currentTerm?.startDate && currentTerm?.endDate) {
      return formatAcademicYear(
        {
          id: currentTerm.id,
          label: currentTerm.academicYear?.name || '',
          startDate: currentTerm.startDate,
          endDate: currentTerm.endDate,
        },
        { calendarType: schoolCalendarType }
      );
    }

    // Direct fallback using currentTerm.academicYear if available
    if (currentTerm?.academicYear && !currentAcademicYear) {
      return formatAcademicYear(
        {
          id: currentTerm.academicYear.id,
          label: currentTerm.academicYear.name || '',
          ethiopianYear: currentTerm.academicYear.ethiopianYear,
          startDate: currentTerm.academicYear.startDate,
          endDate: currentTerm.academicYear.endDate,
        },
        { calendarType: schoolCalendarType }
      );
    }

    if (!currentAcademicYear) {
      return currentTerm?.academicYear?.name || 'No Academic Year Set';
    }

    return formatAcademicYear(
      {
        id: currentAcademicYear.id,
        label: currentAcademicYear.name || currentAcademicYear.label || "",
        ethiopianYear: currentAcademicYear.ethiopianYear,
        startDate: currentAcademicYear.startDate,
        endDate: currentAcademicYear.endDate,
      },
      { calendarType: schoolCalendarType }
    );
  }, [currentAcademicYear, currentTerm, schoolCalendarType]);

  // Methods for fetching all academic years and terms
  const getAllAcademicYears = useCallback(async (): Promise<AcademicYear[]> => {
    if (!user?.schoolId) return [];
    try {
      const response = await academicYearsAPI.getAll({ schoolId: user.schoolId });
      return extractList<AcademicYear>(response.data);
    } catch (err) {
      return [];
    }
  }, [user?.schoolId]);

  const getTermsForYear = useCallback(async (academicYearId: string): Promise<AcademicTerm[]> => {
    try {
      const response = await termsAPI.getAll({ academicYearId });
      return extractList<AcademicTerm>(response.data);
    } catch (err) {
      return [];
    }
  }, []);

  const getCurrentAcademicYearId = useCallback((): string | null => {
    return currentAcademicYear?.id || null;
  }, [currentAcademicYear]);

  const value = useMemo(() => ({
    currentAcademicYear,
    currentTerm,
    schoolCalendarType,
    curriculumType,
    periodLabel,
    periodLabelPlural,
    formattedYearLabel,
    isLoading: isLoadingSettings || isLoadingAcademicYear || isLoadingCurrentTerm,
    formatDate: (date: Date | string) => formatSchoolDate(date, { calendarType: schoolCalendarType }),
    displayTermName: currentTerm
      ? currentTerm.name?.trim() || `${periodLabel} ${currentTerm.order || '1'}`
      : '',
    getAllAcademicYears,
    getTermsForYear,
    getCurrentAcademicYearId,
  }), [
    currentAcademicYear,
    currentTerm,
    schoolCalendarType,
    curriculumType,
    periodLabel,
    periodLabelPlural,
    formattedYearLabel,
    isLoadingSettings,
    isLoadingAcademicYear,
    isLoadingCurrentTerm,
    getAllAcademicYears,
    getTermsForYear,
    getCurrentAcademicYearId,
  ]);

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error("useAcademicYear must be used within an AcademicYearProvider");
  }
  return context;
};
