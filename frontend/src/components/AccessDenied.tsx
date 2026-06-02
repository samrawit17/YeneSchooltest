"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldOff, ArrowLeft, Search, AlertTriangle, LayoutDashboard, FileQuestion, ShieldX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface AccessDeniedProps {
  type?: '403' | '404';
}

export default function AccessDenied({ type = '403' }: AccessDeniedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [attemptedUrl, setAttemptedUrl] = useState<string>('');
  const [attemptedApiUrl, setAttemptedApiUrl] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [requiredPermission, setRequiredPermission] = useState<string>('');

  useEffect(() => {
    setMounted(true);

    const url =
      sessionStorage.getItem('accessDeniedUrl') ||
      searchParams.get('from') ||
      '';
    const apiUrl = sessionStorage.getItem('accessDeniedApiUrl') || '';
    const code = sessionStorage.getItem('accessDeniedCode') || type;
    const message = sessionStorage.getItem('accessDeniedMessage') || '';
    const permission =
      sessionStorage.getItem('accessDeniedPermission') ||
      searchParams.get('permission') ||
      '';
    const queryApiUrl = searchParams.get('api') || '';

    setAttemptedUrl(url);
    setAttemptedApiUrl(apiUrl || queryApiUrl);
    setErrorCode(code);
    setErrorMessage(message);
    setRequiredPermission(permission);

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
      sessionStorage.removeItem('accessDeniedApiUrl');
      sessionStorage.removeItem('accessDeniedCode');
      sessionStorage.removeItem('accessDeniedMessage');
      sessionStorage.removeItem('accessDeniedPermission');
    };
  }, [searchParams, type]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Loading...</h1>
        </div>
      </div>
    );
  }

  const actualType = searchParams.get('type') || errorCode || type;

  const getDashboardUrl = (): string => {
    const roleMap: Record<string, string> = {
      admin: '/admin',
      it_manager: '/it-manager',
      super_admin: '/superadmin',
      teacher: '/teacher',
      student: '/student',
      parent: '/parent',
      registrar: '/registrar',
      finance: '/finance',
    };
    return roleMap[userRole || ''] || '/dashboard';
  };

  const getRoleName = (): string => {
    const roleNames: Record<string, string> = {
      admin: 'Admin Dashboard',
      it_manager: 'IT Manager Dashboard',
      super_admin: 'Super Admin Dashboard',
      teacher: 'Teacher Dashboard',
      student: 'Student Dashboard',
      parent: 'Parent Dashboard',
      registrar: 'Registrar Dashboard',
      finance: 'Finance Dashboard',
    };
    return roleNames[userRole || ''] || 'Dashboard';
  };

  const getRolePermissions = (): string[] => {
    if (actualType !== '404') return [];
    const path = attemptedUrl.toLowerCase();

    const pathPermissions: Record<string, string[]> = {
      '/admin': ['admin', 'it_manager', 'registrar'],
      '/it-manager': ['it_manager'],
      '/finance': ['finance', 'admin'],
      '/teacher': ['teacher', 'admin', 'registrar'],
      '/student': ['student'],
      '/parent': ['parent'],
      '/superadmin': ['super_admin'],
      '/registrar': ['registrar', 'admin'],
    };

    for (const [pathPrefix, roles] of Object.entries(pathPermissions)) {
      if (path.startsWith(pathPrefix)) {
        return roles;
      }
    }

      return ['admin', 'it_manager'];
  };

  if (actualType === '404') {
    const allowedRoles = getRolePermissions();
    const isRoleIssue = userRole && allowedRoles.length > 0 && !allowedRoles.includes(userRole);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
              <FileQuestion className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Page Not Found
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isRoleIssue
              ? "You may not have the required role to access this page."
              : "The page you're looking for doesn't exist or has been moved."}
          </p>

          {attemptedUrl && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Search className="w-4 h-4" />
                <span className="font-mono break-all">{attemptedUrl}</span>
              </div>
            </div>
          )}

          {attemptedApiUrl && (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Blocked Request
              </div>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-200 break-all">
                {attemptedApiUrl}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3 mb-4">
              <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
                {errorMessage}
              </p>
            </div>
          )}

          {isRoleIssue && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <ShieldX className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Role Required
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    Your role: <span className="font-semibold capitalize">{userRole?.replace('_', ' ')}</span>
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Allowed roles: <span className="font-semibold">{allowedRoles.join(', ').replace(/_/g, ' ')}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {requiredPermission && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Permission Required
                  </p>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {requiredPermission}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              onClick={() => router.push(getDashboardUrl())}
              className="bg-[#e35336] hover:bg-[#d1492f]"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to {getRoleName()}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/help')}
              className="dark:bg-gray-800 dark:border-gray-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Help Center
            </Button>
            <Button
              variant="outline"
              onClick={() => { logout(); router.push('/sign-in'); }}
              className="dark:bg-gray-800 dark:border-gray-700 text-red-500 hover:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 403 case
  const path = attemptedUrl.toLowerCase();

  const getContextualInfo = () => {
    if (path.includes('/superadmin') || path.includes('/platform-settings')) {
      return {
        title: 'Platform Admin Only',
        message: 'This area is restricted to Platform Administrators.',
        detail: 'Only Super Admins can manage platform-level settings and configurations.',
        requiredRoles: ['super_admin'],
      };
    }
    if (path.includes('/it-manager')) {
      return {
        title: 'IT Manager Area',
        message: 'You do not have permission to access this IT manager section.',
        detail: 'This section is intended for operational system management.',
        requiredRoles: ['it_manager'],
      };
    }
    if (path.includes('/admin')) {
      return {
        title: 'Admin Area Restricted',
        message: 'You do not have permission to access this admin section.',
        detail: 'This section requires Admin, IT Manager, or Registrar privileges.',
        requiredRoles: ['admin', 'it_manager', 'registrar'],
      };
    }
    if (path.includes('/finance')) {
      return {
        title: 'Finance Area Restricted',
        message: 'You do not have permission to access this finance section.',
        detail: 'This section requires Finance or Admin privileges.',
        requiredRoles: ['finance', 'admin'],
      };
    }
    if (path.includes('/teacher')) {
      return {
        title: 'Teacher Area Only',
        message: 'This page is only accessible to teachers.',
        detail: 'Your account does not have the required teacher role.',
        requiredRoles: ['teacher'],
      };
    }
    if (path.includes('/student')) {
      return {
        title: 'Student Area Only',
        message: 'This page is only accessible to students.',
        detail: 'Your account does not have the required student role.',
        requiredRoles: ['student'],
      };
    }
    if (path.includes('/list/parents')) {
      return {
        title: 'Parent Records Restricted',
        message: 'You do not have permission to access parent records.',
        detail: 'This section requires Admin, IT Manager, or Registrar privileges.',
        requiredRoles: ['admin', 'it_manager', 'registrar'],
      };
    }
    if (path === '/parent' || path.startsWith('/parent/')) {
      return {
        title: 'Parent Area Only',
        message: 'This page is only accessible to parents.',
        detail: 'Your account does not have the required parent role.',
        requiredRoles: ['parent'],
      };
    }
    if (path.includes('/registrar')) {
      return {
        title: 'Registrar Area Restricted',
        message: 'This page requires Registrar privileges.',
        detail: 'Your account does not have the required registrar role.',
        requiredRoles: ['registrar', 'admin'],
      };
    }
    if (path.includes('/list/staff') || path.includes('/list/teachers')) {
      return {
        title: 'Staff Management Restricted',
        message: 'You do not have permission to manage staff records.',
        detail: 'This section requires Admin, IT Manager, or Registrar privileges.',
        requiredRoles: ['admin', 'it_manager', 'registrar'],
      };
    }
    if (path.includes('/list/students')) {
      return {
        title: 'Student Records Restricted',
        message: 'You do not have permission to access student records.',
        detail: 'This section requires Admin, IT Manager, or Registrar privileges.',
        requiredRoles: ['admin', 'it_manager', 'registrar'],
      };
    }
    if (path.includes('/list')) {
      return {
        title: 'List View Restricted',
        message: 'You do not have permission to access this list.',
        detail: 'This area requires specific role privileges.',
        requiredRoles: [],
      };
    }
    return {
      title: 'Access Denied',
      message: "You don't have permission to access this page.",
      detail: 'Your current role does not allow you to view this content.',
      requiredRoles: [],
    };
  };

  const info = getContextualInfo();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center">
            <ShieldOff className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {info.title}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {info.message}
        </p>

        <p className="text-gray-500 dark:text-gray-500 mb-4 text-sm">
          {info.detail}
        </p>

        {attemptedUrl && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Search className="w-4 h-4" />
              <span className="font-mono break-all">{attemptedUrl}</span>
            </div>
          </div>
        )}

        {attemptedApiUrl && (
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
              Blocked Request
            </div>
            <p className="font-mono text-sm text-slate-700 dark:text-slate-200 break-all">
              {attemptedApiUrl}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words text-left">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {requiredPermission && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Permission Required
                </p>
                <p className="text-sm font-mono text-blue-600 dark:text-blue-400 mt-1">
                  {requiredPermission}
                </p>
              </div>
            </div>
          </div>
        )}

        {info.requiredRoles.length > 0 && userRole && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <ShieldX className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Role Mismatch
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Your role: <span className="font-semibold capitalize">{userRole.replace('_', ' ')}</span>
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Required: <span className="font-semibold">{info.requiredRoles.join(', ').replace(/_/g, ' ')}</span>
                </p>
              </div>
            </div>
          </div>
        )}

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
            onClick={() => router.push(getDashboardUrl())}
            className="bg-[#e35336] hover:bg-[#d1492f]"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to {getRoleName()}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/help')}
            className="dark:bg-gray-800 dark:border-gray-700"
          >
            <Search className="w-4 h-4 mr-2" />
            Help Center
          </Button>
          <Button
            variant="outline"
            onClick={() => { logout(); router.push('/sign-in'); }}
            className="dark:bg-gray-800 dark:border-gray-700 text-red-500 hover:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-500 mt-8">
          Need assistance? Contact your system administrator.
        </p>
      </div>
    </div>
  );
}
