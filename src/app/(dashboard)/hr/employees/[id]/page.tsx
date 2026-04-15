"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hrAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";
import UserDetailPage, { UserDetailData } from "@/components/UserDetailPage";
import { toast } from "sonner";

interface PageProps {
  params: { id: string };
}

const SingleEmployeePage = ({ params }: PageProps) => {
  const router = useRouter();
  const employeeId = params.id;

  const fetchEmployee = async () => {
    try {
      const response = await hrAPI.getEmployeeById(employeeId);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch employee:", error);
      return null;
    }
  };

  const handleActivate = async () => {
    try {
      await hrAPI.updateEmployee(employeeId, { isActive: true });
      toast.success("Employee account activated successfully");
      setEmployee((prev: any) => ({
        ...prev,
        isActive: true,
      }));
    } catch (error) {
      console.error("Failed to activate employee:", error);
      toast.error("Failed to activate employee account");
    }
  };

  const handleDeactivate = async () => {
    try {
      await hrAPI.updateEmployee(employeeId, { isActive: false });
      toast.success("Employee account deactivated successfully");
      setEmployee((prev: any) => ({
        ...prev,
        isActive: false,
      }));
    } catch (error) {
      console.error("Failed to deactivate employee:", error);
      toast.error("Failed to deactivate employee account");
    }
  };

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchEmployee();
      setEmployee(data);
      setError(!data);
      setLoading(false);
    };
    loadData();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading employee data</p>
        </div>
      </div>
    );
  }

  const userData = employee.user || {};
  const hrProfile = employee.hrProfile || {};

  const userDetail: UserDetailData = {
    id: employee.id,
    name: userData.name || employee.name || "Unknown Employee",
    email: userData.email || employee.email || "",
    role: employee.role || hrProfile.position || "STAFF",
    avatarUrl: userData.img || userData.avatarUrl,
    isActive: employee.isActive ?? true,
    createdAt: userData.createdAt || employee.createdAt,
    lastLogin: userData.lastLogin || employee.lastLogin,
    username: userData.email || employee.email,

    phone: userData.phone || employee.phone,
    gender: employee.gender,
    dateOfBirth: employee.dateOfBirth,
    address: employee.address,
    city: employee.city,
    state: employee.state,
    country: employee.country,
    pinCode: employee.pinCode,
    emergencyContact: employee.emergencyContact,
    emergencyPhone: employee.emergencyPhone,

    employeeId: hrProfile.employeeId,
    designation: hrProfile.designation,
    department: hrProfile.department?.name,
    joiningDate: hrProfile.joiningDate,
    qualification: hrProfile.qualification,
    experience: hrProfile.experience,
    salary: hrProfile.salary,
    
    bankName: hrProfile.bankName,
    accountNumber: hrProfile.accountNumber,
    ifscCode: hrProfile.ifscCode,

    employmentType: hrProfile.employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
    contractStartDate: hrProfile.contractStartDate,
    contractEndDate: hrProfile.contractEndDate,
    workSchedule: hrProfile.workSchedule,
    shiftTime: hrProfile.shiftTime,

    leaveBalance: hrProfile.leaveBalance ? {
      annual: hrProfile.leaveBalance.annual || 0,
      sick: hrProfile.leaveBalance.sick || 0,
      casual: hrProfile.leaveBalance.casual || 0,
      used: {
        annual: hrProfile.leaveBalance.used?.annual || 0,
        sick: hrProfile.leaveBalance.used?.sick || 0,
        casual: hrProfile.leaveBalance.used?.casual || 0,
      },
    } : undefined,

    employeeAttendanceRate: hrProfile.attendanceRate,
    performanceRating: hrProfile.performanceRating,
    performanceReview: hrProfile.performanceReview,
    lastPromotionDate: hrProfile.lastPromotionDate,

    transactions: hrProfile.transactions?.map((tx: any) => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
    })),

    nationality: employee.nationality,
    religion: employee.religion,
    maritalStatus: employee.maritalStatus,
    bloodGroup: employee.bloodGroup,

    schoolName: userData.school?.name || userData.schoolName,
    schoolId: userData.schoolId,
  };

  const isActive = employee.isActive === true;

  console.log('Employee isActive:', employee.isActive, 'isActive:', isActive);

  return (
    <UserDetailPage
      user={userDetail}
      backUrl="/hr/employees"
      backLabel="Back to Employees"
      onEdit={() => router.push(`/hr/employees/${employeeId}/edit`)}
      onDeactivate={isActive ? handleDeactivate : undefined}
      onActivate={!isActive ? handleActivate : undefined}
    />
  );
};

export default SingleEmployeePage;