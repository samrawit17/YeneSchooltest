ALTER TABLE "PracticeExam" ADD COLUMN "accessCode" TEXT;

UPDATE "PracticeExam"
SET "accessCode" = upper(substr(replace(id, 'c', ''), 1, 6))
WHERE "accessCode" IS NULL OR btrim("accessCode") = '';

ALTER TABLE "PracticeExam" ALTER COLUMN "accessCode" SET NOT NULL;
