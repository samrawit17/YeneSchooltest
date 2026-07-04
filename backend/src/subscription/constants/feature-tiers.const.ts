import { PlanTier } from '@prisma/client';

export const FEATURE_TIERS: Record<string, PlanTier> = {
  SCHOOL_PROFILE: 'CORE',
  USER_MANAGEMENT: 'CORE',
  ACADEMIC_STRUCTURE: 'CORE',
  ATTENDANCE_TRACKING: 'CORE',
  ANNOUNCEMENTS: 'CORE',
  SCHOOL_CALENDAR: 'CORE',
  BASIC_REPORTS: 'CORE',
  NOTIFICATIONS: 'CORE',
  GRADE_MANAGEMENT: 'STANDARD',
  TIMETABLE_MANAGEMENT: 'STANDARD',
  LESSON_MANAGEMENT: 'STANDARD',
  EXAM_MANAGEMENT: 'STANDARD',
  FINANCE_MANAGEMENT: 'STANDARD',
  PARENT_PORTAL: 'STANDARD',
  MESSAGING: 'STANDARD',
  COMMUNICATION_BOOK: 'STANDARD',
  DOCUMENT_MANAGEMENT: 'STANDARD',
  ENROLLMENT_MANAGEMENT: 'STANDARD',
  CREDENTIAL_MANAGEMENT: 'STANDARD',
  DISCIPLINE_MANAGEMENT: 'STANDARD',
  REPORT_CARDS: 'STANDARD',
  EXAM_SEATING: 'ULTIMATE',
  STUDENT_PROMOTION: 'ULTIMATE',
  STUDENT_RANKINGS: 'ULTIMATE',
  STUDENT_ID_CARDS: 'ULTIMATE',
  CERTIFICATE_TEMPLATES: 'ULTIMATE',
  TEMPLATE_MANAGER: 'ULTIMATE',
  ADVANCED_ANALYTICS: 'ULTIMATE',
  CUSTOM_BRANDING: 'ULTIMATE',
  BULK_OPERATIONS: 'ULTIMATE',
  PRIORITY_SUPPORT: 'ULTIMATE',
  ADVANCED_REPORTING: 'ULTIMATE',
  DATA_EXPORT: 'ULTIMATE',
  SIREN_ALERT: 'ULTIMATE',
};

export const TIER_HIERARCHY: Record<PlanTier, number> = {
  CORE: 1,
  STANDARD: 2,
  ULTIMATE: 3,
};

export const TIER_ORDER: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];

export const CORE_FEATURES = Object.entries(FEATURE_TIERS)
  .filter(([_, tier]) => tier === 'CORE')
  .map(([feature]) => feature);

export const STANDARD_FEATURES = Object.entries(FEATURE_TIERS)
  .filter(([_, tier]) => tier === 'CORE' || tier === 'STANDARD')
  .map(([feature]) => feature);

export const ULTIMATE_FEATURES = Object.keys(FEATURE_TIERS);

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  SCHOOL_PROFILE: 'School profile and settings management',
  USER_MANAGEMENT: 'Students, staff, parents, roles, duplicate checks, linking, and account setup',
  ACADEMIC_STRUCTURE: 'Guided classes, sections, subjects, teacher assignments, terms, and academic years',
  ATTENDANCE_TRACKING: 'Fast daily attendance with clear save state, class filters, and recovery-friendly tracking',
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

export const SUBSCRIPTION_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  [SUBSCRIPTION_STATUS.DRAFT]: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.CANCELLED],
  [SUBSCRIPTION_STATUS.ACTIVE]: [SUBSCRIPTION_STATUS.EXPIRED, SUBSCRIPTION_STATUS.CANCELLED],
  [SUBSCRIPTION_STATUS.EXPIRED]: [SUBSCRIPTION_STATUS.ACTIVE],
  [SUBSCRIPTION_STATUS.CANCELLED]: [SUBSCRIPTION_STATUS.ACTIVE],
};
