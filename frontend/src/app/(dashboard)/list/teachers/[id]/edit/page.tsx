"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { authAPI, classesAPI, subjectsAPI } from "@/lib/api";
import { classSubjectsAPI } from "@/lib/api/admin";
import { hrAPI } from "@/lib/api/hr";
import { Loader2, Save, User, Briefcase, BookOpen, Users, FileText, Trash2, Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

interface TeacherProfile {
  id: string;
  staffId: string;
  phone: string;
  gender: string;
  address: string;
  dateOfBirth?: string;
  position?: string;
  employmentType?: string;
  joiningDate?: string;
  subjects?: Array<{
    id: string;
    name: string;
    subjectId: string;
  }>;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  img?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  teacherProfile?: TeacherProfile | Record<string, any>;
}

interface ClassOption {
  id: string;
  name: string;
  grade: number;
  homeroomTeacherId?: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface AssignedSubject {
  id: string;
  class: {
    name: string;
    grade: number;
  };
  section: {
    name: string;
  };
  subject: {
    name: string;
  };
}

export default function EditTeacherPage() {
  const params = useParams();
  const teacherId = params.id as string;
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    // Personal info
    fullName: "",
    email: "",
    phone: "",
    gender: "MALE",
    address: "",
    dateOfBirth: "",
    
    // Professional info
    staffId: "",
    position: "",
    employmentType: "FULL_TIME",
    joiningDate: "",
    
    // Class assignment
    homeroomClassId: "",
    
    // Subject assignments
    assignedSubjects: [] as string[],
  });

  const [activeTab, setActiveTab] = useState("personal");

  // Fetch teacher data
  const { data: teacher, isLoading: isLoadingTeacher, error: teacherError } = useQuery<Teacher>({
    queryKey: ["teacher", teacherId],
    queryFn: async () => {
      const response = await authAPI.getUserById(teacherId);
      return response.data;
    },
  });

  // Fetch classes
  const { data: classesData } = useQuery<ClassOption[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const response = await classesAPI.getAll();
      return response.data;
    },
  });

  // Fetch subjects
  const { data: subjectsData } = useQuery<SubjectOption[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await subjectsAPI.getAll();
      return response.data;
    },
  });

  // Fetch teacher's current subject assignments
  const { data: teacherSubjects, refetch: refetchSubjects } = useQuery<AssignedSubject[]>({
    queryKey: ["teacher-subjects", teacherId],
    queryFn: async () => {
      const response = await classSubjectsAPI.getByTeacher(teacherId);
      return response.data;
    },
    enabled: !!teacherId,
  });

  // Populate form with teacher data
  useEffect(() => {
    if (teacher) {
      const profile = teacher.teacherProfile || {};
      
      setFormData({
        fullName: teacher.name || "",
        email: teacher.email || "",
        phone: teacher.phone || profile.phone || "",
        gender: profile.gender || "MALE",
        address: profile.address || "",
        dateOfBirth: profile.dateOfBirth || "",
        staffId: profile.staffId || "",
        position: profile.position || "",
        employmentType: profile.employmentType || "FULL_TIME",
        joiningDate: profile.joiningDate || "",
        homeroomClassId: "",
        assignedSubjects: [],
      });
    }
  }, [teacher]);

  // Update teacher mutation
  const updateTeacherMutation = useMutation({
    mutationFn: (data: any) => hrAPI.updateEmployee(teacherId, data),
    onSuccess: () => {
      toast.success("Teacher updated successfully");
      queryClient.invalidateQueries({ queryKey: ["teacher", teacherId] });
    },
    onError: (error: any) => {
      console.error("Update teacher error:", error);
      toast.error(error.response?.data?.message || "Failed to update teacher");
    },
  });

  // Set homeroom teacher mutation
  const setHomeroomMutation = useMutation({
    mutationFn: ({ classId, teacherId }: { classId: string; teacherId: string }) => 
      classesAPI.setHomeroomTeacher(classId, teacherId),
    onSuccess: () => {
      toast.success("Homeroom class assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", teacherId] });
    },
    onError: (error: any) => {
      console.error("Set homeroom error:", error);
      toast.error(error.response?.data?.message || "Failed to assign homeroom class");
    },
  });

  // Remove homeroom teacher mutation
  const removeHomeroomMutation = useMutation({
    mutationFn: (classId: string) => 
      classesAPI.setHomeroomTeacher(classId, null),
    onSuccess: () => {
      toast.success("Homeroom class removed successfully");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", teacherId] });
    },
    onError: (error: any) => {
      console.error("Remove homeroom error:", error);
      toast.error(error.response?.data?.message || "Failed to remove homeroom class");
    },
  });

  // Assign subject mutation
  const assignSubjectMutation = useMutation({
    mutationFn: (data: { classId: string; sectionId: string; subjectId: string; teacherId: string }) => 
      classSubjectsAPI.create({ ...data, academicYearId: "" }),
    onSuccess: () => {
      toast.success("Subject assigned successfully");
      refetchSubjects();
    },
    onError: (error: any) => {
      console.error("Assign subject error:", error);
      toast.error(error.response?.data?.message || "Failed to assign subject");
    },
  });

  // Unassign subject mutation
  const unassignSubjectMutation = useMutation({
    mutationFn: (classSubjectId: string) => 
      classSubjectsAPI.delete(classSubjectId),
    onSuccess: () => {
      toast.success("Subject unassigned successfully");
      refetchSubjects();
    },
    onError: (error: any) => {
      console.error("Unassign subject error:", error);
      toast.error(error.response?.data?.message || "Failed to unassign subject");
    },
  });

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePersonal = () => {
    const updateData: any = {
      phone: formData.phone,
      gender: formData.gender,
      address: formData.address,
      dateOfBirth: formData.dateOfBirth,
      staffId: formData.staffId,
      position: formData.position,
      employmentType: formData.employmentType,
      joiningDate: formData.joiningDate,
    };

    // Update user name if changed
    if (formData.fullName !== teacher?.name) {
      updateData.name = formData.fullName;
    }

    console.log("Sending update data:", updateData);
    
    updateTeacherMutation.mutate(updateData);
  };

  const handleSetHomeroom = () => {
    if (formData.homeroomClassId) {
      setHomeroomMutation.mutate({ 
        classId: formData.homeroomClassId, 
        teacherId 
      });
    }
  };

  const handleRemoveHomeroom = (classId: string) => {
    removeHomeroomMutation.mutate(classId);
  };

  // Get classes where this teacher is homeroom
  const homeroomClasses = (classesData || []).filter(
    (cls: any) => cls.homeroomTeacherId === teacherId || cls.homeroomTeacher?.id === teacherId
  );

  if (isLoadingTeacher) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading teacher data...</p>
        </div>
      </div>
    );
  }

  if (teacherError || !teacher) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading teacher data</p>
          <p className="text-sm text-gray-500">{(teacherError as any)?.message || "Teacher not found"}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e35336]">Edit Teacher</h1>
        <p className="text-sm text-gray-500">Update teacher information and assignments</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="professional" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Professional
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic teacher details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50"
                    placeholder="Email cannot be changed"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
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
                
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter address"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePersonal}
                  disabled={updateTeacherMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateTeacherMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Professional Information Tab */}
        <TabsContent value="professional" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Employment details and position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">Staff ID</Label>
                  <Input
                    id="staffId"
                    value={formData.staffId}
                    onChange={(e) => handleInputChange("staffId", e.target.value)}
                    placeholder="Enter staff ID"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    placeholder="e.g., Teacher, Head of Department"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) => handleInputChange("employmentType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="VISITING">Visiting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => handleInputChange("joiningDate", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePersonal}
                  disabled={updateTeacherMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateTeacherMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classes Tab - Homeroom Assignment */}
        <TabsContent value="classes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Assignments</CardTitle>
              <CardDescription>Assign homeroom class for this teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Homeroom Classes */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Current Homeroom Classes</h3>
                {homeroomClasses.length > 0 ? (
                  <div className="space-y-2">
                    {homeroomClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold">{cls.name}</p>
                            <p className="text-sm text-gray-600">Grade {cls.grade}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveHomeroom(cls.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No homeroom class assigned</p>
                )}
              </div>

              {/* Assign New Homeroom Class */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Assign New Homeroom Class</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Select
                      value={formData.homeroomClassId}
                      onValueChange={(value) => handleInputChange("homeroomClassId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesData
                          ?.filter(cls => !cls.homeroomTeacherId || cls.homeroomTeacherId === teacherId)
                          .map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              Grade {cls.grade} - {cls.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleSetHomeroom}
                    disabled={!formData.homeroomClassId || setHomeroomMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {setHomeroomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Plus className="h-4 w-4" />
                    Assign Class
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Subject Assignments</CardTitle>
              <CardDescription>Manage subjects assigned to this teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Subject Assignments */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Currently Assigned Subjects</h3>
                {teacherSubjects && teacherSubjects.length > 0 ? (
                  <div className="space-y-2">
                    {teacherSubjects.map((subject) => (
                      <div key={subject.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-semibold">{subject.subject?.name || 'Unknown Subject'}</p>
                            <p className="text-sm text-gray-600">
                              {subject.class?.name || 'Unknown Class'} - Section {subject.section?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => unassignSubjectMutation.mutate(subject.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No subjects assigned yet</p>
                )}
              </div>

              {/* Note about subject assignment */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Subject assignments are managed through the Class-Subject management. 
                  To assign new subjects to this teacher, please go to Classes → Subject Assignments.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Teacher documents and certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No documents uploaded yet</p>
                <Button variant="outline" className="mt-4">
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
