"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users, Calendar, BookOpen, Eye, TrendingUp, Award, Star } from "lucide-react";
import { parentDashboardAPI } from "@/lib/api/parent";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
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
                // Continue without class info
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
      case "A": return "text-green-600 bg-green-50";
      case "B": return "text-blue-600 bg-blue-50";
      case "C": return "text-yellow-600 bg-yellow-50";
      case "D": return "text-orange-600 bg-orange-50";
      case "F": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
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
    <div className="p-4 md:p-6 bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#e35336]">
            My Children
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Monitor your children's academic progress and attendance
          </p>
        </div>

        {/* No Children Message */}
        {children.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-[#e35336]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#e35336]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Children Linked
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Contact the school administration to link your children to your parent account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => {
              const attendance = getAttendance(child);
              const academics = getAcademics(child);
              const gradeColor = getGradeColor(academics.grade);
              const attendanceColor = getAttendanceColor(attendance.rate);
              
              return (
                <Card 
                  key={child.id} 
                  className="group hover:shadow-xl transition-all duration-300 border-t-4 border-t-[#e35336] hover:border-t-[#e35336] overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14 ring-2 ring-[#e35336]/20 group-hover:ring-[#e35336]/40 transition-all">
                        <AvatarFallback className="bg-gradient-to-br from-[#e35336] to-[#c74428] text-white text-lg font-semibold">
                          {child.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {child.name}
                        </CardTitle>
                        <CardDescription className="text-sm flex items-center gap-1 mt-1">
                          <span className="font-medium text-[#e35336]">{child.className}</span>
                          <span>•</span>
                          <span>Section {child.section}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                        {child.studentCode}
                      </Badge>
                      <Badge variant="secondary" className="bg-[#e35336]/10 text-[#e35336] hover:bg-[#e35336]/20">
                        {child.relation}
                      </Badge>
                      {child.isPrimary && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                          <Star className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Attendance Card */}
                      <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-[#e35336]" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Attendance</span>
                        </div>
                        <p className={`text-2xl font-bold ${attendanceColor}`}>
                          {attendance.rate}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {attendance.presentDays}/{attendance.totalDays} days
                        </p>
                      </div>

                      {/* Academic Card */}
                      <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-[#e35336]" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Latest Grade</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-bold px-2 py-0.5 rounded ${gradeColor}`}>
                            {academics.grade}
                          </span>
                          {academics.average > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {academics.average}% avg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Indicators */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Overall Progress
                        </span>
                        <span>{attendance.rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-[#e35336] h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${attendance.rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      variant="outline" 
                      className="w-full group/btn border-[#e35336] text-[#e35336] hover:bg-[#e35336] hover:text-white transition-all duration-300"
                      onClick={() => router.push(`/parent/children/${child.studentId || child.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
                      View Detailed Report
                    </Button>
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
