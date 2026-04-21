"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api, { studentsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ClassProgramView from "@/components/timetable/ClassProgramView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, School, Users, ChevronDown, Loader2 } from "lucide-react";

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

export default function ParentTimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [children, setChildren] = useState<ChildEnrollment[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getChildren();
      const rows = response.data?.children || response.data || [];
      const childrenWithEnrollment = await Promise.all(
        (Array.isArray(rows) ? rows : []).map(async (child: Child) => {
          try {
            const enrollmentResponse = await api.get(`/enrollments/student/${child.userId}`);
            return {
              ...child,
              classId: enrollmentResponse.data?.classId,
              sectionId: enrollmentResponse.data?.sectionId,
              className: child.className || enrollmentResponse.data?.className,
              section: child.section || enrollmentResponse.data?.section,
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

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-3" />
            <Skeleton className="h-5 w-96" />
          </div>

          {/* Child Selector Card Skeleton */}
          <Card className="mb-6 border-t-4 border-t-[#e35336]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>

          {/* Timetable Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
                {[...Array(5)].map((_, row) => (
                  <div key={row} className="grid grid-cols-7 gap-2">
                    {[...Array(7)].map((_, col) => (
                      <Skeleton key={col} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#e35336]/10 rounded-lg">
              <Calendar className="w-6 h-6 text-[#e35336]" />
            </div>
            <h1 className="text-2xl font-bold text-[#e35336]">
              Class Timetable
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-11">
            View your child's weekly class schedule and academic program
          </p>
        </div>

        {/* Child Selector Card */}
        <Card className="mb-6 border-t-4 border-t-[#e35336] shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#e35336]" />
              Select Child
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#e35336] focus:border-transparent transition-all"
                disabled={children.length === 0}
              >
                {children.length === 0 ? (
                  <option value="">No children linked to your account</option>
                ) : (
                  children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                      {child.className ? ` • ${child.className}` : ""}
                      {child.section ? ` (Section ${child.section})` : ""}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Help Text */}
            {children.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <School className="w-3 h-3" />
                Contact the school to link children to your account
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timetable View */}
        <ClassProgramView
          schoolId={user?.schoolId}
          classId={selectedChild?.classId}
          sectionId={selectedChild?.sectionId}
          ownerName={selectedChild?.name || "Child"}
          title="Weekly Schedule"
          subtitle={
            selectedChild?.className
              ? `${selectedChild.className}${selectedChild.section ? ` • Section ${selectedChild.section}` : ""}`
              : "Select a child to view their class timetable"
          }
          emptyTitle="No Class Program Available"
          emptyDescription={
            children.length === 0
              ? "Please ensure your child is linked to your account and has an assigned class."
              : "The selected child doesn't have a published timetable yet. Please check back later."
          }
        />
      </div>
    </div>
  );
}