# Assessments Module

> Purpose: Assessment calendar, scheduling, and configuration.

---

## Responsibilities
- Assessment type definition and configuration
- Assessment scheduling per class/subject
- Weight configuration per assessment type
- Assessment status tracking (DRAFT/ACTIVE/LOCKED/COMPLETED)

## Features
- Assessment types (Quiz, Midterm, Final, Practical, Assignment)
- Assessment calendar with dates and deadlines
- Subject-specific assessment configuration
- Weight allocation per assessment type per school
- Score entry workflow (DRAFT → SUBMITTED)

## Database Entities
- `Assessment` — id, schoolId, name, type, status, startDate, endDate
- `AssessmentSubject` — id, schoolId, assessmentId, classId, sectionId, subjectId, teacherId
- `StudentAssessmentScore` — id, schoolId, assessmentSubjectId, studentId, score, status
- `AssessmentWeight` — id, schoolId, assessmentType, weight, academicYearId

## Permissions
- `ADMIN`: Create assessments, define weights
- `TEACHER`: Enter scores for assigned subjects
- `STUDENT`: View own scores

## Related Documents
- `docs/FEATURES/Examinations/README.md`
- `docs/FEATURES/Gradebook/README.md`
- `backend/src/assessments/`
