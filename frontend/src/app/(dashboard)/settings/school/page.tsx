"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function SchoolSettingsRedirectPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user?.schoolId) {
        // Redirect to the school's settings page
        router.push(`/list/schools/${user.schoolId}/settings`);
      } else {
        // If no school ID, redirect to admin dashboard
        router.push("/admin");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
