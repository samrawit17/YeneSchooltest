"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { hrAPI } from "@/lib/api";
import { Loader2, Save, User, Briefcase, Phone, Mail, MapPin, Building, Calendar } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender: string;
  address?: string;
  isActive: boolean;
  hrProfile?: {
    employeeId: string;
    designation: string;
    department?: { name: string };
    joiningDate?: string;
  };
}

export default function EditStaffPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const staffId = params.id as string;

  const [activeTab, setActiveTab] = useState("personal");
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "MALE",
    address: "",
    dateOfBirth: "",
    designation: "",
    department: "",
    joiningDate: "",
  });

  // Fetch staff profile first to get user ID
  const { data: staffProfile, isLoading: staffLoading } = useQuery({
    queryKey: ["staff-profile", staffId],
    queryFn: async () => {
      const response = await hrAPI.getEmployeeById(staffId);
      return response.data;
    },
  });

  // Update staff mutation (handles both user and hrProfile)
  const updateStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!staffId) throw new Error("No staff ID found");
      return hrAPI.updateEmployee(staffId, data);
    },
    onSuccess: () => {
      toast.success("Staff information updated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff-profile", staffId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update staff information");
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (staffProfile) {
      const hrProfile = staffProfile.hrProfile || {};
      
      setForm({
        name: staffProfile.name || "",
        email: staffProfile.email || "",
        phone: staffProfile.phone || "",
        gender: staffProfile.gender || "MALE",
        address: staffProfile.address || "",
        dateOfBirth: "",
        designation: hrProfile.designation || "",
        department: hrProfile.department?.name || "",
        joiningDate: hrProfile.joiningDate ? new Date(hrProfile.joiningDate).toISOString().split('T')[0] : "",
      });
      setIsLoading(false);
    }
  }, [staffProfile]);

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePersonal = async () => {
    try {
      await updateStaffMutation.mutateAsync({
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        address: form.address,
      });
    } catch (error) {
      console.error("Failed to save personal info:", error);
    }
  };

  const handleSaveWork = async () => {
    try {
      await updateStaffMutation.mutateAsync({
        position: form.designation,
        department: form.department,
        hireDate: form.joiningDate,
      });
    } catch (error) {
      console.error("Failed to save work info:", error);
    }
  };

  if (staffLoading || isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Edit Staff</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update staff personal and work information
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/list/staff/${staffId}`)}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger
            value="personal"
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger
            value="work"
            className="flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Work Info
          </TabsTrigger>
        </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update the staff member's personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="pl-10"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="pl-10"
                        placeholder="Enter email address"
                        disabled
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="pl-10"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(value) => handleInputChange("gender", value)}
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

                  {/* Address */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="address"
                        value={form.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        className="pl-10"
                        placeholder="Enter address"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSavePersonal}
                    disabled={updateStaffMutation.isPending}
                    style={{ backgroundColor: "#1E3A8A" }}
                  >
                    {updateStaffMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Personal Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Info Tab */}
          <TabsContent value="work">
            <Card>
              <CardHeader>
                <CardTitle>Work Information</CardTitle>
                <CardDescription>Update the staff member's work details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Designation */}
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="designation"
                        value={form.designation}
                        onChange={(e) => handleInputChange("designation", e.target.value)}
                        className="pl-10"
                        placeholder="e.g., Administrative Officer"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="department"
                        value={form.department}
                        onChange={(e) => handleInputChange("department", e.target.value)}
                        className="pl-10"
                        placeholder="e.g., Administration"
                      />
                    </div>
                  </div>

                  {/* Joining Date */}
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="joiningDate"
                        type="date"
                        value={form.joiningDate}
                        onChange={(e) => handleInputChange("joiningDate", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveWork}
                    disabled={updateStaffMutation.isPending}
                    style={{ backgroundColor: "#1E3A8A" }}
                  >
                    {updateStaffMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Work Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
