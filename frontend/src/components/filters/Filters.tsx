"use client";

import { useEffect, useState, useCallback } from "react";
import { classesAPI, academicYearsAPI } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useTranslations } from "@/hooks/useTranslations";

export interface FilterConfig {
  academicYear?: boolean;
  term?: boolean;
  grade?: boolean;
  section?: boolean;
  status?: boolean;
  curriculum?: boolean;
  search?: boolean;
}

export interface FilterOptions {
  statusOptions?: { value: string; label: string }[];
  curriculumOptions?: { value: string; label: string }[];
}

export interface FiltersProps {
  config: FilterConfig;
  options?: FilterOptions;
  
  selectedYear: string;
  onYearChange: (year: string) => void;
  
  selectedTerm?: string;
  onTermChange?: (term: string) => void;
  termOptions?: { id: string; name: string }[];
  
  selectedGrade?: string;
  onGradeChange?: (grade: string) => void;
  
selectedSection?: string;
  onSectionChange?: (section: string) => void;
  sectionMode?: "id" | "name";

  selectedStatus?: string;
  onStatusChange?: (status: string) => void;

  selectedCurriculum?: string;
  onCurriculumChange?: (curriculum: string) => void;

  selectedSearch?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;

  disabled?: boolean;
  className?: string;
}

interface AcademicYear {
  id: string;
  name: string;
  isActive?: boolean;
  curriculumType?: string;
}

interface SectionData {
  id: string;
  name: string;
}

interface ClassData {
  id: string;
  grade: number;
  name?: string;
  sections?: SectionData[];
}

const formatMessage = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );

export function Filters({
  config,
  options,
  selectedYear = "",
  onYearChange,
  selectedTerm = "",
  onTermChange,
  termOptions = [],
  selectedGrade = "",
  onGradeChange,
  selectedSection = "",
  onSectionChange,
  sectionMode = "id",
  selectedStatus = "",
  onStatusChange,
  selectedCurriculum = "",
  onCurriculumChange,

  selectedSearch = "",
  onSearchChange,
  searchPlaceholder = "Search...",

  disabled = false,
  className = "",
}: FiltersProps) {
  const { t } = useTranslations<any>("filters");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [grades, setGrades] = useState<{ id: string; grade: number }[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [curriculums, setCurriculums] = useState<{ value: string; label: string }[]>([]);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await academicYearsAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAcademicYears(data);
      
      const uniqueCurriculums = new Map<string, string>();
      data.forEach((y: AcademicYear) => {
        if (y.curriculumType && !uniqueCurriculums.has(y.curriculumType)) {
          uniqueCurriculums.set(y.curriculumType, y.curriculumType);
        }
      });
      setCurriculums(
        Array.from(uniqueCurriculums.entries()).map(([value, label]) => ({ value, label }))
      );
      
      if (data.length > 0 && !selectedYear) {
        const activeYear = data.find((y: AcademicYear) => y.isActive) || data[0];
        onYearChange(activeYear.id);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    } finally {
      setInitialLoading(false);
    }
  }, [selectedYear, onYearChange]);

  const fetchClasses = useCallback(async (yearId: string) => {
    if (!yearId) return;
    
    setLoading(true);
    try {
      const res = await classesAPI.getAll({ academicYearId: yearId });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setClasses(data);

      const uniqueGrades = new Map<number, { id: string; grade: number }>();
      data.forEach((c: ClassData) => {
        if (!uniqueGrades.has(c.grade)) {
          uniqueGrades.set(c.grade, { id: c.id, grade: c.grade });
        }
      });
      setGrades(
        Array.from(uniqueGrades.values()).sort((a, b) => a.grade - b.grade)
      );
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    if (classes.length === 0 || !selectedGrade) {
      setSections([]);
      return;
    }

    try {
      const filteredClasses = classes.filter(
        (c) => c.grade === parseInt(selectedGrade)
      );
      
      const uniqueSections = new Map<string, SectionData>();
      
      filteredClasses.forEach((c) => {
        if (c.sections && Array.isArray(c.sections)) {
          c.sections.forEach((s) => {
            if (!uniqueSections.has(s.id)) {
              uniqueSections.set(s.id, s);
            }
          });
        }
      });
      
      setSections(
        Array.from(uniqueSections.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  }, [selectedGrade, classes]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    if (selectedYear) {
      fetchClasses(selectedYear);
    } else {
      setClasses([]);
      setGrades([]);
      setSections([]);
    }
  }, [selectedYear, fetchClasses]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (!selectedGrade && onSectionChange && selectedSection) {
      onSectionChange("");
    }
  }, [onSectionChange, selectedGrade, selectedSection]);

  const handleYearChange = (year: string) => {
    if (year && year !== selectedYear) {
      onYearChange(year);
      if (onTermChange) onTermChange("");
      if (onGradeChange) onGradeChange("");
      if (onSectionChange) onSectionChange("");
    }
  };

  const handleGradeChange = (grade: string) => {
    if (onGradeChange) {
      if (grade !== selectedGrade) {
        onGradeChange(grade);
        if (onSectionChange) onSectionChange("");
      }
    }
  };

  const defaultStatusOptions = [
    { value: "SUBMITTED", label: t.labels.submitted },
    { value: "APPROVED", label: t.labels.approved },
    { value: "REJECTED", label: t.labels.rejected },
    { value: "DRAFT", label: t.labels.draft },
  ];

  const statusOptions = options?.statusOptions || defaultStatusOptions;
  const curriculumOptions = options?.curriculumOptions || curriculums;

  const filterClass = `flex flex-row flex-nowrap items-center gap-2 w-full ${className}`;

  if (initialLoading) {
    return (
      <div className={filterClass}>
        {config.search && <Skeleton className="h-9 flex-1" />}
        {config.academicYear && <Skeleton className="h-9 flex-1" />}
        {config.term && <Skeleton className="h-9 flex-1" />}
        {config.curriculum && <Skeleton className="h-9 flex-1" />}
        {config.grade && <Skeleton className="h-9 flex-1" />}
        {config.section && <Skeleton className="h-9 flex-1" />}
        {config.status && <Skeleton className="h-9 flex-1" />}
      </div>
    );
  }

  return (
    <div className={filterClass}>
      {config.search && onSearchChange && (
        <div className="relative w-[600px] min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder === "Search..." ? t.placeholders.search : searchPlaceholder}
            className="pl-10 h-9 text-sm w-full"
            value={selectedSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {config.academicYear && (
        <div className="flex-1 min-w-0">
          <Select
            value={selectedYear || ""}
            onValueChange={handleYearChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm w-full bg-transparent dark:bg-transparent" disabled={disabled}>
              <SelectValue placeholder={t.placeholders.academicYear} />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A1A1A]">
              {academicYears.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  {t.empty.academicYears}
                </SelectItem>
              ) : (
                academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name} {year.isActive && `(${t.labels.active})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.term && (
        <div className="flex-1 min-w-0">
          <Select
            value={selectedTerm || ""}
            onValueChange={(val) => onTermChange?.(val)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm w-full bg-transparent dark:bg-transparent" disabled={disabled}>
              <SelectValue placeholder={t.placeholders.term} />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A1A1A]">
              {!termOptions || termOptions.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  {t.empty.terms}
                </SelectItem>
              ) : (
                termOptions.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.curriculum && (
        <div className="flex-1 min-w-0">
          <Select
            value={selectedCurriculum || ""}
            onValueChange={(val) => onCurriculumChange?.(val)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm w-full bg-transparent dark:bg-transparent" disabled={disabled}>
              <SelectValue placeholder={t.placeholders.curriculum} />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A1A1A]">
              {curriculumOptions.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  {t.empty.curriculum}
                </SelectItem>
              ) : (
                curriculumOptions.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.grade && (
        <div className="flex-1 min-w-0">
          <Select
            value={selectedGrade || ""}
            onValueChange={handleGradeChange}
            disabled={disabled || !selectedYear || loading}
          >
            <SelectTrigger className="h-9 text-sm w-full bg-transparent dark:bg-transparent" disabled={disabled}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SelectValue placeholder={t.placeholders.grade} />
              )}
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A1A1A]">
              {grades.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  {t.empty.grades}
                </SelectItem>
              ) : (
                grades.map((grade) => (
                  <SelectItem key={grade.id} value={String(grade.grade)}>
                    {formatMessage(t.labels.grade, { grade: grade.grade })}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.section && onSectionChange && (
        <div className="flex-1 min-w-0">
          <Select
            value={selectedSection || ""}
            onValueChange={(val) => onSectionChange(val)}
            disabled={disabled || !selectedYear || !selectedGrade || loading}
          >
            <SelectTrigger className="h-9 text-sm w-full bg-transparent dark:bg-transparent" disabled={disabled || !selectedYear || !selectedGrade || loading}>
              <SelectValue placeholder={t.placeholders.section} />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A1A1A]">
              {!selectedGrade ? (
                <SelectItem value="select-grade-first" disabled>
                  Select a grade first
                </SelectItem>
              ) : sections.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  {t.empty.sections}
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="all">
                    {t.labels.allSections}
                  </SelectItem>
                  {sections.map((section) => (
                    <SelectItem 
                      key={section.id} 
                      value={sectionMode === "name" ? section.name : section.id}
                    >
                      {section.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.status && (
        <div className="flex-1 min-w-0">
          <Select
            value={selectedStatus || ""}
            onValueChange={(val) => onStatusChange?.(val)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm w-full bg-transparent dark:bg-transparent" disabled={disabled}>
              <SelectValue placeholder={t.placeholders.status} />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A1A1A]">
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Helper hook for managing filter state
export function useFilters(initialConfig: FilterConfig = {}) {
  const { currentAcademicYear, currentTerm } = useAcademicYear();
  
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedSearch, setSelectedSearch] = useState("");

  // Set initial values when currentAcademicYear/currentTerm are available
  useEffect(() => {
    if (!selectedYear && currentAcademicYear?.id) {
      setSelectedYear(currentAcademicYear.id);
    }
  }, [currentAcademicYear, selectedYear]);

  useEffect(() => {
    if (!selectedTerm && currentTerm?.id) {
      setSelectedTerm(currentTerm.id);
    }
  }, [currentTerm, selectedTerm]);

  const resetFilters = useCallback(() => {
    setSelectedYear(currentAcademicYear?.id || "");
    setSelectedTerm(currentTerm?.id || "");
    setSelectedGrade("");
    setSelectedSection("");
    setSelectedStatus("");
    setSelectedCurriculum("");
    setSelectedSearch("");
  }, [currentAcademicYear, currentTerm]);

  const getActiveFilters = useCallback(() => {
    const filters: Record<string, string> = {};
    if (selectedYear) filters.academicYear = selectedYear;
    if (selectedTerm) filters.termId = selectedTerm;
    if (selectedGrade) filters.grade = selectedGrade;
    if (selectedSection) filters.sectionId = selectedSection;
    if (selectedStatus) filters.status = selectedStatus;
    if (selectedCurriculum) filters.curriculum = selectedCurriculum;
    if (selectedSearch) filters.search = selectedSearch;
    return filters;
  }, [selectedYear, selectedTerm, selectedGrade, selectedSection, selectedStatus, selectedCurriculum, selectedSearch]);

  return {
    selectedYear,
    setSelectedYear,
    selectedTerm,
    setSelectedTerm,
    selectedGrade,
    setSelectedGrade,
    selectedSection,
    setSelectedSection,
    selectedStatus,
    setSelectedStatus,
    selectedCurriculum,
    setSelectedCurriculum,
    selectedSearch,
    setSelectedSearch,
    resetFilters,
    getActiveFilters,
  };
}

export default Filters;
