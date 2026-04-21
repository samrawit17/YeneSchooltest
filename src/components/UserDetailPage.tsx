"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  KeyRound,
  UserX,
  UserCheck,
  Send,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
  Clock,
  UserCircle,
  GraduationCap,
  BookOpen,
  Users,
  Briefcase,
  ClipboardCheck,
  FileText,
  Download,
  Activity,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Types
export interface UserDetailData {
  // Core user info
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  lastLogin?: string;
  createdBy?: string;
  username?: string;

  // Personal info
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;

  // Student-specific
  studentCode?: string;
  rollNumber?: string;
  grade?: string;
  section?: string;
  classTeacher?: string;
  enrollmentYear?: string;
  enrollmentStatus?: string;

  // Teacher-specific
  staffId?: string;
  subjects?: string[];
  assignedClasses?: string[];
  employmentType?: string;
  joiningDate?: string;

  // Parent-specific
  children?: {
    id: string;
    name: string;
    studentCode?: string;
    relation?: string;
    grade?: string;
  }[];
  occupation?: string;

  // Parents-specific (for students - shows parent info on student detail page)
  parents?: Array<{
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    relation?: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
    lastLogin?: string;
  }>;

  // Attendance
  attendanceRate?: number;
  attendanceHistory?: {
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
  }[];

  // Activity log
  activityLog?: {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    actor?: string;
  }[];

  // Documents
  documents?: {
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
    url?: string;
  }[];

  // Fee summary for students
  feeSummary?: {
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    fees?: any[];
  };

  // Employee-specific fields
  employeeId?: string;
  designation?: string;
  department?: string;
  qualification?: string;
  experience?: string;
  salary?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  
  // Employment details
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  contractStartDate?: string;
  contractEndDate?: string;
  workSchedule?: string;
  shiftTime?: string;
  
  // Leave & Attendance
  leaveBalance?: {
    annual: number;
    sick: number;
    casual: number;
    used: {
      annual: number;
      sick: number;
      casual: number;
    };
  };
  employeeAttendanceRate?: number;
  
  // Transaction/Payment history
  transactions?: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "SALARY" | "ALLOWANCE" | "DEDUCTION" | "BONUS";
    status: "PAID" | "PENDING";
  }>;
  
  // Performance
  performanceRating?: number;
  performanceReview?: string;
  lastPromotionDate?: string;
  
  // Emergency contact
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // Location
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  
  // Additional
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  bloodGroup?: string;
}

interface UserDetailPageProps {
  user: UserDetailData;
  backUrl: string;
  backLabel: string;
  onEdit?: () => void;
  onResetPassword?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
  onSendMessage?: () => void;
  childrenTabActions?: ReactNode;
}

type TabKey = "overview" | "academic" | "attendance" | "fees" | "children" | "activity" | "documents" | "parentInfo" | "transactions";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRoleBadgeColor = (role: string) => {
  switch (role?.toUpperCase()) {
    case "STUDENT":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "TEACHER":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    case "PARENT":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    case "ADMIN":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "SUPER_ADMIN":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    case "REGISTRAR":
      return "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800";
    case "HR":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "FINANCE":
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    case "STAFF":
      return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
  }
};

const getStatusBadge = (isActive: boolean) => {
  return isActive
    ? { className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800", label: "Active", icon: CheckCircle }
    : { className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800", label: "Inactive", icon: XCircle };
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Info row component
const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0 gap-1 sm:gap-0">
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </div>
    <span className="text-sm font-medium text-gray-900 dark:text-white text-left sm:text-right">{value || "N/A"}</span>
  </div>
);

export default function UserDetailPage({
  user,
  backUrl,
  backLabel,
  onEdit,
  onResetPassword,
  onDeactivate,
  onActivate,
  onSendMessage,
  childrenTabActions,
}: UserDetailPageProps) {
  const router = useRouter();
  const role = user.role?.toUpperCase();

  // Determine available tabs based on role
  const getTabs = (): { key: TabKey; label: string }[] => {
    const tabs: { key: TabKey; label: string }[] = [
      { key: "overview", label: "Overview" },
    ];

    if (role === "STUDENT") {
      tabs.push({ key: "academic", label: "Academic Info" });
      tabs.push({ key: "attendance", label: "Attendance" });
      tabs.push({ key: "fees", label: "Fees" });
      tabs.push({ key: "parentInfo", label: "Parent Info" });
    } else if (role === "TEACHER") {
      tabs.push({ key: "academic", label: "Work Info" });
    } else if (["HR", "FINANCE", "REGISTRAR", "STAFF", "ADMIN"].includes(role)) {
      tabs.push({ key: "academic", label: "Work Info" });
      tabs.push({ key: "transactions", label: "Transactions" });
    } else if (role === "PARENT") {
      tabs.push({ key: "children", label: "Children" });
    }

    tabs.push({ key: "activity", label: "Activity Log" });

    // Add documents tab for non-student roles
    if (role !== "STUDENT") {
      tabs.push({ key: "documents", label: "Documents" });
    }

    return tabs;
  };

  const tabs = getTabs();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const statusBadge = getStatusBadge(user.isActive);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header Card */}
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left side - Profile info */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-gray-100">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="text-lg sm:text-xl font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 sm:space-y-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                        {user.role?.replace("_", " ")}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {user.studentCode || user.staffId || user.id?.substring(0, 8)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${statusBadge.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{statusBadge.label}</span>
                      </span>
                    </div>
                    {user.createdAt && (
                      <p className="text-xs text-gray-400 hidden sm:block">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side - Quick actions */}
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit} style={{ borderColor: "#e35336", color: "#e35336" }}>
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                  )}
                  {onResetPassword && (
                    <Button variant="outline" size="sm" onClick={onResetPassword} style={{ borderColor: "#e35336", color: "#e35336" }}>
                      <KeyRound className="w-4 h-4 mr-1.5" />
                      Reset Password
                    </Button>
                  )}
                  {onDeactivate && (
                    <Button variant="outline" size="sm" onClick={onDeactivate} style={{ borderColor: "#e35336", color: "#e35336" }}>
                      <UserX className="w-4 h-4 mr-1.5" />
                      Deactivate
                    </Button>
                  )}
                  {onActivate && (
                    <Button variant="outline" size="sm" onClick={onActivate} style={{ borderColor: "#22c55e", color: "#22c55e" }}>
                      <UserCheck className="w-4 h-4 mr-1.5" />
                      Activate
                    </Button>
                  )}
                  {onSendMessage && (
                    <Button size="sm" onClick={onSendMessage} style={{ backgroundColor: "#e35336" }}>
                      <Send className="w-4 h-4 mr-1.5" />
                      Send Message
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Navigation */}
          <div className="border-b dark:border-slate-700">
            <nav className="flex gap-0 -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-[#e35336] text-[#e35336]"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-[#e35336] hover:border-[#e35336]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "overview" && <OverviewTab user={user} />}
            {activeTab === "academic" && <AcademicTab user={user} />}
            {activeTab === "attendance" && <AttendanceTab user={user} />}
            {activeTab === "fees" && <FeesTab user={user} />}
            {activeTab === "children" && <ChildrenTab user={user} actions={childrenTabActions} />}
            {activeTab === "activity" && <ActivityLogTab user={user} />}
            {activeTab === "documents" && <DocumentsTab user={user} />}
            {activeTab === "parentInfo" && <ParentInfoTab user={user} />}
            {activeTab === "transactions" && <TransactionsTab user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({ user }: { user: UserDetailData }) {
  const role = user.role?.toUpperCase();
  const isEmployee = ["TEACHER", "HR", "FINANCE", "REGISTRAR", "ADMIN", "STAFF"].includes(role || "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Personal Information - only show if there's data */}
      {(user.dateOfBirth || user.gender || user.phone || user.email || user.bloodGroup || user.maritalStatus) && (
        <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            {role === "STUDENT" && (
              <>
                <InfoRow label="Date of Birth" value={formatDate(user.dateOfBirth)} icon={Calendar} />
                <InfoRow label="Gender" value={user.gender} icon={User} />
              </>
            )}
            {isEmployee && (
              <>
                <InfoRow label="Date of Birth" value={formatDate(user.dateOfBirth)} icon={Calendar} />
                <InfoRow label="Gender" value={user.gender} icon={User} />
                <InfoRow label="Blood Group" value={user.bloodGroup} icon={Activity} />
                <InfoRow label="Marital Status" value={user.maritalStatus} icon={User} />
                <InfoRow label="Nationality" value={user.nationality} icon={Shield} />
                <InfoRow label="Religion" value={user.religion} icon={User} />
              </>
            )}
            <InfoRow label="Phone" value={user.phone} icon={Phone} />
            <InfoRow label="Email" value={user.email} icon={Mail} />
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact - only show for employees if there's data */}
      {isEmployee && (user.emergencyContact || user.emergencyPhone) && (
        <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Contact Name" value={user.emergencyContact || "N/A"} icon={User} />
            <InfoRow label="Contact Phone" value={user.emergencyPhone || "N/A"} icon={Phone} />
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Username" value={user.username || user.email} icon={UserCircle} />
          <InfoRow label="Role" value={user.role?.replace("_", " ") || "N/A"} icon={Shield} />
          <InfoRow label="Created by" value={user.createdBy || "System"} icon={User} />
          <InfoRow label="Last login" value={formatDate(user.lastLogin)} icon={Clock} />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Account status</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${
              user.isActive
                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800"
                : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800"
            }`}>
              {user.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ACADEMIC / WORK TAB ====================
function AcademicTab({ user }: { user: UserDetailData }) {
  const role = user.role?.toUpperCase();

  if (role === "STUDENT") {
    return (
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Academic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Grade" value={user.grade || "N/A"} icon={GraduationCap} />
          <InfoRow label="Section" value={user.section || "N/A"} icon={BookOpen} />
          <InfoRow label="Class Teacher" value={user.classTeacher || "N/A"} icon={Users} />
          <InfoRow label="Enrollment Year" value={user.enrollmentYear || "N/A"} icon={Calendar} />
          <InfoRow label="Roll Number" value={user.rollNumber || "N/A"} icon={FileText} />
          {user.enrollmentStatus && (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Enrollment Status</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                user.enrollmentStatus === "APPROVED"
                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                  : user.enrollmentStatus === "PENDING"
                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                  : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
              }`}>
                {user.enrollmentStatus}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (role === "TEACHER") {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Work Information</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Staff ID" value={user.staffId || "N/A"} icon={FileText} />
            <InfoRow label="Employment Type" value={user.employmentType || "N/A"} icon={Briefcase} />
            <InfoRow label="Joining Date" value={formatDate(user.joiningDate)} icon={Calendar} />
          </CardContent>
        </Card>

        {/* Subjects */}
        {user.subjects && user.subjects.length > 0 && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Subjects Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.subjects.map((subject, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    {subject}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Classes */}
        {user.assignedClasses && user.assignedClasses.length > 0 && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Homeroom Classes Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.assignedClasses.map((cls, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                    <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                    {cls}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // For other staff roles (FINANCE, REGISTRAR, HR, ADMIN, etc.)
  if (role && ["FINANCE", "REGISTRAR", "HR", "ADMIN", "LIBRARIAN", "GUARD", "DRIVER", "COOK", "CLEANER", "OTHER"].includes(role)) {
    return (
      <div className="space-y-6">
        {/* Only show Work Information if there's data */}
        {(user.employeeId || user.designation || user.department || user.joiningDate) && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Work Information</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Employee ID" value={user.employeeId} icon={FileText} />
              <InfoRow label="Designation" value={user.designation} icon={Briefcase} />
              <InfoRow label="Department" value={user.department} icon={Users} />
              <InfoRow label="Employment Type" value={user.employmentType} icon={Clock} />
              <InfoRow label="Joining Date" value={formatDate(user.joiningDate)} icon={Calendar} />
              <InfoRow label="Work Schedule" value={user.workSchedule} icon={Activity} />
              <InfoRow label="Shift Time" value={user.shiftTime} icon={Clock} />
            </CardContent>
          </Card>
        )}

        {/* Contract Details - only show if there's data */}
        {(user.contractStartDate || user.contractEndDate) && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Contract Details</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Contract Start" value={formatDate(user.contractStartDate)} icon={Calendar} />
              <InfoRow label="Contract End" value={formatDate(user.contractEndDate)} icon={Calendar} />
            </CardContent>
          </Card>
        )}

        {/* Qualification & Experience - only show if there's data */}
        {(user.qualification || user.experience) && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Qualifications & Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Qualification" value={user.qualification} icon={GraduationCap} />
              <InfoRow label="Experience" value={user.experience} icon={Briefcase} />
              <InfoRow label="Performance Rating" value={user.performanceRating ? `${user.performanceRating}/5` : "N/A"} icon={Activity} />
              <InfoRow label="Last Promotion" value={formatDate(user.lastPromotionDate)} icon={Calendar} />
            </CardContent>
          </Card>
        )}

        {/* Leave Balance - only show if there's data */}
        {user.leaveBalance && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Annual Leave" value={`${user.leaveBalance.used.annual}/${user.leaveBalance.annual}`} icon={Calendar} />
              <InfoRow label="Sick Leave" value={`${user.leaveBalance.used.sick}/${user.leaveBalance.sick}`} icon={AlertCircle} />
              <InfoRow label="Casual Leave" value={`${user.leaveBalance.used.casual}/${user.leaveBalance.casual}`} icon={Briefcase} />
            </CardContent>
          </Card>
        )}

        {/* Banking Details - only show if there's data */}
        {(user.bankName || user.accountNumber) && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Banking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Bank Name" value={user.bankName} icon={Briefcase} />
              <InfoRow label="Account Number" value={user.accountNumber} icon={FileText} />
              <InfoRow label="IFSC Code" value={user.ifscCode} icon={FileText} />
            </CardContent>
          </Card>
        )}

        {/* Salary Information */}
        {user.salary && (
          <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Salary Information</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Base Salary" value={`$${user.salary.toLocaleString()}`} icon={Briefcase} />
              <InfoRow label="Attendance Rate" value={user.employeeAttendanceRate ? `${user.employeeAttendanceRate}%` : "N/A"} icon={Activity} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

// ==================== ATTENDANCE TAB ====================
function AttendanceTab({ user }: { user: UserDetailData }) {
  const attendanceRate = user.attendanceRate ?? 0;
  const history = user.attendanceHistory || [];

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
      case "ABSENT":
        return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      case "LATE":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
      case "EXCUSED":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Attendance Rate Card */}
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center" style={{
              borderColor: attendanceRate >= 80 ? "#10b981" : attendanceRate >= 60 ? "#f59e0b" : "#ef4444"
            }}>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{attendanceRate}%</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Attendance Rate</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Overall attendance percentage</p>
              <Progress value={attendanceRate} className="mt-3 h-2 w-full sm:w-48" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No attendance records available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, idx) => (
                    <tr key={idx} className="border-b dark:border-slate-700 last:border-0">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getAttendanceStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{record.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== FEES TAB ====================
function FeesTab({ user }: { user: UserDetailData }) {
  const feeSummary = user.feeSummary;
  const fees = feeSummary?.fees || [];
  
  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };
  
  if (!feeSummary || fees.length === 0) {
    return (
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium text-gray-600">Fee Information</p>
            <p className="text-sm mt-1">No fee records found for this student</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Fee</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(feeSummary.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(feeSummary.paidAmount)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
            <p className={`text-2xl font-bold ${feeSummary.outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(feeSummary.outstandingAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Details Table */}
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Fee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-slate-700">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Fee Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Academic Year</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Paid</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Balance</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee: any) => {
                  // Handle both naming conventions from different endpoints
                  const amount = fee.amount ?? fee.totalFee ?? fee.finalAmount ?? 0;
                  const paidAmount = fee.amountPaid ?? fee.paidAmount ?? 0;
                  const balance = fee.remainingBalance ?? (amount - paidAmount);
                  const status = balance <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';
                  return (
                    <tr key={fee.id} className="border-b dark:border-slate-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">{fee.feeType || 'Tuition Fee'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fee.academicYear || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 text-right">{formatCurrency(amount || 0)}</td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">{formatCurrency(paidAmount || 0)}</td>
                      <td className={`px-4 py-3 text-sm text-right ${balance > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                          status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CHILDREN TAB ====================
function ChildrenTab({ user, actions }: { user: UserDetailData; actions?: ReactNode }) {
  const children = user.children || [];

  return (
    <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Linked Children</CardTitle>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No children linked to this parent</p>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/list/students/${child.id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors dark:hover:bg-slate-800 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{child.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {child.studentCode && (
                        <span className="text-xs text-gray-500">{child.studentCode}</span>
                      )}
                      {child.grade && (
                        <Badge variant="outline" className="text-xs">{child.grade}</Badge>
                      )}
                      {child.relation && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {child.relation}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== ACTIVITY LOG TAB ====================
function ActivityLogTab({ user }: { user: UserDetailData }) {
  const activities = user.activityLog || [];

  // Default activities if none provided
  const defaultActivities = [
    {
      id: "1",
      action: "Account Created",
      description: "User account was created",
      timestamp: user.createdAt || new Date().toISOString(),
      actor: user.createdBy || "System",
    },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  const getActivityIcon = (action: string) => {
    if (action.toLowerCase().includes("created")) return { icon: UserCircle, color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" };
    if (action.toLowerCase().includes("updated") || action.toLowerCase().includes("edit")) return { icon: Edit2, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" };
    if (action.toLowerCase().includes("password")) return { icon: KeyRound, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" };
    if (action.toLowerCase().includes("status") || action.toLowerCase().includes("deactivat")) return { icon: AlertCircle, color: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" };
    return { icon: Activity, color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
  };

  return (
    <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />

          <div className="space-y-6">
            {displayActivities.map((activity) => {
              const activityStyle = getActivityIcon(activity.action);
              const ActivityIcon = activityStyle.icon;
              return (
                <div key={activity.id} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${activityStyle.color}`}>
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.action}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{activity.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{formatDate(activity.timestamp)}</span>
                      {activity.actor && (
                        <span className="text-xs text-gray-400">by {activity.actor}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== DOCUMENTS TAB ====================
function DocumentsTab({ user }: { user: UserDetailData }) {
  const documents = user.documents || [];

  const getDocIcon = (type: string) => {
    if (type.includes("id") || type.includes("ID")) return "🪪";
    if (type.includes("certificate") || type.includes("Certificate")) return "📜";
    if (type.includes("report") || type.includes("Report")) return "📊";
    return "📄";
  };

  return (
    <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg border dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDocIcon(doc.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {doc.type} • Uploaded {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                {doc.url && (
                  <Button variant="outline" size="sm" asChild style={{ borderColor: "#e35336", color: "#e35336" }}>
                    <a href={doc.url} download>
                      <Download className="w-4 h-4 mr-1.5" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== PARENT INFO TAB ====================
function ParentInfoTab({ user }: { user: UserDetailData }) {
  const parents = user.parents || [];

  if (parents.length === 0) {
    return (
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="py-12">
          <div className="text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No parent/guardian information available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single card with Parent Info title, relation in table with underlines
  return (
    <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Parent Info</CardTitle>
      </CardHeader>
      <CardContent>
        {parents.map((parent: any, idx: number) => (
          <div key={idx} className={idx > 0 ? "mt-6 pt-6 border-t border-gray-200" : ""}>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Relation</div>
              <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                {parent.relation || "Parent"}
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Name</div>
              <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                {parent.name || "N/A"}
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Email</div>
              <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                {parent.email || "N/A"}
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Phone</div>
              <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                {parent.phone || "N/A"}
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Primary</div>
              <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                {parent.isPrimary ? "Yes" : "No"}
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Emergency Contact</div>
              <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                {parent.emergencyContact ? "Yes" : "No"}
              </div>
              
              {parent.lastLogin && (
                <>
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Last Login</div>
                  <div className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-slate-700">
                    {formatDate(parent.lastLogin)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ==================== TRANSACTIONS TAB ====================
function TransactionsTab({ user }: { user: UserDetailData }) {
  const transactions = user.transactions || [];

  if (transactions.length === 0) {
    return (
      <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Transaction History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Description</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Type</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b dark:border-slate-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {tx.description}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={
                      tx.type === "SALARY" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      tx.type === "ALLOWANCE" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                      tx.type === "BONUS" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }>
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                    ${tx.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={tx.status === "PAID" ? "default" : "secondary"}>
                      {tx.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
