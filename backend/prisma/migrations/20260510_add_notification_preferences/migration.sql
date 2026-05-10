CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "commBookEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "timetableEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "attendanceEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "announcementsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "assignmentsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "examsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "feesEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "eventsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
