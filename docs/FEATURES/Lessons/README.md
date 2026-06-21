# Lessons Module

> Purpose: Lesson planning, delivery tracking, and content management.

---

## Responsibilities
- Lesson plan creation and management
- Lesson status tracking (DRAFT → PUBLISHED → COVERED)
- Syllabus mapping to Ethiopian MoE curriculum
- Content resource management
- Lesson bundle creation

## Features
- Lesson plans with objectives, materials, activities
- Lesson status workflow: DRAFT → PENDING_REVIEW → PUBLISHED → COVERED/MISSED/RESCHEDULED
- Syllabus mapping for Ethiopian Ministry of Education curriculum
- Resource attachments (worksheets, handouts, exam prep)
- Lesson bundles for multi-day lesson grouping
- Lesson query and filtering by class/subject/date range

## Database Entities
- `Content` — id, schoolId, type (LESSON/HOMEWORK/ASSIGNMENT), title, description, status, date
- `ContentSubmission` — id, schoolId, contentId, studentId, status, grade, feedback
- `ContentAttachment` — id, schoolId, contentId, fileUrl, type
- `ContentResource` — id, schoolId, contentId, type, url
- `SyllabusMapping` — id, schoolId, subjectId, gradeLevel, topic, code, objectives

## Permissions
- `TEACHER`: Create/manage lessons for assigned classes
- `ADMIN`: Review and approve lesson plans
- `STUDENT`: View published lessons
- `PARENT`: View children's lessons

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /lessons | List lessons with filters |
| POST | /lessons | Create lesson |
| POST | /lessons/bundle | Create lesson bundle |
| GET | /lessons/:id | Get lesson details |
| PATCH | /lessons/:id | Update lesson |
| POST | /lessons/:id/submit | Submit lesson for review |
| POST | /lessons/:id/approve | Approve lesson |

## Related Documents
- `docs/FEATURES/Assignments/README.md`
- `backend/src/lesson/`
- `frontend/src/lib/api/content.ts`
