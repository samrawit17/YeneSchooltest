ALTER TABLE "Announcement"
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Announcement_isPublic_startDate_endDate_idx"
  ON "Announcement" ("isPublic", "startDate", "endDate");
