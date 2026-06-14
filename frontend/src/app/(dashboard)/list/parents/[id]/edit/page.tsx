"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { parentsAPI } from "@/lib/api/people";
import { queryKeys } from "@/lib/query-keys";
import { ArrowLeft, Loader2, Save, User, Users, Phone, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useAuth } from "@/context/AuthContext";

// Shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ParentProfile {
  id: string;
  phone: string;
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
  const { user } = useAuth();
  const currentRole = String(user?.role || "").toUpperCase();
  const canManageParent = ["ADMIN", "REGISTRAR"].includes(currentRole);

  const [activeTab, setActiveTab] = useState("personal");
  const { setItems: setBreadcrumb } = useBreadcrumb();
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    occupation: "",
  });

  // Fetch parent profile first to get user ID
  const { data: parentProfile, isLoading: parentLoading } = useQuery({
    queryKey: queryKeys.parents.profile(parentId),
    queryFn: async () => {
      const response = await parentsAPI.getById(parentId);
      return response.data;
    },
  });

  // Update parent mutation
  const updateParentMutation = useMutation({
    mutationFn: async (data: any) => {
      await parentsAPI.update(parentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.profile(parentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.detail(parentId) });
      toast.success("Parent profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update parent profile");
    },
  });

  const userData = parentProfile?.user as User | undefined;

  // Update breadcrumb when parent data loads
  useEffect(() => {
    const name = userData?.name || parentProfile?.user?.name || parentProfile?.name || "Parent";
    if (name && parentId) {
      setBreadcrumb([
        { label: "Dashboard", href: "/admin" },
        { label: "Parents", href: "/list/parents" },
        { label: name, href: `/list/parents/${parentId}` },
        { label: "Edit", isCurrent: true },
      ]);
    }
  }, [userData, parentProfile, parentId, setBreadcrumb]);

  // Initialize form data
  useEffect(() => {
    if (userData && parentProfile) {
      const user = userData as any;
      const profile = parentProfile as any;
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: profile.phone || user.phone || "",
        address: profile.address || user.address || "",
        occupation: profile.occupation || "",
      });
      setIsLoading(false);
    }
  }, [userData, parentProfile]);

  // Handle personal info save
  const handlePersonalSave = () => {
    updateParentMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      occupation: form.occupation,
    });
  };

  // Handle parent info save
  const handleParentSave = () => {
    updateParentMutation.mutate({
      address: form.address,
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
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-600 font-medium">Loading parent data...</p>
        </div>
      </div>
    );
  }

  if (!canManageParent) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Read-only access
            </CardTitle>
            <CardDescription>
              Parent editing is limited to school admins and registrars.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push(`/list/parents/${parentId}`)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to parent profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50 dark:bg-[#111111]" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/list/parents/${parentId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Edit {userData?.name || parentProfile?.user?.name || parentProfile?.name || "Parent"}</h1>
            <p className="text-gray-500">Update parent information and manage children</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0 dark:border-[#2A2A2A]">
            <TabsTrigger
              value="personal"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-5 py-3 text-sm font-medium text-gray-500 shadow-none data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-color,#e35336)] data-[state=active]:shadow-none dark:text-gray-400"
            >
              <User className="w-4 h-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger
              value="children"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-5 py-3 text-sm font-medium text-gray-500 shadow-none data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-color,#e35336)] data-[state=active]:shadow-none dark:text-gray-400"
            >
              <Users className="w-4 h-4" />
              Children
            </TabsTrigger>
            <TabsTrigger
              value="contact"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-5 py-3 text-sm font-medium text-gray-500 shadow-none data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-color,#e35336)] data-[state=active]:shadow-none dark:text-gray-400"
            >
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
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={form.occupation}
                      onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                      placeholder="Enter occupation"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handlePersonalSave}
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
