"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AttendanceRootPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect based on user role
      if (user?.role === 'TEACHER') {
        router.push('/teacher/attendance');
      } else if (user?.role === 'STUDENT') {
        router.push('/student/attendance');
      } else if (user?.role === 'PARENT') {
        router.push('/parent/attendance');
      } else if (user?.role === 'ADMIN' || user?.role === 'IT_MANAGER' || user?.role === 'SUPER_ADMIN') {
        router.push('/admin/attendance');
      } else {
        router.push('/');
      }
    } else if (!isLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to attendance...</p>
      </div>
    </div>
  );
}
