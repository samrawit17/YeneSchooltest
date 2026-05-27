ALTER TYPE "PracticeExamStatus" ADD VALUE IF NOT EXISTS 'READY';

ALTER TABLE "PracticeExam"
  ADD COLUMN IF NOT EXISTS "classId" TEXT,
  ADD COLUMN IF NOT EXISTS "sectionId" TEXT,
  ADD COLUMN IF NOT EXISTS "subjectId" TEXT;

CREATE INDEX IF NOT EXISTS "PracticeExam_classId_idx" ON "PracticeExam"("classId");
CREATE INDEX IF NOT EXISTS "PracticeExam_sectionId_idx" ON "PracticeExam"("sectionId");
CREATE INDEX IF NOT EXISTS "PracticeExam_subjectId_idx" ON "PracticeExam"("subjectId");
