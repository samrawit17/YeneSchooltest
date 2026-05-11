"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, BookOpen, Eye, TrendingUp, Star, ArrowRight, User } from "lucide-react";
import { parentDashboardAPI } from "@/lib/api/parent";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
}

const ParentChildrenPage = () => {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const [childrenResponse, dashboardResponse] = await Promise.allSettled([
          parentDashboardAPI.getChildren(),
          parentDashboardAPI.getDashboard(),
        ]);
        
        if (childrenResponse.status === "fulfilled" && childrenResponse.value.status === 200) {
          const childrenData = childrenResponse.value.data.children || [];
          const dashboardChildren =
            dashboardResponse.status === "fulfilled"
              ? dashboardResponse.value.data?.stats?.children || []
              : [];
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
                    attendance: dashboardChild ? {
                      presentDays: dashboardChild.presentDays || 0,
                      totalDays: dashboardChild.totalDays || 0,
                      rate: parseFloat(dashboardChild.attendance || "0"),
                    } : { presentDays: 0, totalDays: 0, rate: 0 },
                    academics: dashboardChild ? {
                      average: Number.parseFloat(dashboardChild.grades?.[0]?.average || "0") || 0,
                      grade: dashboardChild.overallGrade || dashboardChild.latestGrade || "N/A",
                    } : { average: 0, grade: "N/A" },
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
                attendance: dashboardChild ? {
                  presentDays: dashboardChild.presentDays || 0,
                  totalDays: dashboardChild.totalDays || 0,
                  rate: parseFloat(dashboardChild.attendance || "0"),
                } : { presentDays: 0, totalDays: 0, rate: 0 },
                academics: dashboardChild ? {
                  average: Number.parseFloat(dashboardChild.grades?.[0]?.average || "0") || 0,
                  grade: dashboardChild.overallGrade || dashboardChild.latestGrade || "N/A",
                } : { average: 0, grade: "N/A" },
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

  const getAttendance = (child: Child) => {
    return child.attendance || { presentDays: 0, totalDays: 0, rate: 0 };
  };

  const getAcademics = (child: Child) => {
    return child.academics || { average: 0, grade: "N/A" };
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400";
      case "B": return "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400";
      case "C": return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400";
      case "D": return "text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400";
      case "F": return "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#e35336]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#e35336]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e35336]">My Children</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Monitor your children's academic progress and attendance
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {children.length === 0 ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-xl bg-[#e35336]/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#e35336]" />
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
          <div className="space-y-4">
            {children.map((child) => {
              const attendance = getAttendance(child);
              const academics = getAcademics(child);
              const gradeColor = getGradeColor(academics.grade);

              return (
                <Card
                  key={child.id}
                  className="dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar className="h-12 w-12 ring-2 ring-[#e35336]/20">
                          <AvatarFallback className="font-semibold">
                            {child.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                              {child.name}
                            </p>
                            {child.isPrimary && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {child.className} • Section {child.section} • {child.studentCode}
                          </p>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Attendance</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{attendance.rate}%</p>
                          <p className="text-[10px] text-gray-400">{attendance.presentDays}/{attendance.totalDays} days</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Grade</p>
                          <span className={`text-lg font-bold px-2 py-0.5 rounded ${gradeColor}`}>
                            {academics.grade}
                          </span>
                          {academics.average > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{academics.average}% avg</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="md:hidden flex items-center gap-3 mr-2">
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Att.</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{attendance.rate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Grade</p>
                            <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                              {academics.grade}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/parent/children/${child.studentId || child.id}`)}
                          className="h-9"
                        >
                          View
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentChildrenPage;
