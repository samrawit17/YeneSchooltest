-- Add published field to Exam model
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT FALSE;