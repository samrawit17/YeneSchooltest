"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { userAPI, timetableSlotsAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useProfileData } from "@/hooks/useProfileData";
import { useAuth } from "@/context/AuthContext";
import { useThemeStore } from "@/lib/themeStore";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  CalendarCheck,
  Upload,
  Camera,
  Edit2,
  Save,
  X,
  Lock,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  BookOpen,
  GraduationCap,
  UserCircle,
  Key,
  Eye,
  EyeOff,
  Trash2,
  LogOut,
  Activity,
  Bell,
  Globe,
  Heart,
  CreditCard,
  Download
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppLanguage, useLanguageStore } from "@/lib/languageStore";
import enMessages from "../../../../../messages/en.json";
import amMessages from "../../../../../messages/am.json";
import arMessages from "../../../../../messages/ar.json";
import omMessages from "../../../../../messages/om.json";
import soMessages from "../../../../../messages/so.json";

// Form validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

// Password change validation schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

type ProfileFormValues = z.infer<typeof profileSchema>;

const dateLocales: Record<AppLanguage, string> = {
  am: "am-ET",
  ar: "ar",
  en: "en-US",
  om: "om-ET",
  so: "so-SO",
};

const profileMessagesByLanguage = {
  am: amMessages.Profile,
  ar: arMessages.Profile,
  en: enMessages.Profile,
  om: omMessages.Profile,
  so: soMessages.Profile,
} as const;

const ProfilePage = () => {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { theme: themeState, setTheme, resolvedTheme } = useThemeStore();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });

  const queryClient = useQueryClient();
  const { profileData, isLoadingProfile, assignedSubjects, t, formatDate, formatDateTime } = useProfileData();
  const isLoading = isLoadingProfile;

  // Initialize form with react-hook-form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      avatarUrl: user?.avatarUrl || "",
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      await userAPI.updateProfile(data);
    },
    onSuccess: () => {
      toast.success(t.info.saveSuccess);
      if (user) {
        updateUser({ ...user, ...form.getValues() });
      }
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.user });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    await updateMutation.mutateAsync(data);
  };

  // Password change form
  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormValues) => {
      await userAPI.changePassword(data.currentPassword, data.newPassword, data.confirmPassword);
    },
    onSuccess: () => {
      toast.success(t.security.saveSuccess);
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  // Handle password change form submission
  const onPasswordSubmit = async (data: PasswordChangeFormValues) => {
    await changePasswordMutation.mutateAsync(data);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 flex-1" />
            ))}
          </div>

          {/* Profile Card Skeleton */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-black">
                {t.title}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
    
              <Button 
                variant="outline" 
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
                {t.logout}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="grid grid-cols-4 min-w-[500px] md:min-w-auto md:grid-cols-4 w-full bg-transparent shadow-none border-0 p-0">
              <TabsTrigger value="profile" className="gap-1.5 md:gap-2 text-xs md:text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none px-2 md:px-4">
                <User className="w-3 h-3 md:w-4 md:h-4" />
                <span>{t.tabs.profile}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 md:gap-2 text-xs md:text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none px-2 md:px-4">
                <Shield className="w-3 h-3 md:w-4 md:h-4" />
                <span>{t.tabs.security}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5 md:gap-2 text-xs md:text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none px-2 md:px-4">
                <Bell className="w-3 h-3 md:w-4 md:h-4" />
                <span>{t.tabs.notifications}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-1.5 md:gap-2 text-xs md:text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none px-2 md:px-4">
                <Globe className="w-3 h-3 md:w-4 md:h-4" />
                <span>{t.tabs.preferences}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="profile" className="space-y-6 mt-6">
          {/* Main Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">{t.info.title}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {t.info.description}
                  </CardDescription>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-1.5 md:gap-2 text-xs md:text-sm w-full sm:w-auto"
                >
                  {isEditing ? (
                    <>
                      <X className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{t.info.cancel}</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{t.info.edit}</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white dark:border-slate-700 shadow-lg">
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-2xl">
                          {user?.name?.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {isEditing && (
                      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            className="absolute bottom-0 right-0 rounded-full"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t.avatar.title}</DialogTitle>
                            <DialogDescription>
                              {t.avatar.description}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex flex-col items-center gap-4">
                              <Avatar className="w-32 h-32">
                                {user?.avatarUrl ? (
                                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                                ) : (
                                  <AvatarFallback className="text-2xl">
                                    {user?.name?.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <Input
                                placeholder={t.avatar.placeholder}
                                value={form.watch("avatarUrl")}
                                onChange={(e) => form.setValue("avatarUrl", e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAvatarDialog(false)}>
                              {t.info.cancel}
                            </Button>
                            <Button onClick={() => {
                              form.handleSubmit(onSubmit)();
                              setShowAvatarDialog(false);
                            }}>
                              {t.info.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  {/* Role and Status */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground">{user?.name}</h3>
                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center">
                      <Badge variant="secondary" className="gap-1.5">
                        <Shield className="w-3 h-3" />
                        {user?.role ? (t.roles[user.role.toLowerCase().replace("_", "") as keyof typeof t.roles] ?? user.role) : t.roles.user}
                      </Badge>
                      {user?.role === 'TEACHER' && assignedSubjects.length > 0 && (
                        <Badge 
                          variant="outline" 
                          className="border-[var(--brand-color,#e35336)] text-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.05)] gap-1.5 animate-in zoom-in-95 duration-300"
                        >
                          {assignedSubjects.join(' & ')} {t.roles.teacher}
                        </Badge>
                      )}
                      {profileData?.studentProfile && (
                        <Badge
                          variant={
                            profileData.studentProfile.enrollmentStatus === 'APPROVED' 
                              ? 'default'
                              : profileData.studentProfile.enrollmentStatus === 'PENDING'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="gap-1.5"
                        >
                          {profileData.studentProfile.enrollmentStatus === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                          {profileData.studentProfile.enrollmentStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                          {profileData.studentProfile.enrollmentStatus === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
                          {profileData.studentProfile.enrollmentStatus}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Leave Requests Link for Employees */}
                    {['TEACHER', 'FINANCE', 'REGISTRAR', 'ADMIN'].includes(user?.role || '') && (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => router.push('/messages')}
                      >
                        <CalendarCheck className="w-4 h-4" />
                        Messages
                      </Button>
                    )}
                  </div>
                </div>

                {/* Profile Form/Details */}
                <div className="flex-1">
                  {isEditing ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {t.info.fullName}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder={t.info.fullName} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {t.info.email}
                                </FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder={t.info.email} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {t.info.phone}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder={t.info.phone} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="avatarUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Upload className="w-4 h-4" />
                                  {t.info.avatarUrl}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder={t.info.avatarUrl} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            {t.info.cancel}
                          </Button>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                {t.info.saving}
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                {t.info.save}
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-6">
                      {/* Student Profile Info */}
                      {profileData?.studentProfile && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                          {(profileData.studentProfile.className || profileData.enrollment?.className) && (
                            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 dark:from-indigo-950/30 dark:to-indigo-900/20 dark:border-indigo-800">
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.class}</p>
                                    <p className="text-sm font-bold text-gray-900">{profileData.studentProfile.className || profileData.enrollment?.className}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {profileData.studentProfile.gradeLevel && (
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800">
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.gradeLevel}</p>
                                    <p className="text-sm font-bold text-gray-900">{profileData.studentProfile.gradeLevel}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          {profileData.studentProfile.section && (
                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 dark:from-purple-950/30 dark:to-purple-900/20 dark:border-purple-800">
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.section}</p>
                                    <p className="text-sm font-bold text-gray-900">{profileData.studentProfile.section}</p>
                                   
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          {profileData.studentProfile.address && (
                            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 dark:from-green-950/30 dark:to-green-900/20 dark:border-green-800">
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">{t.info.address}</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{profileData.studentProfile.address}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                      
                      {/* Personal Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.info.fullName}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{user?.name || "-"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                                <Mail className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.info.email}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{user?.email || "-"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                                <Phone className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.info.phone}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{user?.phone || "-"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.info.role}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                  {user?.role ? (t.roles[user.role.toLowerCase().replace("_", "") as keyof typeof t.roles] ?? user.role) : "-"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {user?.schoolId && (
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.info.schoolId}</p>
                                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{user.schoolId}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-pink-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">{t.info.memberSince}</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {user?.createdAt ? formatDate(user.createdAt) : '-'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
             
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t.activity.title}
              </CardTitle>
              <CardDescription>
                {t.activity.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t.activity.lastUpdated}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">
                        {(user?.updatedAt || user?.createdAt) ? formatDateTime(user.updatedAt || user.createdAt) : '-'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{t.activity.updated}</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200 dark:from-green-950/30 dark:to-green-900/20 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t.activity.emailVerified}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">{t.activity.emailVerifiedDesc}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
                    {t.activity.verified}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200 dark:from-slate-800 dark:to-slate-700/50 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t.activity.lastLogin}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">
                        {formatDateTime(new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{t.activity.active}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Lock className="w-5 h-5" />
                {t.security.title}
              </CardTitle>
              <CardDescription className="text-sm">
                {t.security.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.security.currentPassword}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder={t.security.currentPlaceholder}
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-1"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.security.newPassword}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder={t.security.newPlaceholder}
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-1"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.security.confirmPassword}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder={t.security.confirmPlaceholder}
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-1"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                    {t.security.passwordHelp}
                  </div>
                  <div className="border-t pt-4">
                    <Button type="submit" className="gap-2 w-full md:w-auto" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t.security.updating}
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          {t.security.updateButton}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
         


        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t.notifications.title}</CardTitle>
              <CardDescription className="text-sm">
                {t.notifications.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              {/* Notification Channels */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-sm md:text-base font-medium">{t.notifications.channels}</h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications" className="text-sm md:text-base">{t.notifications.email}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.emailDesc}</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                    className="mt-2 sm:mt-0"
                  />
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="sms-notifications" className="text-sm md:text-base">{t.notifications.sms}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.smsDesc}</p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                    className="mt-2 sm:mt-0"
                  />
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="push-notifications" className="text-sm md:text-base">{t.notifications.push}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.pushDesc}</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                    className="mt-2 sm:mt-0"
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-sm md:text-base font-medium">{t.notifications.types}</h4>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="comm-book-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.commBook}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.commBookDesc}</p>
                    </div>
                    <Switch
                      id="comm-book-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="timetable-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.timetable}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.timetableDesc}</p>
                    </div>
                    <Switch
                      id="timetable-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="attendance-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.attendance}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.attendanceDesc}</p>
                    </div>
                    <Switch
                      id="attendance-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="announcement-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.announcements}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.announcementsDesc}</p>
                    </div>
                    <Switch
                      id="announcement-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="assignment-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.assignments}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.assignmentsDesc}</p>
                    </div>
                    <Switch
                      id="assignment-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="exam-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.exams}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.examsDesc}</p>
                    </div>
                    <Switch
                      id="exam-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="fee-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.fees}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.feesDesc}</p>
                    </div>
                    <Switch
                      id="fee-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="space-y-1">
                      <Label htmlFor="event-notifications" className="text-sm md:text-base cursor-pointer">{t.notifications.events}</Label>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.notifications.eventsDesc}</p>
                    </div>
                    <Switch
                      id="event-notifications"
                      defaultChecked
                      className="mt-2 sm:mt-0"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row">
              <Button className="gap-2 w-full sm:w-auto">
                <Bell className="w-4 h-4" />
                {t.notifications.save}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t.preferences.appearance}</CardTitle>
              <CardDescription className="text-sm">
                {t.preferences.appearanceDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm md:text-base">{t.preferences.theme}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.preferences.themeDesc}</p>
                  </div>
<div className="flex gap-2 mt-2 sm:mt-0">
                     <Button 
                       variant={themeState === "light" ? "default" : "outline"} 
                       size="sm"
                       className="flex-1 sm:flex-none text-xs md:text-sm"
 onClick={() => {
                          setTheme("light");
                          userAPI.updateTheme("LIGHT").catch(console.error);
                        }}
                     >{t.preferences.light}</Button>
                     <Button 
                       variant={themeState === "dark" ? "default" : "outline"} 
                       size="sm"
                       className="flex-1 sm:flex-none text-xs md:text-sm"
 onClick={() => {
                          setTheme("dark");
                          userAPI.updateTheme("DARK").catch(console.error);
                        }}
                     >{t.preferences.dark}</Button>
                     <Button 
                       variant={themeState === "system" ? "default" : "outline"} 
                       size="sm"
                       className="flex-1 sm:flex-none text-xs md:text-sm"
 onClick={() => {
                          setTheme("system");
                          userAPI.updateTheme("SYSTEM").catch(console.error);
                        }}
                     >{t.preferences.system}</Button>
                   </div>
                </div>
                
                <Separator />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm md:text-base">{t.preferences.language}</Label>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">{t.preferences.languageDesc}</p>
                  </div>
                  <Select value={language} onValueChange={(value) => setLanguage(value as AppLanguage)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t.preferences.language} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="om">Afan Oromo</SelectItem>
                      <SelectItem value="so">Somali</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>


        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;
