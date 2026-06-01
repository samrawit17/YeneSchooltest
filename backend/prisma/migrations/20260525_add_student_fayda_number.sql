ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "faydaNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_faydaNumber_key"
  ON "StudentProfile"("faydaNumber")
  WHERE "faydaNumber" IS NOT NULL;
