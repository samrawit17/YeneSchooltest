# Gradebook Module

> Purpose: Comprehensive grading system with components, scales, scoring, and approval workflow.

---

## Responsibilities
- Grading component definitions (CA, Midterm, Final, etc.)
- Score entry per student per component
- Grade computation from weighted components
- Grade approval workflow (DRAFT → SUBMITTED → APPROVED / REJECTED)
- Grade scales definition (A, B, C, D, F)
- Grade change tracking via GradeChangeLog

## Features
- Configurable grading components per subject
- Grade scale definition (letter grades, percentage ranges)
- Score entry with validation
- Weighted final grade computation
- Grade submission workflow with admin approval
- Complete audit trail via GradeChangeLog
- Grade reports per student, class, and subject

## Business Rules
- Teachers create GradingComponents per subject
- Grade lifecycle: DRAFT → SUBMITTED → APPROVED / REJECTED
- GradeChangeLog tracks every modification with user, timestamp, and change details
- GradeScale defines letter grade ranges per school
- Final grade computed from weighted component scores
- Submitted grades cannot be edited without rejection

## Database Entities
- `GradingComponent` — id, schoolId, name, weight, maxScore, classSubjectId
- `GradeScore` — id, schoolId, gradingComponentId, studentId, score, markedBy
- `SubjectGrade` — id, schoolId, studentId, classSubjectId, termId, totalScore, letterGrade, status
- `GradeScale` — id, schoolId, name, gradeRanges (JSON)
- `GradeChangeLog` — id, schoolId, gradeScoreId, userId, oldValue, newValue, reason

## Permissions
- `TEACHER`: Create components, enter scores, submit grades
- `ADMIN`: Approve/reject grades, define grade scales
- `STUDENT`: View own grades
- `PARENT`: View linked children's grades

## Workflows
```
Teacher defines GradingComponents → Enters GradeScore per student
  → SubjectGrade computed (DRAFT) → Teacher submits (SUBMITTED)
    → Admin approves (APPROVED) or rejects (REJECTED)
      → If rejected → Teacher edits and resubmits
```

## Validation Rules
- Score must be ≤ component maxScore
- Grade can only be submitted if all component scores exist
- Once APPROVED, grade cannot be modified (admin override with audit log)
- Grade range must map to valid letter grades in school's GradeScale

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /grading/components | List grading components |
| POST | /grading/components | Create component |
| GET | /grading/scores | Get scores |
| POST | /grading/scores | Enter score |
| POST | /grading/submit | Submit grades for approval |
| POST | /grading/approve | Approve grades |
| POST | /grading/reject | Reject grades |
| GET | /grading/scales | List grade scales |
| POST | /grading/scales | Create grade scale |

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 4) — Grading rules
- `docs/FEATURES/Examinations/README.md` — Related exam grading
- `docs/FEATURES/Reports/README.md` — Report card generation
- `backend/src/grading/` — Implementation
- `frontend/src/lib/api/assessment.ts` — API client
