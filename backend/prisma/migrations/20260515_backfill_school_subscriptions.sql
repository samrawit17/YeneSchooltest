INSERT INTO "Subscription" (
  id,
  "schoolId",
  "planId",
  status,
  "startDate",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('sub_', s.id),
  s.id,
  s."planId",
  'ACTIVE',
  COALESCE(s."planAssignedAt", now()),
  now(),
  now()
FROM "School" s
WHERE s."planId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Subscription" existing
    WHERE existing."schoolId" = s.id
  );

