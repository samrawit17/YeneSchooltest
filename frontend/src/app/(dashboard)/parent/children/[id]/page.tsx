"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { 
  Calendar, 
  BookOpen, 
  CreditCard, 
  User, 
  ChevronLeft,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Award,
  Users,
  Clock,
  DollarSign,
  FileText,
  Bell,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { academicYearsAPI, financeAPI } from "@/lib/api";
import { parentDashboardAPI } from "@/lib/api/parent";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface ChildDetail {
  id: string;
  name: string;
  studentCode: string;
  className: string;
  section: string;
  enrollmentStatus: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  admissionDate: string;
  academicYear?: string;
  parentName?: string;
  homeroomTeacher?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
}

interface ChildStats {
  attendance: {
    presentDays: number;
    totalDays: number;
    rate: number;
  };
  academics: {
    average: number;
    grade: string;
    ranking?: number;
    totalSubjects?: number;
  };
  fees: {
    total: number;
    paid: number;
    balance: number;
  };
  behavior?: {
    score: number;
    rating: string;
  };
}

interface Activity {
  id: string;
  type: string;
  message: string;
  date: string;
  icon: string;
}

const ChildDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;
  const { setItems } = useBreadcrumb();
  const breadcrumbSetRef = useRef(false);

  const [child, setChild] = useState<ChildDetail | null>(null);
  const [stats, setStats] = useState<ChildStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchChildDetail = async () => {
      try {
        const [childResponse, dashboardResponse, activeYearResponse] =
          await Promise.allSettled([
            parentDashboardAPI.getChildren(),
            parentDashboardAPI.getDashboard(),
            academicYearsAPI.getActive(),
          ]);

        if (childResponse.status !== "fulfilled") {
          throw new Error("Child details could not be loaded");
        }

        const childrenRows = childResponse.value.data?.children || childResponse.value.data || [];
        const childData =
          (Array.isArray(childrenRows) ? childrenRows : []).find((item: any) =>
            item.studentId === childId ||
            item.id === childId ||
            item.student?.id === childId ||
            item.userId === childId ||
            item.student?.userId === childId
          ) || null;
        const studentProfile = childData?.student || {};
        const studentUser = studentProfile?.user || {};
        const studentUserId = studentProfile.userId || studentUser.id;

        const dashboardChild =
          dashboardResponse.status === "fulfilled"
            ? (dashboardResponse.value.data?.stats?.children || []).find(
                (item: any) => item.id === studentUserId,
              )
            : null;

        let feeSummary = { total: 0, paid: 0, balance: 0 };
        const schoolId = dashboardResponse.status === "fulfilled"
          ? dashboardResponse.value.data?.metadata?.schoolId
          : null;
        const academicYearId =
          activeYearResponse.status === "fulfilled"
            ? activeYearResponse.value.data?.data?.id || activeYearResponse.value.data?.id
            : null;

        if (schoolId && academicYearId && (childData?.studentId || studentUserId)) {
          try {
            const feeResponse = await financeAPI.getStudentFees(
              childData?.studentId || studentUserId,
              schoolId,
              academicYearId
            );
            feeSummary = {
              total: feeResponse.data?.summary?.totalFees || 0,
              paid: feeResponse.data?.summary?.totalPaid || 0,
              balance: feeResponse.data?.summary?.totalBalance || 0,
            };
          } catch (feeError) {
            console.error("Failed to fetch fee summary:", feeError);
          }
        }

        setChild({
          id: childData?.studentId || childData?.id,
          name: childData?.name || studentUser?.name || "Unknown",
          studentCode: studentProfile?.studentCode || childData?.studentCode || "N/A",
          className: childData?.className || studentProfile?.className || "N/A",
          section: childData?.section || studentProfile?.section || "N/A",
          enrollmentStatus: studentProfile?.status || "ACTIVE",
          dateOfBirth: studentProfile?.dob || "",
          gender: studentProfile?.gender || "N/A",
          bloodGroup: studentProfile?.bloodType || null,
          address: studentProfile?.address || null,
          phone: studentProfile?.phone || studentUser?.phone || null,
          email: studentUser?.email || null,
          admissionDate: studentProfile?.createdAt || "",
          academicYear: studentProfile?.academicYear || undefined,
          parentName: childData?.parent?.user?.name || undefined,
          homeroomTeacher: null,
        });

        setStats({
          attendance: {
            presentDays: dashboardChild?.presentDays || 0,
            totalDays: dashboardChild?.totalDays || 0,
            rate: parseFloat(dashboardChild?.attendance || "0") || 0,
          },
          academics: {
            average: Number.parseFloat(dashboardChild?.grades?.[0]?.average || "0") || 0,
            grade: dashboardChild?.overallGrade || dashboardChild?.latestGrade || "N/A",
          },
          fees: feeSummary,
        });

        const activity = [
          ...(dashboardChild?.recentAbsences || []).map((absence: any, index: number) => ({
            id: `absence-${index}`,
            type: "attendance",
            message: absence.reason
              ? `Absent: ${absence.reason}`
              : "Marked absent",
            date: absence.date,
            icon: "alert",
          })),
          ...(dashboardChild?.reportCard?.publishedAt
            ? [{
                id: "report-card",
                type: "report",
                message: "Latest report card published",
                date: dashboardChild.reportCard.publishedAt,
                icon: "file",
              }]
            : []),
        ];
        setRecentActivity(activity);
      } catch (error) {
        console.error("Failed to fetch child details:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchChildDetail();
  }, [childId]);

  // Set breadcrumbs when child data is loaded
  useEffect(() => {
    if (!breadcrumbSetRef.current && child?.name) {
      breadcrumbSetRef.current = true;
      setItems([
        { label: "Dashboard", href: "/parent", isCurrent: false },
        { label: "My Children", href: "/parent/children", isCurrent: false },
        { label: child.name, isCurrent: true },
      ]);
    }

    return () => setItems(null);
  }, [child, setItems]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  const getAge = (dateOfBirth: string) => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Child Not Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              The requested child profile could not be found.
            </p>
            <Button className="mt-4" onClick={() => router.push("/parent/children")}>
              Back to Children
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">


          {/* Large Child Profile Card */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left - Student Photo and Basic Info */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-3xl">
                      {child.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-bold text-[#e35336]">
                      {child.name}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      {child.className} - Section {child.section}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge 
                        variant="outline" 
                        className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      >
                        {child.enrollmentStatus === "ACTIVE" ? "Active" : child.enrollmentStatus}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {child.studentCode}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {child.academicYear || "-"}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/parent/timetable?childId=${child.id}`)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        View Timetable
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right - Quick Stats */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Attendance</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.attendance.rate || 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Current GPA</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.academics.grade || "N/A"}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Fee Balance</span>
                    </div>
                    <p className={`text-xl font-bold ${
                      (stats?.fees.balance || 0) > 0 
                        ? "text-amber-600 dark:text-amber-400" 
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      Brr {stats?.fees.balance || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Behavior</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.behavior?.score || 0}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two Column Layout Below Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left - Personal Information Card */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(child.dateOfBirth)} ({getAge(child.dateOfBirth)} years)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                      <p className="font-medium text-gray-900 dark:text-white">{child.gender}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Parent Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{child.parentName || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Contact Info</p>
                      <p className="font-medium text-gray-900 dark:text-white">{child.email || "N/A"}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{child.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="font-medium text-gray-900 dark:text-white">{child.address || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right - Academic Snapshot Card */}
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Academic Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Current Term</p>
                      <p className="font-medium text-gray-900 dark:text-white">Term 2 - 2025-2026</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Homeroom Teacher</p>
                      {child.homeroomTeacher ? (
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900 dark:text-white">{child.homeroomTeacher.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{child.homeroomTeacher.email}</p>
                          {child.homeroomTeacher.phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{child.homeroomTeacher.phone}</p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              if (!child.homeroomTeacher?.id) return;
                              router.push(`/list/communications?teacherId=${child.homeroomTeacher.id}`);
                            }}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Message via Communication Book
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white">Not assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Subjects</p>
                      <p className="font-medium text-gray-900 dark:text-white">{stats?.academics.totalSubjects || 8} subjects</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Ranking</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        #{stats?.academics.ranking || 5} out of 30 students
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Overall Average</p>
                      <p className="font-medium text-gray-900 dark:text-white">{stats?.academics.average || 88}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section - Recent Activity Timeline */}
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 py-4 ${
                      index !== recentActivity.length - 1
                        ? "border-b border-gray-100 dark:border-slate-700"
                        : ""
                    }`}
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`p-2 rounded-full ${
                          activity.type === "payment"
                            ? "bg-emerald-100 dark:bg-emerald-900/50"
                            : activity.type === "grade"
                            ? "bg-blue-100 dark:bg-blue-900/50"
                            : activity.type === "attendance"
                            ? "bg-purple-100 dark:bg-purple-900/50"
                            : "bg-amber-100 dark:bg-amber-900/50"
                        }`}
                      >
                        {activity.type === "payment" && (
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {activity.type === "grade" && (
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                        {activity.type === "attendance" && (
                          <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        )}
                        {activity.type === "notice" && (
                          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      {index !== recentActivity.length - 1 && (
                        <div className="w-px h-full absolute top-10 bg-gray-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(activity.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChildDetailPage;
