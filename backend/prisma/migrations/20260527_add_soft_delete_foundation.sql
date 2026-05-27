ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "Enrollment"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "ReportCard"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "Grade"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "StudentFee"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

CREATE INDEX IF NOT EXISTS "User_deletedAt_idx"
  ON "User" ("deletedAt");

CREATE INDEX IF NOT EXISTS "Enrollment_schoolId_deletedAt_idx"
  ON "Enrollment" ("schoolId", "deletedAt");

CREATE INDEX IF NOT EXISTS "StudentProfile_schoolId_deletedAt_idx"
  ON "StudentProfile" ("schoolId", "deletedAt");

CREATE INDEX IF NOT EXISTS "ReportCard_schoolId_deletedAt_idx"
  ON "ReportCard" ("schoolId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Grade_schoolId_deletedAt_idx"
  ON "Grade" ("schoolId", "deletedAt");

CREATE INDEX IF NOT EXISTS "StudentFee_schoolId_deletedAt_idx"
  ON "StudentFee" ("schoolId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Payment_schoolId_deletedAt_idx"
  ON "Payment" ("schoolId", "deletedAt");
