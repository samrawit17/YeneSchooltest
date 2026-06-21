# Practice Exams Module

> Purpose: Online practice exams with auto-grading for student self-assessment.

---

## Status: ⚠️ Partial — Full grading pipeline may need verification

## Responsibilities
- Create practice exams with multiple question types
- Auto-grading for MCQ and True/False questions
- Student attempt tracking
- Performance analytics

## Features
- Question types: MCQ, True/False, Short Answer
- Auto-grading for MCQ and True/False
- Manual grading for Short Answer
- Time-limited exams
- Attempt tracking with scores
- Random question ordering
- Instant result display for auto-graded questions

## Database Entities
- `PracticeExam` — id, schoolId, title, description, type, timeLimit, status
- `PracticeExamQuestion` — id, practiceExamId, questionText, type, options (JSON), correctAnswer, points
- `PracticeExamAttempt` — id, practiceExamId, studentId, startedAt, completedAt, score, status
- `PracticeExamAnswer` — id, attemptId, questionId, answer, isCorrect, pointsEarned

## Permissions
- `TEACHER`: Create/manage practice exams
- `ADMIN`: Full management
- `STUDENT`: Take practice exams
- `PARENT`: View children's results

## Related Documents
- `backend/src/practice-exams/`
- `frontend/src/lib/api/practice-exams.ts`
- `frontend/src/app/(dashboard)/student/practice-exams/`
