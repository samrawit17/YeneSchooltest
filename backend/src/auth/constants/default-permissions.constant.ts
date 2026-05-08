import { Role } from '../types/role.enum';

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.SUPER_ADMIN]: [
    'school:create',
    'school:read',
    'school:update',
    'school:deactivate',
    'user:create',
    'user:read',
    'user:update',
    'user:deactivate',
    'view_users',
    'update_users',
    'delete_users',
    'dashboard:view',
    'event:read',
    'announcement:read',
    'academic_year:read',
    // Cross-school monitoring
    'student:read',
    'teacher:read',
    'parent:read',
    'employee:read',
    'class:read',
    'section:read',
    'finance:fee_structure:read',
    'finance:student_fees:read',
    'finance:reports:read',
    'attendance:read',
    'timetable:read',
  ],
  [Role.ADMIN]: [
    // User management
    'user:create',
    'user:read',
    'user:update',
    'user:deactivate',
    'view_users',
    'update_users',
    'delete_users',
    // Student management
    'student:create',
    'student:read',
    'student:update',
    'student:approve_enrollment',
    // Parent management
    'parent:create',
    'parent:read',
    'parent:update',
    'parent:link_student',
    'parent:unlink_student',
    // Teacher management
    'teacher:create',
    'teacher:read',
    'teacher:update',
    // Employee/Staff management
    'employee:create',
    'employee:read',
    'employee:update',
    'employee:delete',
    // Class & Section
    'class:create',
    'class:read',
    'class:update',
    'section:create',
    'section:read',
    'section:update',
    'section:delete',
    // Timetable
    'timetable:create',
    'timetable:read',
    'timetable:update',
    'timetable:manage',
    // Attendance
    'attendance:take',
    'attendance:read',
    'attendance:update',
    // Announcements
    'announcement:create',
    'announcement:read',
    // Events
    'event:create',
    'event:read',
    // Dashboard
    'dashboard:view',
    // Promotion
    'promotion:read',
    'promotion:create',
  ],
  [Role.REGISTRAR]: [
    // User management
    'user:create',
    'user:read',
    'user:update',
    'user:deactivate',
    'view_users',
    'update_users',
    'delete_users',
    // Student management
    'student:create',
    'student:read',
    'student:update',
    'student:approve_enrollment',
    // Parent management
    'parent:create',
    'parent:read',
    'parent:update',
    'parent:link_student',
    'parent:unlink_student',
    // Teacher management
    'teacher:create',
    'teacher:read',
    'teacher:update',
    // Employee/Staff management
    'employee:create',
    'employee:read',
    'employee:update',
    'employee:delete',
    // Class & Section
    'class:create',
    'class:read',
    'class:update',
    'section:create',
    'section:read',
    'section:update',
    'section:delete',
    // Timetable
    'timetable:create',
    'timetable:read',
    'timetable:update',
    'timetable:manage',
    // Attendance
    'attendance:take',
    'attendance:read',
    'attendance:update',
    // Announcements
    'announcement:create',
    'announcement:read',
    // Events
    'event:create',
    'event:read',
    // Dashboard
    'dashboard:view',
    // Grading
    'grading:read',
    'grading:update',
    'grading:approve',
  ],
  [Role.TEACHER]: [
    // Student management (read only)
    'student:read',
    // Parent management (read only)
    'parent:read',
    // Class & Section
    'class:read',
    'section:read',
    // Timetable
    'timetable:read',
    // Attendance
    'attendance:take',
    'attendance:read',
    // Announcements
    'announcement:read',
    // Events
    'event:read',
    // Dashboard
    'dashboard:view',
    // Teacher (own profile and assignments)
    'teacher:read',
    // Grading
    'grading:read',
    'grading:create',
    'grading:update',
  ],
  [Role.STUDENT]: [
    // Student management (own data)
    'student:read',
    // Timetable
    'timetable:read',
    // Attendance
    'attendance:read',
    // Announcements
    'announcement:read',
    // Events
    'event:read',
    // Dashboard
    'dashboard:view',
  ],
  [Role.PARENT]: [
    // Parent management (own data)
    'parent:read',
    'parent:update',
    // Timetable
    'timetable:read',
    // Attendance
    'attendance:read',
    // Dashboard
    'dashboard:view',
    // Announcements
    'announcement:read',
    // Events
    'event:read',
    // Results
    'result:read',
    // Fees
    'fee:read',
  ],
  [Role.FINANCE]: [
    // Academic Year
    'academic_year:read',
    // Fee Structure
    'finance:fee_structure:create',
    'finance:fee_structure:read',
    'finance:fee_structure:update',
    'finance:fee_structure:delete',
    // Student Fees
    'finance:student_fees:generate',
    'finance:student_fees:read',
    // Payments
    'finance:payments:record',
    // Reports
    'finance:reports:read',
    // Dashboard
    'dashboard:view',
    // Student (read only)
    'student:read',
    // Parent (read only)
    'parent:read',
    // All student queries
    'student:read',
    // Events and Announcements
    'event:read',
    'announcement:read',
  ],
};
