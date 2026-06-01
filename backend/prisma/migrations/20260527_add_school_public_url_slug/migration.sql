ALTER TABLE "School" ADD COLUMN "publicUrlSlug" TEXT;

WITH generated AS (
  SELECT
    id,
    lower(
      trim(
        both '-' from regexp_replace(
          regexp_replace(name, '[^[:alnum:]]+', '-', 'g'),
          '-+',
          '-',
          'g'
        )
      )
    ) AS base_slug,
    row_number() OVER (
      PARTITION BY lower(
        trim(
          both '-' from regexp_replace(
            regexp_replace(name, '[^[:alnum:]]+', '-', 'g'),
            '-+',
            '-',
            'g'
          )
        )
      )
      ORDER BY "createdAt", id
    ) AS duplicate_number
  FROM "School"
)
UPDATE "School" s
SET "publicUrlSlug" = CASE
  WHEN generated.base_slug = '' THEN s.id
  WHEN generated.duplicate_number = 1 THEN generated.base_slug
  ELSE generated.base_slug || '-' || generated.duplicate_number
END
FROM generated
WHERE generated.id = s.id;

ALTER TABLE "School" ALTER COLUMN "publicUrlSlug" SET NOT NULL;
CREATE UNIQUE INDEX "School_publicUrlSlug_key" ON "School"("publicUrlSlug");
