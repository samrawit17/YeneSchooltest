-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEND_SMS', 'SEND_EMAIL', 'PUSH_NOTIFICATION', 'CREATE_ALERT', 'UPDATE_DATABASE_FIELD');

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventTrigger" TEXT NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecutionLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT,
    "eventType" TEXT NOT NULL,
    "eventPayload" JSONB,
    "status" TEXT NOT NULL,
    "executedActions" JSONB,
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRule_schoolId_eventTrigger_idx" ON "AutomationRule"("schoolId", "eventTrigger");

-- CreateIndex
CREATE INDEX "AutomationRule_schoolId_isActive_idx" ON "AutomationRule"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "AutomationExecutionLog_schoolId_triggeredAt_idx" ON "AutomationExecutionLog"("schoolId", "triggeredAt");

-- CreateIndex
CREATE INDEX "AutomationExecutionLog_ruleId_triggeredAt_idx" ON "AutomationExecutionLog"("ruleId", "triggeredAt");

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecutionLog" ADD CONSTRAINT "AutomationExecutionLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
