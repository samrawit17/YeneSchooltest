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
  planId: string;
}

export interface FeatureCheck {
  hasAccess: boolean;
  feature: string;
  tier: PlanTier;
}

export const TIER_CONFIG = {
  CORE: {
    name: 'Core',
    description: 'Essential features for basic school management',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '📦',
  },
  STANDARD: {
    name: 'Standard',
    description: 'Complete school management with essential integrations',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '⭐',
  },
  ULTIMATE: {
    name: 'Ultimate',
    description: 'Full-featured platform with advanced capabilities',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '💎',
  },
};

export const FEATURE_LIST = [
  { key: 'USER_MANAGEMENT', name: 'User Management', description: 'Basic user management and authentication', tier: 'CORE' },
  { key: 'BASIC_REPORTS', name: 'Basic Reports', description: 'Basic reporting capabilities', tier: 'CORE' },
  { key: 'NOTIFICATIONS', name: 'Notifications', description: 'Push notifications and alerts', tier: 'CORE' },
  { key: 'SCHOOL_PROFILE', name: 'School Profile', description: 'School profile management', tier: 'CORE' },
  { key: 'ATTENDANCE_TRACKING', name: 'Attendance Tracking', description: 'Student attendance tracking', tier: 'STANDARD' },
  { key: 'GRADE_MANAGEMENT', name: 'Grade Management', description: 'Grade entry and management', tier: 'STANDARD' },
  { key: 'TIMETABLE_MANAGEMENT', name: 'Timetable Management', description: 'Class and exam timetable management', tier: 'STANDARD' },
  { key: 'EXAM_MANAGEMENT', name: 'Exam Management', description: 'Exam scheduling and result management', tier: 'STANDARD' },
  { key: 'EXAM_SEATING', name: 'Exam Seating', description: 'Generate and manage exam seating arrangements', tier: 'ULTIMATE' },
  { key: 'FINANCE_MANAGEMENT', name: 'Finance Management', description: 'Fee management and payment tracking', tier: 'STANDARD' },
  { key: 'PARENT_PORTAL', name: 'Parent Portal', description: 'Parent portal access', tier: 'STANDARD' },
  { key: 'MESSAGING', name: 'Messaging', description: 'Internal messaging system', tier: 'STANDARD' },
  { key: 'ANNOUNCEMENTS', name: 'Announcements', description: 'School announcements', tier: 'STANDARD' },
  { key: 'DOCUMENT_MANAGEMENT', name: 'Document Management', description: 'Document upload and management', tier: 'STANDARD' },
  { key: 'TRANSPORT_MANAGEMENT', name: 'Transport Management', description: 'Transport and route management', tier: 'STANDARD' },
  { key: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics', description: 'Advanced analytics and insights', tier: 'ULTIMATE' },
  { key: 'CUSTOM_BRANDING', name: 'Custom Branding', description: 'Custom branding and white-labeling', tier: 'ULTIMATE' },
  { key: 'API_ACCESS', name: 'API Access', description: 'API access for integrations', tier: 'ULTIMATE' },
  { key: 'BULK_OPERATIONS', name: 'Bulk Operations', description: 'Bulk data import/export operations', tier: 'ULTIMATE' },
  { key: 'PRIORITY_SUPPORT', name: 'Priority Support', description: 'Priority customer support', tier: 'ULTIMATE' },
  { key: 'CUSTOM_INTEGRATIONS', name: 'Custom Integrations', description: 'Third-party integrations', tier: 'ULTIMATE' },
  { key: 'ADVANCED_REPORTING', name: 'Advanced Reporting', description: 'Advanced custom reports', tier: 'ULTIMATE' },
  { key: 'DATA_EXPORT', name: 'Data Export', description: 'Full data export capabilities', tier: 'ULTIMATE' },
  { key: 'SIREN_ALERT', name: 'Siren Alert System', description: 'Emergency siren management and scheduling', tier: 'ULTIMATE' },
];

export const getFeaturesByTier = (tier: PlanTier): typeof FEATURE_LIST => {
  const tierOrder: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];
  const tierIndex = tierOrder.indexOf(tier);
  return FEATURE_LIST.filter((f) => tierOrder.indexOf(f.tier as PlanTier) <= tierIndex);
};
