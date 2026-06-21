"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useThemeStore } from '@/lib/themeStore';
import { useLanguageStore } from '@/lib/languageStore';
import { getModuleMessages } from '@/messages/registry';

// User role types based on backend
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'IT_MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'REGISTRAR' | 'FINANCE';

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  isActive?: boolean;
  phone?: string;
  avatarUrl?: string;
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  calendarType?: 'GREGORIAN' | 'ETHIOPIAN';
  permissions?: string[];
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (loginIdentifier: string, password: string, rememberMe?: boolean, schoolId?: string | null) => Promise<User>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionUser(user: Pick<User, 'id' | 'role' | 'schoolId'>) {
  return JSON.stringify({
    id: user.id,
    role: user.role,
    schoolId: user.schoolId || null,
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

   // Check for existing auth on mount
   useEffect(() => {
     setMounted(true);

     if (typeof window !== 'undefined' && window.location.pathname === '/enroll') {
       setUser(null);
       sessionStorage.removeItem('user');
       localStorage.removeItem('user');
       setIsLoading(false);
       useThemeStore.getState().initializeTheme();
       return;
     }
     
      const checkAuth = async () => {
        try {
          localStorage.removeItem('user');
          const response = await userAPI.getProfile({ skipAuthErrorRedirect: true });
          const profile = response.data;
           if (profile) {
             setUser(profile);
             sessionStorage.setItem('user', getSessionUser(profile));
             const userTheme = (profile.theme || 'LIGHT').toLowerCase() as 'light' | 'dark' | 'system';
            useThemeStore.getState().setTheme(userTheme, profile.id);
            return;
         }
        } catch (error: any) {
          const isCanceledRequest =
            error?.code === 'ERR_CANCELED' ||
            error?.name === 'CanceledError' ||
            error?.message === 'Request aborted';
          const isNetworkError = !error?.response && error?.message !== 'Request aborted';
          if (isNetworkError) {
            const cached = sessionStorage.getItem('user');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed.id && parsed.role) {
                  setUser(parsed as User);
                  setIsLoading(false);
                  return;
                }
              } catch {}
            }
          }
          if (error?.response?.status !== 401 && !isCanceledRequest && !isNetworkError) {
            console.error('Failed to restore authenticated session:', error);
          }
          setUser(null);
          sessionStorage.removeItem('user');
        } finally {
          setIsLoading(false);
        }
      };

     checkAuth();
     
     // Initialize guest theme while auth restoration runs. Authenticated users are
     // re-applied with their own scoped key/server preference after profile load.
     useThemeStore.getState().initializeTheme();
   }, []);

   // Don't render children until mounted to prevent hydration mismatch
   if (!mounted) {
     return null;
   }

   const login = async (
     loginIdentifier: string,
     password: string,
     _rememberMe = false,
     schoolId?: string | null,
   ): Promise<User> => {
     try {
       const response = await authAPI.login(loginIdentifier, password, schoolId);
       const { user: userData } = response.data;
        setUser(userData);
        localStorage.removeItem('user');
        sessionStorage.setItem('user', getSessionUser(userData));

        // Apply the authenticated user's own preference, not the guest key.
       const userTheme = (userData.theme || 'LIGHT').toLowerCase() as 'light' | 'dark' | 'system';
       useThemeStore.getState().setTheme(userTheme, userData.id);
       useLanguageStore.getState().initializeLanguage();

       return userData;
     } catch (error: any) {
       const message = error.response?.data?.message || 'Login failed';
       // Don't throw the error - just return it so the caller can handle it
       throw new Error(message);
     }
   };

   const logout = () => {
     authAPI.logout().catch(() => undefined);
     // Reset theme to system default via Zustand store
     useThemeStore.getState().setTheme('light');
       useLanguageStore.getState().initializeLanguage();
       setUser(null);
       sessionStorage.removeItem('user');
       localStorage.removeItem('user');
       const language = useLanguageStore.getState().language;
     const navigationText = getModuleMessages<{ labels?: Record<string, string> }>(language, 'navigation');
     toast.success(navigationText.labels?.['Logged out successfully'] || 'Logged out successfully');
   };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return updatedUser as User;
      }

      return {
        ...currentUser,
        ...updatedUser,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Role-based access control helpers
export const hasRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};

export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) return false;
  
  // SUPER_ADMIN has all permissions
  if (user.role === 'SUPER_ADMIN') return true;

   // Role-specific permissions (simplified - in real app, check actual permissions)
   const rolePermissions: Record<UserRole, string[]> = {
     SUPER_ADMIN: ['*'],
     ADMIN: ['manage_users', 'manage_schools', 'student:create', 'student:read', 'student:update', 'student:approve', 'teacher:create', 'teacher:read', 'class:read', 'class:create', 'exam:create', 'exam:read', 'fee:create', 'fee:read', 'announcement:create', 'announcement:read', 'report:read', 'finance:fee_structure:create', 'finance:fee_structure:read', 'finance:fee_structure:update', 'finance:fee_structure:delete', 'finance:student_fees:generate', 'finance:student_fees:read', 'finance:payments:record', 'finance:reports:read'],
     IT_MANAGER: ['user:read', 'student:read', 'parent:read', 'teacher:read', 'class:create', 'class:read', 'class:update', 'section:create', 'section:read', 'section:update', 'section:delete', 'timetable:create', 'timetable:read', 'timetable:update', 'timetable:manage', 'announcement:create', 'announcement:read', 'event:create', 'event:read', 'dashboard:view', 'academic_year:create', 'academic_year:read', 'academic_year:update', 'academic_year:delete'],
     TEACHER: ['exam:create', 'exam:update', 'exam:read', 'result:publish', 'result:read', 'subject:read', 'student:read', 'announcement:create', 'announcement:read', 'attendance:create', 'attendance:read', 'lesson:read', 'lesson:create'],
     STUDENT: ['exam:read', 'result:read', 'announcement:read', 'fee:read', 'attendance:read', 'timetable:read', 'assignment:read'],
     PARENT: ['student:read', 'result:read', 'announcement:read', 'fee:read', 'attendance:read', 'timetable:read', 'assignment:read'],
     REGISTRAR: ['student:create', 'student:read', 'student:update', 'student:approve', 'class:assign', 'document:upload', 'enrollment:read', 'enrollment:approve'],
     FINANCE: ['fee:create', 'fee:read', 'fee:update', 'fee:pay', 'fee:assign', 'report:read', 'announcement:read', 'finance:fee_structure:create', 'finance:fee_structure:read', 'finance:fee_structure:update', 'finance:fee_structure:delete', 'finance:student_fees:generate', 'finance:student_fees:read', 'finance:payments:record', 'finance:reports:read', 'finance:payroll:read', 'finance:payroll:manage', 'finance:payroll:approve', 'finance:payroll:pay'],
   };

  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

// Menu visibility based on role
export const canAccessMenu = (user: User | null, menuRoles: string[]): boolean => {
  if (!user) return false;
  return menuRoles.includes(user.role);
};
