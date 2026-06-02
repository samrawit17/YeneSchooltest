UPDATE "Plan"
SET
  name = CASE WHEN lower(name) = 'core' THEN 'Core' ELSE name END,
  description = COALESCE(
    NULLIF(description, ''),
    'Guided school setup, reliable user management, daily attendance, calendar, and announcements'
  ),
  features = ARRAY(
    SELECT DISTINCT feature
    FROM unnest(
      COALESCE(features, ARRAY[]::text[]) ||
      ARRAY[
        'SCHOOL_PROFILE',
        'USER_MANAGEMENT',
        'ACADEMIC_STRUCTURE',
        'ATTENDANCE_TRACKING',
        'ANNOUNCEMENTS',
        'SCHOOL_CALENDAR',
        'BASIC_REPORTS',
        'NOTIFICATIONS'
      ]
    ) AS feature
  ),
  "updatedAt" = now()
WHERE tier IN ('CORE', 'STANDARD', 'ULTIMATE');
