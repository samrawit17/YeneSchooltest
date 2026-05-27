DO $$ BEGIN
  CREATE TYPE "PracticeExamStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PracticeExamAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PracticeExamOption" AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PracticeExam" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "grade" INTEGER NOT NULL,
  "stream" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "passMark" INTEGER NOT NULL DEFAULT 50,
  "status" "PracticeExamStatus" NOT NULL DEFAULT 'DRAFT',
  "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PracticeExamQuestion" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "optionA" TEXT NOT NULL,
  "optionB" TEXT NOT NULL,
  "optionC" TEXT NOT NULL,
  "optionD" TEXT NOT NULL,
  "correctOption" "PracticeExamOption" NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PracticeExamAttempt" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "PracticeExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "score" INTEGER,
  "percentage" DOUBLE PRECISION,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "wrongCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PracticeExamAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOption" "PracticeExamOption",
  "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  "isCorrect" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeExamAnswer_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PracticeExam" ADD CONSTRAINT "PracticeExam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExam" ADD CONSTRAINT "PracticeExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamQuestion" ADD CONSTRAINT "PracticeExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PracticeExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamQuestion" ADD CONSTRAINT "PracticeExamQuestion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamAttempt" ADD CONSTRAINT "PracticeExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PracticeExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamAttempt" ADD CONSTRAINT "PracticeExamAttempt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamAttempt" ADD CONSTRAINT "PracticeExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamAnswer" ADD CONSTRAINT "PracticeExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamAnswer" ADD CONSTRAINT "PracticeExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PracticeExamAnswer" ADD CONSTRAINT "PracticeExamAnswer_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PracticeExam_schoolId_grade_stream_idx" ON "PracticeExam"("schoolId", "grade", "stream");
CREATE INDEX IF NOT EXISTS "PracticeExam_schoolId_status_idx" ON "PracticeExam"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "PracticeExam_createdById_idx" ON "PracticeExam"("createdById");
CREATE INDEX IF NOT EXISTS "PracticeExamQuestion_examId_idx" ON "PracticeExamQuestion"("examId");
CREATE INDEX IF NOT EXISTS "PracticeExamQuestion_schoolId_subject_idx" ON "PracticeExamQuestion"("schoolId", "subject");
CREATE UNIQUE INDEX IF NOT EXISTS "PracticeExamAttempt_examId_studentId_key" ON "PracticeExamAttempt"("examId", "studentId");
CREATE INDEX IF NOT EXISTS "PracticeExamAttempt_examId_idx" ON "PracticeExamAttempt"("examId");
CREATE INDEX IF NOT EXISTS "PracticeExamAttempt_studentId_idx" ON "PracticeExamAttempt"("studentId");
CREATE INDEX IF NOT EXISTS "PracticeExamAttempt_schoolId_status_idx" ON "PracticeExamAttempt"("schoolId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PracticeExamAnswer_attemptId_questionId_key" ON "PracticeExamAnswer"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "PracticeExamAnswer_examId_studentId_idx" ON "PracticeExamAnswer"("examId", "studentId");
CREATE INDEX IF NOT EXISTS "PracticeExamAnswer_attemptId_idx" ON "PracticeExamAnswer"("attemptId");
CREATE INDEX IF NOT EXISTS "PracticeExamAnswer_questionId_idx" ON "PracticeExamAnswer"("questionId");
