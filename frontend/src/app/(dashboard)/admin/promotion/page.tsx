"use client";

import { useState, useEffect } from "react";
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
import { classesAPI } from "@/lib/api";
import { promotionAPI, PromotionCandidate } from "@/lib/api/reporting";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface NextClass {
  id: string;
  name: string;
  grade: number | null;
}

interface PromotionData {
  className: string;
  academicYear: string;
  totalStudents: number;
  candidates: PromotionCandidate[];
}

const parseRollNumber = (rollNumber?: string | null) => {
  if (!rollNumber) return Number.POSITIVE_INFINITY;
  const parsed = Number.parseInt(rollNumber, 10);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

export default function PromotionPage() {
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [promotionData, setPromotionData] = useState<PromotionData | null>(null);
  const [nextClasses, setNextClasses] = useState<NextClass[]>([]);
  const [selectedNextClass, setSelectedNextClass] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [promoteAll, setPromoteAll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [minAverageGrade, setMinAverageGrade] = useState<number>(50);
  const [minAttendance, setMinAttendance] = useState<number>(75);

  const isAdmin = ((user?.role === "ADMIN" || user?.role === "IT_MANAGER") || user?.role === "IT_MANAGER") || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchPromotionData();
      fetchNextClasses();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({ academicYearId: currentAcademicYear?.id });
      const data = response.data?.data || response.data || [];
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const fetchPromotionData = async () => {
    setLoading(true);
    try {
      const response = await promotionAPI.getCandidates(selectedClass, {
        academicYear: currentAcademicYear?.name,
      });
      setPromotionData(response.data);
      setSelectedStudents(new Set());
    } catch (err: any) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextClasses = async () => {
    try {
      const nextYear = String(parseInt(currentAcademicYear?.name || "2026", 10) + 1);
      const response = await promotionAPI.getNextClasses(selectedClass, {
        toAcademicYear: nextYear,
      });
      setNextClasses(response.data.nextClasses || []);
      if (response.data.nextClasses?.length > 0) {
        setSelectedNextClass(response.data.nextClasses[0].id);
      }
    } catch (err: any) {
      console.error("Failed to fetch next classes:", err);
    }
  };

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

  const handlePromote = async () => {
    if (!selectedNextClass) {
      toast.error("Please select a destination class");
      return;
    }

    if (!promoteAll && selectedStudents.size === 0) {
      toast.error("Please select students to promote");
      return;
    }

    const confirmMessage = promoteAll
      ? `Promote ALL students to the next class?`
      : `Promote ${selectedStudents.size} selected student(s) to the next class?`;

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
            const nextYear = String(parseInt(currentAcademicYear?.name || "2026") + 1);
            const result = await promotionAPI.bulkPromote({
              fromClassId: selectedClass,
              toClassId: selectedNextClass,
              fromAcademicYear: currentAcademicYear?.name || "",
              toAcademicYear: nextYear,
              studentIds: Array.from(selectedStudents),
              promoteAll,
              minAverageGrade,
              minAttendance,
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
  const retainedStudents = promotionData?.candidates.filter((c) => c.status === "RETAINED") || [];
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-transparent px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Student Promotion
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Promote students to the next class level
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Source Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section && `- Section ${cls.section}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Destination Class
              </label>
              <select
                value={selectedNextClass}
                onChange={(e) => setSelectedNextClass(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select destination</option>
                {nextClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.grade && `(Grade ${cls.grade})`}
                  </option>
                ))}
                {nextClasses.length === 0 && (
                  <option value="graduation">Graduation (Final Grade)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Promotion Criteria
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minAverageGrade}
                    onChange={(e) => setMinAverageGrade(Number(e.target.value))}
                    placeholder="Min Grade"
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Min Grade %</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(Number(e.target.value))}
                    placeholder="Min Attendance"
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Min Attendance %</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedClass && (
          <>


            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                  <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      Promotion Candidates - {promotionData?.className}
                    </h2>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Academic Year: {promotionData?.academicYear}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70">
                      <div className="text-slate-500 dark:text-slate-400">Eligible</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{stats.promoted}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70">
                      <div className="text-slate-500 dark:text-slate-400">Retained</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{stats.retained}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70">
                      <div className="text-slate-500 dark:text-slate-400">No Data</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{stats.noData}</div>
                    </div>
                    <button
                      onClick={fetchPromotionData}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Roll No.</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Student</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Average</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Attendance</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Grade</TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-700">
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
                  <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    No students found in this class
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Roll No.
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Student
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Average
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Attendance
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Grade
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Status
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Reason
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sortedCandidates.map((candidate) => (
                        <TableRow
                          key={candidate.student.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            candidate.status === "RETAINED" ? "bg-red-50/50 dark:bg-red-900/10" : ""
                          }`}
                        >
                          <TableCell className="px-4 py-3">
                            <span className="inline-flex min-w-[52px] justify-center rounded-md bg-slate-100 px-2 py-1 text-center text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
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
                              <span className="truncate font-medium text-slate-900 dark:text-white text-sm">
                                {candidate.student.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900 dark:text-white">
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
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {candidate.reasons?.join(", ") || (candidate.status === "PROMOTED" ? "Meets criteria" : "-")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setPromoteAll(true);
                        setSelectedStudents(new Set(promotableStudents.map((s) => s.student.id)));
                      }}
                      disabled={promotableStudents.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {selectedStudents.size === promotableStudents.length && promotableStudents.length > 0
                        ? "Clear Selection"
                        : "Select Eligible"}
                    </button>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {promoteAll
                      ? `Ready to promote all ${promotableStudents.length} eligible students`
                      : `${selectedStudents.size} of ${promotableStudents.length} eligible students selected`}
                  </div>
                  <div className="flex items-center gap-3">
                    {nextClasses.length > 0 || selectedNextClass === "graduation" ? (
                      <button
                        onClick={handlePromote}
                        disabled={actionLoading || (!promoteAll && selectedStudents.size === 0)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-5 h-5" />
                            Promote to {nextClasses.find((c) => c.id === selectedNextClass)?.name || "Graduation"}
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        No next class available
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
