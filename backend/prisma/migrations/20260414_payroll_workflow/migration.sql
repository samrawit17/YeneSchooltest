-- Payroll Workflow Migration
-- Run this SQL to add workflow status to existing database

-- 1. Add new status values to enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBMITTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PayrollStatus')) THEN
        ALTER TYPE "PayrollStatus" ADD VALUE 'SUBMITTED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_PAYMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PayrollStatus')) THEN
        ALTER TYPE "PayrollStatus" ADD VALUE 'PENDING_PAYMENT';
    END IF;
END $$;

-- 2. Add new columns to Payroll table
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "submittedById" TEXT;
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMPTZ;
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS "Payroll_submittedById_fkey" ON "Payroll" ("submittedById");

-- 4. Add foreign key constraints (run separately if needed)
-- ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_submittedBy_fk" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- Note: Run step 4 separately after ensuring no FK conflicts
-- ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_processedBy_fk" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL;
-- ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_submittedBy_fk" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL;