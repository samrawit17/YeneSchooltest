"use client";

import { useState, useEffect, useMemo } from "react";
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
  Settings,
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
import { classesAPI } from "@/lib/api";
import { termsAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type ClassStatsResponse = {
  totalStudents?: number;
};

const normalizeSectionLabel = (value: string | null | undefined) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^section\s+/, "");

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
  const { currentAcademicYear, currentTerm, periodLabel } = useAcademicYear();

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<ReportCardStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkGenerateLoading, setBulkGenerateLoading] = useState(false);
  const [selectedClassStudentCount, setSelectedClassStudentCount] = useState<number | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_MANAGER" || user?.role === "SUPER_ADMIN";

  const resolvedAcademicYearId = currentAcademicYear?.id || "";
  const resolvedAcademicYearName = currentAcademicYear?.name || "";

  const selectedTermRecord = useMemo(
    () => terms.find((term) => term.id === selectedTerm) || null,
    [terms, selectedTerm],
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
    if (!resolvedAcademicYearId) return;
    fetchClasses(resolvedAcademicYearId);
    fetchTerms(resolvedAcademicYearId);
  }, [resolvedAcademicYearId]);

  useEffect(() => {
    if (currentAcademicYear) {
      fetchReportCards();
    }
  }, [selectedClass, selectedTerm, filterStatus, currentAcademicYear]);

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
      if (!hasSelectedClass) {
        setSelectedClass(data[0].id);
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
        if (currentYearTerm?.id) {
          return currentYearTerm.id;
        }
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
      if (selectedTermRecord?.name) params.term = selectedTermRecord.name;
      if (filterStatus !== "all") params.status = filterStatus;
      if (resolvedAcademicYearName) params.academicYear = resolvedAcademicYearName;

      const response = await reportCardsAPI.getAll(params);
      setReportCards(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load report cards");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedCards.size === reportCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(reportCards.map((rc) => rc.id)));
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
    if (selectedCards.size === 0) {
      toast.error("Please select report cards to unpublish");
      return;
    }
    if (!confirm(`Revert ${selectedCards.size} report card(s) to draft?`)) return;

    setActionLoading(true);
    try {
      const result = await reportCardsAPI.unpublish(Array.from(selectedCards));
      toast.success(`Unpublished ${result.data.unpublished} report card(s)`);
      setSelectedCards(new Set());
      fetchReportCards();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unpublish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report card? This cannot be undone.")) return;

    try {
      await reportCardsAPI.delete(id);
      toast.success("Report card deleted");
      fetchReportCards();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleDownloadCertificate = async (id: string) => {
    try {
      const resp = await reportCardsAPI.downloadCertificatePdf(id);
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to download certificate");
    }
  };

  const handleBulkDownloadCertificates = async () => {
    const ids = Array.from(selectedCards);
    if (!ids.length) {
      toast.error("Select report cards first");
      return;
    }
    try {
      const resp = await reportCardsAPI.downloadCertificateBulkZip(ids);
      const blob = new Blob([resp.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificates.zip";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to download certificates");
    }
  };

  const filteredCards = reportCards;

  const stats = {
    total: reportCards.length,
    draft: reportCards.filter((rc) => rc.status === "DRAFT").length,
    published: reportCards.filter((rc) => rc.status === "PUBLISHED").length,
    avgPercentage:
      reportCards.length > 0
        ? reportCards.reduce((sum, rc) => sum + (rc.percentage || 0), 0) / reportCards.length
        : 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Report Cards</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate, publish, and manage student report cards
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">


        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex flex-1 gap-3">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section && `- Section ${cls.section}`}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  <option value="">All Terms</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--brand-color,#e35336)]"
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && selectedCards.size > 0 && (
                  <button
                    onClick={handleBulkDownloadCertificates}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Certificates ({selectedCards.size})
                  </button>
                )}
                {isAdmin && selectedCards.size > 0 && (
                  <button
                    onClick={handleUnpublish}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Unpublish ({selectedCards.size})
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleBulkGenerate}
                    disabled={bulkGenerateLoading || !selectedClass}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[var(--brand-color,#e35336)] to-[var(--brand-color,#e35336)] text-white rounded-lg text-sm hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/30 transition-all disabled:opacity-50"
                  >
                    {bulkGenerateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Generate All
                  </button>
                )}
                <button
                  onClick={() => router.push("/admin/report-cards/certificate-template")}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4" />
                  Certificate Template
                </button>
                <button
                  onClick={() => router.push("/admin/exams/publish")}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-color,#e35336)] text-white rounded-lg text-sm hover:opacity-90"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Publish Page
                </button>
                <button
                  onClick={fetchReportCards}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCards.size === reportCards.length && reportCards.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[var(--brand-color,#e35336)] focus:ring-[var(--brand-color,#e35336)]"
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Student</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Class</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Grade</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Rank</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Attendance</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-700">
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
                      <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No report cards found</p>
                      {isAdmin && (
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
                    <TableRow key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedCards.has(card.id)}
                          onChange={() => handleSelect(card.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[var(--brand-color,#e35336)] focus:ring-[var(--brand-color,#e35336)]"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-color,#e35336)] to-[var(--brand-color,#e35336)] flex items-center justify-center text-white text-sm font-medium">
                            {card.student?.name?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white text-sm">
                            {card.student?.name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {card.class?.name || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <GradeBadge grade={card.overallGrade} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm font-medium text-slate-900 dark:text-white">
                        {card.rank || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                        {card.attendancePercentage?.toFixed(1) || "0"}%
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <StatusBadge status={card.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownloadCertificate(card.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Download Certificate"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/report-cards/${card.id}`)}
                            className="p-1.5 text-slate-400 hover:text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.12)] dark:hover:bg-[rgba(var(--brand-color-rgb),0.18)] rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && card.status === "DRAFT" && (
                            <button
                              onClick={() => handleDelete(card.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
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
    </div>
  );
}
