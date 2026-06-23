ALTER TABLE "PracticeExam"
  ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;

CREATE INDEX IF NOT EXISTS "PracticeExam_academicYearId_idx" ON "PracticeExam"("academicYearId");

DO $$ BEGIN
  ALTER TABLE "PracticeExam" ADD CONSTRAINT "PracticeExam_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
