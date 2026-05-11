"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { studentsAPI, attendanceAPI, financeAPI, academicYearsAPI } from "@/lib/api";
import { communicationsAPI } from "@/lib/api/communications";
import { queryKeys } from "@/lib/query-keys";
import { Loader2, Edit2 } from "lucide-react";
import UserDetailPage, { UserDetailData } from "@/components/UserDetailPage";
import NewMessageModal from "@/components/communications/NewMessageModal";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";

// Shadcn/ui Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  params: { id: string };
}

const SingleStudentPage = ({ params }: PageProps) => {
  const studentId = params.id;
  return <StudentDetailContent studentId={studentId} />;
};

function StudentDetailContent({ studentId }: { studentId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { setItems } = useBreadcrumb();
  const breadcrumbSetRef = useRef(false);
  
  // Check if user is registrar
  const isRegistrar = user?.role?.toUpperCase() === 'REGISTRAR';
  const isTeacher = user?.role?.toUpperCase() === 'TEACHER';

  // Fetch student data first
  const { data: student, isLoading, error } = useQuery({
    queryKey: queryKeys.students.detail(studentId),
    queryFn: async () => {
      const response = await studentsAPI.getById(studentId);
      return response.data;
    },
  });

  // Set breadcrumbs with student name - only once
  useEffect(() => {
    // Get student data from query cache
    const cachedStudent = queryClient.getQueryData(["student", studentId]);
    const studentUser = (cachedStudent as any)?.user;
    
    if (!breadcrumbSetRef.current && studentUser?.name) {
      breadcrumbSetRef.current = true;
      
      // Check if user is admin to make Students link clickable
      const isAdmin = ((user?.role === 'ADMIN' || user?.role === 'IT_MANAGER') || user?.role === 'IT_MANAGER') || user?.role === 'SUPER_ADMIN';
      
      setItems([
        { label: "Dashboard", href: "/dashboard", isCurrent: false },
        { label: "List", isCurrent: false },
        { label: "Students", href: isAdmin ? "/list/students" : undefined, isCurrent: false },
        { label: studentUser.name, isCurrent: true },
      ]);
    }
    
    // Clear breadcrumbs when navigating away
    return () => setItems(null);
  }, [studentId, setItems, queryClient, user, student]);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "MALE",
    address: "",
    studentCode: "",
    rollNumber: "",
    grade: "",
    section: ""
  });

  // Fetch attendance data
  const { data: attendanceData } = useQuery({
    queryKey: queryKeys.students.attendance(studentId),
    queryFn: async () => {
      // First get the student to find the userId
      const studentResponse = await studentsAPI.getById(studentId);
      const studentData = studentResponse.data;
      const userId = studentData?.user?.id || studentId;
      
      // Use the attendance endpoint which returns both records and summary
      const response = await attendanceAPI.getStudentAttendance(userId);
      return response.data;
    },
    enabled: !!studentId,
  });

  // Fetch fee data
  const { data: feeData } = useQuery({
    queryKey: queryKeys.students.fees(studentId, user?.schoolId),
    queryFn: async () => {
      const schoolId = user?.schoolId || '';
      // First get the student to find the userId
      const studentResponse = await studentsAPI.getById(studentId);
      const studentData = studentResponse.data;
      const userId = studentData?.user?.id || studentId;
      
      // Get fees for ALL academic years (no academicYearId filter)
      const response = await financeAPI.listStudentFees({ 
        studentId: userId, 
        schoolId,
        limit: 100,
      });
      return response.data;
    },
    enabled: !!studentId && !!user?.schoolId && !isTeacher,
  });

  // Fetch academic years to map IDs to names
  const { data: academicYears } = useQuery({
    queryKey: queryKeys.academicYears.list(user?.schoolId),
    queryFn: async () => {
      const response = await academicYearsAPI.getAll({ schoolId: user?.schoolId });
      return response.data;
    },
    enabled: !!user?.schoolId,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => studentsAPI.update(studentId, data),
    onSuccess: () => {
      toast.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
      setEditDialogOpen(false);
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update student");
      setIsEditing(false);
    },
  });

  const handleEditClick = () => {
    router.push(`/list/students/${studentId}/edit`);
  };

  const handleUpdateStudent = async () => {
    setIsEditing(true);
    
    // Prepare the update data
    const updateData: any = {
      phone: editForm.phone,
      gender: editForm.gender,
      address: editForm.address,
      studentCode: editForm.studentCode,
      rollNumber: editForm.rollNumber,
    };

    // Update user info separately if name changed
    if (editForm.full_name !== (student?.user?.name || "")) {
      updateData.name = editForm.full_name;
    }
    
    // Note: Email update might require special handling
    // For now, we'll just update the student profile
    
    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading student data</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{(error as any)?.message || "Student not found"}</p>
        </div>
      </div>
    );
  }

  const userData = student.user || {};

  // Calculate attendance rate from fetched data
  // Backend returns data at root level (from getStudentAttendance endpoint)
  const attendanceRecords = attendanceData?.records || [];
  
  // Transform records to match the expected format (session.date -> date, remark -> remarks)
  const transformedAttendanceHistory = attendanceRecords.map((record: any) => ({
    date: record.session?.date || record.createdAt,
    status: record.status,
    remarks: record.remark || record.remarks,
  }));
  
  // Use pre-calculated attendance percentage from backend
  // Check both root level (from attendance endpoint) and summary object
  const calculatedAttendanceRate = 
    attendanceData?.attendancePercentage || 
    attendanceData?.summary?.attendancePercentage || 
    0;

  // Calculate fee summary
  // Backend returns: totalFee, paidAmount, remainingBalance (not amount, amountPaid)
  const rawFees = feeData?.data || feeData || [];
  
  // Transform fees to include academic year name
  const fees = rawFees.map((fee: any) => {
    const yearName = academicYears?.find((y: any) => y.id === fee.academicYearId || y.id === fee.schoolAcademicYearId)?.name;
    return {
      ...fee,
      academicYear: yearName || fee.academicYear || fee.schoolAcademicYear?.name || '-'
    };
  });

  const totalFeeAmount = fees.reduce((sum: number, f: any) => sum + (f.totalFee || f.finalAmount || 0), 0);
  const totalPaidAmount = fees.reduce((sum: number, f: any) => sum + (f.paidAmount || 0), 0);
  const totalOutstanding = fees.reduce((sum: number, f: any) => sum + (f.remainingBalance || 0), 0);

  const userDetail: UserDetailData = {
    id: student.id,
    name: userData.name || "Unknown Student",
    email: userData.email || "",
    role: "STUDENT",
    avatarUrl: userData.img || userData.avatarUrl,
    isActive: userData.isActive ?? true,
    createdAt: userData.createdAt || student.createdAt,
    lastLogin: student.lastLogin || userData.lastLoginAt || userData.lastLogin,
    username: userData.email,
    phone: student.phone || userData.phone,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth || student.birthday,
    address: student.address || userData.address,
    studentCode: student.studentCode,
    rollNumber: student.rollNumber,
    grade: student.className || student.class?.name,
    section: student.section || student.sectionName,
    classTeacher: student.classTeacher || student.class?.homeroomTeacher?.name,
    enrollmentYear: student.enrollmentYear || student.admissionDate,
    enrollmentStatus: student.enrollmentStatus,
    attendanceRate: calculatedAttendanceRate || student.attendanceRate,
    attendanceHistory: transformedAttendanceHistory.length > 0 ? transformedAttendanceHistory : student.attendanceHistory,
    feeSummary: {
      totalAmount: totalFeeAmount,
      paidAmount: totalPaidAmount,
      outstandingAmount: totalOutstanding,
      fees: fees,
    },
    activityLog: student.activityLog,
    documents: student.documents,
    parents: student.parents || [],
  };

  const handleSendMessage = () => {
    setShowNewMessageModal(true);
  };

  const handleCreateMessage = async (recipientStudentId: string, subject: string, message: string) => {
    setIsSendingMessage(true);
    try {
      await communicationsAPI.create({ studentId: recipientStudentId, subject, message });
      toast.success("Message sent");
      setShowNewMessageModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="px-2 sm:px-4 md:px-6">
      <UserDetailPage
        user={userDetail}
        backUrl="/list/students"
        backLabel="Students"
        viewerRole={user?.role}
        onEdit={isRegistrar ? handleEditClick : undefined}
        onResetPassword={isRegistrar ? () => {} : undefined}
        onDeactivate={isRegistrar ? () => {} : undefined}
        onSendMessage={handleSendMessage}
      />

      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onSubmit={handleCreateMessage}
        isSending={isSendingMessage}
        preselectedStudentId={userData.id || studentId}
        preselectedStudentName={userData.name || userDetail.name}
        isParent={user?.role === "PARENT"}
        isTeacher={user?.role === "TEACHER"}
      />

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Enter full name"
                className="text-sm dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                value={editForm.email}
                disabled
                className="bg-gray-50 dark:bg-slate-800 text-sm dark:border-slate-700"
                placeholder="Email cannot be changed"
              />
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone</label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Enter phone number"
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="gender" className="text-sm font-medium">Gender</label>
              <Select
                value={editForm.gender}
                onValueChange={(value) => setEditForm({ ...editForm, gender: value })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="address" className="text-sm font-medium">Address</label>
            <Input
              id="address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="Enter address"
              className="text-sm"
            />
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label htmlFor="studentCode" className="text-sm font-medium">Student Code</label>
              <Input
                id="studentCode"
                value={editForm.studentCode}
                onChange={(e) => setEditForm({ ...editForm, studentCode: e.target.value })}
                placeholder="Enter student code"
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="rollNumber" className="text-sm font-medium">Roll Number</label>
              <Input
                id="rollNumber"
                value={editForm.rollNumber}
                onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                placeholder="Enter roll number"
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label htmlFor="grade" className="text-sm font-medium">Grade</label>
              <Input
                id="grade"
                value={editForm.grade}
                onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                placeholder="Enter grade"
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="section" className="text-sm font-medium">Section</label>
              <Input
                id="section"
                value={editForm.section}
                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                placeholder="Enter section"
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStudent} disabled={isEditing}>
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SingleStudentPage;
