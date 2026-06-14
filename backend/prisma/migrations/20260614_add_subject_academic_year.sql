-- Add academic_year_id to Subject model
ALTER TABLE "Subject"
ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subject_academic_year_fk'
  ) THEN
    ALTER TABLE "Subject"
    ADD CONSTRAINT "subject_academic_year_fk"
    FOREIGN KEY ("academicYearId")
    REFERENCES "AcademicYear"(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS "Subject_academicYearId_idx"
ON "Subject"("academicYearId");
