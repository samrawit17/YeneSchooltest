'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { hrAPI } from '@/lib/api';
import { toast } from 'sonner';

const POSITIONS = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'HR', label: 'HR Staff' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'LIBRARIAN', label: 'Librarian' },
  { value: 'GUARD', label: 'Guard' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'COOK', label: 'Cook' },
  { value: 'CLEANER', label: 'Cleaner' },
  { value: 'OTHER', label: 'Other' },
];

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
];

interface PageProps {
  params: { id: string };
}

interface LeaveBalance {
  annualLeave: number;
  sickLeave: number;
  casualLeave: number;
  usedAnnualLeave: number;
  usedSickLeave: number;
  usedCasualLeave: number;
}

export default function EditEmployeePage({ params }: PageProps) {
  const router = useRouter();
  const employeeId = params.id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employeeId: '',
    position: '',
    department: '',
    hireDate: '',
    employmentType: 'FULL_TIME',
    contractStartDate: '',
    contractEndDate: '',
    workSchedule: '',
    shiftTime: '',
    qualification: '',
    experience: '',
    salary: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    isActive: true,
    annualLeave: 12,
    sickLeave: 10,
    casualLeave: 5,
    usedAnnualLeave: 0,
    usedSickLeave: 0,
    usedCasualLeave: 0,
  });

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setFetching(true);
      const response = await hrAPI.getEmployeeById(employeeId);
      const employee = response.data;
      const hrProfile = employee.hrProfile || {};

        setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        employeeId: hrProfile.employeeId || '',
        position: employee.role || '',
        department: hrProfile.department || '',
        hireDate: hrProfile.joiningDate ? new Date(hrProfile.joiningDate).toISOString().split('T')[0] : '',
        employmentType: hrProfile.employmentType || 'FULL_TIME',
        contractStartDate: hrProfile.contractStartDate ? new Date(hrProfile.contractStartDate).toISOString().split('T')[0] : '',
        contractEndDate: hrProfile.contractEndDate ? new Date(hrProfile.contractEndDate).toISOString().split('T')[0] : '',
        workSchedule: hrProfile.workSchedule || '',
        shiftTime: hrProfile.shiftTime || '',
        qualification: hrProfile.qualification || '',
        experience: hrProfile.experience || '',
        salary: hrProfile.salary?.toString() || '',
        bankName: hrProfile.bankName || '',
        accountNumber: hrProfile.accountNumber || '',
        ifscCode: hrProfile.ifscCode || '',
        isActive: employee.isActive ?? true,
        annualLeave: hrProfile.annualLeave ?? 12,
        sickLeave: hrProfile.sickLeave ?? 10,
        casualLeave: hrProfile.casualLeave ?? 5,
        usedAnnualLeave: hrProfile.usedAnnualLeave ?? 0,
        usedSickLeave: hrProfile.usedSickLeave ?? 0,
        usedCasualLeave: hrProfile.usedCasualLeave ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      toast.error('Failed to load employee data');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        employeeId: formData.employeeId,
        position: formData.position,
        department: formData.department,
        hireDate: formData.hireDate || undefined,
        employmentType: formData.employmentType,
        contractStartDate: formData.contractStartDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        workSchedule: formData.workSchedule || undefined,
        shiftTime: formData.shiftTime || undefined,
        qualification: formData.qualification || undefined,
        experience: formData.experience || undefined,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        bankName: formData.bankName || undefined,
        accountNumber: formData.accountNumber || undefined,
        ifscCode: formData.ifscCode || undefined,
        isActive: formData.isActive,
        annualLeave: formData.annualLeave,
        sickLeave: formData.sickLeave,
        casualLeave: formData.casualLeave,
        usedAnnualLeave: formData.usedAnnualLeave,
        usedSickLeave: formData.usedSickLeave,
        usedCasualLeave: formData.usedCasualLeave,
      };

      await hrAPI.updateEmployee(employeeId, updateData);
      toast.success('Employee updated successfully');
      router.push(`/hr/employees/${employeeId}`);
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      const message = error?.response?.data?.message || 'Failed to update employee';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Edit Employee</h1>
          <p className="text-gray-500 mt-1">Update employee information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireDate">Joining Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment Type</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) => setFormData({ ...formData, employmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workSchedule">Work Schedule</Label>
                <Input
                  id="workSchedule"
                  value={formData.workSchedule}
                  onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                  placeholder="e.g., Mon-Fri"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shiftTime">Shift Time</Label>
                <Input
                  id="shiftTime"
                  value={formData.shiftTime}
                  onChange={(e) => setFormData({ ...formData, shiftTime: e.target.value })}
                  placeholder="e.g., 8:00 AM - 4:00 PM"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contract & Qualifications */}
          <Card>
            <CardHeader>
              <CardTitle>Contract & Qualifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractStartDate">Contract Start Date</Label>
                <Input
                  id="contractStartDate"
                  type="date"
                  value={formData.contractStartDate}
                  onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractEndDate">Contract End Date</Label>
                <Input
                  id="contractEndDate"
                  type="date"
                  value={formData.contractEndDate}
                  onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="e.g., Bachelor's Degree"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="e.g., 5 years"
                />
              </div>
            </CardContent>
          </Card>

          {/* Salary & Banking */}
          <Card>
            <CardHeader>
              <CardTitle>Salary & Banking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Base Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active Account
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                Unchecking this will deactivate the employee&apos;s account
              </p>
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualLeave">Annual Leave</Label>
                  <Input
                    id="annualLeave"
                    type="number"
                    value={formData.annualLeave}
                    onChange={(e) => setFormData({ ...formData, annualLeave: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sickLeave">Sick Leave</Label>
                  <Input
                    id="sickLeave"
                    type="number"
                    value={formData.sickLeave}
                    onChange={(e) => setFormData({ ...formData, sickLeave: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="casualLeave">Casual Leave</Label>
                  <Input
                    id="casualLeave"
                    type="number"
                    value={formData.casualLeave}
                    onChange={(e) => setFormData({ ...formData, casualLeave: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usedAnnualLeave">Used Annual</Label>
                  <Input
                    id="usedAnnualLeave"
                    type="number"
                    value={formData.usedAnnualLeave}
                    onChange={(e) => setFormData({ ...formData, usedAnnualLeave: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usedSickLeave">Used Sick</Label>
                  <Input
                    id="usedSickLeave"
                    type="number"
                    value={formData.usedSickLeave}
                    onChange={(e) => setFormData({ ...formData, usedSickLeave: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usedCasualLeave">Used Casual</Label>
                  <Input
                    id="usedCasualLeave"
                    type="number"
                    value={formData.usedCasualLeave}
                    onChange={(e) => setFormData({ ...formData, usedCasualLeave: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
