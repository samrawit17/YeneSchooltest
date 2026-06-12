"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Eye, Star, GraduationCap, User, CalendarCheck, Award, Phone } from "lucide-react";
import { parentDashboardAPI } from "@/lib/api/parent";
import { academicYearsAPI, reportCardsAPI, termsAPI } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="w-full px-4 sm:px-6 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-full">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <div className="w-full px-4 sm:px-6 pt-6 pb-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Children</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor your children&apos;s academic progress and attendance
          </p>
        </div>

        {children.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-16 text-center">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[rgba(var(--brand-color-rgb),0.1)]">
              <Users className="w-8 h-8 text-[var(--brand-color,#e35336)]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No Children Linked
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Contact the school administration to link your children to your parent account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {children.map((child) => {
              const attendance = child.attendance || { presentDays: 0, totalDays: 0, rate: 0 };
              const academics = child.academics || { average: 0, grade: "N/A" };
              const photoSrc = resolveAssetUrl(child.photoUrl);

              return (
                <div key={child.id} className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col w-full max-w-[450px] mx-auto">
                  <div className="pt-8 pb-4 px-6 text-center">
                    <div className="relative inline-block">
                      <Avatar className="h-24 w-24 ring-4 ring-slate-100 dark:ring-slate-700 mx-auto">
                        {photoSrc ? (
                          <img src={photoSrc} alt={child.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <AvatarFallback className="text-3xl font-bold text-white bg-[var(--brand-color,#e35336)]">
                            {child.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {child.isPrimary && (
                        <div className="absolute -right-1 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-md ring-2 ring-white dark:ring-slate-900">
                          <Star className="h-3.5 w-3.5 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{child.name}</h3>
                    <p className="text-sm text-slate-500">{child.studentCode}</p>
                    <Badge variant="secondary" className="mt-2 text-xs px-3 py-0.5">
                      {child.relation || "Child"}
                    </Badge>
                  </div>

                  <div className="px-6 pb-4 grid grid-cols-2 gap-3">
                    <Metric icon={GraduationCap} label="Class" value={`${child.className}${child.section && child.section !== "N/A" ? ` - ${child.section}` : ""}`} />
                    <Metric icon={CalendarCheck} label="Attendance" value={`${attendance.rate}%`} />
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 px-6 py-3 space-y-2">
                    {child.username && (
                      <MinimalRow icon={User} label="Username" value={child.username} />
                    )}
                    {child.parentPhone && (
                      <MinimalRow icon={Phone} label="Phone" value={child.parentPhone} />
                    )}
                    {child.homeroomTeacher && (
                      <MinimalRow icon={User} label="Teacher" value={child.homeroomTeacher.name} />
                    )}
                  </div>

                  <div className="mt-auto px-6 pb-6 pt-1">
                    <Button
                      onClick={() => router.push(`/parent/children/${child.studentId || child.id}`)}
                      variant="outline"
                      className="h-10 w-full gap-2 rounded-xl text-sm font-semibold border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Eye className="h-4 w-4" />
                      View Full Profile
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3 text-center">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value || "N/A"}</p>
    </div>
  );
}

function MinimalRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span className="ml-auto font-medium text-slate-800 dark:text-slate-200 truncate">{value}</span>
    </div>
  );
}

export default ParentChildrenPage;
