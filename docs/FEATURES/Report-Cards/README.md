# Report Cards Module

> Purpose: Student academic report card generation with approval workflow.

---

## Status: ⚠️ Partial — Publishing workflow may need verification

## Responsibilities
- Generate report cards with grades and attendance
- Report card lifecycle (DRAFT → PUBLISHED → ARCHIVED)
- Certificate template management
- Financial clearance check for report card release

## Features
- Report card generation with grades, marks, percentages, rank, attendance summary
- Lifecycle: DRAFT → PUBLISHED → ARCHIVED
- Financial clearance gate (check fees paid before publishing)
- Certificate templates (ID cards, certificates)
- Bulk report card operations
- Report card PDF generation

## Business Rules
- Report card lifecycle: DRAFT → PUBLISHED → ARCHIVED
- PUBLISHED report cards visible to students/parents
- ARCHIVED report cards cannot be modified
- Optional financial clearance check before publishing

## Database Entities
- `ReportCard` — id, schoolId, studentId, termId, status (DRAFT/PUBLISHED/ARCHIVED), marksJson, percentage, grade, rank, attendanceSummary, teacherRemarks
- `PromotionRecord` — id, schoolId, studentId, fromClassId, toClassId, academicYearId, status
- `Template` — id, schoolId, type, layout

## Permissions
- `ADMIN`: Generate, publish, archive report cards
- `TEACHER`: Enter remarks
- `STUDENT`: View published
- `PARENT`: View linked children's published

## Related Documents
- `backend/src/report-card/`
- `frontend/src/lib/api/reporting.ts`
- `docs/FEATURES/Gradebook/README.md`
- `docs/BUSINESS_RULES.md` (Section 5)
