"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authAPI, teachersAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatUserDisplayCode } from "@/lib/student-code";
import { Activity, BookOpen, BriefcaseBusiness, Calendar, CheckCircle, Clock, Edit2, GraduationCap, Loader2, Mail, MessageSquare, Phone, Shield, User, Users } from "lucide-react";
import UserAvatarUpload from "@/components/UserAvatarUpload";
import { resolveAssetUrl } from "@/lib/asset-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: { id: string };
}

const formatDate = (date?: string | null) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const formatRole = (role?: string | null) =>
  String(role || "STAFF").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "S";

const formatClassName = (cls?: any) => cls?.name || (cls?.grade ? `Grade ${cls.grade}` : "Class");

export default function StaffDetailPage({ params }: PageProps) {
  return <StaffDetailContent staffId={params.id} />;
}

function StaffDetailContent({ staffId }: { staffId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setItems } = useBreadcrumb();
  const { user: currentUser } = useAuth();
  const { currentAcademicYear, formattedYearLabel } = useAcademicYear();
  const displayYear = currentAcademicYear?.ethiopianYear || currentAcademicYear?.name || formattedYearLabel;
  const currentRole = String(currentUser?.role || "").toUpperCase();
  const canManageStaff = ["ADMIN", "REGISTRAR", "IT_MANAGER", "SUPER_ADMIN"].includes(currentRole);

  const { data: staff, isLoading, error } = useQuery({
    queryKey: queryKeys.users.detail(staffId),
    queryFn: async () => {
      const response = await authAPI.getUserById(staffId);
      return response.data;
    },
  });

  const isTeacher = String(staff?.role || "").toUpperCase() === "TEACHER";
  const { data: assignments } = useQuery({
    queryKey: [...queryKeys.teachers.detail(staffId), "assignments"],
    queryFn: async () => {
      const response = await teachersAPI.getAssignments(staffId);
      return response.data;
    },
    enabled: !!staff && isTeacher,
  });

  useEffect(() => {
    if (!staff) return;
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "List", isCurrent: false },
      { label: "Staff", href: "/list/staff", isCurrent: false },
      { label: staff.name || "Staff Profile", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [staff, setItems]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading staff data...</p>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading staff data</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{(error as any)?.message || "Staff not found"}</p>
        </div>
      </div>
    );
  }

  const profile = staff.teacherProfile || {};
  const staffName = staff.name || "Unknown Staff";
  const roleLabel = formatRole(staff.role);
  const username = staff.username || profile.employeeId || staff.email || "N/A";
  const displayUsername = formatUserDisplayCode(username, displayYear);
  const isActive = staff.isActive ?? true;
  const canUploadPhoto =
    currentUser?.id === staff.id ||
    currentRole === "SUPER_ADMIN" ||
    (canManageStaff && isTeacher);
  const homeroomSections = assignments?.homeroomSections || [];
  const teachingClasses = assignments?.teachingClasses || [];
  const uniqueSubjects = Array.from(new Set(teachingClasses.map((item: any) => item.subject?.name).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="w-full space-y-6">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="flex flex-col gap-5 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-24 w-24 border-4 border-slate-100 shadow-sm dark:border-slate-800">
                  {staff.avatarUrl ? <AvatarImage src={resolveAssetUrl(staff.avatarUrl) || staff.avatarUrl} alt={staffName} /> : <AvatarFallback className="text-2xl font-bold">{getInitials(staffName)}</AvatarFallback>}
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{staffName}</h1>
                    <Badge className={isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}>{isActive ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">{roleLabel}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{displayUsername}</span>
                    {username !== displayUsername ? <span>Login: {username}</span> : null}
                    <span>{staff.email || "No email"}</span>
                    <span>{profile.designation || roleLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canUploadPhoto ? (
                  <UserAvatarUpload userId={staff.id} currentAvatarUrl={staff.avatarUrl || undefined} onUploaded={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(staffId) })} />
                ) : null}
                {canManageStaff ? (
                  <Button variant="outline" size="sm" onClick={() => router.push(isTeacher ? `/list/teachers/${staffId}/edit` : `/list/users/${staffId}/edit`)}>
                    <Edit2 className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => router.push(`/list/communications?recipientId=${staffId}`)} style={{ backgroundColor: "#e35336" }}>
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryItem icon={Shield} label="Username" value={displayUsername} />
              <SummaryItem icon={User} label="Role" value={roleLabel} />
              <SummaryItem icon={CheckCircle} label="Status" value={isActive ? "Active" : "Inactive"} />
              <SummaryItem icon={Clock} label="Last login" value={formatDate(staff.lastLoginAt)} />
              <SummaryItem icon={Calendar} label="Created" value={formatDate(staff.createdAt)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_1fr]">
          <div className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader><CardTitle className="text-base">Staff Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Shield} label="Username" value={displayUsername} />
                <InfoRow icon={Mail} label="Email" value={staff.email || "N/A"} />
                <InfoRow icon={Phone} label="Phone" value={staff.phone || "N/A"} />
                <InfoRow icon={BriefcaseBusiness} label="Designation" value={profile.designation || roleLabel} />
                <InfoRow icon={Activity} label="Last login" value={formatDate(staff.lastLoginAt)} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Shield} label="Employee ID" value={profile.employeeId || "N/A"} />
                <InfoRow icon={GraduationCap} label="Qualification" value={profile.qualification || "N/A"} />
                <InfoRow icon={BookOpen} label="Specialization" value={profile.specialization || "N/A"} />
                <InfoRow icon={Calendar} label="Hire Date" value={formatDate(profile.hireDate)} />
              </CardContent>
            </Card>

            {isTeacher ? (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle className="text-base">Teacher Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow icon={Users} label="Homeroom Sections" value={String(homeroomSections.length)} />
                  <InfoRow icon={BookOpen} label="Subjects" value={String(uniqueSubjects.length)} />
                  <InfoRow icon={GraduationCap} label="Teaching Classes" value={String(teachingClasses.length)} />
                </CardContent>
              </Card>
            ) : null}

            {isTeacher ? (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 2xl:col-span-2">
                <CardHeader><CardTitle className="text-base">Teaching Classes</CardTitle></CardHeader>
                <CardContent>
                  {teachingClasses.length === 0 ? (
                    <EmptyState text="No teaching class assigned." />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {teachingClasses.map((item: any) => (
                        <div key={item.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{formatClassName(item.class)}{item.section?.name ? ` - ${item.section.name}` : ""}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.subject?.name || "No subject"} • {item.studentCount || 0} students</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><Icon className="h-4 w-4" />{label}</div>
      <p className="mt-2 truncate text-lg font-bold text-slate-900 dark:text-white">{value || "N/A"}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-700"><p className="text-sm text-slate-500 dark:text-slate-400">{text}</p></div>;
}
