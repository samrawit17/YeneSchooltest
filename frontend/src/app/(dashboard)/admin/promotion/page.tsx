"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  GraduationCap,
  Award,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { academicYearsAPI, classesAPI } from "@/lib/api";
import { promotionAPI, PromotionCandidate } from "@/lib/api/reporting";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface PromotionData {
  className: string;
  academicYear: string;
  totalStudents: number;
  candidates: PromotionCandidate[];
}

interface AcademicYearOption {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

type PromotionStream = "NATURAL" | "SOCIAL";

const parseRollNumber = (rollNumber?: string | null) => {
  if (!rollNumber) return Number.POSITIVE_INFINITY;
  const parsed = Number.parseInt(rollNumber, 10);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const toTime = (date?: string | null) => {
  if (!date) return 0;
  const parsed = new Date(date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortAcademicYears = (years: AcademicYearOption[]) =>
  years.slice().sort((a, b) => {
    const dateCompare = toTime(a.startDate) - toTime(b.startDate);
    if (dateCompare !== 0) return dateCompare;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const isYearEnded = (endDate?: string | null) => {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return new Date() > end;
};

export default function PromotionPage() {
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();

  const [gradeOptions, setGradeOptions] = useState<number[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [promotionData, setPromotionData] = useState<PromotionData | null>(null);
  const [nextGrades, setNextGrades] = useState<{ grade: number; name: string }[]>([]);
  const [selectedNextGrade, setSelectedNextGrade] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedTargetYearId, setSelectedTargetYearId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [promoteAll, setPromoteAll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [minAverageGrade, setMinAverageGrade] = useState<number>(50);
  const [minAttendance, setMinAttendance] = useState<number>(75);
  const [attendanceEnabled, setAttendanceEnabled] = useState<boolean>(true);
  const [streamAssignments, setStreamAssignments] = useState<Record<string, PromotionStream | "">>({});

  const currentAcademicYearName = currentAcademicYear?.name || "";
  const currentAcademicYearEnded = isYearEnded(currentAcademicYear?.endDate);
  const sortedAcademicYears = useMemo(() => sortAcademicYears(academicYears), [academicYears]);
  const targetYearOptions = useMemo(() => {
    if (!currentAcademicYear) return sortedAcademicYears;
    const currentIndex = sortedAcademicYears.findIndex(
      (year) => year.id === currentAcademicYear.id || year.name === currentAcademicYear.name,
    );
    if (currentIndex >= 0) return sortedAcademicYears.slice(currentIndex + 1);
    const currentEnd = toTime(currentAcademicYear.endDate);
    return sortedAcademicYears.filter((year) => toTime(year.startDate) > currentEnd);
  }, [currentAcademicYear, sortedAcademicYears]);
  const selectedTargetYear = academicYears.find((year) => year.id === selectedTargetYearId) || null;
  const selectedTargetYearName = selectedTargetYear?.name || "";
  const requiresStreamAssignment = Number(selectedNextGrade) === 11;

  const fetchGrades = useCallback(async () => {
    try {
      const response = await classesAPI.getAll({ academicYearId: currentAcademicYear?.id });
      const data = response.data?.data || response.data || [];
      const grades = Array.from(
        new Set<number>(
          data
            .map((cls: any) => Number(cls.grade))
            .filter((grade: number) => Number.isFinite(grade)),
        ),
      ).sort((a, b) => a - b);
      setGradeOptions(grades);
      if (grades.length > 0) {
        setSelectedGrade((current) =>
          grades.some((grade) => String(grade) === current) ? current : String(grades[0]),
        );
      }
    } catch (err) {
      console.error("Failed to fetch grades:", err);
    }
  }, [currentAcademicYear?.id]);

  const fetchAcademicYears = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const response = await academicYearsAPI.getAll({ schoolId: user.schoolId });
      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setAcademicYears(data);
    } catch (err) {
      console.error("Failed to fetch academic years:", err);
      toast.error("Failed to load academic years");
      setAcademicYears([]);
    }
  }, [user?.schoolId]);

  const fetchPromotionData = useCallback(async () => {
    if (!selectedGrade) return;
    setLoading(true);
    try {
      const response = await promotionAPI.getGradeCandidates(Number(selectedGrade), {
        academicYear: currentAcademicYearName,
        minAverageGrade,
        ...(attendanceEnabled ? { minAttendance } : {}),
      });
      setPromotionData(response.data);
      setSelectedStudents(new Set());
      setPromoteAll(false);
    } catch (err: any) {
      console.error("Failed to fetch candidates:", err);
      toast.error(err.response?.data?.message || "Failed to load promotion candidates");
      setPromotionData(null);
    } finally {
      setLoading(false);
    }
  }, [currentAcademicYearName, selectedGrade, minAverageGrade, attendanceEnabled, minAttendance]);

  const fetchNextGrades = useCallback(async () => {
    if (!selectedGrade) return;
    try {
      const response = await promotionAPI.getNextGrades(Number(selectedGrade), {
        toAcademicYear: selectedTargetYearName,
      });
      const grades = response.data.nextGrades || [];
      setNextGrades(grades);
      setSelectedNextGrade(grades.length > 0 ? String(grades[0].grade) : "graduation");
    } catch (err: any) {
      console.error("Failed to fetch next grades:", err);
      toast.error(err.response?.data?.message || "Failed to load destination grade");
      setNextGrades([]);
      setSelectedNextGrade("");
    }
  }, [selectedGrade, selectedTargetYearName]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    if (targetYearOptions.length === 0) {
      setSelectedTargetYearId("");
      return;
    }
    if (!targetYearOptions.some((year) => year.id === selectedTargetYearId)) {
      setSelectedTargetYearId(targetYearOptions[0].id);
    }
  }, [selectedTargetYearId, targetYearOptions]);

  useEffect(() => {
    if (selectedGrade) {
      fetchPromotionData();
      fetchNextGrades();
    }
  }, [fetchNextGrades, fetchPromotionData, selectedGrade]);

  useEffect(() => {
    if (!requiresStreamAssignment) {
      setStreamAssignments({});
    }
  }, [requiresStreamAssignment]);

  const handleSelectAll = () => {
    if (!promotionData) return;
    const promotable = promotionData.candidates
      .filter((c) => c.status === "PROMOTED")
      .map((c) => c.student.id);

    if (selectedStudents.size === promotable.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(promotable));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const setStreamForStudents = (studentIds: string[], stream: PromotionStream) => {
    setStreamAssignments((current) => {
      const next = { ...current };
      for (const studentId of studentIds) {
        next[studentId] = stream;
      }
      return next;
    });
  };

  const handlePromote = async () => {
    if (!currentAcademicYearEnded) {
      toast.error(
        currentAcademicYearName
          ? `Promotion is locked until academic year ${currentAcademicYearName} ends`
          : "Promotion is locked until the current academic year ends",
      );
      return;
    }

    if (!selectedNextGrade) {
      toast.error("Please select a destination grade");
      return;
    }

    if (!selectedTargetYearName) {
      toast.error("Please select the destination academic year");
      return;
    }

    if (selectedTargetYearName === currentAcademicYearName) {
      toast.error("Destination academic year must be different from the source academic year");
      return;
    }

    if (!promoteAll && selectedStudents.size === 0) {
      toast.error("Please select students to promote");
      return;
    }

    const selectedPromotable = promoteAll
      ? promotableStudents
      : promotableStudents.filter((candidate) => selectedStudents.has(candidate.student.id));
    const missingStreams = requiresStreamAssignment
      ? selectedPromotable.filter((candidate) => !streamAssignments[candidate.student.id])
      : [];

    if (missingStreams.length > 0) {
      toast.error(
        `Assign Natural or Social stream for ${missingStreams.slice(0, 3).map((candidate) => candidate.student.name).join(", ")}${missingStreams.length > 3 ? " and others" : ""}`,
      );
      return;
    }

    const streams = requiresStreamAssignment
      ? selectedPromotable.reduce<Record<string, PromotionStream>>((acc, candidate) => {
          const stream = streamAssignments[candidate.student.id];
          if (stream === "NATURAL" || stream === "SOCIAL") {
            acc[candidate.student.id] = stream;
          }
          return acc;
        }, {})
      : undefined;

    const confirmMessage = promoteAll
      ? `Promote ALL eligible Grade ${selectedGrade} students?`
      : `Promote ${selectedStudents.size} selected Grade ${selectedGrade} student(s)?`;

    toast.warning(confirmMessage, {
      duration: 10000,
      style: {
        width: "420px",
        maxWidth: "calc(100vw - 2rem)",
        background: "#ef4444",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.18)",
      },
      action: {
        label: "Confirm",
        onClick: async () => {
          setActionLoading(true);
          try {
            const result = await promotionAPI.bulkPromote({
              fromGrade: Number(selectedGrade),
              toGrade: selectedNextGrade === "graduation" ? null : Number(selectedNextGrade),
              fromAcademicYear: currentAcademicYearName,
              toAcademicYear: selectedTargetYearName,
              studentIds: Array.from(selectedStudents),
              promoteAll,
              minAverageGrade: clampPercent(minAverageGrade),
              ...(attendanceEnabled ? { minAttendance: clampPercent(minAttendance) } : {}),
              ...(streams ? { streams } : {}),
            });

            toast.success(
              `Promotion complete. Promoted: ${result.data.promoted}, Retained: ${result.data.retained}${
                result.data.failed > 0 ? `, Failed: ${result.data.failed}` : ""
              }`
            );

            fetchPromotionData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to promote students");
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
      classNames: {
        actionButton:
          "!bg-white !text-red-600 hover:!bg-red-50 !border-0 !font-semibold",
        cancelButton:
          "!bg-red-500/70 !text-white hover:!bg-red-500 !border !border-white/20 !font-medium",
      },
    });
  };

  const stats = {
    total: promotionData?.candidates.length || 0,
    promoted: promotionData?.candidates.filter((c) => c.status === "PROMOTED").length || 0,
    retained: promotionData?.candidates.filter((c) => c.status === "RETAINED").length || 0,
    noData: promotionData?.candidates.filter((c) => c.status === "NO_DATA").length || 0,
  };

  const promotableStudents = promotionData?.candidates.filter((c) => c.status === "PROMOTED") || [];
  const selectedPromotableStudents = promoteAll
    ? promotableStudents
    : promotableStudents.filter((candidate) => selectedStudents.has(candidate.student.id));
  const assignedStreamCount = requiresStreamAssignment
    ? selectedPromotableStudents.filter((candidate) => streamAssignments[candidate.student.id]).length
    : 0;
  const missingStreamCount = requiresStreamAssignment
    ? Math.max(0, selectedPromotableStudents.length - assignedStreamCount)
    : 0;
  const sortedCandidates = (promotionData?.candidates || []).slice().sort((a, b) => {
    const rollComparison = parseRollNumber(a.student.rollNumber) - parseRollNumber(b.student.rollNumber);
    if (rollComparison !== 0) return rollComparison;

    const rollLabelA = a.student.rollNumber || "";
    const rollLabelB = b.student.rollNumber || "";
    if (rollLabelA !== rollLabelB) {
      return rollLabelA.localeCompare(rollLabelB, undefined, { numeric: true, sensitivity: "base" });
    }

    return a.student.name.localeCompare(b.student.name, undefined, { sensitivity: "base" });
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <header className="bg-transparent px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Student Promotion
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Promote students to the next grade level
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        {!currentAcademicYearEnded ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Promotion is locked for the active academic year.</p>
              <p className="mt-1 text-sm">
                {currentAcademicYearName
                  ? `${currentAcademicYearName} must end before students can be promoted.`
                  : "The current academic year must end before students can be promoted."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-[#2A2A2A] p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
              >
                <option value="">Select a grade</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={String(grade)}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Destination Grade
              </label>
              <select
                value={selectedNextGrade}
                onChange={(e) => setSelectedNextGrade(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
              >
                <option value="">Select destination</option>
                {nextGrades.map((grade) => (
                  <option key={grade.grade} value={String(grade.grade)}>
                    {grade.name}
                  </option>
                ))}
                {nextGrades.length === 0 && (
                  <option value="graduation">Graduation (Final Grade)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Destination Academic Year
              </label>
              <select
                value={selectedTargetYearId}
                onChange={(e) => setSelectedTargetYearId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
              >
                <option value="">Select target year</option>
                {targetYearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
              {targetYearOptions.length === 0 ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                  Create the next academic year before promoting students.
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Promotion Criteria
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minAverageGrade}
                    onChange={(e) => setMinAverageGrade(clampPercent(Number(e.target.value)))}
                    placeholder="Min Grade"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Min Grade %</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(clampPercent(Number(e.target.value)))}
                    placeholder="Min Attendance"
                    disabled={!attendanceEnabled}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <label htmlFor="attendance-toggle" className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      id="attendance-toggle"
                      checked={attendanceEnabled}
                      onChange={(e) => setAttendanceEnabled(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Min Attendance %
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedGrade && (
          <>


            <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-[#2A2A2A] overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-[#2A2A2A] flex items-center justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                  <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Promotion Candidates - {promotionData?.className}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Academic Year: {promotionData?.academicYear}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/70">
                      <div className="text-gray-500 dark:text-gray-400">Eligible</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{stats.promoted}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/70">
                      <div className="text-gray-500 dark:text-gray-400">Retained</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{stats.retained}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/70">
                      <div className="text-gray-500 dark:text-gray-400">No Data</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{stats.noData}</div>
                    </div>
                    <button
                      onClick={fetchPromotionData}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-400 dark:hover:bg-[#2A2A2A] dark:hover:text-gray-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#1A1A1A]/50 border-b border-gray-200 dark:border-[#2A2A2A]">
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Roll No.</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Student</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Average</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Attendance</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Grade</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-4 py-3"><Skeleton className="h-5 w-12 rounded mx-auto" /></TableCell>
                          <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-4 w-14 mx-auto" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-6 w-10 rounded-full mx-auto" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full mx-auto" /></TableCell>
                          <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : !promotionData || promotionData.candidates.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    No students found in this grade
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#1A1A1A]/50 border-b border-gray-200 dark:border-[#2A2A2A]">
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Roll No.
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Student
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Average
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Attendance
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Grade
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Reason
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                      {sortedCandidates.map((candidate) => (
                        <TableRow
                          key={candidate.student.id}
                          className={`hover:bg-gray-50 dark:hover:bg-[#1A1A1A]/50 ${
                            candidate.status === "RETAINED" ? "bg-red-50/50 dark:bg-red-900/10" : ""
                          }`}
                        >
                          <TableCell className="px-4 py-3">
                            <span className="inline-flex min-w-[52px] justify-center rounded-md bg-gray-100 px-2 py-1 text-center text-xs font-semibold text-gray-700 dark:bg-[#2A2A2A] dark:text-gray-200">
                              {candidate.student.rollNumber || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                {candidate.student.avatarUrl ? (
                                  <AvatarImage src={candidate.student.avatarUrl} alt={candidate.student.name} />
                                ) : null}
                                <AvatarFallback className="text-sm font-medium">
                                  {candidate.student.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate font-medium text-gray-900 dark:text-white text-sm">
                                {candidate.student.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {candidate.averageGrade.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <span className={`font-medium ${
                              candidate.attendance >= 75
                                ? "text-emerald-600 dark:text-emerald-400"
                                : candidate.attendance >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {candidate.attendance.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              candidate.overallGrade === "A"
                                ? "bg-emerald-100 text-emerald-700"
                                : candidate.overallGrade === "B"
                                ? "bg-blue-100 text-blue-700"
                                : candidate.overallGrade === "C"
                                ? "bg-amber-100 text-amber-700"
                                : candidate.overallGrade === "D"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {candidate.overallGrade || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            {candidate.status === "PROMOTED" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Ready
                              </span>
                            )}
                            {candidate.status === "RETAINED" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="w-3.5 h-3.5" />
                                Retained
                              </span>
                            )}
                            {candidate.status === "NO_DATA" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                No Data
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {candidate.reasons?.join(", ") || (candidate.status === "PROMOTED" ? "Meets criteria" : "-")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {requiresStreamAssignment && promotionData?.candidates.length ? (
                <div className="border-t border-gray-200 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
                  <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Grade 11 Stream Assignment
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Assign Natural or Social stream for every student being promoted into Grade 11.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={selectedPromotableStudents.length === 0}
                        onClick={() => setStreamForStudents(selectedPromotableStudents.map((candidate) => candidate.student.id), "NATURAL")}
                        className="rounded-lg border border-[rgba(var(--brand-color-rgb),0.25)] bg-[rgba(var(--brand-color-rgb),0.12)] px-3 py-2 text-xs font-semibold text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Set selected Natural
                      </button>
                      <button
                        type="button"
                        disabled={selectedPromotableStudents.length === 0}
                        onClick={() => setStreamForStudents(selectedPromotableStudents.map((candidate) => candidate.student.id), "SOCIAL")}
                        className="rounded-lg border border-[rgba(var(--brand-color-rgb),0.25)] bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#111111] dark:text-gray-100 dark:hover:bg-[#2A2A2A]"
                      >
                        Set selected Social
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-[#2A2A2A] dark:bg-[#111111]/50 dark:text-gray-300">
                    {selectedPromotableStudents.length === 0
                      ? "Select eligible students or choose Promote All Eligible to assign streams."
                      : `${assignedStreamCount} of ${selectedPromotableStudents.length} selected student(s) assigned${missingStreamCount > 0 ? `, ${missingStreamCount} missing` : ""}.`}
                  </div>

                  {selectedPromotableStudents.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {selectedPromotableStudents.map((candidate) => (
                        <div
                          key={`stream-${candidate.student.id}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#2A2A2A] dark:bg-[#111111]/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {candidate.student.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Roll {candidate.student.rollNumber || "-"} - {candidate.averageGrade.toFixed(1)}%
                            </p>
                          </div>
                          <select
                            value={streamAssignments[candidate.student.id] || ""}
                            onChange={(event) =>
                              setStreamAssignments((current) => ({
                                ...current,
                                [candidate.student.id]: event.target.value as PromotionStream,
                              }))
                            }
                            className="h-9 shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-100"
                          >
                            <option value="">Stream</option>
                            <option value="NATURAL">Natural</option>
                            <option value="SOCIAL">Social</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="p-4 border-t border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1A]/50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setPromoteAll(true);
                        setSelectedStudents(new Set(promotableStudents.map((s) => s.student.id)));
                      }}
                      disabled={promotableStudents.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs px-4 py-2"
                      style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                    >
                      <GraduationCap className="h-4 w-4" />
                      Promote All Eligible
                    </button>
                    <button
                      onClick={() => {
                        setPromoteAll(false);
                        handleSelectAll();
                      }}
                      disabled={promotableStudents.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-200 dark:hover:bg-[#2A2A2A]"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {selectedStudents.size === promotableStudents.length && promotableStudents.length > 0
                        ? "Clear Selection"
                        : "Select Eligible"}
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {promoteAll
                      ? `Ready to promote all ${promotableStudents.length} eligible students`
                      : `${selectedStudents.size} of ${promotableStudents.length} eligible students selected`}
                  </div>
                  <div className="flex items-center gap-3">
                    {nextGrades.length > 0 || selectedNextGrade === "graduation" ? (
                      <button
                        onClick={handlePromote}
                        disabled={
                          actionLoading ||
                          !currentAcademicYearEnded ||
                          !selectedTargetYearName ||
                          (!promoteAll && selectedStudents.size === 0) ||
                          (requiresStreamAssignment && missingStreamCount > 0)
                        }
                        className="flex items-center gap-2 rounded-lg bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs px-5 py-2.5"
                        style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-5 h-5" />
                            Promote to {nextGrades.find((grade) => String(grade.grade) === selectedNextGrade)?.name || "Graduation"}
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        No next grade available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
