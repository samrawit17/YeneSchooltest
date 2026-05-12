ALTER TABLE "Assessment"
ALTER COLUMN "type" TYPE TEXT
USING "type"::text;

ALTER TABLE "AssessmentWeight"
ALTER COLUMN "type" TYPE TEXT
USING "type"::text;

DROP TYPE IF EXISTS "AssessmentType";
