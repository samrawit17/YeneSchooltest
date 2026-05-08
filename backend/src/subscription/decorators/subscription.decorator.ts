import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_FEATURE_KEY = 'subscription_features';

export const RequiresFeature = (...features: string[]) =>
  SetMetadata(SUBSCRIPTION_FEATURE_KEY, features);

export const RequiresTier = (tier: 'CORE' | 'STANDARD' | 'ULTIMATE') =>
  SetMetadata('minimumTier', tier);

export const CORE_FEATURES = [
  'USER_MANAGEMENT',
  'BASIC_REPORTS',
  'NOTIFICATIONS',
  'SCHOOL_PROFILE',
];

export const STANDARD_FEATURES = [
  ...CORE_FEATURES,
  'ATTENDANCE_TRACKING',
  'GRADE_MANAGEMENT',
  'TIMETABLE_MANAGEMENT',
  'EXAM_MANAGEMENT',
  'FINANCE_MANAGEMENT',
  'PARENT_PORTAL',
  'MESSAGING',
  'ANNOUNCEMENTS',
  'DOCUMENT_MANAGEMENT',
];

export const ULTIMATE_FEATURES = [
  ...STANDARD_FEATURES,
  'EXAM_SEATING',
  'ADVANCED_ANALYTICS',
  'CUSTOM_BRANDING',
  'API_ACCESS',
  'BULK_OPERATIONS',
  'PRIORITY_SUPPORT',
  'CUSTOM_INTEGRATIONS',
  'ADVANCED_REPORTING',
  'DATA_EXPORT',
];

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  USER_MANAGEMENT: 'Basic user management and authentication',
  BASIC_REPORTS: 'Basic reporting capabilities',
  NOTIFICATIONS: 'Push notifications and alerts',
  SCHOOL_PROFILE: 'School profile management',
  ATTENDANCE_TRACKING: 'Student attendance tracking',
  GRADE_MANAGEMENT: 'Grade entry and management',
  TIMETABLE_MANAGEMENT: 'Class and exam timetable management',
  EXAM_MANAGEMENT: 'Exam scheduling and result management',
  EXAM_SEATING: 'Generate and manage exam seating arrangements',
  FINANCE_MANAGEMENT: 'Fee management and payment tracking',
  PARENT_PORTAL: 'Parent portal access',
  MESSAGING: 'Internal messaging system',
  ANNOUNCEMENTS: 'School announcements',
  DOCUMENT_MANAGEMENT: 'Document upload and management',
  ADVANCED_ANALYTICS: 'Advanced analytics and insights',
  CUSTOM_BRANDING: 'Custom branding and white-labeling',
  API_ACCESS: 'API access for integrations',
  BULK_OPERATIONS: 'Bulk data import/export operations',
  PRIORITY_SUPPORT: 'Priority customer support',
  CUSTOM_INTEGRATIONS: 'Third-party integrations',
  ADVANCED_REPORTING: 'Advanced custom reports',
  DATA_EXPORT: 'Full data export capabilities',
};

export const TIER_DESCRIPTIONS = {
  CORE: {
    name: 'Core',
    description: 'Essential features for basic school management',
    features: CORE_FEATURES,
  },
  STANDARD: {
    name: 'Standard',
    description: 'Complete school management with essential integrations',
    features: STANDARD_FEATURES,
  },
  ULTIMATE: {
    name: 'Ultimate',
    description: 'Full-featured platform with advanced capabilities',
    features: ULTIMATE_FEATURES,
  },
};
