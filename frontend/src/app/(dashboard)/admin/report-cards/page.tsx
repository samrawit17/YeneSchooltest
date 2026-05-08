"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Filter,
  ChevronDown,
  Loader2,
  Search,
  Award,
  BarChart3,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  ReportCard,
  ReportCardStatus,
  reportCardsAPI,
} from "@/lib/api/reporting";
import { classesAPI } from "@/lib/api";
import { termsAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchClasses();
    fetchTerms();
  }, []);

  useEffect(() => {
    if (currentAcademicYear) {
      fetchReportCards();
    }
  }, [selectedClass, selectedTerm, filterStatus, currentAcademicYear]);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({ academicYearId: currentAcademicYear?.id });
      const data = response.data?.data || response.data || [];
      setClasses(data);
      if (data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const fetchTerms = async () => {
    try {
      if (!currentAcademicYear?.id) return;
      const response = await termsAPI.getByYear(currentAcademicYear.id);
      const data = response.data || [];
      setTerms(data);
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
      if (selectedTerm) params.term = selectedTerm;
      if (filterStatus !== "all") params.status = filterStatus;
      if (currentAcademicYear?.name) params.academicYear = currentAcademicYear.name;

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
      alert("Please select a class and term");
      return;
    }
    const term = terms.find((t) => t.id === selectedTerm);
    if (!confirm(`Generate report cards for all students in this class?`)) return;

    setBulkGenerateLoading(true);
    try {
      const result = await reportCardsAPI.bulkGenerate({
        classId: selectedClass,
        sectionId: "",
        termId: selectedTerm,
        termName: term?.name || `Term ${selectedTerm}`,
      });
      alert(`Generated: ${result.data.generated}, Failed: ${result.data.failed}`);
      fetchReportCards();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to generate report cards");
    } finally {
      setBulkGenerateLoading(false);
    }
  };

  const handlePublish = async () => {
    if (selectedCards.size === 0) {
      alert("Please select report cards to publish");
      return;
    }
    if (!confirm(`Publish ${selectedCards.size} report card(s)?`)) return;

    setActionLoading(true);
    try {
      const result = await reportCardsAPI.publish(Array.from(selectedCards));
      alert(`Published ${result.data.published} report card(s)`);
      setSelectedCards(new Set());
      fetchReportCards();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to publish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (selectedCards.size === 0) {
      alert("Please select report cards to unpublish");
      return;
    }
    if (!confirm(`Revert ${selectedCards.size} report card(s) to draft?`)) return;

    setActionLoading(true);
    try {
      const result = await reportCardsAPI.unpublish(Array.from(selectedCards));
      alert(`Unpublished ${result.data.unpublished} report card(s)`);
      setSelectedCards(new Set());
      fetchReportCards();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to unpublish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateRanks = async () => {
    if (!selectedClass || !selectedTerm) {
      alert("Please select a class and term");
      return;
    }
    if (!confirm("Calculate ranks for all students in this class?")) return;

    setActionLoading(true);
    try {
      const term = terms.find((t) => t.id === selectedTerm);
      await reportCardsAPI.calculateRanks({
        classId: selectedClass,
        academicYear: currentAcademicYear?.name || "",
        term: term?.name || selectedTerm,
      });
      alert("Ranks calculated successfully");
      fetchReportCards();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to calculate ranks");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report card? This cannot be undone.")) return;

    try {
      await reportCardsAPI.delete(id);
      fetchReportCards();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete");
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
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Report Cards</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Generate, publish, and manage student report cards
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleBulkGenerate}
              disabled={bulkGenerateLoading || !selectedClass}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
            >
              {bulkGenerateLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Generate All
            </button>
          )}
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Cards</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.draft}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Drafts</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.published}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Published</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgPercentage.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg Score</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex flex-1 gap-3">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && selectedCards.size > 0 && (
                  <>
                    <button
                      onClick={handlePublish}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Publish ({selectedCards.size})
                    </button>
                    <button
                      onClick={handleUnpublish}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Unpublish ({selectedCards.size})
                    </button>
                  </>
                )}
                <button
                  onClick={handleCalculateRanks}
                  disabled={actionLoading || !selectedClass}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  Calculate Ranks
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
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
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
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading report cards...</p>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-12 text-center">
                      <p className="text-sm text-red-500">{error}</p>
                      <button onClick={fetchReportCards} className="text-indigo-500 text-sm hover:underline mt-2">
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
                          className="text-indigo-500 text-sm hover:underline mt-2 disabled:opacity-50"
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
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
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
                            onClick={() => router.push(`/admin/report-cards/${card.id}`)}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
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
