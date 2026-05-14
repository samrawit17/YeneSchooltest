ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "termId" TEXT;

CREATE INDEX IF NOT EXISTS "Payment_termId_idx" ON "Payment"("termId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_term_fk'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "payment_term_fk"
      FOREIGN KEY ("termId")
      REFERENCES "Term"(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
