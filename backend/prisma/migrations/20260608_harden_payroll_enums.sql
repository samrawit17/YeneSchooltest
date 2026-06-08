DO $$
BEGIN
  CREATE TYPE "PayrollFrequency" AS ENUM ('MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayrollEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'HELD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayrollPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "PayrollSalary"
SET "payFrequency" = 'MONTHLY'
WHERE "payFrequency" IS NULL
   OR "payFrequency" NOT IN ('MONTHLY');

UPDATE "PayrollRun"
SET "periodCalendarType" = 'GREGORIAN'
WHERE "periodCalendarType" IS NULL
   OR "periodCalendarType" NOT IN ('GREGORIAN', 'ETHIOPIAN');

UPDATE "PayrollRun"
SET "status" = 'DRAFT'
WHERE "status" IS NULL
   OR "status" NOT IN ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

UPDATE "PayrollEntry"
SET "status" = 'PENDING'
WHERE "status" IS NULL
   OR "status" NOT IN ('PENDING', 'APPROVED', 'PAID', 'HELD');

UPDATE "PayrollEntry"
SET "paymentMethod" = NULL
WHERE "paymentMethod" IS NOT NULL
  AND "paymentMethod" NOT IN ('CASH', 'BANK_TRANSFER', 'CHEQUE');

ALTER TABLE "PayrollSalary"
  ALTER COLUMN "payFrequency" DROP DEFAULT,
  ALTER COLUMN "payFrequency" TYPE "PayrollFrequency" USING "payFrequency"::"PayrollFrequency",
  ALTER COLUMN "payFrequency" SET DEFAULT 'MONTHLY';

ALTER TABLE "PayrollRun"
  ALTER COLUMN "periodCalendarType" DROP DEFAULT,
  ALTER COLUMN "periodCalendarType" TYPE "CalendarType" USING "periodCalendarType"::"CalendarType",
  ALTER COLUMN "periodCalendarType" SET DEFAULT 'GREGORIAN',
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PayrollRunStatus" USING "status"::"PayrollRunStatus",
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "PayrollEntry"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PayrollEntryStatus" USING "status"::"PayrollEntryStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING',
  ALTER COLUMN "paymentMethod" TYPE "PayrollPaymentMethod" USING "paymentMethod"::"PayrollPaymentMethod";
