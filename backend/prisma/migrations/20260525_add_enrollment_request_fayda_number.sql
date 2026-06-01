ALTER TABLE "EnrollmentRequest" ADD COLUMN IF NOT EXISTS "faydaNumber" TEXT;

CREATE INDEX IF NOT EXISTS "EnrollmentRequest_faydaNumber_idx"
  ON "EnrollmentRequest"("faydaNumber");
