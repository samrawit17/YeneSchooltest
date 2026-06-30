"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  UserPlus,
  Loader2,
  Save,
  X,
  Building2,
  Mail,
  Phone,
  User,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { schoolsAPI, authAPI } from "@/lib/api";

const createAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  schoolId: z.string().min(1, "School is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const updateAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  changePassword: z.boolean().default(false),
  newPassword: z.string().optional(),
});

type CreateAdminFormData = z.infer<typeof createAdminSchema>;
type UpdateAdminFormData = z.infer<typeof updateAdminSchema>;

interface SchoolAdminFormProps {
  mode?: "create" | "update";
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SchoolAdminForm({
  mode = "create",
  initialData,
  onSuccess,
  onCancel,
}: SchoolAdminFormProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await schoolsAPI.getAll();
        const data = response.data;
        setSchools(Array.isArray(data) ? data : data?.data || []);
      } catch (error) {
        console.error("Failed to fetch schools:", error);
      } finally {
        setLoadingSchools(false);
      }
    };
    fetchSchools();
  }, []);

  const createForm = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      schoolId: initialData?.schoolId || "",
      password: "",
    },
  });

  const updateForm = useForm<UpdateAdminFormData>({
    resolver: zodResolver(updateAdminSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      isActive: initialData?.isActive ?? true,
      changePassword: false,
      newPassword: "",
    },
  });

  const handleCreate = async (data: CreateAdminFormData) => {
    setIsLoading(true);
    try {
      await authAPI.registerAdmin({
        name: data.name,
        email: data.email,
        password: data.password,
        schoolId: data.schoolId,
      });
      toast.success("Admin created successfully");
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to create admin";
      // Check for email already exists error
      if (errorMessage.includes("email") && errorMessage.includes("exists")) {
        toast.error("An account with this email already exists");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: UpdateAdminFormData) => {
    setIsLoading(true);
    try {
      await authAPI.updateUser(initialData.id, {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        isActive: data.isActive,
      });
      toast.success("Admin updated successfully");
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update admin");
    } finally {
      setIsLoading(false);
    }
  };

  const form = mode === "create" ? createForm : updateForm;
  const activeForm = form as any;
  const handleSubmit =
    mode === "create"
      ? createForm.handleSubmit(handleCreate)
      : updateForm.handleSubmit(handleUpdate);

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-[#2A2A2A]">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === "create" ? "Add New School Admin" : "Update School Admin"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === "create"
              ? "Create a new administrator for a school"
              : "Update admin information"}
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-gray-700 dark:text-gray-300">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              {...activeForm.register("name")}
              placeholder="Enter full name"
              className="pl-10 dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white"
            />
          </div>
          {activeForm.formState.errors.name && (
            <p className="text-sm text-red-500">{activeForm.formState.errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label className="text-gray-700 dark:text-gray-300">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              {...activeForm.register("email")}
              type="email"
              placeholder="Enter email address"
              className="pl-10 dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white"
            />
          </div>
          {activeForm.formState.errors.email && (
            <p className="text-sm text-red-500">{activeForm.formState.errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="text-gray-700 dark:text-gray-300">Phone Number</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              {...activeForm.register("phone")}
              type="tel"
              placeholder="Enter phone number"
              className="pl-10 dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white"
            />
          </div>
        </div>

        {/* School (only for create) */}
        {mode === "create" && (
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              School <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <Select
                value={createForm.watch("schoolId")}
                onValueChange={(value) => createForm.setValue("schoolId", value)}
              >
                <SelectTrigger className="pl-10 dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#2A2A2A] dark:border-[#2A2A2A]">
                  {loadingSchools ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : (
                    schools.map((school) => (
                      <SelectItem
                        key={school.id}
                        value={school.id}
                        className="dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {school.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {createForm.formState.errors.schoolId && (
              <p className="text-sm text-red-500">{createForm.formState.errors.schoolId.message}</p>
            )}
          </div>
        )}

        {/* Password (only for create) */}
        {mode === "create" && (
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                {...createForm.register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className="pl-10 pr-10 dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {createForm.formState.errors.password && (
              <p className="text-sm text-red-500">{createForm.formState.errors.password.message}</p>
            )}
          </div>
        )}

        {/* Is Active (only for update) */}
        {mode === "update" && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={updateForm.watch("isActive")}
              onChange={(e) => updateForm.setValue("isActive", e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isActive" className="text-gray-700 dark:text-gray-300 cursor-pointer">
              Active Account
            </Label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-[#2A2A2A]">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="dark:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:text-gray-200"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {mode === "create" ? "Create Admin" : "Update Admin"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
