-- Add academic_year_id to Announcement model
ALTER TABLE "Announcement"
ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcement_academic_year_fk'
  ) THEN
    ALTER TABLE "Announcement"
    ADD CONSTRAINT "announcement_academic_year_fk"
    FOREIGN KEY ("academicYearId")
    REFERENCES "AcademicYear"(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS "Announcement_academicYearId_idx"
ON "Announcement"("academicYearId");
