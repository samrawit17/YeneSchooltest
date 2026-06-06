CREATE TABLE IF NOT EXISTS "translation_caches" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT,
  "provider" TEXT NOT NULL,
  "sourceLanguage" TEXT NOT NULL,
  "targetLanguage" TEXT NOT NULL,
  "textHash" TEXT NOT NULL,
  "translatedText" TEXT NOT NULL,
  "reviewedText" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "translation_caches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "translation_caches_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "translation_caches_school_provider_source_target_hash_idx"
  ON "translation_caches" ("schoolId", "provider", "sourceLanguage", "targetLanguage", "textHash");

CREATE INDEX IF NOT EXISTS "translation_caches_school_target_idx"
  ON "translation_caches" ("schoolId", "targetLanguage");

CREATE UNIQUE INDEX IF NOT EXISTS "translation_caches_scope_provider_source_target_hash_key"
  ON "translation_caches" (
    COALESCE("schoolId", '__global__'),
    "provider",
    "sourceLanguage",
    "targetLanguage",
    "textHash"
  );
