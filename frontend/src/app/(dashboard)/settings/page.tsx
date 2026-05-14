'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Settings,
  GraduationCap,
  Users,
  CalendarCheck,
  CreditCard,
  BookOpen,
  Bell,
  Shield,
  Building2
} from 'lucide-react';

const SETTINGS_CATEGORIES = [
  {
    title: 'Academic Settings',
    description: 'Configure academic year, grading system, and class settings',
    icon: <GraduationCap className="w-8 h-8" />,
    href: '/list/schools/[schoolId]/settings',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'Class Management',
    description: 'Manage classes, sections, and capacity limits',
    icon: <BookOpen className="w-8 h-8" />,
    href: '/list/schools/[schoolId]/settings',
    color: 'bg-green-100 text-green-600',
  },
  {
    title: 'Attendance Rules',
    description: 'Configure attendance policies and thresholds',
    icon: <CalendarCheck className="w-8 h-8" />,
    href: '/list/schools/[schoolId]/settings',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    title: 'Finance Settings',
    description: 'Configure fee structure and payment options',
    icon: <CreditCard className="w-8 h-8" />,
    href: '/list/schools/[schoolId]/settings',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'Communication',
    description: 'Configure announcements and notification settings',
    icon: <Bell className="w-8 h-8" />,
    href: '/list/schools/[schoolId]/settings',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    title: 'User Management',
    description: 'Manage users and access permissions',
    icon: <Users className="w-8 h-8" />,
    href: '/list/roles',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    title: 'School Profile',
    description: 'Edit school information and branding',
    icon: <Building2 className="w-8 h-8" />,
    href: '/list/schools/[schoolId]',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    title: 'Roles & Permissions',
    description: 'Configure role-based access control',
    icon: <Shield className="w-8 h-8" />,
    href: '/list/roles',
    color: 'bg-red-100 text-red-600',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.schoolId) {
      setSchoolId(user.schoolId);
    }
  }, [user]);

  if (!schoolId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-600">Manage your school settings</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4 text-yellow-700">
          No school assigned to your account. Please contact SuperAdmin.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">

      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Manage your school configuration and preferences</p>
      </div>

      {/* Quick Access */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          <strong>Quick Access:</strong> Go to{' '}
          <Link
            href={`/list/schools/${schoolId}/settings`}
            className="font-medium underline hover:text-blue-900"
          >
            School Settings
          </Link>{' '}
          for all academic and operational settings.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS_CATEGORIES.map((category) => (
          <Link
            key={category.title}
            href={category.href.replace('[schoolId]', schoolId)}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-3 ${category.color}`}>
                {category.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{category.title}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {category.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Profile Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Account</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <Link
              href="/profile"
              className="text-sm text-blue-600 hover:underline"
            >
              Edit Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
