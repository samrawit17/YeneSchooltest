
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { schoolsAPI, schoolSettingsAPI } from "@/lib/api";
import { APP_VERSION } from "@/lib/version";
import { useQuery } from "@tanstack/react-query";
import { getCurrentEthiopianYear } from "@/lib/calendar-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query-keys";

const isValidHexColor = (value?: string | null): value is string =>
  !!value && /^#([0-9A-Fa-f]{6})$/.test(value);

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});


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
    queryKey: queryKeys.school.layout(user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return null;
      const response = await schoolsAPI.getById(user.schoolId);
      return response.data;
    },
    enabled: !!user?.schoolId,
  });
  // Set document title to school name
  useEffect(() => {
    if (school?.name) {
      document.title = `${school.name} - SMS Portal`;
    }
  }, [school?.name]);

  // Dynamically set favicon from school logo
  useEffect(() => {
    if (school?.logoUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = school.logoUrl;
    }
  }, [school?.logoUrl]);

  // Fetch brand color and apply CSS variables
  const { data: brandColor } = useQuery({
    queryKey: queryKeys.school.setting('theme_color', user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return '#e35336';
      try {
        const response = await schoolSettingsAPI.get(user.schoolId, 'theme_color');
        return response.data?.value || '#e35336';
      } catch {
        return '#e35336';
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 60000,
  });

  const { data: useBrandColorInNavigation } = useQuery({
    queryKey: queryKeys.school.setting('BRAND_COLOR_IN_NAVIGATION', user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return true;
      try {
        const response = await schoolSettingsAPI.get(user.schoolId, 'BRAND_COLOR_IN_NAVIGATION');
        return response.data?.value ?? true;
      } catch {
        return true;
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 60000,
  });


  useEffect(() => {
    if (isValidHexColor(brandColor) && brandColor !== '#e35336') {
      const hex = brandColor;
      const { r, g, b } = hexToRgb(hex);
      const red = r / 255;
      const green = g / 255;
      const blue = b / 255;
      const root = document.documentElement;
      root.style.setProperty('--brand-color', hex);
      root.style.setProperty('--brand-color-rgb', `${r}, ${g}, ${b}`);
      // Convert hex to HSL for shadcn's --primary variable
      const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case red: h = ((green - blue) / d + (green < blue ? 6 : 0)) / 6; break;
          case green: h = ((blue - red) / d + 2) / 6; break;
          case blue: h = ((red - green) / d + 4) / 6; break;
        }
      }
      const hslH = Math.round(h * 360);
      const hslS = Math.round(s * 100);
      const hslL = Math.round(l * 100);
      root.style.setProperty('--primary', `${hslH} ${hslS}% ${hslL}%`);
      root.style.setProperty('--ring', `${hslH} ${hslS}% ${hslL}%`);
    } else {
      const root = document.documentElement;
      root.style.setProperty('--brand-color', '#e35336');
      root.style.setProperty('--brand-color-rgb', '227, 83, 54');
      root.style.setProperty('--primary', '10 75% 55%');
      root.style.setProperty('--ring', '10 75% 55%');
    }
  }, [brandColor]);




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
        className={`hidden md:flex flex-col shadow-sm border-r dark:bg-[#111827] dark:border-[#334155] transition-all duration-300 ease-in-out relative ${
          useBrandColorInNavigation !== false
            ? 'bg-[rgba(var(--brand-color-rgb),0.18)] border-[rgba(var(--brand-color-rgb),0.22)]'
            : 'bg-[#F1F5F9] border-gray-200'
        } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <div className={`flex items-center justify-center p-4 border-b dark:border-[#334155] shrink-0 ${
          useBrandColorInNavigation !== false
            ? 'border-[rgba(var(--brand-color-rgb),0.18)]'
            : 'border-gray-200'
        }`}>
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
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {school?.name || "SMS Portal"}
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto m-4">
          <Menu
            collapsed={sidebarCollapsed}
            useBrandNavigation={useBrandColorInNavigation !== false}
          />
        </div>

        {/* User Info */}
        <div className={`m-4 border-t dark:border-[#334155] ${
          useBrandColorInNavigation !== false
            ? 'border-[rgba(var(--brand-color-rgb),0.18)]'
            : 'border-gray-200'
        }`}>
          <div className={`flex items-center gap-3 p-3 rounded-lg mt-4 border border-white/60 bg-white/80 backdrop-blur dark:border-slate-700/70 dark:bg-[#1E293B] ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Image
              src="/avatar.svg"
              alt={user?.name || "User"}
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute top-1/2 -right-3 transform -translate-y-1/2 rounded-full border p-1 shadow-md backdrop-blur transition-colors z-50 dark:border-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] ${
            useBrandColorInNavigation !== false
              ? 'border-[rgba(var(--brand-color-rgb),0.22)] bg-white/90 hover:bg-[rgba(var(--brand-color-rgb),0.2)]'
              : 'border-gray-200 bg-white hover:bg-gray-100'
          }`}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-700 dark:text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-white" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-visible transition-all duration-300 ease-in-out">
        {/* Top Navbar */}
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          useBrandNavigation={useBrandColorInNavigation !== false}
        />

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
              <span className="font-medium">{school?.name ? `${school.name} Portal` : 'SMS Portal'}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span>© {user?.calendarType === 'ETHIOPIAN' ? `${getCurrentEthiopianYear()} E.C.` : new Date().getFullYear()}</span>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
              <span className="hidden md:inline">Lemari SMS</span>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
              <span>v{APP_VERSION}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
