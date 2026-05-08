"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { studentsAPI, classesAPI, sectionsAPI, registrarAPI } from "@/lib/api";
import { parentsAPI } from "@/lib/api/people";
import { queryKeys } from "@/lib/query-keys";
import { Loader2, ArrowLeft, Save, User, BookOpen, Users, FileText } from "lucide-react";
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

interface Parent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  occupation: string;
  relation: string;
  isPrimary: boolean;
  emergencyContact: boolean;
  user?: {
    email?: string;
  } | Record<string, any>;
}

interface Student {
  id: string;
  studentCode: string;
  rollNumber: string;
  phone: string;
  gender: string;
  address: string;
  dateOfBirth?: string;
  enrollmentYear?: string;
  enrollmentStatus?: string;
  className?: string;
  classId?: string;
  section?: string;
  sectionId?: string;
  documents?: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
  }>;
  parents?: Parent[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
  } | Record<string, any>;
}

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

interface SectionOption {
  id: string;
  name: string;
  capacity: number;
  roomNumber?: string;
}

export default function EditStudentPage() {
  const params = useParams();
  const studentId = params.id as string;
  const router = useRouter();
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
    
    // Academic info
    studentCode: "",
    rollNumber: "",
    classId: "",
    sectionId: "",
    className: "",
    section: "",
    
    // Parent info
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentOccupation: "",
    parentRelation: "FATHER",
    isPrimaryParent: true,
    emergencyContact: true,
  });

  // State to store the user ID for updates (backend requires userId, not studentProfile id)
  const [userId, setUserId] = useState<string>("");

  const [activeTab, setActiveTab] = useState("personal");

  // Fetch student data
  const { data: student, isLoading: isLoadingStudent, error: studentError } = useQuery<Student>({
    queryKey: queryKeys.students.detail(studentId),
    queryFn: async () => {
      console.log("Fetching student with ID:", studentId);
      const response = await studentsAPI.getById(studentId);
      console.log("Student response:", response.data);
      return response.data;
    },
    retry: 1,
  });

  // Fetch classes
  const { data: classesData } = useQuery<ClassOption[]>({
    queryKey: queryKeys.classes.all,
    queryFn: async () => {
      const response = await classesAPI.getAll();
      return response.data;
    },
  });

  // Fetch sections for selected class
  const { data: sectionsData } = useQuery<SectionOption[]>({
    queryKey: queryKeys.sections.byClass(formData.classId),
    queryFn: async () => {
      if (!formData.classId) return [];
      const response = await sectionsAPI.getAll({ classId: formData.classId });
      return response.data;
    },
    enabled: !!formData.classId,
  });

  // When classId changes, try to find the matching section by name
  useEffect(() => {
    if (formData.classId && sectionsData && formData.section) {
      // Find section by name (e.g., "A")
      const matchingSection = sectionsData.find(s => s.name === formData.section);
      if (matchingSection && !formData.sectionId) {
        setFormData(prev => ({ ...prev, sectionId: matchingSection.id }));
      }
    }
  }, [sectionsData, formData.classId]);

  // Populate form with student data
  useEffect(() => {
    if (student && classesData) {
      const userData = student.user || {};
      const parent = student.parents?.[0];
      
      // Store user ID for update API call
      if (userData.id) {
        setUserId(userData.id);
      }

      // Find the class by name (className might be "Grade 10" or similar)
      let foundClassId = student.classId || "";
      let foundSectionId = student.sectionId || "";
      
      // Store the class and section names for reference
      const classNameFromDb = student.className || "";
      const sectionFromDb = student.section || "";
      
      // If classId is not set but we have className, try to find the matching class
      if (!foundClassId && student.className) {
        // Extract grade number from className like "Grade 10"
        const gradeMatch = student.className.match(/Grade\s*(\d+)/i);
        const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : null;
        
        if (gradeNum) {
          const matchingClass = classesData.find(c => c.grade === gradeNum);
          if (matchingClass) {
            foundClassId = matchingClass.id;
          }
        }
      }

      setFormData({
        fullName: userData.name || "",
        email: userData.email || "",
        phone: student.phone || userData.phone || "",
        gender: student.gender || "MALE",
        address: student.address || "",
        dateOfBirth: student.dateOfBirth || "",
        studentCode: student.studentCode || "",
        rollNumber: student.rollNumber || "",
        classId: foundClassId,
        sectionId: foundSectionId,
        // Also store className and section for reference
        className: classNameFromDb,
        section: sectionFromDb,
        parentName: parent?.name || "",
        parentPhone: parent?.phone || "",
        parentEmail: parent?.user?.email || parent?.email || "",
        parentOccupation: parent?.occupation || "",
        parentRelation: parent?.relation || "FATHER",
        isPrimaryParent: parent?.isPrimary ?? true,
        emergencyContact: parent?.emergencyContact ?? true,
      });
    }
  }, [student, classesData]);

  // Update student mutation - use registrarAPI with userId
  const updateStudentMutation = useMutation({
    mutationFn: (data: any) => {
      // Use userId if available, otherwise fall back to studentId
      const idToUse = userId || studentId;
      console.log("Updating student with ID (using registrar API):", idToUse);
      console.log("Update data:", data);
      return registrarAPI.updateStudent(idToUse, data);
    },
    onSuccess: (data) => {
      console.log("Update success, response:", data);
      toast.success("Student updated successfully");
      // Use userId for query key if available
      const idForQuery = userId || studentId;
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      // Also refetch to ensure data is fresh
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      }, 500);
    },
    onError: (error: any) => {
      console.error("Update student error:", error);
      toast.error(error.response?.data?.message || "Failed to update student");
    },
  });

  // Update parent mutation
  const updateParentMutation = useMutation({
    mutationFn: ({ parentId, data }: { parentId: string; data: any }) => 
      parentsAPI.update(parentId, data),
    onSuccess: () => {
      toast.success("Parent information updated successfully");
      const idForQuery = userId || studentId;
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      }, 500);
    },
    onError: (error: any) => {
      console.error("Update parent error:", error);
      toast.error(error.response?.data?.message || "Failed to update parent");
    },
  });

  // Create parent mutation
  const createParentMutation = useMutation({
    mutationFn: (data: any) => parentsAPI.create(data),
    onSuccess: () => {
      toast.success("Parent added successfully");
      const idForQuery = userId || studentId;
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      }, 500);
    },
    onError: (error: any) => {
      console.error("Create parent error:", error);
      toast.error(error.response?.data?.message || "Failed to add parent");
    },
  });

  // Assign class mutation
  const assignClassMutation = useMutation({
    mutationFn: (data: { className: string; section: string; rollNumber: string }) => {
      const idToUse = userId || studentId;
      return registrarAPI.assignClass(idToUse, data);
    },
    onSuccess: () => {
      toast.success("Class assigned successfully");
      const idForQuery = userId || studentId;
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.students.detail(idForQuery) });
      }, 500);
    },
    onError: (error: any) => {
      console.error("Assign class error:", error);
      toast.error(error.response?.data?.message || "Failed to assign class");
    },
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveStudent = async () => {
    // Only send fields that the backend accepts: name, gender, address, phone
    const updateData: any = {
      phone: formData.phone,
      gender: formData.gender,
      address: formData.address,
    };

    // Update user name if changed
    if (formData.fullName !== student?.user?.name) {
      updateData.name = formData.fullName;
    }

    console.log("Sending update data:", updateData);
    
    updateStudentMutation.mutate(updateData);
  };

  // Handle saving class/section changes
  const handleSaveClassSection = () => {
    // Get the selected class name from the class options
    const selectedClass = classesData?.find(c => c.id === formData.classId);
    const className = selectedClass ? `Grade ${selectedClass.grade}` : formData.classId;
    
    // Get the selected section name
    const selectedSection = sectionsData?.find(s => s.id === formData.sectionId);
    const section = selectedSection?.name || formData.sectionId;

    console.log("Assigning class:", { className, section, rollNumber: formData.rollNumber });
    
    assignClassMutation.mutate({
      className,
      section,
      rollNumber: formData.rollNumber
    });
  };

  const handleSaveParent = () => {
    const existingParent = student?.parents?.[0];
    
    if (existingParent) {
      // Update existing parent
      updateParentMutation.mutate({
        parentId: existingParent.id,
        data: {
          name: formData.parentName,
          phone: formData.parentPhone,
          occupation: formData.parentOccupation,
          address: formData.address,
        },
      });
    } else {
      // Create new parent and link to student
      createParentMutation.mutate({
        email: formData.parentEmail || `${formData.parentName.toLowerCase().replace(/\s+/g, '.')}@parent.edu.et`,
        name: formData.parentName,
        phone: formData.parentPhone,
        occupation: formData.parentOccupation,
        children: [
          {
            studentProfileId: studentId,
            relation: formData.parentRelation,
            isPrimary: formData.isPrimaryParent,
            emergencyContact: formData.emergencyContact,
          },
        ],
      });
    }
  };

  if (isLoadingStudent) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (!student || studentError) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading student data</p>
          <p className="text-sm text-gray-500">{(studentError as any)?.message || "Student not found"}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e35336]">Edit Student</h1>
        <p className="text-sm text-gray-500">Update student information</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="parent" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Parent
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
              <CardDescription>Basic student details</CardDescription>
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
                
                <div className="space-y-2">
                  <Label htmlFor="studentCode">Student Code</Label>
                  <Input
                    id="studentCode"
                    value={formData.studentCode}
                    onChange={(e) => handleInputChange("studentCode", e.target.value)}
                    placeholder="Enter student code"
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
                  onClick={handleSaveStudent}
                  disabled={updateStudentMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateStudentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Information Tab */}
        <TabsContent value="academic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
              <CardDescription>Class, section, and enrollment details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classId">Grade / Class</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={(value) => {
                      handleInputChange("classId", value);
                      handleInputChange("sectionId", ""); // Reset section
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesData?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          Grade {cls.grade} - {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sectionId">Section</Label>
                  <Select
                    value={formData.sectionId}
                    onValueChange={(value) => handleInputChange("sectionId", value)}
                    disabled={!formData.classId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionsData?.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          Section {section.name} (Capacity: {section.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    value={formData.rollNumber}
                    onChange={(e) => handleInputChange("rollNumber", e.target.value)}
                    placeholder="Enter roll number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Enrollment Status</Label>
                  <Input
                    value={student.enrollmentStatus || "ACTIVE"}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveClassSection}
                  disabled={assignClassMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {assignClassMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Class & Section
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parent Information Tab */}
        <TabsContent value="parent" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Parent / Guardian Information</CardTitle>
              <CardDescription>Details of the student's parent or guardian</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent Name</Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={(e) => handleInputChange("parentName", e.target.value)}
                    placeholder="Enter parent name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentRelation">Relation</Label>
                  <Select
                    value={formData.parentRelation}
                    onValueChange={(value) => handleInputChange("parentRelation", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FATHER">Father</SelectItem>
                      <SelectItem value="MOTHER">Mother</SelectItem>
                      <SelectItem value="GUARDIAN">Guardian</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentPhone">Phone Number</Label>
                  <Input
                    id="parentPhone"
                    value={formData.parentPhone}
                    onChange={(e) => handleInputChange("parentPhone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Email (Optional)</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => handleInputChange("parentEmail", e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentOccupation">Occupation</Label>
                  <Input
                    id="parentOccupation"
                    value={formData.parentOccupation}
                    onChange={(e) => handleInputChange("parentOccupation", e.target.value)}
                    placeholder="Enter occupation"
                  />
                </div>
                
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPrimaryParent"
                      checked={formData.isPrimaryParent}
                      onChange={(e) => handleInputChange("isPrimaryParent", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isPrimaryParent" className="font-normal">
                      Primary Parent
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emergencyContact"
                      checked={formData.emergencyContact}
                      onChange={(e) => handleInputChange("emergencyContact", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="emergencyContact" className="font-normal">
                      Emergency Contact
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveParent}
                  disabled={updateParentMutation.isPending || createParentMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {(updateParentMutation.isPending || createParentMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Save className="h-4 w-4" />
                  Save Parent Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Student documents and certificates</CardDescription>
            </CardHeader>
            <CardContent>
              {student.documents && student.documents.length > 0 ? (
                <div className="space-y-3">
                  {student.documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-500">{doc.type}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No documents uploaded yet</p>
                  <Button variant="outline" className="mt-4">
                    Upload Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
