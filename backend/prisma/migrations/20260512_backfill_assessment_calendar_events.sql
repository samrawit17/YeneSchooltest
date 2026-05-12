WITH targets AS (
  SELECT
    a.id,
    a."schoolId",
    a.title,
    a.type,
    a."startDate",
    a."endDate",
    a."createdBy",
    concat('asev_', substr(md5(a.id), 1, 20)) AS event_id
  FROM "Assessment" a
  WHERE a."calendarEventId" IS NULL
    AND upper(a.type) IN ('MID', 'MID_EXAM', 'FINAL', 'FINAL_EXAM', 'TEST')
),
inserted AS (
  INSERT INTO "SchoolEvent" (
    id,
    "schoolId",
    title,
    description,
    "startDate",
    "endDate",
    audience,
    category,
    color,
    "createdById",
    "createdAt",
    "updatedAt"
  )
  SELECT
    t.event_id,
    t."schoolId",
    t.title,
    initcap(replace(lower(t.type), '_', ' ')) || ' scheduled for score entry and school calendar visibility.',
    t."startDate",
    t."endDate",
    '["ADMIN","TEACHER","STUDENT","PARENT"]',
    'ACADEMIC',
    '#e35336',
    t."createdBy",
    now(),
    now()
  FROM targets t
)
UPDATE "Assessment" a
SET "calendarEventId" = t.event_id
FROM targets t
WHERE a.id = t.id;
