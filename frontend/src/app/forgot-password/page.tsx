"use client";

import { useState } from "react";
import Link from "next/link";
import { User, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { userAPI } from "@/lib/api/auth";
import { useTranslations } from "@/hooks/useTranslations";

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

export default function ForgotPasswordPage() {
  const { t } = useTranslations<ForgotPasswordMessages>("forgotPassword");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
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
              <Link href="/sign-in">{t.backToSignIn}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
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
              <Link href="/sign-in" className="flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                {t.backToSignIn}
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
