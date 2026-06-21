# Examinations Module

> Purpose: Exam management, scheduling, seating plans, results tracking, and national exam integration.

---

## Responsibilities
- Exam creation and scheduling
- Exam seating plan generation
- Exam result entry and management
- National exam result tracking
- Practice exams with auto-grading

## Features
- Exam definition (midterm, final, quiz, etc.)
- Exam seating plans with room/seat assignment
- National exam results tracking (batch import, subject-level)
- Practice exams (MCQ, True/False, Short Answer) with auto-grading
- Exam results publication workflow
- Exam timetables

## Business Rules
- Exam seating plans generate random or arranged seating per section
- National exam results track subject-level performance per student
- Practice exams support auto-grading for MCQ and True/False
- Exam results cannot be modified after PUBLISHED status
- ExamSectionStudent assigns individual seats

## Database Entities
- `Exam` — id, schoolId, name, type, date, duration, status
- `ExamResult` — id, schoolId, examId, studentId, score, grade
- `NationalExamResult` — id, schoolId, studentId, year, totalScore
- `NationalExamResultBatch` — id, schoolId, year, uploadedAt
- `NationalExamSubjectResult` — id, schoolId, nationalExamResultId, subject, score
- `ExamSeatingPlan` — id, schoolId, examId, layout
- `ExamSectionAssignment` — id, schoolId, seatingPlanId, sectionId, room
- `ExamSectionStudent` — id, schoolId, assignmentId, studentId, seatNumber
- `PracticeExam` — id, schoolId, title, type, timeLimit
- `PracticeExamQuestion` — id, practiceExamId, questionText, type, options, correctAnswer
- `PracticeExamAttempt` — id, practiceExamId, studentId, startedAt, completedAt, score
- `PracticeExamAnswer` — id, attemptId, questionId, answer, isCorrect

## Permissions
- `ADMIN`: Create/manage exams, seating plans
- `TEACHER`: Create practice exams, enter results
- `STUDENT`: View own exam schedule and results, take practice exams
- `PARENT`: View linked children's exam results

## Workflows
```
Seating: Create Exam → Create ExamSeatingPlan → Create ExamSectionAssignment
  → Assign ExamSectionStudent → Generate seating layout

Results: Enter scores → Validate → Publish → Visible to students/parents

Practice Exams: Create PracticeExam → Add Questions → Student Attempts
  → Auto-graded → Score displayed
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /exams | List exams |
| POST | /exams | Create exam |
| GET | /exams/seating-plans | Get seating plans |
| POST | /exams/seating-plans | Create seating plan |
| GET | /exams/results | Get exam results |
| POST | /exams/results | Enter results |
| GET | /practice-exams | List practice exams |
| POST | /practice-exams/:id/attempt | Start attempt |
| POST | /practice-exams/attempt/:id/submit | Submit attempt |

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 10) — Exam rules
- `docs/FEATURES/Gradebook/README.md` — Related grading
- `backend/src/exams/` — Implementation
- `backend/src/practice-exams/` — Practice exam implementation
