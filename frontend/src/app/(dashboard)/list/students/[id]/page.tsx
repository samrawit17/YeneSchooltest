"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { studentsAPI, attendanceAPI, financeAPI, academicYearsAPI } from "@/lib/api";
import { communicationsAPI } from "@/lib/api/communications";
import { queryKeys } from "@/lib/query-keys";
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Edit2,
  GraduationCap,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  User,
  Users,
} from "lucide-react";
import UserAvatarUpload from "@/components/UserAvatarUpload";
import NewMessageModal from "@/components/communications/NewMessageModal";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { resolveAssetUrl } from "@/lib/asset-url";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

const formatDate = (date?: string | null) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatShortDate = (date?: string | null) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatWeekday = (date?: string | null) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", { weekday: "long" });
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "S";

const formatMoney = (amount: number) => Math.round(amount).toLocaleString();

const normalizeFeeStatus = (balance: number, paid: number, due: number) => {
  if (due <= 0) return "Not generated";
  if (balance <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
};

const getPeriodStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "text-emerald-700 dark:text-emerald-300";
    case "partial":
      return "text-amber-700 dark:text-amber-300";
    case "unpaid":
      return "text-red-700 dark:text-red-300";
    default:
      return "text-slate-500 dark:text-slate-400";
  }
};

const getAttendanceStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "present":
      return "text-emerald-700 dark:text-emerald-300";
    case "late":
      return "text-amber-700 dark:text-amber-300";
    case "absent":
      return "text-red-700 dark:text-red-300";
    default:
      return "text-slate-500 dark:text-slate-400";
  }
};

const toDateKey = (date?: string | Date | null) => {
  if (!date) return "";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

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
  
  // Staff who can maintain student records.
  const currentRole = String(user?.role || '').toUpperCase();
  const isRegistrar = currentRole === 'REGISTRAR';
  const isTeacher = currentRole === 'TEACHER';
  const canEditStudent = ['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);
  const canUploadPhoto = ['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);

  const { data: activeAcademicYear } = useQuery({
    queryKey: queryKeys.academicYears.active(user?.schoolId),
    queryFn: async () => {
      const response = await academicYearsAPI.getActive({ schoolId: user?.schoolId });
      return response.data;
    },
    enabled: !!user?.schoolId,
  });

  const { data: curriculumInfo } = useQuery({
    queryKey: ["student-finance-curriculum", user?.schoolId, activeAcademicYear?.id],
    queryFn: async () => {
      const response = await financeAPI.getCurriculumInfo(user?.schoolId || "", activeAcademicYear?.id || "");
      return response.data;
    },
    enabled: !!user?.schoolId && !!activeAcademicYear?.id && !isTeacher,
  });

  const currentTermId = (() => {
    const terms = curriculumInfo?.terms || [];
    const today = new Date();
    const current = terms.find((term: any) => {
      if (!term.startDate || !term.endDate) return false;
      const start = new Date(term.startDate);
      const end = new Date(term.endDate);
      return today >= start && today <= end;
    });
    return current?.id;
  })();

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
      const isAdmin = ['ADMIN', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);
      
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
    queryKey: [...queryKeys.students.fees(studentId, user?.schoolId), activeAcademicYear?.id],
    queryFn: async () => {
      const schoolId = user?.schoolId || '';
      // First get the student to find the userId
      const studentResponse = await studentsAPI.getById(studentId);
      const studentData = studentResponse.data;
      const userId = studentData?.user?.id || studentId;
      
      const response = await financeAPI.getStudentFees(
        userId,
        schoolId,
        activeAcademicYear?.id,
      );
      return response.data;
    },
    enabled: !!studentId && !!user?.schoolId && !!activeAcademicYear?.id && !isTeacher,
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
  const studentUserId = userData.id || student.userId;

  // Calculate attendance rate from fetched data
  // Backend returns data at root level (from getStudentAttendance endpoint)
  const attendanceRecords = attendanceData?.records || [];
  
  // Transform records to match the expected format (session.date -> date, remark -> remarks)
  const transformedAttendanceHistory = attendanceRecords.map((record: any) => ({
    date: record.session?.date || record.createdAt,
    status: record.status,
    remarks: record.remark || record.remarks,
  }));
  const attendanceRecordsForTable = (transformedAttendanceHistory.length > 0
    ? transformedAttendanceHistory
    : student.attendanceHistory || []
  )
    .filter((record: any) => record?.date)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const attendanceByDate = new Map(
    attendanceRecordsForTable.map((record: any) => [toDateKey(record.date), record]),
  );
  const today = new Date();
  const todayAttendance = attendanceByDate.get(toDateKey(today)) as any;
  const todayAttendanceRow = {
    date: today,
    status: todayAttendance?.status || "No record",
    remarks: todayAttendance?.remarks || "Attendance not submitted",
  };
  
  // Use pre-calculated attendance percentage from backend
  // Check both root level (from attendance endpoint) and summary object
  const calculatedAttendanceRate = 
    attendanceData?.attendancePercentage || 
    attendanceData?.summary?.attendancePercentage || 
    0;

  const feeItems = Array.isArray(feeData?.feeItems) ? feeData.feeItems : [];
  const terms = Array.isArray(feeData?.terms)
    ? feeData.terms
    : Array.isArray(curriculumInfo?.terms)
      ? curriculumInfo.terms
      : [];
  const installmentCount = terms.length > 0 ? terms.length : 1;
  const payments = Array.isArray(feeData?.payments) ? feeData.payments : [];
  const periodFeeRows = terms.map((term: any, index: number) => {
    const termId = String(term.id || term.termId || term.name || index);
    const termName = String(term.name || term.period || `Period ${index + 1}`);
    let due = 0;

    for (const fee of feeItems) {
      const amount = Number(fee.amount) || 0;
      if (fee.isYearWide) {
        due += amount / installmentCount;
      } else if (fee.termId === termId || fee.termName === termName) {
        due += amount;
      }
    }

    const directPaid = payments
      .filter((payment: any) => payment.termId === termId || payment.termName === termName)
      .reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);

    const fallbackPaid = directPaid > 0
      ? directPaid
      : feeItems
          .filter((fee: any) => fee.isYearWide && !payments.some((payment: any) => payment.termId || payment.termName))
          .reduce((sum: number, fee: any) => {
            const perPeriodAmount = (Number(fee.amount) || 0) / installmentCount;
            const paidBeforeThisPeriod = perPeriodAmount * index;
            const remainingPaid = Math.max(0, (Number(fee.paidAmount) || 0) - paidBeforeThisPeriod);
            return sum + Math.min(perPeriodAmount, remainingPaid);
          }, 0);

    const roundedDue = Math.round(due * 100) / 100;
    const roundedPaid = Math.round(fallbackPaid * 100) / 100;
    const balance = Math.max(0, Math.round((roundedDue - roundedPaid) * 100) / 100);

    return {
      id: termId,
      name: termName,
      due: roundedDue,
      paid: roundedPaid,
      balance,
      isCurrent: currentTermId === term.id,
      status: normalizeFeeStatus(balance, roundedPaid, roundedDue),
    };
  });

  const feeRows = periodFeeRows.length > 0
    ? periodFeeRows
    : feeItems.map((fee: any) => {
        const due = Number(fee.amount) || 0;
        const paid = Number(fee.paidAmount) || 0;
        const balance = Number(fee.balance) || Math.max(0, due - paid);
        return {
          id: fee.id,
          name: fee.termName || fee.name || "Whole Academic Year",
          due,
          paid,
          balance,
          isCurrent: false,
          status: normalizeFeeStatus(balance, paid, due),
        };
      });

  const totalFeeAmount = feeData?.summary?.totalFees || 0;
  const totalPaidAmount = feeData?.summary?.totalPaid || 0;
  const totalOutstanding = feeData?.summary?.totalBalance || 0;
  const hasGeneratedFees = feeItems.length > 0;

  const studentName = userData.name || "Unknown Student";
  const avatarUrl = userData.img || userData.avatarUrl;
  const username = userData.username || student.studentCode || "N/A";
  const phone = student.phone || userData.phone || "N/A";
  const address = student.address || userData.address || "N/A";
  const gender = student.gender || "N/A";
  const dateOfBirth = student.dateOfBirth || student.birthday;
  const className = student.className || student.class?.name || "N/A";
  const section = student.section || student.sectionName || "N/A";
  const homeroomTeacher = student.classTeacher || student.class?.homeroomTeacher?.name || "N/A";
  const enrollmentStatus = student.enrollmentStatus || "N/A";
  const lastLogin = student.lastLogin || userData.lastLoginAt || userData.lastLogin;
  const isActive = userData.isActive ?? true;
  const parents = student.parents || [];
  const attendanceRate = Number(calculatedAttendanceRate || student.attendanceRate || 0);
  const feeStatus = hasGeneratedFees
    ? normalizeFeeStatus(totalOutstanding, totalPaidAmount, totalFeeAmount)
    : "Not generated";

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
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="w-full space-y-6">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="flex flex-col gap-5 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-24 w-24 border-4 border-slate-100 shadow-sm dark:border-slate-800">
                  {avatarUrl ? (
                    <AvatarImage src={resolveAssetUrl(avatarUrl) || avatarUrl} alt={studentName} />
                  ) : (
                    <AvatarFallback className="text-2xl font-bold">{getInitials(studentName)}</AvatarFallback>
                  )}
                </Avatar>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{studentName}</h1>
                    <Badge className={isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{enrollmentStatus}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{username}</span>
                    <span>{className}{section !== "N/A" ? ` - ${section}` : ""}</span>
                    <span>Roll {student.rollNumber || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUploadPhoto && studentUserId ? (
                  <UserAvatarUpload
                    userId={studentUserId}
                    currentAvatarUrl={avatarUrl}
                    onUploaded={() => {
                      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
                    }}
                  />
                ) : null}
                {canEditStudent ? (
                  <Button variant="outline" size="sm" onClick={handleEditClick}>
                    <Edit2 className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                ) : null}
                <Button size="sm" onClick={handleSendMessage} style={{ backgroundColor: "#e35336" }}>
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryItem icon={GraduationCap} label="Class" value={`${className}${section !== "N/A" ? ` - ${section}` : ""}`} />
              <SummaryItem icon={User} label="Homeroom" value={homeroomTeacher} />
              <SummaryItem icon={Activity} label="Attendance" value={`${attendanceRate}%`} />
              <SummaryItem icon={CreditCard} label="Fee Status" value={feeStatus} />
              <SummaryItem icon={Clock} label="Last login" value={formatDate(lastLogin)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_1fr]">
          <div className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">Student Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Shield} label="Username" value={username} />
                <InfoRow icon={Phone} label="Phone" value={phone} />
                <InfoRow icon={User} label="Gender" value={gender} />
                <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(dateOfBirth)} />
                <InfoRow icon={MapPin} label="Address" value={address} />
                <InfoRow icon={Calendar} label="Enrollment" value={student.enrollmentYear || student.admissionDate || "N/A"} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">Parent / Guardian</CardTitle>
              </CardHeader>
              <CardContent>
                {parents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                    <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No parent linked</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parents.map((parent: any, index: number) => (
                      <div key={`${parent.id || index}`} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                        <p className="font-semibold text-slate-900 dark:text-white">{parent.name || "Unknown Parent"}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{parent.phone || "No phone"}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {parent.relation ? <Badge variant="outline">{parent.relation}</Badge> : null}
                          {parent.isPrimary ? <Badge variant="outline">Primary</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">Attendance Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                    <span>Day</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span>Note</span>
                  </div>
                  {[todayAttendanceRow].map((record: any, index: number) => (
                    <div
                      key={`${toDateKey(record.date)}-${index}`}
                      className="grid grid-cols-[1.1fr_0.9fr_0.8fr_1fr] gap-2 border-t border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                    >
                      <span className="truncate font-medium text-slate-800 dark:text-slate-100">{formatWeekday(record.date)}</span>
                      <span className="truncate text-slate-500 dark:text-slate-400">{formatShortDate(record.date)}</span>
                      <span className={`truncate font-semibold ${getAttendanceStatusClass(record.status || "")}`}>
                        {record.status}
                      </span>
                      <span className="truncate text-slate-500 dark:text-slate-400">{record.remarks}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!isTeacher ? (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-base">Fee Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <Metric label="Total" value={formatMoney(totalFeeAmount)} />
                    <Metric label="Paid" value={formatMoney(totalPaidAmount)} />
                    <Metric label="Balance" value={formatMoney(totalOutstanding)} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {feeRows.map((period: any) => (
                      <PeriodFeeRow key={period.id} period={period} />
                    ))}
                    {feeRows.length === 0 ? (
                      <p className="py-4 text-sm text-slate-500">
                        No curriculum periods found for this academic year.
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 2xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Academic Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoRow icon={BookOpen} label="Academic Year" value={activeAcademicYear?.name || student.enrollmentYear || "N/A"} />
                <InfoRow icon={Award} label="Class Teacher" value={homeroomTeacher} />
                <InfoRow icon={CheckCircle} label="Status" value={enrollmentStatus} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onSubmit={handleCreateMessage}
        isSending={isSendingMessage}
        preselectedStudentId={userData.id || studentId}
        preselectedStudentName={userData.name || studentName}
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

function SummaryItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 truncate text-lg font-bold text-slate-900 dark:text-white">{value || "N/A"}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">{value || "0"}</p>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
      <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{label}</span>
      <span className="shrink-0 font-semibold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function PeriodFeeRow({ period }: { period: { name: string; due: number; paid: number; balance: number; status: string; isCurrent?: boolean } }) {
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{period.name}</span>
            {period.isCurrent ? (
              <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                Current
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Due {formatMoney(period.due)} • Paid {formatMoney(period.paid)} • Balance {formatMoney(period.balance)}
          </p>
        </div>
        <span className={`shrink-0 font-semibold ${getPeriodStatusClass(period.status)}`}>
          {period.status}
        </span>
      </div>
    </div>
  );
}

export default SingleStudentPage;
