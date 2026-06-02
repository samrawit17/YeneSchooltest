CREATE INDEX IF NOT EXISTS "Communication_schoolId_createdAt_idx"
  ON "Communication" ("schoolId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CommunicationReply_communicationId_createdAt_idx"
  ON "CommunicationReply" ("communicationId", "createdAt" ASC);
