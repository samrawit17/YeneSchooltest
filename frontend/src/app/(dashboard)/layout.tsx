
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { schoolsAPI } from "@/lib/api";
import { APP_VERSION } from "@/lib/version";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Track if we've already checked auth to prevent premature redirects
  const hasCheckedAuth = useRef(false);

  // Fetch school data
  const { data: school, isLoading: isSchoolLoading } = useQuery({
    queryKey: ["school-layout", user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return null;
      const response = await schoolsAPI.getById(user.schoolId);
      return response.data;
    },
    enabled: !!user?.schoolId,
  });


  useEffect(() => {
    // Wait until loading is complete
    if (isLoading) return;

    // Mark that we've completed an auth check
    hasCheckedAuth.current = true;

    // Only redirect if we're sure the user is not authenticated
    if (!isAuthenticated && !user) {
      router.replace("/sign-in");
    }

    // Redirect to change-password if user must change password
    if (user && user.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e35336] dark:border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!user && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#F1F5F9] dark:bg-[#111827] shadow-sm border-r border-gray-200 dark:border-[#334155] transition-all duration-300 ease-in-out relative ${sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Logo */}
        <div className={`flex items-center justify-center p-4 border-b border-gray-200 dark:border-[#334155] shrink-0`}>
          {isSchoolLoading ? (
            <Skeleton className="h-8 w-8 rounded-xl" />
          ) : sidebarCollapsed ? (
            school?.logoUrl ? (
              <Image
                src={school.logoUrl}
                alt={school.name || "School Logo"}
                width={56}
                height={56}
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#e35336] flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {school?.name?.charAt(0) || "S"}
                </span>
              </div>
            )
          ) : (
            <span className="text-xl font-bold text-[#e35336] dark:text-white">
              {school?.name || "SMS Portal"}
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto m-4">
          <Menu collapsed={sidebarCollapsed} />
        </div>

        {/* User Info */}
        <div className="m-4 border-t border-gray-200 dark:border-[#334155]">
          <div className={`flex items-center gap-3 p-3 bg-white dark:bg-[#1E293B] rounded-lg mt-4 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Image
              src="/avatar.svg"
              alt={user?.name || "User"}
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-[#F1F5F9] dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-full p-1 shadow-md hover:bg-gray-200 dark:hover:bg-[#334155] transition-colors z-50"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-white" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-visible transition-all duration-300 ease-in-out">
        {/* Top Navbar */}
        <Navbar sidebarCollapsed={sidebarCollapsed} />

        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-[#F8FAFC] dark:bg-[#0F172A]">
          <div className="w-full overflow-visible">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-[#334155] bg-[#F1F5F9] dark:bg-[#111827] px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-row items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-medium">SMS</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>v{APP_VERSION}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
              <span className="hidden md:inline">Powered by Next.js</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
