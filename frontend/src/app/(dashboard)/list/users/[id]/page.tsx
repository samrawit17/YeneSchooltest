"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatUserDisplayCode } from "@/lib/student-code";
import {
  Activity,
  BriefcaseBusiness,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  User,
} from "lucide-react";
import UserAvatarUpload from "@/components/UserAvatarUpload";
import { resolveAssetUrl } from "@/lib/asset-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: { id: string };
}

type UserResponse = {
  id: string;
  email?: string | null;
  username?: string | null;
  name: string;
  role: string;
  schoolId?: string | null;
  isActive: boolean;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  teacherProfile?: {
    id: string;
    employeeId?: string | null;
    designation?: string | null;
    qualification?: string | null;
    specialization?: string | null;
    hireDate?: string | null;
    experienceYears?: number | null;
    department?: {
      name?: string | null;
    } | null;
  } | null;
};

const formatDate = (date?: string | null) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatRole = (role?: string | null) =>
  String(role || "STAFF")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

const SingleUserPage = ({ params }: PageProps) => {
  return <UserDetailContent userId={params.id} />;
};

function UserDetailContent({ userId }: { userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setItems } = useBreadcrumb();
  const { user: currentUser } = useAuth();
  const { currentAcademicYear, formattedYearLabel } = useAcademicYear();
  const displayYear = String(currentAcademicYear?.ethiopianYear || currentAcademicYear?.name || formattedYearLabel || "");
  const currentRole = String(currentUser?.role || "").toUpperCase();
  const canManageUser = ["ADMIN", "IT_MANAGER", "SUPER_ADMIN"].includes(currentRole);

  const { data: user, isLoading, error } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const response = await authAPI.getUserById(userId);
      return response.data as UserResponse;
    },
  });

  useEffect(() => {
    if (!user) return;
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "List", isCurrent: false },
      { label: "Users", isCurrent: false },
      { label: user.name || "User Profile", isCurrent: true },
    ]);

    return () => setItems(null);
  }, [setItems, user]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading user data</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{(error as any)?.message || "User not found"}</p>
        </div>
      </div>
    );
  }

  const teacherProfile = user.teacherProfile || undefined;
  const userName = user.name || "Unknown User";
  const username = user.username || teacherProfile?.employeeId || user.email || "N/A";
  const displayUsername = formatUserDisplayCode(username, displayYear);
  const isActive = user.isActive ?? true;
  const roleLabel = formatRole(user.role);
  const normalizedViewedRole = String(user.role || "").toUpperCase();
  const isViewedAdmin = normalizedViewedRole === "ADMIN";
  const canUploadPhoto = canManageUser || currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-[#111111] sm:p-6">
      <div className="w-full space-y-6">
        <Card className="overflow-hidden border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
          <CardContent className="p-0">
            <div className="flex flex-col gap-5 border-b border-gray-100 p-5 dark:border-[#2A2A2A] lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-24 w-24 border-4 border-gray-100 shadow-sm dark:border-[#2A2A2A]">
                  {user.avatarUrl ? (
                    <AvatarImage src={resolveAssetUrl(user.avatarUrl) || user.avatarUrl} alt={userName} />
                  ) : (
                    <AvatarFallback className="text-2xl font-bold">{getInitials(userName)}</AvatarFallback>
                  )}
                </Avatar>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-white">{userName}</h1>
                    <Badge className={isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{roleLabel}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{displayUsername}</span>
                    {username !== displayUsername ? <span>Login: {username}</span> : null}
                    <span>{user.email || "No email"}</span>
                    <span>{teacherProfile?.designation || roleLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUploadPhoto ? (
                  <UserAvatarUpload
                    userId={user.id}
                    currentAvatarUrl={user.avatarUrl || undefined}
                    onUploaded={() => {
                      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
                    }}
                  />
                ) : null}
                {canManageUser && isViewedAdmin ? (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/list/users/${userId}/edit`)}>
                    <Edit2 className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                ) : null}
                {isViewedAdmin ? (
                  <Button size="sm" onClick={() => router.push(`/list/communications?recipientId=${userId}`)} style={{ backgroundColor: "#e35336" }}>
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    Message
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryItem icon={Shield} label="Username" value={displayUsername} />
              <SummaryItem icon={User} label="Role" value={roleLabel} />
              <SummaryItem icon={CheckCircle} label="Status" value={isActive ? "Active" : "Inactive"} />
              <SummaryItem icon={Clock} label="Last login" value={formatDate(user.lastLoginAt)} />
              <SummaryItem icon={Calendar} label="Created" value={formatDate(user.createdAt)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_1fr]">
          <div className="space-y-6">
            <Card className="border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-base">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Shield} label="Username" value={displayUsername} />
                <InfoRow icon={Mail} label="Email" value={user.email || "N/A"} />
                <InfoRow icon={Phone} label="Phone" value={user.phone || "N/A"} />
                <InfoRow icon={User} label="Role" value={roleLabel} />
                <InfoRow icon={Activity} label="Last login" value={formatDate(user.lastLoginAt)} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <Card className="border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-base">Staff Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Shield} label="Employee ID" value={teacherProfile?.employeeId || "N/A"} />
                <InfoRow icon={BriefcaseBusiness} label="Designation" value={teacherProfile?.designation || "N/A"} />
                <InfoRow icon={GraduationCap} label="Qualification" value={teacherProfile?.qualification || "N/A"} />
                <InfoRow icon={BriefcaseBusiness} label="Department" value={teacherProfile?.department?.name || "N/A"} />
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-base">Employment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={BriefcaseBusiness} label="Specialization" value={teacherProfile?.specialization || "N/A"} />
                <InfoRow icon={Calendar} label="Hire Date" value={formatDate(teacherProfile?.hireDate)} />
                <InfoRow
                  icon={Clock}
                  label="Experience"
                  value={
                    teacherProfile?.experienceYears !== null && teacherProfile?.experienceYears !== undefined
                      ? `${teacherProfile.experienceYears} years`
                      : "N/A"
                  }
                />
                <InfoRow icon={Calendar} label="Updated" value={formatDate(user.updatedAt)} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-[#1A1A1A]/70">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 truncate text-lg font-bold text-gray-900 dark:text-white">{value || "N/A"}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-[#2A2A2A]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

export default SingleUserPage;
