-- Create baseline tables that were part of the initial prisma db push
CREATE TABLE IF NOT EXISTS "Exam" (
    id TEXT PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'QUIZ',
    title TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    weightage DOUBLE PRECISION NOT NULL DEFAULT 1,
    description TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add published field to Exam model
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add missing foreign key indexes for Exam
CREATE INDEX IF NOT EXISTS "Exam_schoolId_idx" ON "Exam"("schoolId");
CREATE INDEX IF NOT EXISTS "Exam_classId_idx" ON "Exam"("classId");
CREATE INDEX IF NOT EXISTS "Exam_sectionId_idx" ON "Exam"("sectionId");
CREATE INDEX IF NOT EXISTS "Exam_subjectId_idx" ON "Exam"("subjectId");
