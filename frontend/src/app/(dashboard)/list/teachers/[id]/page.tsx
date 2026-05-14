"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authAPI, classesAPI, sectionsAPI, teachersAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import UserDetailPage, { UserDetailData } from "@/components/UserDetailPage";

interface PageProps {
  params: { id: string };
}

const SingleTeacherPage = ({ params }: PageProps) => {
  const router = useRouter();
  const teacherId = params.id;
  return <TeacherDetailContent teacherId={teacherId} />;
};

function TeacherDetailContent({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const { user } = useAuth();
  const breadcrumbSetRef = useRef(false);
  const { data: teacher, isLoading, error } = useQuery({
    queryKey: queryKeys.teachers.detail(teacherId),
    queryFn: async () => {
      const response = await authAPI.getUserById(teacherId);
      return response.data;
    },
  });

  const { data: homeroomAssignments } = useQuery({
    queryKey: queryKeys.teachers.homeroomAssignments(teacherId),
    queryFn: async () => {
      try {
        const [classesResponse, sectionsResponse] = await Promise.all([
          classesAPI.getAll(),
          sectionsAPI.getAll(),
        ]);

        const allClasses = classesResponse.data || [];
        const allSections = sectionsResponse.data || [];

        const classLevelAssignments = allClasses
          .filter(
            (cls: any) =>
              cls.homeroomTeacherId === teacherId ||
              cls.homeroomTeacher?.id === teacherId,
          )
          .map((cls: any) => {
            const className = cls.name || (cls.grade ? `Grade ${cls.grade}` : "Class");
            return `${className}${cls.section ? ` - Section ${cls.section}` : ""}`;
          });

        const sectionLevelAssignments = allSections
          .filter(
            (section: any) =>
              section.homeroomTeacherId === teacherId ||
              section.homeroomTeacher?.id === teacherId,
          )
          .map((section: any) => {
            const className =
              section.class?.name ||
              (section.class?.grade ? `Grade ${section.class.grade}` : "Class");
            return `${className} - Section ${section.name}`;
          });

        return Array.from(
          new Set([...sectionLevelAssignments, ...classLevelAssignments]),
        );
      } catch {
        return [];
      }
    },
    enabled: !!teacher,
  });

  const { data: teacherAssignments } = useQuery({
    queryKey: [...queryKeys.teachers.detail(teacherId), "assignments"],
    queryFn: async () => {
      const response = await teachersAPI.getAssignments(teacherId);
      return response.data;
    },
    enabled: !!teacher,
  });

  // Set breadcrumbs with teacher name
  useEffect(() => {
    const teacherName = teacher?.name || "Teacher Profile";
    const isAdmin = ((user?.role === 'ADMIN' || user?.role === 'IT_MANAGER') || user?.role === 'IT_MANAGER') || user?.role === 'IT_MANAGER' || user?.role === 'SUPER_ADMIN';
    if (!breadcrumbSetRef.current && teacher) {
      breadcrumbSetRef.current = true;
      setItems([
        { label: "Dashboard", href: "/dashboard", isCurrent: false },
        { label: "List", isCurrent: false },
        { label: "Teachers", href: isAdmin ? "/list/teachers" : undefined, isCurrent: false },
        { label: teacherName, isCurrent: true },
      ]);
    }
    return () => setItems(null);
  }, [teacher?.name, setItems, user?.role]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading teacher data...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading teacher data</p>
          <p className="text-sm text-gray-500">{(error as any)?.message || "Teacher not found"}</p>
        </div>
      </div>
    );
  }

  const teacherProfile = teacher.teacherProfile || {};
  const assignedClasses = homeroomAssignments || [];

  const userDetail: UserDetailData = {
    id: teacher.id,
    name: teacher.name || "Unknown Teacher",
    email: teacher.email || "",
    role: "TEACHER",
    avatarUrl: teacher.img || teacher.avatarUrl,
    isActive: teacher.isActive ?? true,
    createdAt: teacher.createdAt,
    lastLogin: teacher.lastLogin,
    username: teacher.email,
    phone: teacher.phone || teacherProfile.phone,
    gender: teacherProfile.gender || teacher.gender,
    dateOfBirth: teacherProfile.dateOfBirth || teacher.dateOfBirth,
    address: teacher.address || teacherProfile.address,
    staffId: teacherProfile.staffId || teacher.staffId,
    subjects: teacherProfile.subjects || [],
    assignedClasses,
    teacherAssignments,
    employmentType: teacherProfile.employmentType || teacherProfile.employmentStatus,
    joiningDate: teacherProfile.joiningDate || teacher.createdAt,
    attendanceRate: teacherProfile.attendanceRate,
    attendanceHistory: teacherProfile.attendanceHistory,
    activityLog: teacher.activityLog,
    documents: teacher.documents,
  };

  return (
    <UserDetailPage
      user={userDetail}
      fullWidth
      backUrl="/list/teachers"
      backLabel="Teachers"
      onEdit={() => router.push(`/list/teachers/${teacherId}/edit`)}
      onResetPassword={() => {}}
      onDeactivate={() => {}}
      onSendMessage={() => router.push(`/messages?recipientId=${teacherId}`)}
    />
  );
}

export default SingleTeacherPage;
