"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useThemeStore } from '@/lib/themeStore';

// User role types based on backend
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'REGISTRAR' | 'FINANCE';

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
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (loginIdentifier: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

   // Check for existing auth on mount
   useEffect(() => {
     setMounted(true);
     
     const checkAuth = async () => {
       try {
         const storedToken = localStorage.getItem('token');
         const storedUser = localStorage.getItem('user');

         if (storedToken && storedUser) {
           setToken(storedToken);
           try {
             const parsedUser = JSON.parse(storedUser);
             setUser(parsedUser);
           } catch (error) {
             console.error('Failed to parse user data from localStorage:', error);
             localStorage.removeItem('token');
             localStorage.removeItem('user');
           }
         }
       } catch (error) {
         console.warn('localStorage not available:', error);
       } finally {
         setIsLoading(false);
       }
     };

     checkAuth();
     
     // Initialize theme from Zustand store (which handles persistence)
     useThemeStore.getState().initializeTheme();
   }, []);

   // Don't render children until mounted to prevent hydration mismatch
   if (!mounted) {
     return null;
   }

   const login = async (loginIdentifier: string, password: string): Promise<User> => {
     try {
       const response = await authAPI.login(loginIdentifier, password);
       const { access_token, user: userData } = response.data;

       // Store in localStorage
       localStorage.setItem('token', access_token);
       localStorage.setItem('user', JSON.stringify(userData));
       // Save user's theme preference to Zustand store
       const userTheme = (userData.theme || 'SYSTEM').toLowerCase() as 'light' | 'dark' | 'system';
       useThemeStore.getState().setTheme(userTheme);

       setToken(access_token);
       setUser(userData);

       return userData;
     } catch (error: any) {
       const message = error.response?.data?.message || 'Login failed';
       // Don't throw the error - just return it so the caller can handle it
       throw new Error(message);
     }
   };

   const logout = () => {
     localStorage.removeItem('token');
     localStorage.removeItem('user');
     // Reset theme to system default via Zustand store
     useThemeStore.getState().setTheme('system');
     setToken(null);
     setUser(null);
     toast.success('Logged out successfully');
   };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
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
     TEACHER: ['exam:create', 'exam:update', 'exam:read', 'result:publish', 'result:read', 'subject:read', 'student:read', 'announcement:create', 'announcement:read', 'attendance:create', 'attendance:read', 'lesson:read', 'lesson:create'],
     STUDENT: ['exam:read', 'result:read', 'announcement:read', 'fee:read', 'attendance:read', 'timetable:read', 'assignment:read'],
     PARENT: ['student:read', 'result:read', 'announcement:read', 'fee:read', 'attendance:read', 'timetable:read', 'assignment:read'],
     REGISTRAR: ['student:create', 'student:read', 'student:update', 'student:approve', 'class:assign', 'document:upload', 'enrollment:read', 'enrollment:approve'],
     FINANCE: ['fee:create', 'fee:read', 'fee:update', 'fee:pay', 'fee:assign', 'report:read', 'finance:fee_structure:create', 'finance:fee_structure:read', 'finance:fee_structure:update', 'finance:fee_structure:delete', 'finance:student_fees:generate', 'finance:student_fees:read', 'finance:payments:record', 'finance:reports:read'],
   };

  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

// Menu visibility based on role
export const canAccessMenu = (user: User | null, menuRoles: string[]): boolean => {
  if (!user) return false;
  return menuRoles.includes(user.role);
};
