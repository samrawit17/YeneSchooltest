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
  GraduationCap,
  ArrowUp,
  Users,
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
import { schoolsAPI, studentsAPI, classesAPI, sectionsAPI, academicYearsAPI } from "@/lib/api";
import { credentialsAPI } from "@/lib/api/admin";

// Schema for student creation
const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  parentEmail: z.string().email("Invalid parent email").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  promoteToNextClass: z.boolean().default(false),
  generateCredentials: z.boolean().default(true),
  username: z.string().optional(),
  password: z.string().optional(),
});

// Schema for student update
const updateStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  changePassword: z.boolean().default(false),
  newPassword: z.string().optional(),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;
type UpdateStudentFormData = z.infer<typeof updateStudentSchema>;

interface StudentUserData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  motherName?: string;
  motherPhone?: string;
  gender?: string;
  address?: string;
  studentProfile?: {
    studentCode?: string;
    rollNumber?: string;
    classId?: string;
    className?: string;
    sectionId?: string;
    section?: string;
    enrollmentStatus?: string;
  };
}

interface UnifiedStudentFormProps {
  mode?: "create" | "update";
  schoolId?: string;
  schoolCode?: string;
  initialData?: StudentUserData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UnifiedStudentForm({
  mode = "create",
  schoolId: propSchoolId,
  schoolCode: propSchoolCode,
  initialData,
  onSuccess,
  onCancel,
}: UnifiedStudentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [schoolCode, setSchoolCode] = useState<string | undefined>(propSchoolCode);
  const [schoolId, setSchoolId] = useState<string>(propSchoolId || user?.schoolId || "");
  const [showPassword, setShowPassword] = useState(false);
  
  // Classes and sections data
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Handle class selection to load sections
  const handleClassChange = async (classId: string) => {
    createForm.setValue("classId", classId);
    createForm.setValue("sectionId", ""); // Reset section
    setSections([]);
    
    if (classId) {
      try {
        const sectionsResponse = await sectionsAPI.getAll({ classId });
        if (sectionsResponse.data) {
          setSections(sectionsResponse.data.map((s: any) => ({ id: s.id, name: s.name })));
        }
      } catch (error) {
        console.error("Failed to fetch sections:", error);
      }
    }
  };

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

  // Fetch classes and sections
  useEffect(() => {
    const fetchClassesAndSections = async () => {
      if (!schoolId) return;
      
      setLoadingClasses(true);
      try {
        // First get the active academic year
        const academicYearResponse = await academicYearsAPI.getActive({ schoolId });
        const academicYearId = academicYearResponse.data?.id;
        
        if (!academicYearId) {
          console.warn("No active academic year found");
          setLoadingClasses(false);
          return;
        }
        
        // Fetch classes with academic year
        const classesResponse = await classesAPI.getAll({ academicYearId });
        if (classesResponse.data) {
          setClasses(classesResponse.data.map((c: any) => ({ id: c.id, name: c.name || `Grade ${c.grade}` })));
        }
        
        // Fetch all sections (we'll need to get them per class or get all)
        // Since sectionsAPI.getAll requires classId, we'll fetch sections for first class by default
        if (classesResponse.data && classesResponse.data.length > 0) {
          const firstClassId = classesResponse.data[0].id;
          const sectionsResponse = await sectionsAPI.getAll({ classId: firstClassId });
          if (sectionsResponse.data) {
            setSections(sectionsResponse.data.map((s: any) => ({ id: s.id, name: s.name })));
          }
        }
      } catch (error) {
        console.error("Failed to fetch classes/sections:", error);
      } finally {
        setLoadingClasses(false);
      }
    };
    
    fetchClassesAndSections();
  }, [schoolId]);

  // Create form
  const createForm = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      motherName: "",
      motherPhone: "",
      parentEmail: "",
      gender: undefined,
      classId: undefined,
      sectionId: undefined,
      promoteToNextClass: false,
      generateCredentials: true,
      username: "",
      password: "",
    },
  });

  // Update form
  const updateForm = useForm<UpdateStudentFormData>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      motherName: initialData?.motherName || "",
      motherPhone: initialData?.motherPhone || "",
      gender: initialData?.gender as any || undefined,
      address: initialData?.address || "",
      classId: initialData?.studentProfile?.classId || "",
      sectionId: initialData?.studentProfile?.sectionId || "",
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
        motherName: initialData.motherName || "",
        motherPhone: initialData.motherPhone || "",
        gender: initialData.gender as any || undefined,
        address: initialData.address || "",
        classId: initialData.studentProfile?.classId || "",
        sectionId: initialData.studentProfile?.sectionId || "",
        changePassword: false,
        newPassword: "",
      });
    }
  }, [initialData, mode, updateForm]);

  const handleCreate = async (data: CreateStudentFormData) => {
    if (!schoolCode && data.generateCredentials) {
      toast.error("School code is not configured. Please set a school code first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await credentialsAPI.createStudent({
        students: [{
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          motherName: data.motherName || undefined,
          motherPhone: data.motherPhone || undefined,
          parentEmail: data.parentEmail || undefined,
          gender: data.gender,
          classId: data.classId || undefined,
          sectionId: data.sectionId || undefined,
          promoteToNextClass: data.promoteToNextClass,
          generateCredentials: data.generateCredentials,
          username: data.generateCredentials === false ? data.username : undefined,
          password: data.generateCredentials === false ? data.password : undefined,
        }],
      });

      toast.success("Student created successfully!");
      
      // Reset form
      createForm.reset({
        name: "",
        email: "",
        phone: "",
        motherName: "",
        motherPhone: "",
        parentEmail: "",
        gender: undefined,
        classId: undefined,
        sectionId: undefined,
        promoteToNextClass: false,
        generateCredentials: true,
        username: "",
        password: "",
      });

      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to create student";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: UpdateStudentFormData) => {
    if (!initialData?.id) {
      toast.error("Student ID is required for update");
      return;
    }

    setIsLoading(true);
    try {
      // Update student info
      await studentsAPI.update(initialData.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        motherName: data.motherName,
        motherPhone: data.motherPhone,
        gender: data.gender,
        address: data.address,
        classId: data.classId,
        sectionId: data.sectionId,
      });

      // Handle password change if requested
      if (data.changePassword && data.newPassword) {
        toast.info("Password change functionality requires backend support");
      }

      toast.success("Student updated successfully!");
      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update student";
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
                    <FormLabel>Student Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
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

              <FormField
                control={createForm.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mother's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="motherPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother's Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mother's phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleClassChange(value);
                      }} 
                      value={field.value}
                      disabled={loadingClasses}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="sectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingClasses}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="parentEmail"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Parent Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="parent@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Class Assignment Options */}
            <div className="p-4 bg-blue-50 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Class Assignment</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Class</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleClassChange(value);
                        }} 
                        value={field.value}
                        disabled={loadingClasses}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="sectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Section</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={loadingClasses}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="promoteToNextClass"
                render={({ field }) => (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-green-600" />
                      <div>
                        <Label className="text-sm font-medium">Promote to Next Class</Label>
                        <p className="text-xs text-gray-500">Automatically promote student to the next grade level</p>
                      </div>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
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
                    Create Student
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
      {/* Student Info Header */}
      {initialData && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{initialData.name}</p>
            <p className="text-sm text-gray-600">{initialData.email || "No email"}</p>
            {initialData.studentProfile && (
              <p className="text-xs text-gray-500">
                {initialData.studentProfile.className} - {initialData.studentProfile.section}
              </p>
            )}
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
                  <FormLabel>Student Email</FormLabel>
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
              name="motherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mother's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="motherPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mother's phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Load sections for selected class
                      const loadSections = async () => {
                        updateForm.setValue("sectionId", "");
                        setSections([]);
                        if (value) {
                          try {
                            const sectionsResponse = await sectionsAPI.getAll({ classId: value });
                            if (sectionsResponse.data) {
                              setSections(sectionsResponse.data.map((s: any) => ({ id: s.id, name: s.name })));
                            }
                          } catch (error) {
                            console.error("Failed to fetch sections:", error);
                          }
                        }
                      };
                      loadSections();
                    }} 
                    value={field.value}
                    disabled={loadingClasses}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={loadingClasses}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={updateForm.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Password Change */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-4">
            <FormField
              control={updateForm.control}
              name="changePassword"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label className="text-sm">Change Password</Label>
                </div>
              )}
            />

            {updateForm.watch("changePassword") && (
              <FormField
                control={updateForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
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
                  Update Student
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
