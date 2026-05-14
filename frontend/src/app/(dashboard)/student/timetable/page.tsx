"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { studentsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import ClassProgramView from "@/components/timetable/ClassProgramView";

interface EnrollmentInfo {
  classId?: string;
  sectionId?: string;
  className?: string;
  section?: string;
}

export default function StudentTimetablePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { setItems } = useBreadcrumb();
  const [enrollment, setEnrollment] = useState<EnrollmentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEnrollment = useCallback(async () => {
    if (!user?.id) {
      setEnrollment(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Student class assignment (StudentClass) for the active academic year
      const response = await studentsAPI.getMyClass();
      const assignment = response.data;

      if (assignment?.assigned && assignment?.classId) {
        setEnrollment({
          classId: assignment.classId,
          sectionId: assignment.sectionId || undefined,
          className: assignment.className || undefined,
          section: assignment.section || undefined,
        });
        return;
      }

      setEnrollment(null);
    } catch (error) {
      console.error("Failed to load student class assignment:", error);
      setEnrollment(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    if (!isLoading && isAuthenticated && user?.role !== "STUDENT") {
      router.push("/");
      return;
    }

    if (isAuthenticated && user?.role === "STUDENT") {
      loadEnrollment();
    }
  }, [isAuthenticated, isLoading, loadEnrollment, router, user]);

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/student", isCurrent: false },
      { label: "My Timetable", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  if (isLoading || loading) {
    return <ClassProgramView title="My Timetable" subtitle="Loading class program..." ownerName="Student" emptyTitle="" emptyDescription="" />;
  }

  return (
    <ClassProgramView
      schoolId={user?.schoolId}
      classId={enrollment?.classId}
      sectionId={enrollment?.sectionId}
      ownerName={user?.name || "Student"}
      title="My Timetable"
      subtitle={
        enrollment?.className
          ? `${enrollment.className}${enrollment.section ? ` - Section ${enrollment.section}` : ""}`
          : "Published timetable for your class program"
      }
      emptyTitle="No Class Assigned"
      emptyDescription="Your class program will appear here after the school assigns you to a class and publishes the timetable."
    />
  );
}
