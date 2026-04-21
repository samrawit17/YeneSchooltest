"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
      const response = await api.get("/students/me/class");
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
