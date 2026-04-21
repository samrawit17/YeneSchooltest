"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, ArrowLeft, Home, Search, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
  type?: '403' | '404';
}

export default function AccessDenied({ type = '403' }: AccessDeniedProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Only access storage after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    const attemptedUrl = sessionStorage.getItem('accessDeniedUrl');
    const errorCode = sessionStorage.getItem('accessDeniedCode');
    const storedMessage = sessionStorage.getItem('accessDeniedMessage');
    
    if (storedMessage) {
      setErrorMessage(storedMessage);
    }
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user?.role?.toLowerCase() || null);
      } catch (e) {
        setUserRole(null);
      }
    }
    
    return () => {
      sessionStorage.removeItem('accessDeniedUrl');
      sessionStorage.removeItem('accessDeniedCode');
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
        </div>
      </div>
    );
  }

  const actualType = type;
  const displayUrl = '';

  // Get dashboard URL based on role
  const getDashboardUrl = (): string => {
    const role = userRole;
    if (!role) return '/dashboard';
    
    const roleMap: Record<string, string> = {
      'admin': '/admin',
      'super_admin': '/superadmin',
      'teacher': '/teacher',
      'student': '/student',
      'parent': '/parent',
      'registrar': '/registrar',
      'finance': '/finance',
      'hr': '/hr',
    };
    
    return roleMap[role] || '/dashboard';
  };

  // Get role display name
  const getRoleName = (): string => {
    const role = userRole;
    if (!role) return 'Dashboard';
    
    const roleNames: Record<string, string> = {
      'admin': 'Admin Dashboard',
      'super_admin': 'Super Admin Dashboard',
      'teacher': 'Teacher Dashboard',
      'student': 'Student Dashboard',
      'parent': 'Parent Dashboard',
      'registrar': 'Registrar Dashboard',
      'finance': 'Finance Dashboard',
      'hr': 'HR Dashboard',
    };
    
    return roleNames[role] || 'Dashboard';
  };

  const getContent = () => {
    if (actualType === '404') {
      return {
        icon: '🔍',
        title: 'Page Not Found',
        message: "The page you're looking for doesn't exist or has been moved.",
        description: "The URL you tried to access could not be found on this server.",
      };
    }

    // 403 cases
    const path = displayUrl.toLowerCase();
    
    if (path.includes('/admin') || path.includes('/hr') || path.includes('/finance')) {
      return {
        icon: '🚫',
        title: 'Access Restricted',
        message: 'You do not have permission to access this area.',
        description: 'This section is reserved for administrators and authorized personnel only.',
        showRoleBox: true,
        roleMessage: 'If you believe you should have access, please contact your system administrator.',
      };
    }
    
    if (path.includes('/teacher')) {
      return {
        icon: '👨‍🏫',
        title: 'Teacher Area Only',
        message: 'This page is only accessible to teachers.',
        description: 'Your account does not have the required permissions to view this content.',
        showRoleBox: true,
        roleMessage: 'If you are a teacher, please contact your school administrator.',
      };
    }
    
    if (path.includes('/student')) {
      return {
        icon: '🎓',
        title: 'Student Area Only',
        message: 'This page is only accessible to students.',
        description: 'Your account does not have the required permissions to view this content.',
        showRoleBox: true,
        roleMessage: 'If you are a student, please contact your school administrator.',
      };
    }
    
    if (path.includes('/parent')) {
      return {
        icon: '👨‍👩‍👧',
        title: 'Parent Area Only',
        message: 'This page is only accessible to parents.',
        description: 'Your account does not have the required permissions to view this content.',
        showRoleBox: true,
        roleMessage: 'If you are a parent, please contact your school administrator.',
      };
    }
    
    if (path.includes('/superadmin') || path.includes('/platform-settings')) {
      return {
        icon: '⚙️',
        title: 'Platform Admin Only',
        message: 'This area is restricted to Platform Administrators.',
        description: 'Only Super Admins can manage platform-level settings and configurations.',
        showRoleBox: true,
        roleMessage: 'This is a platform-level feature that requires Super Admin access.',
      };
    }
    
    // Default 403
    return {
      icon: '🚫',
      title: 'Access Denied',
      message: "You don't have permission to access this page.",
      description: 'Your current permissions do not allow you to view this content.',
      showRoleBox: true,
      roleMessage: 'Contact your administrator if you believe this is an error.',
    };
  };

  const content = getContent();
  const dashboardUrl = getDashboardUrl();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
            <span className="text-5xl">{content.icon}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {content.title}
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {content.message}
        </p>

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3 mb-6">
            <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
              Error: {errorMessage}
            </p>
          </div>
        )}
        
        <p className="text-gray-500 dark:text-gray-500 mb-6 text-sm">
          {content.description}
        </p>

        {/* URL that was attempted */}
        {displayUrl && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Search className="w-4 h-4" />
              <span className="font-mono">{displayUrl}</span>
            </div>
          </div>
        )}

        {/* Role-specific info box */}
        {content.showRoleBox && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Permission Required
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {content.roleMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="dark:bg-gray-800 dark:border-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={() => router.push(dashboardUrl)}
            className="bg-[#e35336] hover:bg-[#d1492f]"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to {getRoleName()}
          </Button>
        </div>

        {/* Help text */}
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-8">
          Need assistance? Contact your system administrator.
        </p>
      </div>
    </div>
  );
}