import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_FEATURE_KEY = 'subscription_features';

export const RequiresFeature = (...features: string[]) =>
  SetMetadata(SUBSCRIPTION_FEATURE_KEY, features);

export const RequiresTier = (tier: 'CORE' | 'STANDARD' | 'ULTIMATE') =>
  SetMetadata('minimumTier', tier);

export const CORE_FEATURES = [
  'SCHOOL_PROFILE',
  'USER_MANAGEMENT',
  'ACADEMIC_STRUCTURE',
  'ATTENDANCE_TRACKING',
  'ANNOUNCEMENTS',
  'SCHOOL_CALENDAR',
  'BASIC_REPORTS',
  'NOTIFICATIONS',
];

export const STANDARD_FEATURES = [
  ...CORE_FEATURES,
  'GRADE_MANAGEMENT',
  'TIMETABLE_MANAGEMENT',
  'LESSON_MANAGEMENT',
  'EXAM_MANAGEMENT',
  'FINANCE_MANAGEMENT',
  'PARENT_PORTAL',
  'MESSAGING',
  'COMMUNICATION_BOOK',
  'DOCUMENT_MANAGEMENT',
  'ENROLLMENT_MANAGEMENT',
  'CREDENTIAL_MANAGEMENT',
  'DISCIPLINE_MANAGEMENT',
  'REPORT_CARDS',
];

export const ULTIMATE_FEATURES = [
  ...STANDARD_FEATURES,
  'EXAM_SEATING',
  'STUDENT_PROMOTION',
  'STUDENT_RANKINGS',
  'STUDENT_ID_CARDS',
  'CERTIFICATE_TEMPLATES',
  'TEMPLATE_MANAGER',
  'ADVANCED_ANALYTICS',
  'CUSTOM_BRANDING',
  'BULK_OPERATIONS',
  'PRIORITY_SUPPORT',
  'ADVANCED_REPORTING',
  'DATA_EXPORT',
  'SIREN_ALERT',
];

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  SCHOOL_PROFILE: 'School profile and settings management',
  USER_MANAGEMENT: 'Basic user management and authentication',
  ACADEMIC_STRUCTURE: 'Classes, sections, subjects, assignments, and academic years',
  ATTENDANCE_TRACKING: 'Student attendance tracking',
  ANNOUNCEMENTS: 'School announcements',
  SCHOOL_CALENDAR: 'School calendar and events',
  BASIC_REPORTS: 'Basic reporting capabilities',
  NOTIFICATIONS: 'Push notifications and alerts',
  GRADE_MANAGEMENT: 'Grade entry and management',
  TIMETABLE_MANAGEMENT: 'Class and exam timetable management',
  LESSON_MANAGEMENT: 'Teacher, student, and parent lesson access',
  EXAM_MANAGEMENT: 'Exam scheduling and result management',
  EXAM_SEATING: 'Generate and manage exam seating arrangements',
  FINANCE_MANAGEMENT: 'Fee management and payment tracking',
  PARENT_PORTAL: 'Parent portal access',
  MESSAGING: 'Internal messaging system',
  COMMUNICATION_BOOK: 'Parent-teacher communication book',
  DOCUMENT_MANAGEMENT: 'Document upload and management',
  ENROLLMENT_MANAGEMENT: 'Student enrollment workflow',
  CREDENTIAL_MANAGEMENT: 'Credential and password reset management',
  DISCIPLINE_MANAGEMENT: 'Student discipline records',
  REPORT_CARDS: 'Report cards, published results, and parent grade views',
  STUDENT_PROMOTION: 'Student promotion workflow',
  STUDENT_RANKINGS: 'Student ranking and exam analytics',
  STUDENT_ID_CARDS: 'Student ID card generation',
  CERTIFICATE_TEMPLATES: 'Certificate template management',
  TEMPLATE_MANAGER: 'Reusable academic template management',
  ADVANCED_ANALYTICS: 'Advanced analytics and insights',
  CUSTOM_BRANDING: 'Custom branding and white-labeling',
  BULK_OPERATIONS: 'Bulk data import/export operations',
  PRIORITY_SUPPORT: 'Priority customer support',
  ADVANCED_REPORTING: 'Advanced custom reports',
  DATA_EXPORT: 'Full data export capabilities',
  SIREN_ALERT: 'Emergency siren management and scheduling',
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
