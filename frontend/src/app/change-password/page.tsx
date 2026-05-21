"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { schoolSettingsAPI } from "@/lib/api";
import { userAPI } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, KeyRound, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

// Shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(128, { message: "Password must be less than 128 characters" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
    confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

const calculatePasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label = "Very Weak";
  let color = "bg-red-500";

  if (score === 5) {
    label = "Very Strong";
    color = "bg-green-500";
  } else if (score === 4) {
    label = "Strong";
    color = "bg-emerald-500";
  } else if (score === 3) {
    label = "Medium";
    color = "bg-yellow-500";
  } else if (score === 2) {
    label = "Weak";
    color = "bg-orange-500";
  }

  return { score, label, color, checks };
};

const isValidHexColor = (value?: string | null) =>
  typeof value === "string" && /^#([0-9A-Fa-f]{6})$/.test(value);

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `${r}, ${g}, ${b}`;
};

const applyBrandColor = (color?: string | null) => {
  if (!isValidHexColor(color)) return;

  document.documentElement.style.setProperty("--brand-color", color);
  document.documentElement.style.setProperty("--brand-color-rgb", hexToRgb(color));
};

const ChangePasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: "",
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });
  
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const { data: brandColor } = useQuery({
    queryKey: queryKeys.school.setting("theme_color", user?.schoolId),
    queryFn: async () => {
      if (!user?.schoolId) return null;
      const response = await schoolSettingsAPI.get(user.schoolId, "theme_color");
      const value = response.data?.value;
      return isValidHexColor(value) ? value : null;
    },
    enabled: !!user?.schoolId,
    staleTime: 60_000,
  });

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Watch password for strength calculation
  const newPassword = form.watch("newPassword");

  useEffect(() => {
    applyBrandColor(brandColor);
  }, [brandColor]);

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    } else {
      setPasswordStrength({
        score: 0,
        label: "",
        color: "",
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      });
    }
  }, [newPassword]);

  // Redirect if user doesn't need to change password
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      const redirectPath = (() => {
        switch (user.role) {
          case 'SUPER_ADMIN': return "/superadmin";
          case 'ADMIN': return "/admin";
          case 'IT_MANAGER': return "/it-manager";
          case 'TEACHER': return "/teacher";
          case 'STUDENT': return "/student";
          case 'PARENT': return "/parent";
          case 'REGISTRAR': return "/registrar";
          default: return "/dashboard";
        }
      })();
      router.replace(redirectPath);
    }
  }, [user, router]);

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true);
    try {
      await userAPI.changePassword(data.currentPassword, data.newPassword, data.confirmPassword);

      // Update user context to reflect password change
      if (user) {
        updateUser({ ...user, mustChangePassword: false });
      }

      toast.success("Password changed successfully! Redirecting...");

      // Redirect to appropriate dashboard
      setTimeout(() => {
        const redirectPath = (() => {
          switch (user?.role) {
            case 'SUPER_ADMIN': return "/superadmin";
            case 'ADMIN': return "/admin";
            case 'IT_MANAGER': return "/it-manager";
            case 'TEACHER': return "/teacher";
            case 'STUDENT': return "/student";
            case 'PARENT': return "/parent";
            case 'REGISTRAR': return "/registrar";
            default: return "/dashboard";
          }
        })();
        router.replace(redirectPath);
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'rgba(var(--brand-color-rgb, 227, 83, 54), 0.1)' }}>
            <KeyRound className="w-8 h-8" style={{ color: 'var(--brand-color, #e35336)' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Your Password</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            For your security, please create a new password before continuing
          </p>
        </div>

   

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Password</CardTitle>
            <CardDescription>
              Your new password must meet all security requirements below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Current Password */}
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* New Password */}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter your new password"
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
                      <span className={`font-medium ${
                        passwordStrength.score >= 4 ? 'text-green-600' :
                        passwordStrength.score >= 3 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <Progress 
                      value={(passwordStrength.score / 5) * 100} 
                      className="h-2"
                    />
                    
                    {/* Password Requirements */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {[
                        { key: 'length', label: '8+ characters' },
                        { key: 'uppercase', label: 'Uppercase letter' },
                        { key: 'lowercase', label: 'Lowercase letter' },
                        { key: 'number', label: 'Number' },
                        { key: 'special', label: 'Special character' },
                      ].map((req) => (
                        <div 
                          key={req.key}
                          className={`flex items-center gap-1.5 text-xs ${
                            passwordStrength.checks[req.key as keyof typeof passwordStrength.checks]
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {passwordStrength.checks[req.key as keyof typeof passwordStrength.checks] ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600" />
                          )}
                          {req.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your new password"
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  style={{ backgroundColor: 'var(--brand-color, #e35336)' }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Changing Password...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Change Password & Continue
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Need help? Contact your school administrator
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
