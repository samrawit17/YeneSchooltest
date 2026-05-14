-- Attach legacy payments to the curriculum period they paid for.
-- Direct period fees inherit StudentFee.termId; annual fees are inferred from paymentDate.

UPDATE "Payment" AS p
SET "termId" = sf."termId"
FROM "StudentFee" AS sf
WHERE p."studentFeeId" = sf.id
  AND p."termId" IS NULL
  AND sf."termId" IS NOT NULL;

UPDATE "Payment" AS p
SET "termId" = t.id
FROM "StudentFee" AS sf
JOIN "Term" AS t
  ON t."academicYearId" = sf."academicYearId"
WHERE p."studentFeeId" = sf.id
  AND p."termId" IS NULL
  AND sf."termId" IS NULL
  AND p."paymentDate" >= t."startDate"
  AND p."paymentDate" <= t."endDate";
