ALTER TABLE "Assessment"
ADD COLUMN "calendarEventId" TEXT;

ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_calendarEventId_fkey"
FOREIGN KEY ("calendarEventId")
REFERENCES "SchoolEvent"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Assessment_calendarEventId_key"
ON "Assessment"("calendarEventId");
