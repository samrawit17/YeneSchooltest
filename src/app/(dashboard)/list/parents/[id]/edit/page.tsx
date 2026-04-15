"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { parentsAPI, authAPI } from "@/lib/api";
import { Loader2, Save, User, Users, Phone, Mail, MapPin, Briefcase } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface ParentProfile {
  id: string;
  phone: string;
  gender: string;
  address: string;
  occupation?: string;
  relation?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface Child {
  id: string;
  studentId: string;
  relation: string;
  student?: {
    id: string;
    user?: { name: string };
    studentCode: string;
    className?: string;
  };
}

export default function EditParentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const parentId = params.id as string;

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
    occupation: "",
  });

  // Fetch parent profile first to get user ID
  const { data: parentProfile, isLoading: parentLoading } = useQuery({
    queryKey: ["parent-profile", parentId],
    queryFn: async () => {
      const response = await parentsAPI.getById(parentId);
      return response.data;
    },
  });

  // Fetch user data using the user ID from parent profile
  const { data: userData } = useQuery({
    queryKey: ["user", parentProfile?.userId],
    queryFn: async () => {
      if (!parentProfile?.userId) return null;
      const response = await authAPI.getUserById(parentProfile.userId);
      return response.data as User;
    },
    enabled: !!parentProfile?.userId,
  });

  // Update user mutation - use userId from parent profile
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!parentProfile?.userId) return;
      await authAPI.updateUser(parentProfile.userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", parentId] });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  // Update parent mutation
  const updateParentMutation = useMutation({
    mutationFn: async (data: any) => {
      await parentsAPI.update(parentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-profile", parentId] });
      toast.success("Parent profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update parent profile");
    },
  });

  // Initialize form data
  useEffect(() => {
    if (userData && parentProfile) {
      const user = userData as any;
      const profile = parentProfile as any;
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: profile.phone || user.phone || "",
        gender: profile.gender || "MALE",
        address: profile.address || user.address || "",
        dateOfBirth: user.dateOfBirth || "",
        occupation: profile.occupation || "",
      });
      setIsLoading(false);
    }
  }, [userData, parentProfile]);

  // Handle personal info save
  const handlePersonalSave = () => {
    updateUserMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
  };

  // Handle parent info save
  const handleParentSave = () => {
    updateParentMutation.mutate({
      gender: form.gender,
      address: form.address,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone,
      occupation: form.occupation,
    });
  };

  // Transform children data for display
  const children = (parentProfile?.children || []).map((c: any) => ({
    id: c.studentId || c.student?.id || c.id,
    name: c.student?.user?.name || c.studentName || c.name || "Unknown",
    studentCode: c.student?.studentCode || c.studentCode || "",
    relation: c.relation,
    grade: c.student?.className || c.student?.class?.name || c.grade || "",
  }));

  if (isLoading || parentLoading || !parentProfile) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading parent data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e35336]">Edit Parent</h1>
          <p className="text-gray-500">Update parent information and manage children</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="children" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Children
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact
            </TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic parent details</CardDescription>
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
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={form.occupation}
                      onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                      placeholder="Enter occupation"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handlePersonalSave}
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
          </TabsContent>

          {/* Children Tab */}
          <TabsContent value="children">
            <Card>
              <CardHeader>
                <CardTitle>Linked Children</CardTitle>
                <CardDescription>View children associated with this parent</CardDescription>
              </CardHeader>
              <CardContent>
                {children.length > 0 ? (
                  <div className="space-y-3">
                    {children.map((child: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{child.name}</p>
                            <p className="text-sm text-gray-500">
                              {child.studentCode || "No code"}{child.grade ? ` • ${child.grade}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{child.relation}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No children linked to this parent</p>
                    <p className="text-sm text-gray-400">Contact the registrar to link children</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Address and emergency contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleParentSave}
                    disabled={updateParentMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateParentMutation.isPending ? (
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
