"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import UserDetailPage, { UserDetailData } from "@/components/UserDetailPage";

interface PageProps {
  params: { id: string };
}

type UserResponse = {
  id: string;
  email: string;
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

const SingleUserPage = ({ params }: PageProps) => {
  return <UserDetailContent userId={params.id} />;
};

function UserDetailContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const { user: currentUser } = useAuth();
  const breadcrumbSetRef = useRef(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const response = await authAPI.getUserById(userId);
      return response.data as UserResponse;
    },
  });

  useEffect(() => {
    const userName = user?.name || "User Profile";

    if (!breadcrumbSetRef.current && user) {
      breadcrumbSetRef.current = true;
      setItems([
        { label: "Dashboard", href: "/dashboard", isCurrent: false },
        { label: "List", isCurrent: false },
        {
          label: "Users",
          isCurrent: false,
        },
        { label: userName, isCurrent: true },
      ]);
    }

    return () => setItems(null);
  }, [currentUser?.role, setItems, user]);

  if (isLoading) {
    return (
      <div
        className="flex-1 p-4 flex items-center justify-center"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div
        className="flex-1 p-4 flex items-center justify-center"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading user data</p>
          <p className="text-sm text-gray-500">
            {(error as any)?.message || "User not found"}
          </p>
        </div>
      </div>
    );
  }

  const teacherProfile = user.teacherProfile || undefined;
  const normalizedViewedRole = (user.role || "").trim().toUpperCase();
  const isViewedAdmin = normalizedViewedRole === "ADMIN";

  const userDetail: UserDetailData = {
    id: user.id,
    name: user.name || "Unknown User",
    email: user.email || "",
    role: user.role || "STAFF",
    avatarUrl: user.avatarUrl || undefined,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt,
    lastLogin: user.lastLoginAt || undefined,
    username: user.email,
    phone: user.phone || undefined,
    employeeId: teacherProfile?.employeeId || undefined,
    staffId: teacherProfile?.employeeId || undefined,
    designation: teacherProfile?.designation || undefined,
    department: teacherProfile?.department?.name || undefined,
    qualification: teacherProfile?.qualification || undefined,
    specialization: teacherProfile?.specialization || undefined,
    joiningDate: teacherProfile?.hireDate || user.createdAt,
    experience:
      teacherProfile?.experienceYears !== null &&
      teacherProfile?.experienceYears !== undefined
        ? `${teacherProfile.experienceYears} years`
        : undefined,
  };

  return (
    <UserDetailPage
      user={userDetail}
      backUrl="/settings"
      backLabel="Settings"
      fullWidth
      onEdit={
        isViewedAdmin ? () => router.push(`/list/users/${userId}/edit`) : undefined
      }
      onResetPassword={isViewedAdmin ? () => {} : undefined}
      onDeactivate={isViewedAdmin ? () => {} : undefined}
      onSendMessage={
        isViewedAdmin
          ? () => router.push(`/messages?recipientId=${userId}`)
          : undefined
      }
    />
  );
}

export default SingleUserPage;
