"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  BarChart3,
  ExternalLink,
  Download,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { toast } from "sonner";
import {
  ReportCard,
  ReportCardStatus,
  reportCardsAPI,
} from "@/lib/api/reporting";
import { academicYearsAPI, classesAPI } from "@/lib/api";
import { termsAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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

type ClassStatsResponse = {
  totalStudents?: number;
};

const normalizeSectionLabel = (value: string | null | undefined) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^section\s+/, "");

const toDownloadFileName = (value: string | null | undefined, fallback: string) => {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
};

function GradeBadge({ grade }: { grade: string | null }) {
  const configs: Record<string, { bg: string; text: string }> = {
    A: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
    B: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
    C: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
    D: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
    F: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  };
  const config = configs[grade || ""] || { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-400" };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${config.bg} ${config.text}`}>
      {grade || "-"}
    </span>
  );
}

function StatusBadge({ status }: { status: ReportCardStatus }) {
  const configs: Record<ReportCardStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    DRAFT: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", icon: <FileText className="w-3.5 h-3.5" /> },
    PUBLISHED: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  };
  const config = configs[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status === "DRAFT" ? "Draft" : "Published"}
    </span>
  );
}

export default function ReportCardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentAcademicYear, currentTerm } = useAcademicYear();

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<ReportCardStatus | "all">("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkGenerateLoading, setBulkGenerateLoading] = useState(false);
  const [selectedClassStudentCount, setSelectedClassStudentCount] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: "unpublish" } | { type: "delete"; id: string } | null>(null);
  const initialQueryApplied = useRef(false);

  const canManageReportCards =
    user?.role === "ADMIN" ||
    user?.role === "REGISTRAR" ||
    user?.role === "SUPER_ADMIN";

  const selectedAcademicYearRecord = useMemo(
    () => academicYears.find((year) => year.id === selectedAcademicYear) || null,
    [academicYears, selectedAcademicYear],
  );
  const resolvedAcademicYearId =
    selectedAcademicYearRecord?.id ||
    (!selectedAcademicYear ? currentAcademicYear?.id : "") ||
    "";
  const resolvedAcademicYearName =
    selectedAcademicYearRecord?.name ||
    (!selectedAcademicYear ? currentAcademicYear?.name : "") ||
    "";

  const selectedTermRecord = useMemo(
    () => terms.find((term) => term.id === selectedTerm) || null,
    [terms, selectedTerm],
  );
  const selectedVisibleCardIds = useMemo(() => reportCards.map((card) => card.id), [reportCards]);
  const selectedPublishedCardIds = useMemo(
    () =>
      reportCards
        .filter((card) => selectedCards.has(card.id) && card.status === "PUBLISHED")
        .map((card) => card.id),
    [reportCards, selectedCards],
  );

  const resolveSectionRecord = (classRecord: any) => {
    if (!classRecord?.sections?.length) return null;

    const targetSection = normalizeSectionLabel(classRecord.section);
    return (
      classRecord.sections.find(
        (section: { name: string; id: string }) =>
          normalizeSectionLabel(section.name) === targetSection,
      ) || classRecord.sections[0]
    );
  };

  useEffect(() => {
    academicYearsAPI
      .getAll()
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setAcademicYears(data);
        const query = new URLSearchParams(window.location.search);
        const queryAcademicYearId = query.get("academicYearId");
        const validQueryAcademicYearId =
          queryAcademicYearId && data.some((year: any) => year.id === queryAcademicYearId)
            ? queryAcademicYearId
            : "";
        const active = data.find((year: any) => year.isActive) || data[0];
        setSelectedAcademicYear((prev) => prev || validQueryAcademicYearId || currentAcademicYear?.id || active?.id || "");
      })
      .catch(() => {
        if (currentAcademicYear?.id) setSelectedAcademicYear(currentAcademicYear.id);
      });
  }, [currentAcademicYear?.id]);

  useEffect(() => {
    if (!initialQueryApplied.current && typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      const queryClassId = query.get("classId");
      const queryTermId = query.get("termId");
      if (queryClassId) setSelectedClass(queryClassId);
      if (queryTermId) setSelectedTerm(queryTermId);
      initialQueryApplied.current = true;
    }
  }, []);

  useEffect(() => {
    if (!resolvedAcademicYearId) return;
    fetchClasses(resolvedAcademicYearId);
    fetchTerms(resolvedAcademicYearId);
  }, [resolvedAcademicYearId]);

  useEffect(() => {
    if (resolvedAcademicYearId && (!selectedTerm || selectedTermRecord?.name)) {
      fetchReportCards();
    }
  }, [selectedClass, selectedTerm, selectedTermRecord?.name, filterStatus, resolvedAcademicYearId]);

  useEffect(() => {
    const fetchSelectedClassStats = async () => {
      if (!selectedClass) {
        setSelectedClassStudentCount(null);
        return;
      }

      const classRecord = classes.find((cls) => cls.id === selectedClass);
      const sectionRecord = resolveSectionRecord(classRecord);

      try {
        const response = await classesAPI.getStats(selectedClass, sectionRecord?.id ? { sectionId: sectionRecord.id } : undefined);
        const payload = response.data?.data || response.data || {};
        const statsCount = Number((payload as ClassStatsResponse).totalStudents) || 0;
        const fallbackCount = reportCards.length > 0 ? reportCards.length : 0;
        setSelectedClassStudentCount(statsCount > 0 ? statsCount : fallbackCount);
      } catch (err) {
        setSelectedClassStudentCount(reportCards.length > 0 ? reportCards.length : null);
      }
    };

    void fetchSelectedClassStats();
  }, [classes, reportCards.length, selectedClass]);

  const fetchClasses = async (academicYearId: string) => {
    try {
      const response = await classesAPI.getAll({ academicYearId });
      const data = response.data?.data || response.data || [];
      setClasses(data);
      if (data.length === 0) {
        setSelectedClass("");
        return;
      }

      const hasSelectedClass = data.some((item: { id: string }) => item.id === selectedClass);
      if (selectedClass && !hasSelectedClass) {
        setSelectedClass("");
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const fetchTerms = async (academicYearId: string) => {
    try {
      const response = await termsAPI.getByYear(academicYearId);
      const data = response.data || [];
      setTerms(data);
      if (data.length === 0) {
        setSelectedTerm("");
        return;
      }

      const now = new Date();
      const currentYearTerm =
        data.find((term: { startDate?: string; endDate?: string }) => {
          if (!term.startDate || !term.endDate) return false;
          return now >= new Date(term.startDate) && now <= new Date(term.endDate);
        }) ||
        data.find((term: { id: string }) => term.id === currentTerm?.id) ||
        data[0];

      setSelectedTerm((prev) => {
        if (prev && data.some((term: { id: string }) => term.id === prev)) {
          return prev;
        }
        return currentYearTerm?.id || "";
      });
    } catch (err) {
      console.error("Failed to fetch terms:", err);
    }
  };

  const fetchReportCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedTerm) params.termId = selectedTerm;
      if (filterStatus !== "all") params.status = filterStatus;
      if (resolvedAcademicYearId) params.academicYearId = resolvedAcademicYearId;

      const response = await reportCardsAPI.getAll(params);
      const data = response.data || [];
      setReportCards(data);
      setSelectedCards((prev) => {
        if (prev.size === 0) return prev;
        const visibleIds = new Set(data.map((card) => card.id));
        return new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load report cards");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (
      selectedVisibleCardIds.length > 0 &&
      selectedVisibleCardIds.every((id) => selectedCards.has(id))
    ) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(selectedVisibleCardIds));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCards(newSelected);
  };

  const handleBulkGenerate = async () => {
    if (!selectedClass || !selectedTerm) {
      toast.error("Please select a class and term");
      return;
    }
    if (!resolvedAcademicYearId || !resolvedAcademicYearName) {
      toast.error("No academic year selected");
      return;
    }
    if (selectedClassStudentCount === 0) {
      toast.error("This class has no students. Report cards cannot be generated.");
      return;
    }

    const term = terms.find((t) => t.id === selectedTerm);
    const classRecord = classes.find((cls) => cls.id === selectedClass);
    const sectionRecord = resolveSectionRecord(classRecord);
    if (!sectionRecord?.id) {
      toast.error("The selected class does not have a valid section mapping");
      return;
    }

    toast("Generate report cards for all students in this class?", {
      style: {
        background: "var(--brand-color,#e35336)",
        color: "#ffffff",
        border: "1px solid rgba(var(--brand-color-rgb,227,83,54),0.35)",
        boxShadow: "0 14px 40px rgba(var(--brand-color-rgb,227,83,54),0.28)",
      },
      actionButtonStyle: {
        background: "#ffffff",
        color: "var(--brand-color,#e35336)",
        borderRadius: "10px",
        fontWeight: "600",
      },
      cancelButtonStyle: {
        background: "rgba(255,255,255,0.16)",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "10px",
        fontWeight: "600",
      },
      action: {
        label: "Generate",
        onClick: async () => {
          setBulkGenerateLoading(true);
          try {
            const result = await reportCardsAPI.bulkGenerate({
              classId: selectedClass,
              sectionId: sectionRecord.id,
              academicYearId: resolvedAcademicYearId,
              termId: selectedTerm,
              termName: term?.name || `Term ${selectedTerm}`,
            });
            toast.success(`Generated: ${result.data.generated}, Failed: ${result.data.failed}`);
            fetchReportCards();
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to generate report cards");
          } finally {
            setBulkGenerateLoading(false);
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  const handleUnpublish = async () => {
    if (selectedPublishedCardIds.length === 0) {
      toast.error("Please select published report cards to unpublish");
      return;
    }
    setPendingAction({ type: "unpublish" });
  };

  const executeUnpublish = async () => {
    setActionLoading(true);
    try {
      const result = await reportCardsAPI.unpublish(selectedPublishedCardIds);
      toast.success(`Unpublished ${result.data.unpublished} report card(s)`);
      setSelectedCards(new Set());
      fetchReportCards();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unpublish");
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingAction({ type: "delete", id });
  };

  const executeDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await reportCardsAPI.delete(id);
      toast.success("Report card deleted");
      setSelectedCards((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchReportCards();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const handleDownloadCertificate = async (card: ReportCard) => {
    try {
      const resp = await reportCardsAPI.downloadCertificatePdf(card.id);
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${toDownloadFileName(card.student?.name, `report-card-${card.id}`)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to download certificate");
    }
  };

  const handleBulkDownloadReportCards = async () => {
    const ids = selectedCards.size > 0
      ? Array.from(selectedCards)
      : filteredCards.map((card) => card.id);
    if (!ids.length) {
      toast.error("No report cards available to download");
      return;
    }
    try {
      const resp = await reportCardsAPI.downloadCertificateBulkZip(ids);
      const blob = new Blob([resp.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedCards.size > 0 ? "selected-report-cards.zip" : "report-cards.zip";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to download report cards");
    }
  };

  const filteredCards = reportCards;

  const cardsWithPercentage = reportCards.filter((rc) => rc.percentage !== null && rc.percentage !== undefined);
  const stats = {
    total: reportCards.length,
    draft: reportCards.filter((rc) => rc.status === "DRAFT").length,
    published: reportCards.filter((rc) => rc.status === "PUBLISHED").length,
    avgPercentage:
      cardsWithPercentage.length > 0
        ? cardsWithPercentage.reduce((sum, rc) => sum + (rc.percentage || 0), 0) / cardsWithPercentage.length
        : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Report Cards</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generate, publish, and manage student report cards
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">


        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-[#2A2A2A]">
          <div className="p-4 border-b border-gray-200 dark:border-[#2A2A2A]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex flex-1 flex-nowrap gap-3">
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    setSelectedAcademicYear(e.target.value);
                    setSelectedClass("");
                    setSelectedTerm("");
                    setSelectedCards(new Set());
                  }}
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  {academicYears.length === 0 ? (
                    <option value="" className="bg-white dark:bg-[#1A1A1A]">Academic Year</option>
                  ) : (
                    academicYears.map((year) => (
                      <option key={year.id} value={year.id} className="bg-white dark:bg-[#1A1A1A]">
                        {year.name} {year.isActive ? "(Active)" : ""}
                      </option>
                    ))
                  )}
                </select>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  <option value="" className="bg-white dark:bg-[#1A1A1A]">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id} className="bg-white dark:bg-[#1A1A1A]">
                      {cls.name} {cls.section && `- Section ${cls.section}`}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  <option value="" className="bg-white dark:bg-[#1A1A1A]">All Terms</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id} className="bg-white dark:bg-[#1A1A1A]">
                      {term.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-[#2A2A2A] border-0 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  <option value="all" className="bg-white dark:bg-[#1A1A1A]">All Status</option>
                  <option value="DRAFT" className="bg-white dark:bg-[#1A1A1A]">Draft</option>
                  <option value="PUBLISHED" className="bg-white dark:bg-[#1A1A1A]">Published</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                {canManageReportCards && filteredCards.length > 0 && (
                  <button
                    onClick={handleBulkDownloadReportCards}
                    className="flex items-center gap-2 px-3 py-2 bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg"
                    style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                  >
                    <Download className="w-4 h-4" />
                    Download Report Cards ({selectedCards.size > 0 ? selectedCards.size : filteredCards.length})
                  </button>
                )}
                {canManageReportCards && selectedPublishedCardIds.length > 0 && (
                  <button
                    onClick={handleUnpublish}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg"
                    style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                  >
                    <XCircle className="w-4 h-4" />
                    Unpublish ({selectedPublishedCardIds.length})
                  </button>
                )}
                {canManageReportCards && (
                  <button
                    onClick={handleBulkGenerate}
                    disabled={bulkGenerateLoading || !selectedClass}
                    className="flex items-center gap-2 px-3 py-2 bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg"
                    style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                  >
                    {bulkGenerateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Generate All
                  </button>
                )}
                <button
                  onClick={() => router.push("/admin/exams/publish")}
                  className="flex items-center gap-2 px-3 py-2 bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg"
                  style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Publish Page
                </button>
                <button
                  onClick={fetchReportCards}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-[#1A1A1A]/50 border-b border-gray-200 dark:border-[#2A2A2A]">
                  <TableHead className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedVisibleCardIds.length > 0 &&
                        selectedVisibleCardIds.every((id) => selectedCards.has(id))
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[var(--brand-color,#e35336)] focus:ring-[var(--brand-color,#e35336)]"
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Student</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Class</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Grade</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rank</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Attendance</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                      <TableCell className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-6 w-14 rounded-full mx-auto" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full mx-auto" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-12 text-center">
                      <p className="text-sm text-red-500">{error}</p>
                      <button onClick={fetchReportCards} className="text-[var(--brand-color,#e35336)] text-sm hover:underline mt-2">
                        Try again
                      </button>
                    </TableCell>
                  </TableRow>
                ) : filteredCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No report cards found</p>
                      {canManageReportCards && (
                        <button
                          onClick={handleBulkGenerate}
                          disabled={!selectedClass || bulkGenerateLoading}
                          className="text-[var(--brand-color,#e35336)] text-sm hover:underline mt-2 disabled:opacity-50"
                        >
                          Generate report cards for selected class
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCards.map((card) => (
                    <TableRow key={card.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                      <TableCell className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedCards.has(card.id)}
                          onChange={() => handleSelect(card.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[var(--brand-color,#e35336)] focus:ring-[var(--brand-color,#e35336)]"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-color,#e35336)] to-[var(--brand-color,#e35336)] flex items-center justify-center text-white text-sm font-medium">
                            {card.student?.name?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {card.student?.name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {card.class?.name || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <GradeBadge grade={card.overallGrade} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">
                        {card.rank ?? card.rankInClass ?? "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {card.attendancePercentage?.toFixed(1) || "0"}%
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <StatusBadge status={card.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownloadCertificate(card)}
                            className="p-1.5 text-gray-400 hover:text-[var(--brand-color)] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg"
                            title="Download Certificate"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/report-cards/${card.id}`)}
                            className="p-1.5 text-gray-400 hover:text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.12)] dark:hover:bg-[rgba(var(--brand-color-rgb),0.18)] rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManageReportCards && card.status === "DRAFT" && (
                            <button
                              onClick={() => handleDelete(card.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => { if (!open && !actionLoading) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "delete" ? "Delete report card?" : "Revert selected report cards?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "delete"
                ? "This deletes the draft report card. This action cannot be undone."
                : `This will move ${selectedPublishedCardIds.length} published report card${selectedPublishedCardIds.length === 1 ? "" : "s"} back to draft and remove parent/student visibility until they are published again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={() => {
                if (pendingAction?.type === "delete") {
                  void executeDelete(pendingAction.id);
                } else {
                  void executeUnpublish();
                }
              }}
              className={pendingAction?.type === "delete" ? "bg-red-600 text-white hover:bg-red-700" : "bg-amber-600 text-white hover:bg-amber-700"}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {pendingAction?.type === "delete" ? "Delete" : "Revert to Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
