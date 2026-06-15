"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Eye, Star } from "lucide-react";
import { parentDashboardAPI } from "@/lib/api/parent";
import { academicYearsAPI, reportCardsAPI, termsAPI } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { resolveAssetUrl } from "@/lib/asset-url";

interface Child {
  id: string;
  studentId?: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
  classId: string;
  relation: string;
  isPrimary: boolean;
  isPromoted?: boolean;
  userId: string;
  username?: string;
  parentPhone?: string;
  homeroomTeacher?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  attendance?: {
    presentDays: number;
    totalDays: number;
    rate: number;
  };
  academics?: {
    average: number;
    grade: string;
  };
  photoUrl?: string;
}

const ParentChildrenPage = () => {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const [childrenResponse, dashboardResponse, activeYearResponse, currentTermResponse] = await Promise.allSettled([
          parentDashboardAPI.getChildren(),
          parentDashboardAPI.getDashboard(),
          academicYearsAPI.getActive(),
          termsAPI.getCurrent(),
        ]);

        if (childrenResponse.status === "fulfilled" && childrenResponse.value.status === 200) {
          const childrenData = childrenResponse.value.data.children || [];
          const dashboardChildren =
            dashboardResponse.status === "fulfilled"
              ? dashboardResponse.value.data?.stats?.children || []
              : [];
          const activeAcademicYear =
            activeYearResponse.status === "fulfilled"
              ? activeYearResponse.value.data?.data || activeYearResponse.value.data
              : null;
          const currentTerm =
            currentTermResponse.status === "fulfilled"
              ? currentTermResponse.value.data?.data || currentTermResponse.value.data
              : null;
          const dashboardMap = new Map(
            dashboardChildren.map((child: any) => [child.id, child]),
          );

          const childrenWithInfo = await Promise.all(
            childrenData.map(async (child: any) => {
              const childUserId =
                child.student?.userId || child.student?.id || child.userId;
              const dashboardChild = childUserId
                ? (dashboardMap.get(childUserId) as any)
                : null;
              const fallbackAttendance = dashboardChild ? {
                presentDays: dashboardChild.presentDays || 0,
                totalDays: dashboardChild.totalDays || 0,
                rate: parseFloat(dashboardChild.attendance || "0"),
              } : { presentDays: 0, totalDays: 0, rate: 0 };
              const fallbackAcademics = dashboardChild ? {
                average: Number.parseFloat(dashboardChild.grades?.[0]?.average || "0") || 0,
                grade: dashboardChild.overallGrade || dashboardChild.latestGrade || "N/A",
              } : { average: 0, grade: "N/A" };

              let publishedAcademics = fallbackAcademics;
              if (childUserId) {
                try {
                  const publishedCardsResponse = await reportCardsAPI.getPublishedForParent(childUserId, {
                    ...(activeAcademicYear?.name ? { academicYear: activeAcademicYear.name } : {}),
                    ...(currentTerm?.name ? { term: currentTerm.name } : {}),
                  });

                  const publishedCards = Array.isArray(publishedCardsResponse.data)
                    ? publishedCardsResponse.data
                    : [];
                  const latestPublishedCard = publishedCards.sort((a, b) =>
                    new Date(b.publishedAt || b.updatedAt).getTime() -
                    new Date(a.publishedAt || a.updatedAt).getTime(),
                  )[0];

                  if (latestPublishedCard) {
                    publishedAcademics = {
                      average: Number(latestPublishedCard.percentage) || 0,
                      grade: latestPublishedCard.overallGrade || "N/A",
                    };
                  }
                } catch (reportCardError) {
                  console.error("Failed to fetch published report cards:", reportCardError);
                }
              }

              try {
                const enrollmentResponse = childUserId
                  ? await parentDashboardAPI.getStudentEnrollment(childUserId)
                  : null;
                if (enrollmentResponse?.data?.classId) {
                  const classResponse = await parentDashboardAPI.getStudentClass(enrollmentResponse.data.classId);
                  return {
                    ...child,
                    id: child.studentId || child.id,
                    userId: childUserId,
                    classId: enrollmentResponse.data.classId,
                    homeroomTeacher: classResponse.data?.homeroomTeacher || null,
                    name: child.name || child.student?.user?.name || "Unknown",
                    className: child.className || child.student?.className || "N/A",
                    section: child.section || child.student?.section || "N/A",
                    studentCode: child.studentCode || child.student?.studentCode || child.student?.studentId || "N/A",
                    username: child.username || child.student?.user?.username || child.student?.username,
                    parentPhone: child.parentPhone || child.phone || child.parent?.user?.phone,
                    photoUrl: child.photoUrl || child.student?.user?.avatarUrl || child.student?.user?.photoUrl || null,
                    attendance: fallbackAttendance,
                    academics: publishedAcademics,
                  };
                }
              } catch (e) {
              }
              return {
                ...child,
                id: child.studentId || child.id,
                userId: childUserId,
                name: child.name || child.student?.user?.name || "Unknown",
                className: child.className || child.student?.className || "N/A",
                section: child.section || child.student?.section || "N/A",
                studentCode: child.studentCode || child.student?.studentCode || child.student?.studentId || "N/A",
                username: child.username || child.student?.user?.username || child.student?.username,
                parentPhone: child.parentPhone || child.phone || child.parent?.user?.phone,
                photoUrl: child.photoUrl || child.student?.user?.avatarUrl || child.student?.user?.photoUrl || null,
                attendance: fallbackAttendance,
                academics: publishedAcademics,
              };
            })
          );

          setChildren(childrenWithInfo);
        }
      } catch (error) {
        console.error("Failed to fetch children:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111111]">
        <div className="w-full px-4 sm:px-6 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-full">
                <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-5 space-y-4">
                  <Skeleton className="w-20 h-20 rounded-full mx-auto" />
                  <Skeleton className="h-5 w-32 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#111111]">
      <div className="w-full px-4 sm:px-6 pt-6 pb-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Children</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your children&apos;s academic progress and attendance
          </p>
        </div>

        {children.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-xl py-16 text-center">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[rgba(var(--brand-color-rgb),0.1)]">
              <Users className="w-8 h-8 text-[var(--brand-color,#e35336)]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Children Linked
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Contact the school administration to link your children to your parent account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {children.map((child) => {
              const attendance = child.attendance || { presentDays: 0, totalDays: 0, rate: 0 };
              const academics = child.academics || { average: 0, grade: "N/A" };
              const photoSrc = resolveAssetUrl(child.photoUrl);

              return (
                <div key={child.id} className="w-full rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-6 text-gray-900 dark:text-gray-100 shadow-lg">
                  {/* Header Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border-2 border-gray-200 dark:border-[#2A2A2A]">
                        {photoSrc ? (
                          <img src={photoSrc} alt={child.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <AvatarFallback className="text-lg font-bold text-white bg-[var(--brand-color,#e35336)]">
                            {child.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{child.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{child.studentCode}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{child.relation || "Child"}</p>
                      </div>
                    </div>
                    {child.isPrimary && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-md">
                        <Star className="h-3.5 w-3.5 fill-white text-white" />
                      </div>
                    )}
                  </div>

                  {/* Details Grid Section */}
                  <div className="my-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-gray-200 dark:border-[#2A2A2A] py-5">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Class</span>
                      <div className="flex items-center gap-2">
                        <span className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{child.className}{child.section && child.section !== "N/A" ? ` - ${child.section}` : ""}</span>
                        {child.isPromoted && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Promoted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Attendance</span>
                      <span className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{attendance.rate}%</span>
                    </div>
                    {child.username && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Username</span>
                        <span className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{child.username}</span>
                      </div>
                    )}
                    {child.parentPhone && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Phone</span>
                        <span className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{child.parentPhone}</span>
                      </div>
                    )}
                    {child.homeroomTeacher && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Teacher</span>
                        <span className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{child.homeroomTeacher.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => router.push(`/parent/children/${child.studentId || child.id}`)}
                    className="w-full bg-[var(--brand-color,#e35336)] text-white hover:opacity-90"
                    size="lg"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Full Profile
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentChildrenPage;
