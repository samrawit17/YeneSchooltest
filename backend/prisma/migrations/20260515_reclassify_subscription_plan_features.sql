UPDATE "Plan"
SET
  name = 'Core',
  description = 'Basic school setup, users, attendance, calendar, and announcements',
  features = ARRAY[
    'SCHOOL_PROFILE',
    'USER_MANAGEMENT',
    'ACADEMIC_STRUCTURE',
    'ATTENDANCE_TRACKING',
    'ANNOUNCEMENTS',
    'SCHOOL_CALENDAR',
    'BASIC_REPORTS',
    'NOTIFICATIONS'
  ],
  "updatedAt" = now()
WHERE tier = 'CORE';

UPDATE "Plan"
SET
  name = 'Standard',
  description = 'Daily academic, finance, parent portal, messaging, and reporting workflows',
  features = ARRAY[
    'SCHOOL_PROFILE',
    'USER_MANAGEMENT',
    'ACADEMIC_STRUCTURE',
    'ATTENDANCE_TRACKING',
    'ANNOUNCEMENTS',
    'SCHOOL_CALENDAR',
    'BASIC_REPORTS',
    'NOTIFICATIONS',
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
    'REPORT_CARDS'
  ],
  "updatedAt" = now()
WHERE tier = 'STANDARD';

UPDATE "Plan"
SET
  name = 'Ultimate',
  description = 'Advanced automation, exam seating, rankings, bulk operations, siren, and exports',
  features = ARRAY[
    'SCHOOL_PROFILE',
    'USER_MANAGEMENT',
    'ACADEMIC_STRUCTURE',
    'ATTENDANCE_TRACKING',
    'ANNOUNCEMENTS',
    'SCHOOL_CALENDAR',
    'BASIC_REPORTS',
    'NOTIFICATIONS',
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
    'SIREN_ALERT'
  ],
  "updatedAt" = now()
WHERE tier = 'ULTIMATE';
