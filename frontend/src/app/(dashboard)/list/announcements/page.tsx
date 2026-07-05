"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, Announcement } from "@/lib/api/content";
import { syncService } from "@/lib/db/sync-service";
import { schoolSettingsAPI, academicYearsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import Pagination from "@/components/Pagination";
import CreateAnnouncementForm from "@/components/announcement/CreateAnnouncementForm";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search, Plus, Loader2, Bell, Pin, Trash2, AlertTriangle, X, Paperclip, Megaphone
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { formatDateByCalendarType } from "@/lib/calendar-utils";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnnouncementAttachment } from "@/lib/api/content";

type CategoryFilter = "all" | "urgent" | "normal" | "low";

const colors = {
  urgent: { bg: "#fff", tape: "repeating-linear-gradient(135deg, #e35336 0 8px, #c65142 8px 16px)", pin: "radial-gradient(circle at 35% 30%, #fff, #e35336 55%, #a33 100%)" },
  normal: { bg: "#f3f3f1", tape: "repeating-linear-gradient(135deg, #a3a39f 0 8px, #c9c9c5 8px 16px)", pin: "radial-gradient(circle at 35% 30%, #fff, #a3a39f 55%, #6e6e6a 100%)" },
  low: { bg: "#ececea", tape: "repeating-linear-gradient(135deg, #9a9a96 0 8px, #b0b0ac 8px 16px)", pin: "radial-gradient(circle at 35% 30%, #fff, #9a9a96 55%, #5c5c58 100%)" },
};

const rotations = ["-1.6deg", "1.2deg", "-0.7deg", "1.8deg", "-1.1deg", "0.9deg"];

const AnnouncementListPage = () => {
  const { t } = useTranslations<any>("announcements");
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const userRole = user?.role?.toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'IT_MANAGER' || userRole === 'REGISTRAR';
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const itemsPerPage = 9;

  useEffect(() => {
    syncService.startAutoSync();
    return () => syncService.stopAutoSync();
  }, []);

  useEffect(() => {
    if (!user?.schoolId) return;
    academicYearsAPI.getAll({ schoolId: user.schoolId }).then((res) => {
      const years = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setAcademicYears(years);
      if (currentAcademicYear && selectedAcademicYear === "all") {
        setSelectedAcademicYear(currentAcademicYear.id);
      }
    }).catch(() => {});
  }, [user?.schoolId, currentAcademicYear]);

  const { data: announcements, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.announcements.list(userRole),
    queryFn: async () => {
      const response = await announcementsAPI.getAll({ role: userRole });
      return response.data;
    },
    enabled: !!userRole,
  });

  const { data: announcementsSetting } = useQuery({
    queryKey: ["school-setting", user?.schoolId, "ANNOUNCEMENTS_ENABLED"],
    queryFn: async () => {
      const response = await schoolSettingsAPI.get(user!.schoolId!, "ANNOUNCEMENTS_ENABLED");
      return response.data?.value;
    },
    enabled: !!user?.schoolId,
  });
  const announcementsEnabled = announcementsSetting !== false;

  const getCategory = (a: Announcement): string => {
    if (a.priority === "HIGH") return "urgent";
    if (a.priority === "MEDIUM") return "normal";
    return "low";
  };

  const getCategoryLabel = (a: Announcement): string => {
    if (a.priority === "HIGH") return t.urgent;
    if (a.priority === "MEDIUM") return t.important;
    return t.normal;
  };

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter((a) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && getCategory(a) !== categoryFilter) return false;
      if (audienceFilter !== "all" && a.visibleTo) {
        const map: Record<string, string[]> = {
          students: ["student"], parents: ["parent"],
          staff: ["admin", "it_manager", "teacher", "registrar", "finance", "staff"],
        };
        if (!map[audienceFilter]?.some(au => a.visibleTo?.some(v => v.toLowerCase().includes(au)))) return false;
      }
      if (selectedAcademicYear !== "all" && a.academicYearId !== selectedAcademicYear) return false;
      return true;
    });
  }, [announcements, searchQuery, categoryFilter, audienceFilter, selectedAcademicYear]);

  const pinnedAnnouncements = useMemo(() => filteredAnnouncements.filter(a => a.isPinned), [filteredAnnouncements]);
  const unpinnedAnnouncements = useMemo(() => filteredAnnouncements.filter(a => !a.isPinned), [filteredAnnouncements]);

  const totalPages = Math.ceil(unpinnedAnnouncements.length / itemsPerPage);
  const paginatedUnpinned = unpinnedAnnouncements.slice(
    (currentPage - 1) * itemsPerPage, currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSearchQuery(""); setCategoryFilter("all"); setAudienceFilter("all");
    setSelectedAcademicYear("all"); setCurrentPage(1);
  };
  const hasActiveFilters = searchQuery || categoryFilter !== "all" || audienceFilter !== "all" || selectedAcademicYear !== "all";

  const togglePinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => announcementsAPI.togglePin(id, pinned),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all }); toast.success('Pin status updated'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update pin status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all }); toast.success('Announcement deleted'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete'),
  });

  const parseAttachments = (a: Announcement): AnnouncementAttachment[] => {
    if (!a.attachments) return [];
    try { return JSON.parse(a.attachments); } catch { return []; }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const NoteCard = ({ a, idx, isFeatured }: { a: Announcement; idx?: number; isFeatured?: boolean }) => {
    const cat = getCategory(a);
    const isExpanded = expandedIds.has(a.id);
    const attachments = parseAttachments(a);
    const c = colors[cat as keyof typeof colors];
    const rot = idx !== undefined ? rotations[idx % rotations.length] : "-0.6deg";

    return (
      <div style={{
        position: "relative",
        padding: isFeatured ? "26px 30px 22px" : "26px 20px 20px",
        borderRadius: 2,
        background: isFeatured ? "#fff" : c.bg,
        boxShadow: isFeatured ? "0 14px 26px rgba(0,0,0,.35)" : "0 10px 18px rgba(0,0,0,.28)",
        transform: `rotate(${rot})`,
        transition: "transform .18s ease, box-shadow .18s ease",
        display: "flex", flexDirection: "column",
        minHeight: isFeatured ? "auto" : 210,
        clipPath: isFeatured ? "polygon(0% 1%, 3% 0%, 22% 1.5%, 40% 0%, 61% 1%, 79% 0%, 97% 1.2%, 100% 0%, 100% 98%, 82% 100%, 63% 98.5%, 45% 100%, 25% 98.7%, 8% 100%, 0% 99%)" : undefined,
        maxWidth: isFeatured ? 920 : "none",
        margin: isFeatured ? "0 auto 44px" : 0,
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = `translateY(-4px) rotate(0deg) scale(1.015)`; e.currentTarget.style.boxShadow = "0 16px 26px rgba(0,0,0,.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${rot})`; e.currentTarget.style.boxShadow = isFeatured ? "0 14px 26px rgba(0,0,0,.35)" : "0 10px 18px rgba(0,0,0,.28)"; }}
      >
        {/* Peeling corner */}
        {!isFeatured && <div style={{
          position: "absolute", right: 0, bottom: 0,
          width: 0, height: 0,
          borderStyle: "solid",
          borderWidth: "0 0 22px 22px",
          borderColor: "transparent transparent rgba(0,0,0,.13) transparent",
          filter: "blur(.3px)",
        }} />}

        {/* Pushpin */}
        <div style={{
          position: "absolute",
          top: isFeatured ? -16 : -13,
          left: "50%", transform: "translateX(-50%)",
          width: isFeatured ? 26 : 20,
          height: isFeatured ? 26 : 20,
          borderRadius: "50%",
          background: isFeatured ? colors.urgent.pin : c.pin,
          boxShadow: "0 3px 4px rgba(0,0,0,.4)",
          zIndex: 3,
        }} />

        {/* Tape */}
        <div style={{
          position: "absolute",
          top: isFeatured ? -14 : -10,
          left: isFeatured ? 26 : 16,
          width: isFeatured ? 118 : 78,
          height: 24,
          opacity: .92,
          transform: isFeatured ? "rotate(-6deg)" : "rotate(-4deg)",
          background: isFeatured ? colors.urgent.tape : c.tape,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 3px rgba(0,0,0,.2)",
          zIndex: 2,
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 600, letterSpacing: .6, color: isFeatured ? "#f5f5f4" : "#242422" }}>
            {isFeatured ? "PINNED" : getCategoryLabel(a).toUpperCase()}
          </span>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div style={{
            position: "absolute", top: 8, right: 8, display: "flex", gap: 2, zIndex: 5,
            opacity: 0, transition: "opacity .15s",
          }} className="admin-actions">
            <button onClick={() => togglePinMutation.mutate({ id: a.id, pinned: !a.isPinned })}
              style={{ background: "rgba(255,255,255,.8)", border: "none", borderRadius: 4, cursor: "pointer", padding: 4, color: a.isPinned ? "#e35336" : "#6e6e6a", display: "inline-flex" }} title="Toggle pin">
              <Pin size={13} />
            </button>
            <button onClick={() => { if (confirm('Delete this announcement?')) deleteMutation.mutate(a.id); }}
              style={{ background: "rgba(255,255,255,.8)", border: "none", borderRadius: 4, cursor: "pointer", padding: 4, color: "#c00", display: "inline-flex" }} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {isFeatured ? (
          <>
            <h3 style={{ fontFamily: "cursive", fontSize: 27, margin: "20px 0 8px", color: "#232323", paddingRight: 60 }}>
              <TranslatedText text={a.title} />
            </h3>
            <p style={{ fontSize: 15, color: "#54544e", maxWidth: 640, lineHeight: 1.5 }}>
              <TranslatedText text={a.content} />
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontFamily: "monospace", fontSize: 11.5, color: "#6e6e6a", flexWrap: "wrap" }}>
              <span style={{ border: "1.5px solid #e35336", color: "#e35336", padding: "3px 8px", borderRadius: 3, transform: "rotate(-3deg)", fontWeight: 600, letterSpacing: .5 }}>
                {a.endDate && isBefore(parseISO(a.endDate), new Date()) ? "Expired" : isAfter(parseISO(a.startDate), new Date()) ? "Scheduled" : "Active"}
              </span>
              <span>— {a.createdBy?.name || "System"}</span>
              <span>{formatDateByCalendarType(a.startDate, user?.calendarType || "ETHIOPIAN")}</span>
              <Link href={`/list/announcements/${a.id}`} style={{ color: "#e35336", textDecoration: "none", fontWeight: 600, fontSize: 12, marginLeft: "auto" }}>
                View details →
              </Link>
            </div>
          </>
        ) : (
          <>
            <h4 style={{ fontFamily: "cursive", fontSize: 19, margin: "14px 0 6px", color: "#242422", lineHeight: 1.25, paddingRight: isAdmin ? 40 : 0 }}>
              <TranslatedText text={a.title} />
            </h4>
            <div style={{ fontSize: 13.3, color: "#5c5c56", lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: isExpanded ? "unset" : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              <TranslatedText text={a.content} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontFamily: "monospace", fontSize: 10.5, color: "#6e6e6a" }}>
              <span>{formatDateByCalendarType(a.startDate, user?.calendarType || "ETHIOPIAN")}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {attachments.length > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Paperclip size={11} /> {attachments.length}</span>
                )}
                <Link href={`/list/announcements/${a.id}`} style={{ fontFamily: "sans-serif", fontWeight: 600, fontSize: 11, color: "#e35336", textDecoration: "none" }}>
                  View →
                </Link>
                <button onClick={() => toggleExpand(a.id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, fontSize: 11, color: "#e35336", padding: 0 }}>
                  {isExpanded ? "Less" : "More"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full bg-gray-50 dark:bg-[#1a1a1a]">
      <style>{`
        .note-card:hover .admin-actions { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-black dark:text-white">School Notice Board</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
        </div>
        {isAdmin && announcementsEnabled && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t.create}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[82vh] w-[min(94vw,900px)] max-w-none overflow-hidden p-0">
              <DialogHeader className="border-b bg-[rgba(var(--brand-color-rgb),0.08)] px-5 py-4 dark:border-[#2A2A2A]">
                <DialogTitle>{t.createTitle}</DialogTitle>
                <DialogDescription>{t.createDescription}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[calc(82vh-88px)] overflow-y-auto px-5 py-4">
                <CreateAnnouncementForm onSuccess={() => setShowCreateModal(false)} onCancel={() => setShowCreateModal(false)} />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {isAdmin && !announcementsEnabled && (
          <Button size="sm" className="gap-2" disabled title={t.disabledTitle}>
            <Plus className="h-4 w-4" />
            {t.create}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-row flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {([["all", "All"], ["urgent", t.urgent], ["normal", t.important], ["low", t.normal]] as const).map(([value, label]) => (
            <button key={value}
              onClick={() => { setCategoryFilter(value); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === value
                  ? 'bg-[var(--brand-color,#e35336)] text-white shadow-sm'
                  : 'bg-white dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#333]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <>
            <Select value={audienceFilter} onValueChange={(v) => { setAudienceFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="parents">Parents</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedAcademicYear} onValueChange={(v) => { setSelectedAcademicYear(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map(y => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 px-2 py-1">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-20 border rounded-lg bg-card">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3 opacity-80" />
          <p className="font-medium text-red-600">Failed to load announcements</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(error as any)?.response?.data?.message || (error as Error)?.message || "Please refresh and try again."}
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {/* Featured pinned */}
          {pinnedAnnouncements.length > 0 && (
            <div className="note-card" style={{ marginBottom: 20 }}>
              <NoteCard a={pinnedAnnouncements[0]} isFeatured />
            </div>
          )}

          {/* Empty */}
          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-20 border rounded-lg bg-card">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">{t.empty}</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">{t.clearFilters}</Button>
              )}
            </div>
          ) : (
            <>
              {/* Grid of note cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 note-card">
                {paginatedUnpinned.map((a, idx) => (
                  <NoteCard key={a.id} a={a} idx={idx} />
                ))}
              </div>

              {/* Pagination */}
              {unpinnedAnnouncements.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, unpinnedAnnouncements.length)} of {unpinnedAnnouncements.length}
                  </p>
                  <Pagination page={currentPage} setPage={setCurrentPage} totalPages={totalPages} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AnnouncementListPage;
