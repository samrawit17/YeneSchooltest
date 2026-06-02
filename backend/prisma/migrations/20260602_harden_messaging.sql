CREATE INDEX IF NOT EXISTS "Conversation_schoolId_updatedAt_idx"
  ON "Conversation" ("schoolId", "updatedAt" DESC);
