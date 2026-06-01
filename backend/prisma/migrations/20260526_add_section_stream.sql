ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "stream" TEXT;

UPDATE "Section" s
SET "stream" = stream_counts.stream
FROM (
  SELECT
    sc."sectionId",
    sp.stream,
    COUNT(*) AS stream_count,
    ROW_NUMBER() OVER (
      PARTITION BY sc."sectionId"
      ORDER BY COUNT(*) DESC, sp.stream ASC
    ) AS stream_rank
  FROM "StudentClass" sc
  JOIN "StudentProfile" sp ON sp."userId" = sc."studentId"
  JOIN "Class" c ON c.id = sc."classId"
  WHERE c.grade IN (11, 12)
    AND sp.stream IN ('NATURAL', 'SOCIAL')
  GROUP BY sc."sectionId", sp.stream
) stream_counts
WHERE s.id = stream_counts."sectionId"
  AND stream_counts.stream_rank = 1
  AND s."stream" IS NULL;
