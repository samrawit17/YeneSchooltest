# Promotion Module

> Purpose: Student promotion to next grade level.

---

## Status: ⚠️ Partial — Logic may need review

## Responsibilities
- Promote students to next grade level
- Track promotion history
- Handle failed/pending promotions
- Integration with report cards for promotion criteria

## Features
- Batch student promotion by class
- Individual student promotion/retention
- Promotion criteria validation (grades, attendance, fees)
- Promotion history tracking
- Class reassignment after promotion

## Database Entities
- `PromotionRecord` — id, schoolId, studentId, fromClassId, toClassId, fromAcademicYearId, toAcademicYearId, status, promotedAt, remarks

## Permissions
- `ADMIN`: Manage promotion
- `REGISTRAR`: Process promotions

## Related Documents
- `backend/src/report-card/promotion.controller.ts`
- `frontend/src/lib/api/reporting.ts`
