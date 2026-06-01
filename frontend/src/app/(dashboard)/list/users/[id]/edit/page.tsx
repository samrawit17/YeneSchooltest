"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Loader2, Save, User, GraduationCap, Briefcase, Users, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// Shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";

// User types
type UserRole = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'IT_MANAGER' | 'REGISTRAR' | 'FINANCE' | 'SUPER_ADMIN';

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDateInputValue = (value: string) => {
  if (!value) return undefined;
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "MALE",
    address: "",
    dateOfBirth: "",
  });

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const response = await authAPI.getUserById(userId);
      return response.data as User;
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      await authAPI.updateUser(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: "MALE",
        address: "",
        dateOfBirth: "",
      });
      setIsLoading(false);
    }
  }, [user]);

  // Handle save
  const handleSave = () => {
    updateUserMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
  };

  // Get role-specific edit URL
  const getRoleSpecificEditUrl = () => {
    switch (user?.role) {
      case 'STUDENT':
        return `/list/students/${userId}/edit`;
      case 'TEACHER':
        return `/list/teachers/${userId}/edit`;
      case 'PARENT':
        return `/list/parents/${userId}/edit`;
      default:
        return null;
    }
  };

  const roleSpecificEditUrl = getRoleSpecificEditUrl();

  if (isLoading || userLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-600 font-medium">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: "#F8FAFC", fontFamily: "var(--font-sans), sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e35336]">Edit User</h1>
          <p className="text-gray-500">Update user basic information</p>
        </div>

        <div className="space-y-6">
          {/* User Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {user?.role === 'STUDENT' && <GraduationCap className="w-6 h-6 text-blue-600" />}
                  {user?.role === 'TEACHER' && <Briefcase className="w-6 h-6 text-blue-600" />}
                  {user?.role === 'PARENT' && <Users className="w-6 h-6 text-blue-600" />}
                  {(user?.role === 'ADMIN' || user?.role === 'IT_MANAGER') && <FileText className="w-6 h-6 text-blue-600" />}
                  {user?.role === 'REGISTRAR' && <FileText className="w-6 h-6 text-blue-600" />}
                  {user?.role === 'FINANCE' && <FileText className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <p className="text-lg font-semibold">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-sm">
                  {user?.role}
                </Badge>
                <Badge 
                  variant={user?.isActive ? "default" : "destructive"}
                  className="text-sm"
                >
                  {user?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Role-specific Edit Button */}
          {roleSpecificEditUrl && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.role === 'STUDENT' && "Edit Student Details"}
                      {user?.role === 'TEACHER' && "Edit Teacher Details"}
                      {user?.role === 'PARENT' && "Edit Parent Details"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.role === 'STUDENT' && "Update academic info, class, section, enrollment"}
                      {user?.role === 'TEACHER' && "Update work info, subjects, homeroom class"}
                      {user?.role === 'PARENT' && "View and manage linked children"}
                    </p>
                  </div>
                  <Button 
                    onClick={() => router.push(roleSpecificEditUrl)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Edit Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Information Form */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic user details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(value) => setForm({ ...form, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <CalendarDatePicker
                    value={parseLocalDateInputValue(form.dateOfBirth)}
                    onChange={(date) => setForm({ ...form, dateOfBirth: date ? toLocalDateInputValue(date) : "" })}
                    placeholder="Select date of birth"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Account status and metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">User ID</p>
                  <p className="font-mono text-xs">{user?.id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created At</p>
                  <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
