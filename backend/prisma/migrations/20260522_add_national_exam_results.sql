CREATE TYPE "NationalExamType" AS ENUM ('GRADE_6_REGIONAL', 'GRADE_8_REGIONAL', 'GRADE_12_ESLCE');
CREATE TYPE "NationalExamSource" AS ENUM ('NEAEA', 'REGIONAL_BUREAU', 'MANUAL');
CREATE TYPE "NationalExamBatchStatus" AS ENUM ('DRAFT', 'IMPORTED', 'PUBLISHED');
CREATE TYPE "NationalExamResultStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'WITHHELD', 'ABSENT');

CREATE TABLE "NationalExamResultBatch" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT,
  "examType" "NationalExamType" NOT NULL,
  "examYear" TEXT NOT NULL,
  "source" "NationalExamSource" NOT NULL DEFAULT 'REGIONAL_BUREAU',
  "fileName" TEXT,
  "status" "NationalExamBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "cutoffScore" DOUBLE PRECISION,
  "importedById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NationalExamResultBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NationalExamResult" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT,
  "candidateNumber" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "stream" TEXT,
  "totalScore" DOUBLE PRECISION,
  "averageScore" DOUBLE PRECISION,
  "status" "NationalExamResultStatus" NOT NULL DEFAULT 'PENDING',
  "cutoffEligible" BOOLEAN,
  "remarks" TEXT,
  "rawData" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NationalExamResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NationalExamSubjectResult" (
  "id" TEXT NOT NULL,
  "resultId" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "gradeLetter" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NationalExamSubjectResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NationalExamResultBatch_schoolId_examType_examYear_idx" ON "NationalExamResultBatch"("schoolId", "examType", "examYear");
CREATE INDEX "NationalExamResultBatch_academicYearId_idx" ON "NationalExamResultBatch"("academicYearId");
CREATE INDEX "NationalExamResultBatch_status_idx" ON "NationalExamResultBatch"("status");
CREATE UNIQUE INDEX "NationalExamResult_batchId_candidateNumber_key" ON "NationalExamResult"("batchId", "candidateNumber");
CREATE INDEX "NationalExamResult_schoolId_candidateNumber_idx" ON "NationalExamResult"("schoolId", "candidateNumber");
CREATE INDEX "NationalExamResult_studentId_idx" ON "NationalExamResult"("studentId");
CREATE INDEX "NationalExamResult_status_idx" ON "NationalExamResult"("status");
CREATE UNIQUE INDEX "NationalExamSubjectResult_resultId_subjectName_key" ON "NationalExamSubjectResult"("resultId", "subjectName");
CREATE INDEX "NationalExamSubjectResult_resultId_idx" ON "NationalExamSubjectResult"("resultId");

ALTER TABLE "NationalExamResultBatch"
  ADD CONSTRAINT "NationalExamResultBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NationalExamResultBatch_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "NationalExamResultBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NationalExamResult"
  ADD CONSTRAINT "NationalExamResult_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "NationalExamResultBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NationalExamResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NationalExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NationalExamSubjectResult"
  ADD CONSTRAINT "NationalExamSubjectResult_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "NationalExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
