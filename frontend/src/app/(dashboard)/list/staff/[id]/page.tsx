"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hrAPI } from "@/lib/api/hr";
import { Loader2 } from "lucide-react";
import UserDetailPage, { UserDetailData } from "@/components/UserDetailPage";

interface PageProps {
  params: { id: string };
}

const SingleStaffPage = ({ params }: PageProps) => {
  const router = useRouter();
  const staffId = params.id;

  const fetchStaff = async () => {
    try {
      const response = await hrAPI.getEmployeeById(staffId);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      return null;
    }
  };

  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchStaff();
      setStaff(data);
      setError(!data);
      setLoading(false);
    };
    loadData();
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading staff data...</p>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">Error loading staff data</p>
        </div>
      </div>
    );
  }

  const userData = staff.user || {};
  const hrProfile = staff.hrProfile || {};

  // Map staff data to UserDetailData
  const userDetail: UserDetailData = {
    id: staff.id,
    name: userData.name || staff.name || "Unknown Staff",
    email: userData.email || staff.email || "",
    role: staff.position || hrProfile.position || "STAFF",
    avatarUrl: userData.img || userData.avatarUrl,
    isActive: userData.isActive ?? true,
    createdAt: userData.createdAt || staff.createdAt,
    lastLogin: userData.lastLogin,
    username: userData.email || staff.email,

    // Personal info
    phone: userData.phone || staff.phone,
    gender: staff.gender,
    address: staff.address || userData.address,

    // Staff-specific (using Teacher-specific fields)
    staffId: hrProfile.employeeId,
    employmentType: hrProfile.designation || staff.department?.name || hrProfile.department?.name,
    joiningDate: hrProfile.joiningDate,
    
    // Activity log
    activityLog: staff.activityLog,

    // Documents
    documents: staff.documents,
  };

  return (
    <UserDetailPage
      user={userDetail}
      backUrl="/list/staff"
      backLabel="Staff"
      onEdit={() => router.push(`/list/staff/${staffId}/edit`)}
      onResetPassword={() => {}}
      onDeactivate={() => {}}
      onSendMessage={() => router.push(`/messages?recipientId=${staffId}`)}
    />
  );
};


export default SingleStaffPage;
