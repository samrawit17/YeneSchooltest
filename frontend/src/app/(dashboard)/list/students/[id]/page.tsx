"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { studentsAPI, attendanceAPI, financeAPI, academicYearsAPI } from "@/lib/api";
import { communicationsAPI } from "@/lib/api/communications";
import { queryKeys } from "@/lib/query-keys";
import { formatStudentDisplayCode } from "@/lib/student-code";
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Edit2,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import UserAvatarUpload from "@/components/UserAvatarUpload";
import NewMessageModal from "@/components/communications/NewMessageModal";
import StudentDocumentViewer, { StudentDocumentRecord } from "@/components/students/StudentDocumentViewer";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const requiredStudentDocuments = [
  { type: "birth_certificate", title: "Birth Certificate" },
  { type: "parent_id", title: "Parent ID" },
  { type: "previous_transcript", title: "Previous School Transcript" },
  { type: "transfer_letter", title: "Transfer Letter" },
  { type: "passport_photo", title: "Passport Photo" },
  { type: "medical_record", title: "Medical Record" },
];

const extractGradeNumber = (value?: string | number | null) => {
  if (typeof value === "number") return value;
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getRequiredStudentDocuments = (className?: string | number | null) => {
  const grade = extractGradeNumber(className);
  const nationalDocuments =
    grade === 7
      ? [{ type: "grade_6_national_certificate", title: "Grade 6 National Certificate" }]
      : grade === 9
        ? [{ type: "grade_8_national_certificate", title: "Grade 8 National Certificate" }]
        : [];

  return [...requiredStudentDocuments, ...nationalDocuments];
};

const parseStudentDocuments = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseJsonObject = (raw: any): Record<string, any> | null => {
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
  const { t } = useTranslations<any>("students");
  const translateFeeStatus = (status: string): string => {
    switch (status) {
      case "Not generated": return t.fee.notGenerated;
      case "Paid": return t.fee.paid;
      case "Partial": return t.fee.partial;
      case "Unpaid": return t.fee.unpaid;
      default: return status;
    }
  };
  const { user } = useAuth();
  const { setItems } = useBreadcrumb();
  const breadcrumbSetRef = useRef(false);
  
  // Staff who can maintain student records.
  const currentRole = String(user?.role || '').toUpperCase();
  const isRegistrar = currentRole === 'REGISTRAR';
  const isTeacher = currentRole === 'TEACHER';
  const isFinance = currentRole === 'FINANCE';
  const canEditStudent = ['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);
  const canUploadPhoto = ['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN'].includes(currentRole);
  const canManageDocuments = ['ADMIN', 'REGISTRAR'].includes(currentRole);

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
      const response = await financeAPI.getCurriculumInfo(
        user?.schoolId || "",
        activeAcademicYear?.id || "",
        { skipAuthErrorRedirect: true },
      );
      return response.data;
    },
    enabled: !!user?.schoolId && !!activeAcademicYear?.id && !isTeacher && !isRegistrar,
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
  const [customDocumentTitle, setCustomDocumentTitle] = useState("");
  const [customDocumentNote, setCustomDocumentNote] = useState("");
  const [viewingDocument, setViewingDocument] = useState<StudentDocumentRecord | null>(null);
  
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
    enabled: !!studentId && !isFinance,
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
        undefined,
        { skipAuthErrorRedirect: true },
      );
      return response.data;
    },
    enabled: !!studentId && !!user?.schoolId && !!activeAcademicYear?.id && !isTeacher,
    retry: false,
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
      toast.success(t.studentUpdated);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
      setEditDialogOpen(false);
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t.updateFailed);
      setIsEditing(false);
    },
  });

  const documentMutation = useMutation({
    mutationFn: (documents: any[]) => studentsAPI.uploadDocuments(studentUserId, documents),
    onSuccess: (_data, documents) => {
      const status = documents?.[0]?.status;
      toast.success(status === "NOT_REQUIRED" ? "Document marked not required" : "Document submitted");
      setCustomDocumentTitle("");
      setCustomDocumentNote("");
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit document");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentKey: string) => studentsAPI.deleteDocument(studentUserId, documentKey),
    onSuccess: () => {
      toast.success("Document deleted");
      setViewingDocument(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete document");
    },
  });

  const getDocumentKey = (document: any) => String(document?.id || document?.type || document?.title || document?.name || "");

  const handleDeleteDocument = (document: any) => {
    const documentKey = getDocumentKey(document);
    if (!documentKey) {
      toast.error("Cannot identify this document");
      return;
    }
    deleteDocumentMutation.mutate(documentKey);
  };

  const handleMarkDocumentNotRequired = (document: { type: string; title: string }) => {
    if (!studentUserId) {
      toast.error("Student account not found");
      return;
    }
    documentMutation.mutate([
      {
        type: document.type,
        title: document.title,
        category: "student_registration",
        status: "NOT_REQUIRED",
        submitted: false,
        notRequired: true,
        description: "Marked not required by admin",
      },
    ]);
  };

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
          <p className="text-gray-600 dark:text-gray-400 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{t.loadError}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{(error as any)?.message || t.notFound}</p>
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
    status: todayAttendance?.status || t.attendance.noRecord,
    remarks: todayAttendance?.remarks || t.attendance.notSubmitted,
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
  const unassignedFeeItems = feeItems.filter((fee: any) => !fee.isYearWide && !fee.termId);
  const shouldDistributeUnassignedFees =
    terms.length > 0 &&
    unassignedFeeItems.length > terms.length &&
    unassignedFeeItems.length === feeItems.length;

  const periodFeeRows = terms.map((term: any, index: number) => {
    const termId = String(term.id || term.termId || term.name || index);
    const termName = String(term.name || term.period || `Period ${index + 1}`);
    const distributedFees = shouldDistributeUnassignedFees
      ? unassignedFeeItems.filter((_: any, feeIndex: number) => {
          const targetIndex = Math.floor((feeIndex * terms.length) / unassignedFeeItems.length);
          return targetIndex === index;
        })
      : [];
    let due = 0;

    for (const fee of feeItems) {
      const amount = Number(fee.amount) || 0;
      if (fee.isYearWide) {
        due += amount / installmentCount;
      } else if (fee.termId === termId || fee.termName === termName) {
        due += amount;
      }
    }
    due += distributedFees.reduce((sum: number, fee: any) => sum + (Number(fee.amount) || 0), 0);

    const directPaid = payments
      .filter((payment: any) => payment.termId === termId || payment.termName === termName)
      .reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);

    const fallbackPaid = directPaid > 0
      ? directPaid
      : distributedFees.length > 0
        ? distributedFees.reduce((sum: number, fee: any) => sum + (Number(fee.paidAmount) || 0), 0)
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

  const studentName = userData.name || t.unknownStudent;
  const avatarUrl = userData.img || userData.avatarUrl;
  const username = userData.username || student.studentCode || t.nA;
  const studentCode = student.studentCode || student.studentId || t.nA;
  const displayStudentCode = formatStudentDisplayCode(
    studentCode,
    student.academicYearDisplay || student.enrollmentYear || student.academicYear,
  );
  const faydaNumber = student.faydaNumber || t.nA;
  const phone = student.phone || userData.phone || t.nA;
  const motherName = student.motherName || t.nA;
  const motherPhone = student.motherPhone || t.nA;
  const address = student.address || userData.address || t.nA;
  const gender = student.gender || t.nA;
  const nationality = student.nationality || t.nA;
  const dateOfBirth = student.dateOfBirth || student.birthday;
  const emergencyContact = parseJsonObject(student.emergencyContact);
  const emergencyContactLabel = emergencyContact
    ? [emergencyContact.name, emergencyContact.phone, emergencyContact.relationship || emergencyContact.relation].filter(Boolean).join(" - ")
    : t.nA;
  const medicalInfo = parseJsonObject(student.medicalInfo);
  const medicalInfoLabel = medicalInfo
    ? Object.entries(medicalInfo)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
        .join(", ")
    : student.medicalInfo || t.nA;
  const className = student.className || student.class?.name || t.nA;
  const gradeNumber = extractGradeNumber(className);
  const stream = [11, 12].includes(Number(gradeNumber)) && student.stream
    ? String(student.stream).toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
    : t.nA;
  const section = student.section || student.sectionName || t.nA;
  const homeroomTeacher = student.classTeacher || student.class?.homeroomTeacher?.name || t.nA;
  const enrollmentStatus = student.enrollmentStatus || t.nA;
  const lastLogin = student.lastLogin || userData.lastLoginAt || userData.lastLogin;
  const isActive = userData.isActive ?? true;
  const parents = student.parents || [];
  const documents = parseStudentDocuments(student.documents);
  const documentTypes = new Set(documents.map((doc: any) => String(doc.type || doc.title || doc.name || "").toLowerCase()));
  const documentsByType = new Map(
    documents.map((doc: any) => [String(doc.type || doc.title || doc.name || "").toLowerCase(), doc]),
  );
  const requiredDocuments = getRequiredStudentDocuments(className);
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
      toast.success(t.messageSent);
      setShowNewMessageModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t.messageFailed);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSubmitDocument = (document: { type: string; title: string }, note?: string) => {
    if (!studentUserId) {
      toast.error("Student account not found");
      return;
    }
    documentMutation.mutate([
      {
        type: document.type,
        title: document.title,
        category: "student_registration",
        status: "SUBMITTED",
        submitted: true,
        description: note?.trim() || "Submitted physically",
      },
    ]);
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
                      {isActive ? t.active : t.inactive}
                    </Badge>
                    <Badge variant="outline">{enrollmentStatus}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{displayStudentCode}</span>
                    {username !== displayStudentCode ? <span>Login: {username}</span> : null}
                    <span>{className}{section !== t.nA ? ` - ${section}` : ""}</span>
                    <span>{t.roll.replace("{number}", student.rollNumber || t.nA)}</span>
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
                    {t.edit}
                  </Button>
                ) : null}
                <Button size="sm" onClick={handleSendMessage} style={{ backgroundColor: "#e35336" }}>
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  {t.message}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryItem icon={GraduationCap} label={t.summary.class} value={`${className}${section !== t.nA ? ` - ${section}` : ""}`} />
              <SummaryItem icon={User} label={t.summary.homeroom} value={homeroomTeacher} />
              <SummaryItem icon={Activity} label={t.summary.attendance} value={isFinance ? t.nA : `${attendanceRate}%`} />
               <SummaryItem icon={CreditCard} label={t.summary.feeStatus} value={translateFeeStatus(feeStatus)} />
              <SummaryItem icon={Clock} label={t.summary.lastLogin} value={formatDate(lastLogin)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_1fr]">
          <div className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">{t.info.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Shield} label={t.info.username} value={username} />
                <InfoRow icon={Shield} label="Student Code" value={displayStudentCode} />
                <InfoRow icon={Shield} label="Fayda Number (FAN)" value={faydaNumber} />
                <InfoRow icon={Phone} label={t.info.phone} value={phone} />
                <InfoRow icon={User} label="Mother's Name" value={motherName} />
                <InfoRow icon={Phone} label="Mother's Phone" value={motherPhone} />
                <InfoRow icon={User} label={t.info.gender} value={gender} />
                <InfoRow icon={User} label="Nationality" value={nationality} />
                <InfoRow icon={Calendar} label={t.info.dateOfBirth} value={formatDate(dateOfBirth)} />
                <InfoRow icon={MapPin} label={t.info.address} value={address} />
                <InfoRow icon={Phone} label="Emergency Contact" value={emergencyContactLabel} />
                <InfoRow icon={Shield} label="Medical Info" value={medicalInfoLabel} />
                <InfoRow icon={Calendar} label={t.info.enrollment} value={student.enrollmentYear || student.admissionDate || t.nA} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">{t.parent.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {parents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                    <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">{t.parent.noParent}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parents.map((parent: any, index: number) => (
                      <div key={`${parent.id || index}`} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                        <p className="font-semibold text-slate-900 dark:text-white">{parent.name || t.parent.unknown}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{parent.phone || t.parent.noPhone}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {parent.relation ? <Badge variant="outline">{parent.relation}</Badge> : null}
                          {parent.isPrimary ? <Badge variant="outline">{t.parent.primary}</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {canManageDocuments ? (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-slate-500" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {requiredDocuments.map((document) => {
                      const submittedDocument = documentsByType.get(document.type.toLowerCase()) || documentsByType.get(document.title.toLowerCase()) || null;
                      const notRequired = String(submittedDocument?.status || "").toUpperCase() === "NOT_REQUIRED" || submittedDocument?.notRequired === true;
                      const submitted = !!submittedDocument && !notRequired;
                      if (notRequired) return null;
                      return (
                        <div key={document.type} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{document.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {notRequired ? "Not required" : submitted ? "Submitted" : "Waiting for physical document"}
                            </p>
                          </div>
                          <DocumentActionsMenu
                            isBusy={documentMutation.isPending || deleteDocumentMutation.isPending}
                            onView={submitted ? () => setViewingDocument(submittedDocument || { ...document, status: "SUBMITTED", submitted: true }) : undefined}
                            onMark={!submitted && !notRequired ? () => handleSubmitDocument(document) : undefined}
                            onNotRequired={!submitted && !notRequired ? () => handleMarkDocumentNotRequired(document) : undefined}
                            onDelete={submitted ? () => handleDeleteDocument(submittedDocument || document) : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Add custom document</p>
                    <div className="space-y-2">
                      <Input
                        value={customDocumentTitle}
                        onChange={(event) => setCustomDocumentTitle(event.target.value)}
                        placeholder="Document name"
                      />
                      <Input
                        value={customDocumentNote}
                        onChange={(event) => setCustomDocumentNote(event.target.value)}
                        placeholder="Note, e.g. original seen"
                      />
                      <Button
                        size="sm"
                        disabled={documentMutation.isPending || !customDocumentTitle.trim()}
                        onClick={() => handleSubmitDocument({
                          type: customDocumentTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
                          title: customDocumentTitle.trim(),
                        }, customDocumentNote)}
                      >
                        {documentMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                        Mark Submitted
                      </Button>
                    </div>
                  </div>
                  {documents.length > 0 ? (
                    <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                      <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Submitted documents</p>
                      <div className="space-y-2">
                        {documents.filter((document: any) => String(document?.status || "").toUpperCase() !== "NOT_REQUIRED" && document?.notRequired !== true).map((document: any, index: number) => (
                          <div key={`${getDocumentKey(document)}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{document.title || document.name || document.type || "Document"}</p>
                              <p className="truncate text-xs text-slate-500">{document.note || document.description || document.status || "Submitted"}</p>
                            </div>
                            <DocumentActionsMenu
                              isBusy={deleteDocumentMutation.isPending}
                              onView={() => setViewingDocument(document)}
                              onDelete={() => handleDeleteDocument(document)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base">{t.attendance.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {isFinance ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Attendance details are not available to finance accounts.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                      <span>{t.attendance.day}</span>
                      <span>{t.attendance.date}</span>
                      <span>{t.attendance.status}</span>
                      <span>{t.attendance.note}</span>
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
                )}
              </CardContent>
            </Card>

            {!isTeacher ? (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-base">{t.fee.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <Metric label={t.fee.total} value={formatMoney(totalFeeAmount)} />
                    <Metric label={t.fee.paid} value={formatMoney(totalPaidAmount)} />
                    <Metric label={t.fee.balance} value={formatMoney(totalOutstanding)} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {feeRows.map((period: any) => (
                      <PeriodFeeRow key={period.id} period={period} />
                    ))}
                    {feeRows.length === 0 ? (
                      <p className="py-4 text-sm text-slate-500">
                        {t.fee.noPeriods}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 2xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{t.academic.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoRow icon={BookOpen} label={t.academic.year} value={activeAcademicYear?.name || student.enrollmentYear || t.nA} />
                <InfoRow icon={BookOpen} label="Stream" value={stream} />
                <InfoRow icon={Award} label={t.academic.classTeacher} value={homeroomTeacher} />
                <InfoRow icon={CheckCircle} label={t.academic.status} value={enrollmentStatus} />
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

      <StudentDocumentViewer
        document={viewingDocument}
        open={Boolean(viewingDocument)}
        onOpenChange={(open) => {
          if (!open) setViewingDocument(null);
        }}
      />

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.editDialog.title}</DialogTitle>
            <DialogDescription>
              {t.editDialog.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="full_name" className="text-sm font-medium">{t.editDialog.fullName}</label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder={t.editDialog.fullNamePlaceholder}
                className="text-sm dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">{t.editDialog.email}</label>
              <Input
                id="email"
                value={editForm.email}
                disabled
                className="bg-gray-50 dark:bg-slate-800 text-sm dark:border-slate-700"
                placeholder={t.editDialog.emailDisabled}
              />
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium">{t.editDialog.phone}</label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder={t.editDialog.phonePlaceholder}
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="gender" className="text-sm font-medium">{t.editDialog.gender}</label>
              <Select
                value={editForm.gender}
                onValueChange={(value) => setEditForm({ ...editForm, gender: value })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t.editDialog.genderPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{t.editDialog.male}</SelectItem>
                  <SelectItem value="FEMALE">{t.editDialog.female}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="address" className="text-sm font-medium">{t.editDialog.address}</label>
            <Input
              id="address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder={t.editDialog.addressPlaceholder}
              className="text-sm"
            />
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label htmlFor="studentCode" className="text-sm font-medium">{t.editDialog.studentCode}</label>
              <Input
                id="studentCode"
                value={editForm.studentCode}
                onChange={(e) => setEditForm({ ...editForm, studentCode: e.target.value })}
                placeholder={t.editDialog.studentCodePlaceholder}
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="rollNumber" className="text-sm font-medium">{t.editDialog.rollNumber}</label>
              <Input
                id="rollNumber"
                value={editForm.rollNumber}
                onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                placeholder={t.editDialog.rollNumberPlaceholder}
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label htmlFor="grade" className="text-sm font-medium">{t.editDialog.grade}</label>
              <Input
                id="grade"
                value={editForm.grade}
                onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                placeholder={t.editDialog.gradePlaceholder}
                className="text-sm"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="section" className="text-sm font-medium">{t.editDialog.section}</label>
              <Input
                id="section"
                value={editForm.section}
                onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                placeholder={t.editDialog.sectionPlaceholder}
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t.editDialog.cancel}
            </Button>
            <Button onClick={handleUpdateStudent} disabled={isEditing}>
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.editDialog.saving}
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t.editDialog.saveChanges}
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

function DocumentActionsMenu({
  isBusy,
  onView,
  onMark,
  onNotRequired,
  onDelete,
}: {
  isBusy?: boolean;
  onView?: () => void;
  onMark?: () => void;
  onNotRequired?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" disabled={isBusy}>
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onView ? (
          <DropdownMenuItem onClick={onView}>
            <FileText className="h-4 w-4" />
            View
          </DropdownMenuItem>
        ) : null}
        {onMark ? (
          <DropdownMenuItem onClick={onMark}>
            <CheckCircle className="h-4 w-4" />
            Mark submitted
          </DropdownMenuItem>
        ) : null}
        {onNotRequired ? (
          <DropdownMenuItem onClick={onNotRequired} className="text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300">
            <Trash2 className="h-4 w-4" />
            Hide as not required
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem onClick={onDelete} className="text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300">
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PeriodFeeRow({ period }: { period: { name: string; due: number; paid: number; balance: number; status: string; isCurrent?: boolean } }) {
  const { t } = useTranslations<any>("students");
  const translateFeeStatus = (status: string): string => {
    switch (status) {
      case "Not generated": return t.fee.notGenerated;
      case "Paid": return t.fee.paid;
      case "Partial": return t.fee.partial;
      case "Unpaid": return t.fee.unpaid;
      default: return status;
    }
  };
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{period.name}</span>
            {period.isCurrent ? (
              <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                {t.fee.current}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.fee.periodNote.replace("{due}", formatMoney(period.due)).replace("{paid}", formatMoney(period.paid)).replace("{balance}", formatMoney(period.balance))}
          </p>
        </div>
        <span className={`shrink-0 font-semibold ${getPeriodStatusClass(period.status)}`}>
          {translateFeeStatus(period.status)}
        </span>
      </div>
    </div>
  );
}

export default SingleStudentPage;
