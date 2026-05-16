export type PlanTier = 'CORE' | 'STANDARD' | 'ULTIMATE';

export interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  description: string | null;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string | null;
}

export interface Subscription {
  id: string;
  schoolId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  plan?: Plan;
}

export interface SchoolWithPlan {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  planAssignedAt: string | null;
  plan?: Plan | null;
  subscription?: Subscription | null;
}

export interface CreatePlanInput {
  name: string;
  tier: PlanTier;
  description?: string;
  features: string[];
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  features?: string[];
  isActive?: boolean;
}

export interface AssignPlanInput {
  schoolId: string;
  planId: string | null;
}

export interface FeatureCheck {
  hasAccess: boolean;
  feature: string;
  tier: PlanTier;
}

export const TIER_CONFIG = {
  CORE: {
    name: 'Core',
    description: 'Basic school setup, users, attendance, calendar, and announcements',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '📦',
  },
  STANDARD: {
    name: 'Standard',
    description: 'Daily academic, finance, parent portal, messaging, and reporting workflows',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '⭐',
  },
  ULTIMATE: {
    name: 'Ultimate',
    description: 'Advanced automation, exam seating, rankings, bulk operations, siren, and exports',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '💎',
  },
};

export const FEATURE_LIST = [
  { key: 'SCHOOL_PROFILE', name: 'School Profile', description: 'School profile and settings management', tier: 'CORE' },
  { key: 'USER_MANAGEMENT', name: 'User Management', description: 'Basic students, staff, teachers, parents, and users', tier: 'CORE' },
  { key: 'ACADEMIC_STRUCTURE', name: 'Academic Structure', description: 'Classes, sections, subjects, assignments, and academic years', tier: 'CORE' },
  { key: 'ATTENDANCE_TRACKING', name: 'Attendance Tracking', description: 'Student attendance tracking', tier: 'CORE' },
  { key: 'ANNOUNCEMENTS', name: 'Announcements', description: 'School announcements', tier: 'CORE' },
  { key: 'SCHOOL_CALENDAR', name: 'School Calendar', description: 'School calendar and events', tier: 'CORE' },
  { key: 'BASIC_REPORTS', name: 'Basic Reports', description: 'Basic reporting capabilities', tier: 'CORE' },
  { key: 'NOTIFICATIONS', name: 'Notifications', description: 'Push notifications and alerts', tier: 'CORE' },
  { key: 'GRADE_MANAGEMENT', name: 'Grade Management', description: 'Grade entry and management', tier: 'STANDARD' },
  { key: 'TIMETABLE_MANAGEMENT', name: 'Timetable Management', description: 'Class and exam timetable management', tier: 'STANDARD' },
  { key: 'LESSON_MANAGEMENT', name: 'Lesson Management', description: 'Teacher, student, and parent lesson access', tier: 'STANDARD' },
  { key: 'EXAM_MANAGEMENT', name: 'Exam Management', description: 'Exam scheduling and result management', tier: 'STANDARD' },
  { key: 'FINANCE_MANAGEMENT', name: 'Finance Management', description: 'Fee management and payment tracking', tier: 'STANDARD' },
  { key: 'PARENT_PORTAL', name: 'Parent Portal', description: 'Parent portal access', tier: 'STANDARD' },
  { key: 'MESSAGING', name: 'Messaging', description: 'Internal messaging system', tier: 'STANDARD' },
  { key: 'COMMUNICATION_BOOK', name: 'Communication Book', description: 'Parent-teacher communication book', tier: 'STANDARD' },
  { key: 'DOCUMENT_MANAGEMENT', name: 'Document Management', description: 'Document upload and management', tier: 'STANDARD' },
  { key: 'ENROLLMENT_MANAGEMENT', name: 'Enrollment Management', description: 'Student enrollment workflow', tier: 'STANDARD' },
  { key: 'CREDENTIAL_MANAGEMENT', name: 'Credential Management', description: 'Credential and password reset management', tier: 'STANDARD' },
  { key: 'DISCIPLINE_MANAGEMENT', name: 'Discipline Management', description: 'Student discipline records', tier: 'STANDARD' },
  { key: 'REPORT_CARDS', name: 'Report Cards', description: 'Report cards, published results, and parent grade views', tier: 'STANDARD' },
  { key: 'EXAM_SEATING', name: 'Exam Seating', description: 'Generate and manage exam seating arrangements', tier: 'ULTIMATE' },
  { key: 'STUDENT_PROMOTION', name: 'Student Promotion', description: 'Student promotion workflow', tier: 'ULTIMATE' },
  { key: 'STUDENT_RANKINGS', name: 'Student Rankings', description: 'Student ranking and exam analytics', tier: 'ULTIMATE' },
  { key: 'STUDENT_ID_CARDS', name: 'Student ID Cards', description: 'Student ID card generation', tier: 'ULTIMATE' },
  { key: 'CERTIFICATE_TEMPLATES', name: 'Certificate Templates', description: 'Certificate template management', tier: 'ULTIMATE' },
  { key: 'TEMPLATE_MANAGER', name: 'Template Manager', description: 'Reusable academic template management', tier: 'ULTIMATE' },
  { key: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics', description: 'Advanced analytics and insights', tier: 'ULTIMATE' },
  { key: 'CUSTOM_BRANDING', name: 'Custom Branding', description: 'Custom branding and white-labeling', tier: 'ULTIMATE' },
  { key: 'BULK_OPERATIONS', name: 'Bulk Operations', description: 'Bulk data import/export operations', tier: 'ULTIMATE' },
  { key: 'PRIORITY_SUPPORT', name: 'Priority Support', description: 'Priority customer support', tier: 'ULTIMATE' },
  { key: 'ADVANCED_REPORTING', name: 'Advanced Reporting', description: 'Advanced custom reports', tier: 'ULTIMATE' },
  { key: 'DATA_EXPORT', name: 'Data Export', description: 'Full data export capabilities', tier: 'ULTIMATE' },
  { key: 'SIREN_ALERT', name: 'Siren Alert System', description: 'Emergency siren management and scheduling', tier: 'ULTIMATE' },
];

export const getFeaturesByTier = (tier: PlanTier): typeof FEATURE_LIST => {
  const tierOrder: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];
  const tierIndex = tierOrder.indexOf(tier);
  return FEATURE_LIST.filter((f) => tierOrder.indexOf(f.tier as PlanTier) <= tierIndex);
};
