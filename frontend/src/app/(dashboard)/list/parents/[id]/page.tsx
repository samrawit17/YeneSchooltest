"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parentsAPI } from "@/lib/api/people";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { Loader2, Plus } from "lucide-react";
import UserDetailPage, { UserDetailData } from "@/components/UserDetailPage";
import ParentChildLinkForm from "@/components/forms/ParentChildLinkForm";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: { id: string };
}

const SingleParentPage = ({ params }: PageProps) => {
  const router = useRouter();
  const parentId = params.id;
  const [linkChildOpen, setLinkChildOpen] = useState(false);
  const { user } = useAuth();
  const { setItems } = useBreadcrumb();

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
    const isAdmin = ((user?.role === 'ADMIN' || user?.role === 'IT_MANAGER') || user?.role === 'IT_MANAGER') || user?.role === 'SUPER_ADMIN';
    
    if (parent) {
      setItems([
        { label: "Dashboard", href: "/dashboard", isCurrent: false },
        { label: "List", isCurrent: false },
        { label: "Parents", href: isAdmin ? "/list/parents" : undefined, isCurrent: false },
        { label: parentName, isCurrent: true },
      ]);
    }
    return () => setItems(null);
  }, [parent, setItems, user?.role]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
  const children = (parent.children || []).map((c: any) => ({
    id: c.studentId || c.student?.id || c.id,
    name: c.student?.user?.name || c.studentName || "Unknown",
    studentCode: c.student?.studentCode || c.studentCode,
    relation: c.relation,
    grade: c.student?.className || c.student?.class?.name,
  }));

  // Map parent data to UserDetailData
  const userDetail: UserDetailData = {
    id: parent.id,
    name: userData.name || parent.name || "Unknown Parent",
    email: userData.email || parent.email || "",
    role: "PARENT",
    avatarUrl: userData.img || userData.avatarUrl,
    isActive: userData.isActive ?? true,
    createdAt: userData.createdAt || parent.createdAt,
    lastLogin: userData.lastLogin,
    username: userData.email || parent.email,

    // Personal info
    phone: userData.phone || parent.phone,
    gender: parent.gender,
    address: parent.address || userData.address,

    // Parent-specific
    children,
    occupation: parent.occupation,

    // Activity log
    activityLog: parent.activityLog,

    // Documents
    documents: parent.documents,
  };

  return (
    <>
      <UserDetailPage
        user={userDetail}
        fullWidth
        backUrl="/list/parents"
        backLabel="Parents"
        onEdit={() => router.push(`/list/parents/${parentId}/edit`)}
        onResetPassword={() => {}}
        onDeactivate={() => {}}
        onSendMessage={() => {}}
        childrenTabActions={
          <Button size="sm" onClick={() => setLinkChildOpen(true)} style={{ backgroundColor: "#e35336" }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add child
          </Button>
        }
      />

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
    </>
  );
};

export default SingleParentPage;
