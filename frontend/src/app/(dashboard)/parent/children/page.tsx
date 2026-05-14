"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Eye, Star, GraduationCap, User } from "lucide-react";
import { parentDashboardAPI } from "@/lib/api/parent";
import { academicYearsAPI, reportCardsAPI, termsAPI } from "@/lib/api";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
                ? dashboardMap.get(childUserId)
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
                    photoUrl: child.photoUrl || child.student?.user?.photoUrl || null,
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
                photoUrl: child.photoUrl || child.student?.user?.photoUrl || null,
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full" style={{ aspectRatio: '4 / 5' }}>
                <Card className="dark:bg-slate-900 dark:border-slate-800 h-full">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="w-24 h-24 rounded-full mx-auto" />
                    <Skeleton className="h-5 w-32 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                    <div className="space-y-2 pt-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Children</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor your children&apos;s academic progress and attendance
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {children.length === 0 ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="py-16 text-center">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(var(--brand-color-rgb, 227, 83, 54), 0.1)' }}
              >
                <Users className="w-8 h-8" style={{ color: 'var(--brand-color, #e35336)' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Children Linked
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Contact the school administration to link your children to your parent account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {children.map((child) => {
              const attendance = child.attendance || { presentDays: 0, totalDays: 0, rate: 0 };

              return (
                <div key={child.id} className="w-full">
                  <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col rounded-2xl">

                    {/* Photo */}
                    <div className="flex justify-center pt-6 pb-3 px-6">
                      <div className="relative">
                        <Avatar className="w-28 h-28 ring-[3px] ring-slate-100 dark:ring-slate-700">
                          {child.photoUrl ? (
                            <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <AvatarFallback
                              className="text-3xl font-bold text-white"
                              style={{ backgroundColor: 'var(--brand-color, #e35336)' }}
                            >
                              {child.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {child.isPrimary && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900">
                            <Star className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="text-center px-6">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {child.name}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {child.relation || "Child"}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 my-4 border-t border-slate-100 dark:border-slate-800" />

                    {/* Details */}
                    <div className="px-6 space-y-3 pb-4">
                      <DetailRow label="Student ID" value={child.studentId || child.id} />
                      <DetailRow label="Roll Number" value={child.studentCode} />
                      <DetailRow label="Class" value={`${child.className} - Section ${child.section}`} />
                      {child.homeroomTeacher && (
                        <DetailRow label="Homeroom Teacher" value={child.homeroomTeacher.name} />
                      )}
                      <DetailRow
                        label="Attendance"
                        value={`${attendance.rate}%${attendance.totalDays > 0 ? ` (${attendance.presentDays}/${attendance.totalDays})` : ''}`}
                        indicator={
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            attendance.rate >= 75 ? 'bg-green-500' : attendance.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                        }
                      />
                    </div>

                    {/* Action */}
                    <div className="px-6 pb-5 pt-1 mt-auto">
                      <Button
                        onClick={() => router.push(`/parent/children/${child.studentId || child.id}`)}
                        className="w-full h-9 text-xs font-semibold gap-1.5 rounded-xl"
                        style={{ backgroundColor: 'var(--brand-color, #e35336)' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Full Profile
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function DetailRow({ label, value, indicator }: { label: string; value: string; indicator?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      {indicator || <div className="w-4 h-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{value}</p>
      </div>
    </div>
  );
}

export default ParentChildrenPage;
