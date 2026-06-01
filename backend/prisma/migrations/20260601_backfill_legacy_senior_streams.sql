-- Backfill legacy demo/import data that predates senior stream assignment.
-- Existing explicit stream values are preserved.
WITH senior_sections AS (
  SELECT
    s.id,
    CASE
      WHEN UPPER(s.name) = 'A' THEN 'NATURAL'
      WHEN UPPER(s.name) = 'B' THEN 'SOCIAL'
      ELSE NULL
    END AS stream
  FROM "Section" s
  JOIN "Class" c ON c.id = s."classId"
  WHERE c.grade IN (11, 12)
    AND UPPER(s.name) IN ('A', 'B')
)
UPDATE "Section" s
SET "stream" = senior_sections.stream
FROM senior_sections
WHERE s.id = senior_sections.id
  AND senior_sections.stream IS NOT NULL
  AND (s."stream" IS NULL OR s."stream" = '');

WITH senior_student_streams AS (
  SELECT
    sp."userId",
    s."stream"
  FROM "StudentClass" sc
  JOIN "StudentProfile" sp ON sp."userId" = sc."studentId"
  JOIN "Class" c ON c.id = sc."classId"
  JOIN "Section" s ON s.id = sc."sectionId"
  WHERE c.grade IN (11, 12)
    AND s."stream" IN ('NATURAL', 'SOCIAL')
)
UPDATE "StudentProfile" sp
SET "stream" = senior_student_streams."stream"
FROM senior_student_streams
WHERE sp."userId" = senior_student_streams."userId"
  AND (sp."stream" IS NULL OR sp."stream" = '');

WITH senior_profile_streams AS (
  SELECT
    sp.id,
    s."stream"
  FROM "StudentProfile" sp
  JOIN "Class" c
    ON c."schoolId" = sp."schoolId"
   AND c.name = sp."className"
  JOIN "Section" s
    ON s."classId" = c.id
   AND s.name = sp.section
  WHERE c.grade IN (11, 12)
    AND s."stream" IN ('NATURAL', 'SOCIAL')
)
UPDATE "StudentProfile" sp
SET "stream" = senior_profile_streams."stream"
FROM senior_profile_streams
WHERE sp.id = senior_profile_streams.id
  AND (sp."stream" IS NULL OR sp."stream" = '');
