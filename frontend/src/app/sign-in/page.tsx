"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useThemeStore } from "@/lib/themeStore";
import { Lock, Mail, Eye, EyeOff, LogIn, School, User, Sun, Moon } from "lucide-react";

// Shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  loginIdentifier: z.string().min(1, { message: "Please enter your email or username" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { resolvedTheme, setTheme } = useThemeStore();
  const router = useRouter();

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
      const user = await login(data.loginIdentifier, data.password);
      
      toast.success(`Welcome back, ${user.name}!`);
      
      if (user.mustChangePassword) {
        router.push("/change-password");
        toast.info("Please change your temporary password to continue.");
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
      const errorMessage = error?.message || "Invalid credentials. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
      {/* Left Side - Full Size School Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop"
          alt="Modern school campus with students"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
        <div className="absolute bottom-12 left-12 text-white max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
              <School className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-light tracking-tight">EduPortal</h1>
          </div>
          <p className="text-4xl font-bold leading-tight mb-4">
            Where education meets innovation
          </p>
          <p className="text-lg text-white/80">
            A minimalist approach to modern school management
          </p>
        </div>
      </div>

      {/* Right Side - Minimal Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900 relative">
        {/* Theme Toggle Button */}
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            )}
          </Button>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl">
              <School className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900">EduPortal</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please enter your details to sign in
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
                      Email or Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Enter your email or username"
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
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
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
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <Button
                  variant="link"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-0 h-auto"
                  asChild
                >
                  <Link href="/forgot-password">Forgot password?</Link>
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#e35336] hover:bg-[#c6452a] text-white transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>
          </Form>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="text-[#e35336] hover:text-[#c6452a] p-0 h-auto font-medium"
              asChild
            >
              <Link href="/enroll">Sign up</Link>
            </Button>
          </p>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-8">
            <p>© 2026 EduPortal. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
