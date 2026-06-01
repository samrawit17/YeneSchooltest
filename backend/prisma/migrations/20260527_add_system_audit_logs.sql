CREATE TABLE IF NOT EXISTS "SystemAuditLog" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT,
  "userId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SystemAuditLog_schoolId_createdAt_idx"
  ON "SystemAuditLog" ("schoolId", "createdAt");

CREATE INDEX IF NOT EXISTS "SystemAuditLog_userId_createdAt_idx"
  ON "SystemAuditLog" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "SystemAuditLog_action_createdAt_idx"
  ON "SystemAuditLog" ("action", "createdAt");

CREATE INDEX IF NOT EXISTS "SystemAuditLog_entityType_entityId_idx"
  ON "SystemAuditLog" ("entityType", "entityId");
