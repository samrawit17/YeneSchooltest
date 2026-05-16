
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import Image from "next/image";
import { Wrench } from "lucide-react";
import { platformSettingsAPI, schoolsAPI, schoolSettingsAPI } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { APP_VERSION } from "@/lib/version";
import { useQuery } from "@tanstack/react-query";
import { getCurrentEthiopianYear } from "@/lib/calendar-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query-keys";
import { useTranslations } from "@/hooks/useTranslations";

const isValidHexColor = (value?: string | null): value is string =>
  !!value && /^#([0-9A-Fa-f]{6})$/.test(value);

const BRAND_SETTINGS_STORAGE_KEY = "sms-brand-settings";

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const revealTextClass = (expanded: boolean, maxWidth = "max-w-[220px]") =>
  `overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out ${
    expanded ? `${maxWidth} opacity-100` : "max-w-0 opacity-0 pointer-events-none"
  }`;

const normalizeBrandNavigationSetting = (value: unknown, fallback = true): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const formatPortalLabel = (template: string, schoolName?: string | null, fallback?: string) =>
  schoolName ? template.replace("{school}", schoolName) : fallback || "SMS Portal";

interface CachedBrandSettings {
  themeColor?: string;
  useBrandNavigation?: boolean;
}

const readCachedBrandSettings = (schoolId?: string): CachedBrandSettings | null => {
  if (typeof window === "undefined" || !schoolId) return null;

  try {
    const raw = window.localStorage.getItem(BRAND_SETTINGS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, CachedBrandSettings>;
    return parsed?.[schoolId] ?? null;
  } catch {
    return null;
  }
};

const writeCachedBrandSettings = (schoolId: string, settings: CachedBrandSettings) => {
  if (typeof window === "undefined" || !schoolId) return;

  try {
    const raw = window.localStorage.getItem(BRAND_SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CachedBrandSettings>) : {};
    parsed[schoolId] = settings;
    window.localStorage.setItem(BRAND_SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures and continue with runtime state.
  }
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslations<any>("layout");
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
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
  const schoolLogoSrc = resolveAssetUrl(school?.logoUrl);
  // Set document title to school name
  useEffect(() => {
    if (school?.name) {
      document.title = `${school.name} - SMS Portal`;
    }
  }, [school?.name]);

  // Dynamically set favicon from school logo
  useEffect(() => {
    if (schoolLogoSrc) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = schoolLogoSrc;
    }
  }, [schoolLogoSrc]);

  // Fetch brand color and apply CSS variables
  const cachedBrandSettings = useMemo(
    () => readCachedBrandSettings(user?.schoolId),
    [user?.schoolId]
  );

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
    initialData: cachedBrandSettings?.themeColor,
  });

  const { data: useBrandColorInNavigation } = useQuery({
    queryKey: queryKeys.school.setting('BRAND_COLOR_IN_NAVIGATION', user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return false;
      try {
        const response = await schoolSettingsAPI.get(user.schoolId, 'BRAND_COLOR_IN_NAVIGATION');
        return response.data?.value ?? false;
      } catch {
        return false;
      }
    },
    enabled: !!user?.schoolId,
    staleTime: 60000,
  });

  const brandNavigationEnabled = normalizeBrandNavigationSetting(
    useBrandColorInNavigation,
    false
  );

  const {
    data: platformFlags,
    isLoading: isPlatformFlagsLoading,
    refetch: refetchPlatformFlags,
  } = useQuery({
    queryKey: queryKeys.menu.platformSettings,
    queryFn: async () => {
      const response = await platformSettingsAPI.getFlags();
      return response.data || {};
    },
    enabled: isAuthenticated,
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnMount: true,
  });

  const isMaintenanceMode =
    platformFlags?.MAINTENANCE_MODE === true ||
    String(platformFlags?.MAINTENANCE_MODE).toLowerCase() === "true";

  useEffect(() => {
    const handleMaintenanceMode = () => {
      refetchPlatformFlags();
    };

    window.addEventListener("sms:maintenance-mode", handleMaintenanceMode);
    return () => {
      window.removeEventListener("sms:maintenance-mode", handleMaintenanceMode);
    };
  }, [refetchPlatformFlags]);


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
    if (!user?.schoolId) return;

    writeCachedBrandSettings(user.schoolId, {
      themeColor: isValidHexColor(brandColor) ? brandColor : "#e35336",
      useBrandNavigation: brandNavigationEnabled,
    });
  }, [brandColor, brandNavigationEnabled, user?.schoolId]);




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

  if (isPlatformFlagsLoading && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e35336] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Checking platform status...</p>
        </div>
      </div>
    );
  }

  if (isMaintenanceMode && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 dark:bg-[#0F172A]">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[rgba(var(--brand-color-rgb),0.12)] text-[var(--brand-color,#e35336)] dark:bg-[rgba(var(--brand-color-rgb),0.2)]">
            <Wrench className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Platform Under Maintenance
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            The school portal is temporarily unavailable while maintenance is in progress.
            Please check back later.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-[var(--brand-color,#e35336)] px-5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color,#e35336)] focus:ring-offset-2 dark:focus:ring-offset-[#0F172A]"
          >
            Sign out
          </button>
          <div className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Signed in as {user?.name || "User"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Desktop Sidebar */}
      <div className="relative hidden shrink-0 md:block md:w-20">
        <aside
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`dashboard-sidebar-flyout absolute inset-y-0 left-0 z-[60] flex h-full flex-col shadow-sm dark:bg-[#111827] dark:border-[#334155] transition-[width] duration-200 ease-out will-change-transform ${
            brandNavigationEnabled
              ? 'bg-[rgba(var(--brand-color-rgb),0.18)] border-r border-[rgba(var(--brand-color-rgb),0.22)]'
              : 'bg-[#F1F5F9] border-r border-gray-200'
          } ${isSidebarHovered ? 'w-64' : 'w-20'} group/sidebar`}
        >
        {/* Logo */}
        <div className={`flex h-24 items-center px-4 border-b dark:border-[#334155] shrink-0 ${
          brandNavigationEnabled
            ? 'border-[rgba(var(--brand-color-rgb),0.18)]'
            : 'border-gray-200'
        }`}>
          {isSchoolLoading ? (
            <div className={`flex w-full items-center ${isSidebarHovered ? "justify-start gap-3" : "justify-center"}`}>
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <Skeleton className={`h-6 ${revealTextClass(isSidebarHovered, "max-w-[180px]")}`} />
            </div>
          ) : (
            <div className={`flex w-full items-center ${isSidebarHovered ? "justify-start gap-3" : "justify-center"}`}>
              {schoolLogoSrc ? (
                <img
                  src={schoolLogoSrc}
                  alt={school.name || "School Logo"}
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e35336]">
                  <span className="text-xl font-bold text-white">
                    {school?.name?.charAt(0) || "S"}
                  </span>
                </div>
              )}
              <span className={`text-base font-bold text-slate-900 dark:text-white ${revealTextClass(isSidebarHovered, "max-w-[180px]")}`}>
                {formatPortalLabel(t.portal, school?.name, t.defaultPortal)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-1 overflow-y-auto py-4 pl-4">
          <div className={isSidebarHovered ? 'w-56' : 'w-12'}>
          <Menu
            collapsed={!isSidebarHovered}
            useBrandNavigation={brandNavigationEnabled}
          />
          </div>
        </div>

        {/* User Info */}
        <div className={`m-4 border-t dark:border-[#334155] ${
          brandNavigationEnabled
            ? 'border-[rgba(var(--brand-color-rgb),0.18)]'
            : 'border-gray-200'
        }`}>
          <div className={`mt-4 flex min-h-[72px] items-center rounded-lg border border-white/60 bg-white/80 p-3 backdrop-blur dark:border-slate-700/70 dark:bg-[#1E293B] ${isSidebarHovered ? 'justify-start gap-3' : 'justify-center'}`}>
            <Image
              src="/avatar.svg"
              alt={user?.name || "User"}
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
            <div className={`min-w-0 flex-1 ${revealTextClass(isSidebarHovered, "max-w-[180px]")}`}>
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                  {user?.email || ""}
                </p>
            </div>
          </div>
        </div>

        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-visible min-w-0">
        {/* Top Navbar */}
        <Navbar
          sidebarCollapsed={!isSidebarHovered}
          useBrandNavigation={brandNavigationEnabled}
        />

        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-[#F8FAFC] dark:bg-[#0F172A] contain-content">
          <div className="w-full overflow-visible">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-[#334155] bg-[#F1F5F9] dark:bg-[#111827] px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-row items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-medium">{school?.name ? t.portal.replace("{school}", school.name) : t.defaultPortal}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span>© {user?.calendarType === 'ETHIOPIAN' ? `${getCurrentEthiopianYear()} ${t.era}` : new Date().getFullYear()}</span>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
              <span className="hidden md:inline">{t.product}</span>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
              <span>v{APP_VERSION}</span>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
