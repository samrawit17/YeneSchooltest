DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PracticeExamQuestionType') THEN
    CREATE TYPE "PracticeExamQuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT_ANSWER');
  END IF;
END $$;

ALTER TABLE "PracticeExamQuestion"
  ADD COLUMN IF NOT EXISTS "questionType" "PracticeExamQuestionType" NOT NULL DEFAULT 'MCQ',
  ADD COLUMN IF NOT EXISTS "correctText" TEXT,
  ADD COLUMN IF NOT EXISTS "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "optionA" DROP NOT NULL,
  ALTER COLUMN "optionB" DROP NOT NULL,
  ALTER COLUMN "optionC" DROP NOT NULL,
  ALTER COLUMN "optionD" DROP NOT NULL,
  ALTER COLUMN "correctOption" DROP NOT NULL;

ALTER TABLE "PracticeExamAnswer"
  ADD COLUMN IF NOT EXISTS "textAnswer" TEXT;
