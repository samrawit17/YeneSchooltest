CREATE TABLE IF NOT EXISTS "PromotionRecord" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "fromClassId" TEXT NOT NULL,
  "toClassId" TEXT,
  "fromAcademicYear" TEXT NOT NULL,
  "toAcademicYear" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reportCardId" TEXT,
  "averageGrade" DOUBLE PRECISION,
  "attendance" DOUBLE PRECISION,
  "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PromotionRecord_schoolId_fromAcademicYear_idx"
  ON "PromotionRecord" ("schoolId", "fromAcademicYear");

CREATE INDEX IF NOT EXISTS "PromotionRecord_studentId_idx"
  ON "PromotionRecord" ("studentId");

CREATE INDEX IF NOT EXISTS "PromotionRecord_fromClassId_idx"
  ON "PromotionRecord" ("fromClassId");

CREATE INDEX IF NOT EXISTS "PromotionRecord_toClassId_idx"
  ON "PromotionRecord" ("toClassId");

CREATE INDEX IF NOT EXISTS "PromotionRecord_promotedAt_idx"
  ON "PromotionRecord" ("promotedAt");

ALTER TABLE "PromotionRecord"
  ADD CONSTRAINT "PromotionRecord_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromotionRecord"
  ADD CONSTRAINT "PromotionRecord_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromotionRecord"
  ADD CONSTRAINT "PromotionRecord_fromClassId_fkey"
  FOREIGN KEY ("fromClassId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromotionRecord"
  ADD CONSTRAINT "PromotionRecord_toClassId_fkey"
  FOREIGN KEY ("toClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromotionRecord"
  ADD CONSTRAINT "PromotionRecord_reportCardId_fkey"
  FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
