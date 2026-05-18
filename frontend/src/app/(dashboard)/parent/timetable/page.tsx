"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { studentsAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";
import { useAuth } from "@/context/AuthContext";
import ClassProgramView from "@/components/timetable/ClassProgramView";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  School,
  Users,
  BookText,
  GraduationCap,
} from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import type { ParentTimetableMessages } from "@/messages/registry";

interface Child {
  id: string;
  userId: string;
  name: string;
  className?: string;
  section?: string;
}

interface ChildEnrollment extends Child {
  classId?: string;
  sectionId?: string;
}

const formatShortWeekday = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

export default function ParentTimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslations<ParentTimetableMessages>("parentTimetable");
  const [children, setChildren] = useState<ChildEnrollment[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getChildren();
      const rows = response.data?.children || response.data || [];
      const childrenWithEnrollment = await Promise.all(
        (Array.isArray(rows) ? rows : []).map(async (rawChild: any) => {
          const child: ChildEnrollment = {
            id: rawChild.studentId || rawChild.id,
            userId:
              rawChild.student?.userId || rawChild.student?.id || rawChild.userId,
            name: rawChild.name || rawChild.student?.user?.name || "Unknown",
            classId: rawChild.classId || rawChild.student?.classId,
            sectionId: rawChild.sectionId || rawChild.student?.sectionId,
            className: rawChild.className || rawChild.student?.className,
            section: rawChild.section || rawChild.student?.section,
          };
          try {
            const enrollmentResponse = await parentDashboardAPI.getStudentEnrollment(child.userId);
            const enrollmentData = enrollmentResponse.data?.data || enrollmentResponse.data || {};
            return {
              ...child,
              classId: enrollmentData.classId || enrollmentData.class?.id || child.classId,
              sectionId: enrollmentData.sectionId || enrollmentData.section?.id || child.sectionId,
              className: child.className || enrollmentData.className || enrollmentData.class?.name,
              section:
                child.section ||
                enrollmentData.sectionName ||
                enrollmentData.section?.name ||
                enrollmentData.section,
            };
          } catch {
            return child;
          }
        }),
      );

      setChildren(childrenWithEnrollment);

      const requestedChildId = searchParams.get("childId");
      const preferredChild =
        childrenWithEnrollment.find((child) => child.id === requestedChildId) ||
        childrenWithEnrollment[0];
      setSelectedChildId(preferredChild?.id || "");
    } catch (error) {
      console.error("Failed to load children:", error);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "PARENT") {
      router.push("/");
      return;
    }

    if (isAuthenticated && user?.role === "PARENT") {
      loadChildren();
    }
  }, [isAuthenticated, authLoading, loadChildren, router, user]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId],
  );

  const translatedClassName = useMemo(() => {
    if (!selectedChild?.className) return "";
    return selectedChild.className.replace(/^Grade\s*/i, `${t.grade} `);
  }, [selectedChild?.className, t.grade]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="px-4 py-6 md:px-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <div className="px-4 py-6 md:px-6 space-y-6">

        {/* Header */}
        <div>
          <div className="mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        {/* Child Selector + Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(var(--brand-color-rgb),0.1)] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.selectChild}</p>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-full h-9 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder={t.chooseChild} />
                </SelectTrigger>
                <SelectContent>
                {children.map((child) => {
                  const childClassName = child.className?.replace(/^Grade\s*/i, `${t.grade} `) || "";
                  return (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                      {childClassName ? ` • ${childClassName}` : ""}
                      {child.section ? ` (${t.section} ${child.section})` : ""}
                    </SelectItem>
                  );
                })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(var(--brand-color-rgb),0.1)] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.child}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                {selectedChild?.name || "N/A"}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(var(--brand-color-rgb),0.1)] flex items-center justify-center shrink-0">
              <BookText className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.class}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                {selectedChild?.className || selectedChild?.section
                  ? `${translatedClassName || "N/A"}${selectedChild.section ? ` - ${selectedChild.section}` : ""}`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {children.length === 0 && (
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <School className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.noChildren}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t.noChildrenDesc}
            </p>
          </div>
        )}

        {/* Timetable View */}
        <ClassProgramView
          schoolId={user?.schoolId}
          classId={selectedChild?.classId}
          sectionId={selectedChild?.sectionId}
          ownerName={selectedChild?.name || t.child}
          title={t.weeklyProgram}
          subtitle={
            translatedClassName
              ? `${translatedClassName}${selectedChild.section ? ` • ${t.section} ${selectedChild.section}` : ""}`
              : t.selectChildSubtitle
          }
          emptyTitle={t.noProgram}
          emptyDescription={
            children.length === 0
              ? t.noProgramDescNoChild
              : t.noProgramDescNoTimetable
          }
        />
      </div>
    </div>
  );
}
