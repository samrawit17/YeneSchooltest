"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  UserPlus,
  AlertCircle,
  Loader2,
  Key,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { schoolsAPI, authAPI } from "@/lib/api";
import { credentialsAPI } from "@/lib/api/admin";

// Schema for staff creation
const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["TEACHER", "ADMIN", "PARENT", "REGISTRAR"], {
    required_error: "Role is required",
  }),
  phone: z.string().optional(),
  generateCredentials: z.boolean().default(true),
  username: z.string().optional(),
  password: z.string().optional(),
});

// Schema for staff update
const updateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  changePassword: z.boolean().default(false),
  newPassword: z.string().optional(),
});

type CreateStaffFormData = z.infer<typeof createStaffSchema>;
type UpdateStaffFormData = z.infer<typeof updateStaffSchema>;

interface StaffUserData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive?: boolean;
  avatarUrl?: string;
}

interface UnifiedStaffFormProps {
  mode?: "create" | "update";
  schoolId?: string;
  schoolCode?: string;
  initialData?: StaffUserData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UnifiedStaffForm({
  mode = "create",
  schoolId: propSchoolId,
  schoolCode: propSchoolCode,
  initialData,
  onSuccess,
  onCancel,
}: UnifiedStaffFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [schoolCode, setSchoolCode] = useState<string | undefined>(propSchoolCode);
  const [schoolId, setSchoolId] = useState<string>(propSchoolId || user?.schoolId || "");
  const [showPassword, setShowPassword] = useState(false);

  // Fetch school settings if not provided
  useEffect(() => {
    const fetchSchoolSettings = async () => {
      if (!propSchoolCode && user?.schoolId) {
        try {
          const response = await schoolsAPI.getById(user.schoolId);
          setSchoolCode(response.data.code);
          setSchoolId(response.data.id);
        } catch (error) {
          console.error("Failed to fetch school settings:", error);
        }
      }
    };
    fetchSchoolSettings();
  }, [user, propSchoolCode]);

  // Create form
  const createForm = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "TEACHER",
      phone: "",
      generateCredentials: true,
      username: "",
      password: "",
    },
  });

  // Update form
  const updateForm = useForm<UpdateStaffFormData>({
    resolver: zodResolver(updateStaffSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      isActive: initialData?.isActive ?? true,
      changePassword: false,
      newPassword: "",
    },
  });

  // Update form values when initialData changes
  useEffect(() => {
    if (mode === "update" && initialData) {
      updateForm.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        isActive: initialData.isActive ?? true,
        changePassword: false,
        newPassword: "",
      });
    }
  }, [initialData, mode, updateForm]);

  const handleCreate = async (data: CreateStaffFormData) => {
    if (!schoolCode && data.generateCredentials) {
      toast.error("School code is not configured. Please set a school code first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await credentialsAPI.createStaff({
        staff: [{
          name: data.name,
          email: data.email,
          role: data.role as any,
          phone: data.phone || undefined,
          generateCredentials: data.generateCredentials,
          username: data.generateCredentials === false ? data.username : undefined,
          password: data.generateCredentials === false ? data.password : undefined,
        }],
      });

      toast.success("Staff created successfully!");
      
      // Reset form
      createForm.reset({
        name: "",
        email: "",
        role: "TEACHER",
        phone: "",
        generateCredentials: true,
        username: "",
        password: "",
      });

      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to create staff";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: UpdateStaffFormData) => {
    if (!initialData?.id) {
      toast.error("Staff ID is required for update");
      return;
    }

    setIsLoading(true);
    try {
      // Update basic user info
      await authAPI.updateUser(initialData.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
      });

      // Handle password change if requested
      if (data.changePassword && data.newPassword) {
        // Note: This would need a backend endpoint for admin to reset user password
        // For now, we'll just show a message
        toast.info("Password change functionality requires backend support");
      }

      toast.success("Staff updated successfully!");
      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update staff";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render create form
  if (mode === "create") {
    return (
      <div className="space-y-6">
        {/* School Code Warning */}
        {!schoolCode && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>School Code Required</AlertTitle>
            <AlertDescription>
              A school code must be configured before generating credentials.
              Please go to School Settings to set the school code.
            </AlertDescription>
          </Alert>
        )}

        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="PARENT">Parent</SelectItem>
                        <SelectItem value="REGISTRAR">Registrar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Credential Options */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-slate-600" />
                  <span className="font-medium">Credential Options</span>
                </div>
                <FormField
                  control={createForm.control}
                  name="generateCredentials"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label className="text-sm">
                        {field.value ? "Auto-generate credentials" : "Custom credentials"}
                      </Label>
                    </div>
                  )}
                />
              </div>

              {createForm.watch("generateCredentials") === false && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => createForm.reset()}>
                Reset
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Staff
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  // Render update form
  return (
    <div className="space-y-6">
      {/* User Info Header */}
      {initialData && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{initialData.name}</p>
            <p className="text-sm text-gray-600">{initialData.email}</p>
            <p className="text-xs text-gray-500">Role: {initialData.role}</p>
          </div>
        </div>
      )}

      <Form {...updateForm}>
        <form onSubmit={updateForm.handleSubmit(handleUpdate)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={updateForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <p className="text-sm text-gray-500">
                      User can login and access the system
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Password Change Section */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-4">
            <FormField
              control={updateForm.control}
              name="changePassword"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-slate-600" />
                    <span className="font-medium">Change Password</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label className="text-sm">
                      {field.value ? "Set new password" : "Keep current password"}
                    </Label>
                  </div>
                </div>
              )}
            />

            {updateForm.watch("changePassword") && (
              <FormField
                control={updateForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password *</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter new password" 
                          {...field} 
                        />
                      </FormControl>
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
