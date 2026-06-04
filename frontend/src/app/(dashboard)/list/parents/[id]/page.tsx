"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parentsAPI } from "@/lib/api/people";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatUserDisplayCode } from "@/lib/student-code";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Edit2,
  GraduationCap,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Shield,
  User,
  Users,
} from "lucide-react";
import UserAvatarUpload from "@/components/UserAvatarUpload";
import ParentChildLinkForm from "@/components/forms/ParentChildLinkForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { resolveAssetUrl } from "@/lib/asset-url";

interface PageProps {
  params: { id: string };
}

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

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

const SingleParentPage = ({ params }: PageProps) => {
  const router = useRouter();
  const parentId = params.id;
  const [linkChildOpen, setLinkChildOpen] = useState(false);
  const { user } = useAuth();
  const { setItems } = useBreadcrumb();
  const { currentAcademicYear, formattedYearLabel } = useAcademicYear();
  const displayYear = String(currentAcademicYear?.ethiopianYear || currentAcademicYear?.name || formattedYearLabel || "");
  const currentRole = String(user?.role || '').toUpperCase();

  const { data: parent, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.parents.detail(parentId),
    queryFn: async () => {
      const response = await parentsAPI.getById(parentId);
      return response.data;
    },
  });

  // Set breadcrumbs with parent name
  useEffect(() => {
    const parentName = parent?.user?.name || parent?.name || "Parent Profile";
    const isAdmin = ['ADMIN', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);
    
    if (parent) {
      setItems([
        { label: "Dashboard", href: "/dashboard", isCurrent: false },
        { label: "List", isCurrent: false },
        { label: "Parents", href: isAdmin ? "/list/parents" : undefined, isCurrent: false },
        { label: parentName, isCurrent: true },
      ]);
    }
    return () => setItems(null);
  }, [parent, setItems, currentRole]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-600 font-medium">Loading parent data...</p>
        </div>
      </div>
    );
  }

  if (error || !parent) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading parent data</p>
        </div>
      </div>
    );
  }

  const userData = parent.user || {};
  const parentUserId = userData.id || parent.userId;
  const canUploadPhoto = ['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);
  const children = (parent.children || []).map((c: any) => ({
    id: c.studentId || c.student?.id || c.id,
    userId: c.student?.userId || c.student?.user?.id,
    name: c.student?.user?.name || c.studentName || "Unknown",
    studentCode: c.student?.studentCode || c.studentCode,
    relation: c.relation,
    isPrimary: c.isPrimary,
    emergencyContact: c.emergencyContact,
    grade: c.student?.className || c.student?.class?.name,
    section: c.student?.section || c.section,
    status: c.student?.enrollmentStatus || c.student?.status,
  }));
  const parentName = userData.name || parent.name || "Unknown Parent";
  const avatarUrl = userData.img || userData.avatarUrl;
  const isActive = userData.isActive ?? true;
  const username = userData.username || userData.email || parent.email || "N/A";
  const displayUsername = formatUserDisplayCode(username, displayYear);
  const phone = userData.phone || parent.phone || "N/A";
  const address = parent.address || userData.address || "N/A";
  const lastLogin = userData.lastLoginAt || userData.lastLogin;
  const createdAt = userData.createdAt || parent.createdAt;

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="w-full space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="flex flex-col gap-5 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-24 w-24 border-4 border-slate-100 shadow-sm dark:border-slate-800">
                  {avatarUrl ? (
                    <AvatarImage src={resolveAssetUrl(avatarUrl) || avatarUrl} alt={parentName} />
                  ) : (
                    <AvatarFallback className="text-2xl font-bold">
                      {getInitials(parentName)}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">
                      {parentName}
                    </h1>
                    <Badge className={isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{displayUsername}</span>
                    {username !== displayUsername ? <span>Login: {username}</span> : null}
                    <span>{phone}</span>
                    <span>{children.length} linked child{children.length === 1 ? "" : "ren"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUploadPhoto && parentUserId ? (
            <UserAvatarUpload
              userId={parentUserId}
                    currentAvatarUrl={avatarUrl}
              onUploaded={() => refetch()}
            />
                ) : null}
                <Button variant="outline" size="sm" onClick={() => router.push(`/list/parents/${parentId}/edit`)}>
                  <Edit2 className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                <Button size="sm" onClick={() => setLinkChildOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add child
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryItem icon={Users} label="Linked Children" value={String(children.length)} />
              <SummaryItem icon={Shield} label="Account Status" value={isActive ? "Active" : "Inactive"} />
              <SummaryItem icon={Activity} label="Last login" value={formatDate(lastLogin)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">Parent Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={User} label="Username" value={displayUsername} />
                <InfoRow icon={Phone} label="Phone" value={phone} />
                <InfoRow icon={MapPin} label="Address" value={address} />
                <InfoRow icon={GraduationCap} label="Occupation" value={parent.occupation || "N/A"} />
                <InfoRow icon={Calendar} label="Created" value={formatDate(createdAt)} />
                <InfoRow icon={Activity} label="Last login" value={formatDate(lastLogin)} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Linked Children</CardTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Students connected to this parent account.
                </p>
              </div>
              <Button size="sm" onClick={() => setLinkChildOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add child
              </Button>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
                  <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-medium text-slate-900 dark:text-white">No children linked</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Link a student to this parent profile.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                  {children.map((child: any) => (
                    <Link
                      key={`${child.id}-${child.userId || ""}`}
                      href={`/list/students/${child.id}`}
                      className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb),0.06)] dark:border-slate-800 dark:hover:bg-[rgba(var(--brand-color-rgb),0.12)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{child.name}</p>
                          <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">{child.studentCode || "N/A"}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {child.isPrimary ? <Badge variant="outline">Primary</Badge> : null}
                          {child.emergencyContact ? <Badge variant="outline">Emergency</Badge> : null}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <MiniInfo label="Class" value={child.grade || "N/A"} />
                        <MiniInfo label="Section" value={child.section || "N/A"} />
                        <MiniInfo label="Relation" value={child.relation || "N/A"} />
                        <MiniInfo label="Status" value={child.status || "Active"} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      <ParentChildLinkForm
        isOpen={linkChildOpen}
        onClose={() => setLinkChildOpen(false)}
        mode="link"
        parentData={{
          id: parent.id,
          userId: parent.user?.id || "",
          name: parent.user?.name || parent.name || "Unknown Parent",
          email: parent.user?.email || parent.email || "",
          phone: parent.user?.phone || parent.phone,
          children: parent.children || [],
        }}
        onSuccess={() => refetch()}
      />
      </div>
    </div>
  );
};

function SummaryItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="truncate font-medium text-slate-700 dark:text-slate-200">{value || "N/A"}</p>
    </div>
  );
}

export default SingleParentPage;
