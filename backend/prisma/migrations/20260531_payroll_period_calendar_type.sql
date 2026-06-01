ALTER TABLE "PayrollRun"
ADD COLUMN IF NOT EXISTS "periodCalendarType" TEXT NOT NULL DEFAULT 'GREGORIAN';

DROP INDEX IF EXISTS "PayrollRun_school_period_key";

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_school_period_calendar_key"
ON "PayrollRun"("schoolId", "periodCalendarType", "periodYear", "periodMonth");
