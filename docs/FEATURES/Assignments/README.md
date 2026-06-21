# Assignments Module

> Purpose: Homework and assignment management for teachers and students.

---

## Responsibilities
- Assignment creation and distribution
- Student submission tracking
- Grading of submissions
- Late submission handling

## Features
- Assignment creation with due dates
- File attachments support
- Student submissions (online upload)
- Submission status tracking (PENDING/SUBMITTED/GRADED/LATE/MISSING)
- Resource attachments (worksheets, reading materials, handouts)

## Database Entities
- `Content` — id, schoolId, type (LESSON/HOMEWORK/ASSIGNMENT), title, description, dueDate
- `ContentSubmission` — id, schoolId, contentId, studentId, status, grade, feedback
- `ContentAttachment` — id, schoolId, contentId, fileUrl, type
- `ContentResource` — id, schoolId, contentId, type, url

## Permissions
- `TEACHER`: Create/manage assignments, grade submissions
- `STUDENT`: View assignments, submit work
- `PARENT`: View children's assignments

## Related Documents
- `docs/FEATURES/Lessons/README.md`
- `backend/src/lesson/`
