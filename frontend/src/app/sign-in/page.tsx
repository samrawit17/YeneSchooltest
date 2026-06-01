"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useThemeStore } from "@/lib/themeStore";
import { AppLanguage, useLanguageStore } from "@/lib/languageStore";
import { useTranslations } from "@/hooks/useTranslations";
import { Eye, EyeOff, Languages, Lock, LogIn, Moon, School, Sun, User, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { announcementsAPI, type Announcement } from "@/lib/api/content";
import { enrollmentAPI } from "@/lib/api/enrollment";
import { resolveAssetUrl } from "@/lib/asset-url";
import {
  findSchoolByUrlSlug,
  getHostSchoolSlug,
  readCachedSchoolLoginContext,
  writeCachedSchoolLoginContext,
  type PublicSchoolSummary,
} from "@/lib/school-resolver";

// Shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type LoginFormData = {
  loginIdentifier: string;
  password: string;
  rememberMe?: boolean;
};

const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ" },
  { value: "om", label: "Afaan Oromo" },
  { value: "so", label: "Soomaali" },
  { value: "ar", label: "العربية" },
];

const accentControlClassName =
  "border bg-white/90 text-gray-700 shadow-sm transition-colors hover:bg-white focus:ring-2 focus:ring-offset-2 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-900";
const defaultLoginImageUrl =
  "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop";

const getTranslatedLoginError = (message: string | undefined, fallback: string) => {
  const normalizedMessage = (message || "").trim().toLowerCase();
  if (!normalizedMessage) return fallback;

  const knownCredentialErrors = new Set([
    "invalid credentials",
    "login failed",
    "unauthorized",
    "unauthorized exception",
  ]);

  return knownCredentialErrors.has(normalizedMessage) ? fallback : message || fallback;
};

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { resolvedTheme, setTheme } = useThemeStore();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const { t } = useTranslations<any>("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSchoolId = searchParams.get("schoolId");
  const requestedSchoolSlug = searchParams.get("school") || searchParams.get("slug") || getHostSchoolSlug();
  const cachedLoginSchool = readCachedSchoolLoginContext({
    schoolId: requestedSchoolId,
    slug: requestedSchoolSlug,
  });
  const [resolvedLoginSchoolId, setResolvedLoginSchoolId] = useState<string | null>(cachedLoginSchool?.id || null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [schoolName, setSchoolName] = useState<string | null>(cachedLoginSchool?.name || null);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(cachedLoginSchool?.logoUrl || null);
  const [schoolLoginImageUrl, setSchoolLoginImageUrl] = useState<string | null>(cachedLoginSchool?.loginImageUrl || null);
  const [schoolAccentColor, setSchoolAccentColor] = useState<string | null>(cachedLoginSchool?.accentColor || null);
  const [resolvedLoginSchoolSlug, setResolvedLoginSchoolSlug] = useState<string | null>(cachedLoginSchool?.publicUrlSlug || null);
  const initialDocumentTitleRef = useRef<string | null>(null);
  const displaySchoolName =
    schoolName ||
    announcements[currentSlide]?.school?.name ||
    announcements[0]?.school?.name ||
    t.brand;
  const displaySchoolLogoUrl = resolveAssetUrl(schoolLogoUrl);
  const displayLoginImageUrl =
    resolveAssetUrl(schoolLoginImageUrl) ||
    displaySchoolLogoUrl ||
    defaultLoginImageUrl;
  const forgotPasswordHref =
    resolvedLoginSchoolSlug || requestedSchoolSlug
      ? `/forgot-password?slug=${encodeURIComponent(resolvedLoginSchoolSlug || requestedSchoolSlug || "")}`
      : resolvedLoginSchoolId || requestedSchoolId
        ? `/forgot-password?schoolId=${encodeURIComponent(resolvedLoginSchoolId || requestedSchoolId || "")}`
        : "/forgot-password";
  const brandColor = /^#[0-9a-fA-F]{6}$/.test((schoolAccentColor || "").trim())
    ? schoolAccentColor!.trim()
    : "#e35336";
  const brandColorRgb = `${parseInt(brandColor.slice(1, 3), 16)}, ${parseInt(brandColor.slice(3, 5), 16)}, ${parseInt(brandColor.slice(5, 7), 16)}`;
  const accentControlStyle = {
    borderColor: "color-mix(in srgb, var(--brand-color, #e35336) 45%, transparent)",
    "--tw-ring-color": "color-mix(in srgb, var(--brand-color, #e35336) 35%, transparent)",
  } as CSSProperties;
  const schoolEnrollHref = resolvedLoginSchoolSlug
    ? `/enroll?school=${encodeURIComponent(resolvedLoginSchoolSlug)}`
    : requestedSchoolSlug
      ? `/enroll?school=${encodeURIComponent(requestedSchoolSlug)}`
      : resolvedLoginSchoolId
        ? `/enroll?schoolId=${encodeURIComponent(resolvedLoginSchoolId)}`
      : "/enroll";

  useEffect(() => {
    if (typeof document === "undefined") return;
    initialDocumentTitleRef.current ??= document.title;
    document.title = `${displaySchoolName} - ${t.signIn}`;

    return () => {
      if (initialDocumentTitleRef.current) {
        document.title = initialDocumentTitleRef.current;
      }
    };
  }, [displaySchoolName, t.signIn]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const selector = 'link[data-school-favicon="true"]';
    document.head.querySelectorAll(selector).forEach((node) => node.remove());

    if (!displaySchoolLogoUrl) return;

    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = displaySchoolLogoUrl;
    icon.setAttribute("data-school-favicon", "true");

    const shortcutIcon = document.createElement("link");
    shortcutIcon.rel = "shortcut icon";
    shortcutIcon.href = displaySchoolLogoUrl;
    shortcutIcon.setAttribute("data-school-favicon", "true");

    document.head.append(icon, shortcutIcon);

    return () => {
      document.head.querySelectorAll(selector).forEach((node) => node.remove());
    };
  }, [displaySchoolLogoUrl]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schoolsRes = await enrollmentAPI.getSchools();
        const schools: PublicSchoolSummary[] = schoolsRes.data?.data || [];
        const selectedSchool =
          (requestedSchoolId
            ? schools.find((school) => school.id === requestedSchoolId)
            : undefined) ||
          findSchoolByUrlSlug(schools, requestedSchoolSlug) ||
          (schools.length === 1 ? schools[0] : undefined);

        const announcementResponse = selectedSchool
          ? await announcementsAPI.getPublic(selectedSchool.id)
          : { data: [] };

        if (selectedSchool) {
          writeCachedSchoolLoginContext(selectedSchool);
          setResolvedLoginSchoolId(selectedSchool.id);
          setResolvedLoginSchoolSlug(selectedSchool.publicUrlSlug || null);
          setSchoolName(selectedSchool.name);
          setSchoolLogoUrl(selectedSchool.logoUrl || null);
          setSchoolLoginImageUrl(selectedSchool.loginImageUrl || null);
          setSchoolAccentColor(selectedSchool.accentColor || null);
        } else {
          setResolvedLoginSchoolId(null);
          setResolvedLoginSchoolSlug(null);
          setSchoolName(null);
          setSchoolLogoUrl(null);
          setSchoolLoginImageUrl(null);
          setSchoolAccentColor(null);
        }
        const data = Array.isArray(announcementResponse.data) ? announcementResponse.data : [];
        setAnnouncements(data);
      } catch {
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    fetchData();
  }, [requestedSchoolSlug, requestedSchoolId]);

  useEffect(() => {
    if (currentSlide >= announcements.length) {
      setCurrentSlide(0);
    }
  }, [announcements.length, currentSlide]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const loginSchema = z.object({
    loginIdentifier: z.string().min(1, { message: t.validationIdentifier }),
    password: z.string().min(1, { message: t.validationPassword }),
    rememberMe: z.boolean().optional(),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const redirectPath = (() => {
        switch (user.role) {
          case 'SUPER_ADMIN': return "/superadmin";
          case 'ADMIN': return "/admin";
          case 'IT_MANAGER': return "/it-manager";
          case 'TEACHER': return "/teacher";
          case 'STUDENT': return "/student";
          case 'PARENT': return "/parent";
          case 'FINANCE': return "/finance";
          case 'REGISTRAR': return "/registrar";
          default: return "/dashboard";
        }
      })();
      router.replace(redirectPath);
    }
  }, [authLoading, isAuthenticated, user, router]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginIdentifier: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await login(
        data.loginIdentifier,
        data.password,
        !!data.rememberMe,
        resolvedLoginSchoolId,
      );
      if (resolvedLoginSchoolId || schoolName) {
        writeCachedSchoolLoginContext({
          id: resolvedLoginSchoolId || user.schoolId || "",
          name: schoolName || user.name,
          code: null,
          publicUrlSlug: resolvedLoginSchoolSlug,
          logoUrl: schoolLogoUrl,
          accentColor: schoolAccentColor,
          loginImageUrl: schoolLoginImageUrl,
        });
      }
      
      toast.success(t.welcomeToast.replace("{name}", user.name));
      
      if (user.mustChangePassword) {
        router.push("/change-password");
        toast.info(t.changePasswordToast);
        return;
      }
      
      const redirectPath = (() => {
        switch (user.role?.toLowerCase()) {
          case 'super_admin': return "/superadmin";
          case 'admin': return "/admin";
          case 'it_manager': return "/it-manager";
          case 'teacher': return "/teacher";
          case 'student': return "/student";
          case 'parent': return "/parent";
          case 'finance': return "/finance";
          case 'registrar': return "/registrar";
          default: return "/dashboard";
        }
      })();
      
      router.push(redirectPath);
    } catch (error: any) {
      const errorMessage = getTranslatedLoginError(error?.message, t.invalidCredentials);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex h-screen w-full overflow-hidden ${resolvedTheme === 'dark' ? 'dark' : ''}`}
      style={{ "--brand-color": brandColor, "--brand-color-rgb": brandColorRgb } as React.CSSProperties}
    >
      {/* Left Side - Full Size School Image with Announcement Slideshow */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={displayLoginImageUrl}
          alt={`${displaySchoolName} login background`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            const fallbackUrl = displaySchoolLogoUrl || defaultLoginImageUrl;
            if (event.currentTarget.src !== fallbackUrl) {
              event.currentTarget.src = fallbackUrl;
            }
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

        <div className="absolute left-0 right-0 top-8 px-10 text-center text-white">
          <div className="flex w-full flex-col items-center justify-center gap-4">
            {displaySchoolLogoUrl && (
              <img
                src={displaySchoolLogoUrl}
                alt={`${displaySchoolName} logo`}
                className="h-40 w-52 shrink-0 rounded-xl bg-transparent object-contain md:h-48 md:w-64"
              />
            )}
            <h1 className="max-w-full truncate text-3xl font-bold tracking-wide md:text-4xl">
              {displaySchoolName}
            </h1>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-12 right-12 text-white max-w-lg">
          {announcementsLoading ? (
            <div className="space-y-4">
              <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-8 w-full bg-white/20 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
            </div>
          ) : announcements.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="w-5 h-5 text-orange-300" />
                <span className="text-sm font-medium text-orange-200 uppercase tracking-wider">Announcements</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >

                  <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-3">
                    {announcements[currentSlide].title}
                  </h2>
                  <p className="text-base text-white/80 line-clamp-3">
                    {announcements[currentSlide].content}
                  </p>
                </motion.div>
              </AnimatePresence>

              {announcements.length > 1 && (
                <div className="flex items-center gap-2 mt-6">
                  {announcements.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <School className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-light tracking-tight">{t.brand}</h1>
              </div>
              <p className="text-4xl font-bold leading-tight mb-4">
                {t.heroTitle}
              </p>
              <p className="text-lg text-white/80">
                {t.heroSubtitle}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right Side - Minimal Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900 relative">
        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Select value={language} onValueChange={(value) => setLanguage(value as AppLanguage)}>
            <SelectTrigger
              aria-label={t.language}
              className={`h-10 w-[132px] rounded-full ${accentControlClassName}`}
              style={accentControlStyle}
            >
              <Languages className="mr-2 h-4 w-4 text-[var(--brand-color,#e35336)]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={`w-10 h-10 rounded-full ${accentControlClassName}`}
            style={accentControlStyle}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
            ) : (
              <Moon className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
            )}
          </Button>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="rounded-xl bg-[var(--brand-color,#e35336)] p-2">
              <School className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">{t.brand}</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {t.welcome}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t.subtitle}
            </p>
          </div>

           {/* Form - IMPORTANT: No action attribute, preventDefault in onSubmit */}
           <Form {...form}>
             <form 
               onSubmit={form.handleSubmit(onSubmit)}
               className="space-y-5"
               noValidate
             >
              <FormField
                control={form.control}
                name="loginIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.loginIdentifier}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t.loginIdentifierPlaceholder}
                          {...field}
                          className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                          disabled={isLoading}
                        />
                        <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.password}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t.passwordPlaceholder}
                          {...field}
                          className="pl-10 pr-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                          disabled={isLoading}
                        />
                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-gray-300 dark:border-gray-600"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal text-gray-600 dark:text-gray-400 cursor-pointer">
                        {t.rememberMe}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <Button
                  variant="link"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-0 h-auto"
                  asChild
                >
                  <Link href={forgotPasswordHref}>{t.forgotPassword}</Link>
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full bg-[rgba(var(--brand-color-rgb),0.9)] text-white transition-all hover:bg-[rgba(var(--brand-color-rgb),0.82)] hover:shadow-lg hover:shadow-[var(--brand-color)]/20 active:bg-[rgba(var(--brand-color-rgb),0.75)]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t.signingIn}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    {t.signIn}
                  </div>
                )}
              </Button>
            </form>
          </Form>

          {/* Enrollment link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t.needAdmission}{" "}
            <Button
              variant="link"
              className="h-auto p-0 font-medium text-[var(--brand-color,#e35336)] hover:opacity-80"
              asChild
            >
              <Link href={schoolEnrollHref}>{t.enrollNow}</Link>
            </Button>
          </p>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="font-medium text-[var(--brand-color,#e35336)] hover:opacity-80">
              &larr; Back to Home
            </Link>
          </p>

        </div>

        {/* Footer - bottom right */}
        <div className="absolute bottom-4 right-4 text-xs text-gray-400 dark:text-gray-500">
          <p>{t.footer}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
