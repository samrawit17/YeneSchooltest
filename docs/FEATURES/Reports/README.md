# Reports Module

> Purpose: Report card generation, academic reporting, and data export.

---

## Responsibilities
- Report card generation (DRAFT → PUBLISHED → ARCHIVED)
- Academic performance reports
- Attendance reports
- Finance reports
- Data export (PDF, Excel)

## Features
- Report card generation with grades + attendance + remarks
- Report card lifecycle management
- Bulk report generation
- Promotion records and tracking
- Custom report templates

## Business Rules
- Report card lifecycle: DRAFT → PUBLISHED → ARCHIVED
- PUBLISHED report cards visible to students/parents
- ARCHIVED report cards cannot be modified
- PromotionRecord tracks student progression to next grade

## Database Entities
- `ReportCard` — id, schoolId, studentId, termId, status, grades, attendanceSummary, remarks
- `PromotionRecord` — id, schoolId, studentId, fromGrade, toGrade, academicYearId, status

## Permissions
- `ADMIN`: Generate, publish, archive report cards
- `TEACHER`: Enter remarks, view draft
- `STUDENT`: View published report cards
- `PARENT`: View linked children's published report cards

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 5) — Report card rules
- `docs/FEATURES/Gradebook/README.md` — Grading input
- `backend/src/report-card/` — Implementation
- `frontend/src/lib/api/reporting.ts` — API client
