DO $$ BEGIN
  CREATE TYPE "DocumentTemplateType" AS ENUM ('CERTIFICATE', 'ID_CARD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Template" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "type" "DocumentTemplateType" NOT NULL,
  "name" TEXT NOT NULL,
  "backgroundUrl" TEXT NOT NULL,
  "fieldMapJson" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Template"
    ADD CONSTRAINT "Template_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Template"
    ADD CONSTRAINT "Template_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Template_schoolId_type_idx" ON "Template"("schoolId", "type");
CREATE INDEX IF NOT EXISTS "Template_schoolId_isActive_idx" ON "Template"("schoolId", "isActive");
CREATE INDEX IF NOT EXISTS "Template_createdById_idx" ON "Template"("createdById");
