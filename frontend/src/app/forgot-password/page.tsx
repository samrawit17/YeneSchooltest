"use client";

import { CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { userAPI } from "@/lib/api/auth";
import { enrollmentAPI } from "@/lib/api/enrollment";
import { resolveAssetUrl } from "@/lib/asset-url";
import { useTranslations } from "@/hooks/useTranslations";
import {
  getHostSchoolSlug,
  readCachedSchoolLoginContext,
  writeCachedSchoolLoginContext,
  type PublicSchoolSummary,
} from "@/lib/school-resolver";

type ForgotPasswordMessages = {
  title: string;
  description: string;
  code: string;
  placeholder: string;
  requestReset: string;
  backToSignIn: string;
  sending: string;
  submittedTitle: string;
  submittedDescription: string;
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";

export default function ForgotPasswordPage() {
  const { t } = useTranslations<ForgotPasswordMessages>("forgotPassword");
  const searchParams = useSearchParams();
  const requestedSchoolId = searchParams.get("schoolId");
  const requestedSchoolSlug =
    searchParams.get("school") || searchParams.get("slug") || getHostSchoolSlug();
  const cachedLoginSchool = readCachedSchoolLoginContext({
    schoolId: requestedSchoolId,
    slug: requestedSchoolSlug,
    fallbackToLast: true,
  });
  const signInHref =
    requestedSchoolSlug || cachedLoginSchool?.publicUrlSlug
      ? `/sign-in?slug=${encodeURIComponent(requestedSchoolSlug || cachedLoginSchool?.publicUrlSlug || "")}`
      : requestedSchoolId || cachedLoginSchool?.id
        ? `/sign-in?schoolId=${encodeURIComponent(requestedSchoolId || cachedLoginSchool?.id || "")}`
        : "/sign-in";
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [schoolName, setSchoolName] = useState(cachedLoginSchool?.name || "");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(cachedLoginSchool?.logoUrl || null);
  const [schoolAccentColor, setSchoolAccentColor] = useState<string | null>(cachedLoginSchool?.accentColor || null);

  useEffect(() => {
    let ignore = false;

    const loadSchool = async () => {
      if (!requestedSchoolSlug && !requestedSchoolId) return;

      try {
        const response = requestedSchoolSlug
          ? await enrollmentAPI.getSchoolByUrlSlug(requestedSchoolSlug)
          : await enrollmentAPI.getSchoolById(requestedSchoolId || "");
        const school = response.data?.data as PublicSchoolSummary | undefined;

        if (!school || ignore) return;

        writeCachedSchoolLoginContext(school);
        setSchoolName(school.name || "");
        setSchoolLogoUrl(school.logoUrl || null);
        setSchoolAccentColor(school.accentColor || null);
      } catch {
        // Keep cached branding if the public school lookup is unavailable.
      }
    };

    loadSchool();

    return () => {
      ignore = true;
    };
  }, [requestedSchoolId, requestedSchoolSlug]);

  const schoolLogoSrc = resolveAssetUrl(schoolLogoUrl);
  const validAccentColor = /^#[0-9a-fA-F]{6}$/.test((schoolAccentColor || "").trim())
    ? schoolAccentColor!.trim()
    : "#e35336";
  const pageStyle = { "--brand-color": validAccentColor } as CSSProperties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      await userAPI.requestPasswordReset(username);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="flex min-h-screen flex-col items-center bg-slate-50 pt-10 dark:bg-slate-900"
        style={pageStyle}
      >
        {schoolName && (
          <div className="flex items-center gap-3">
            {schoolLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={schoolLogoSrc}
                alt={`${schoolName} logo`}
                className="h-28 w-28 object-contain"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[var(--brand-color,#e35336)] text-xl font-bold text-white shadow-sm">
                {getInitials(schoolName)}
              </div>
            )}
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {schoolName}
            </p>
          </div>
        )}
        <div className="flex w-full flex-1 items-center justify-center">
          <Card className="w-full max-w-lg dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="dark:text-white">{t.submittedTitle}</CardTitle>
              <CardDescription className="text-base">
                {t.submittedDescription}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button variant="link" asChild>
                <Link href={signInHref}>{t.backToSignIn}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
      <div
        className="flex min-h-screen flex-col items-center bg-slate-50 pt-10 dark:bg-slate-900"
        style={pageStyle}
      >
        {schoolName && (
          <div className="flex items-center gap-4">
            {schoolLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={schoolLogoSrc}
                alt={`${schoolName} logo`}
                className="h-28 w-28 object-contain"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[var(--brand-color,#e35336)] text-xl font-bold text-white shadow-sm">
                {getInitials(schoolName)}
              </div>
            )}
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {schoolName}
            </p>
          </div>
        )}
        <div className="flex w-full flex-1 items-center justify-center">
          <Card className="w-full max-w-lg dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="dark:text-white">{t.title}</CardTitle>
              <CardDescription>
                {t.description}
              </CardDescription>
            </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="dark:text-gray-300">{t.code}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="username"
                  placeholder={t.placeholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[var(--brand-color,#e35336)] text-white hover:opacity-90"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.sending}
                </>
              ) : (
                t.requestReset
              )}
            </Button>
            <Button variant="link" size="sm" asChild>
              <Link href={signInHref} className="flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                {t.backToSignIn}
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
    </div>
  );
}
