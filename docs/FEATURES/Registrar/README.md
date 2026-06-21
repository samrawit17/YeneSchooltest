# Registrar Module

> Purpose: Registrar operations for enrollment, records, and document management.

---

## Responsibilities
- Student enrollment processing and approval
- Academic records management
- Document verification
- National exam registration and results
- School leaving certificate processing

## Features
- Enrollment request review (PENDING → APPROVED/REJECTED)
- Student document management and verification
- National exam registration (Grade 6, 8, 12)
- National exam results import
- School leaving certificate generation
- Transcript generation
- Student record maintenance

## Database Entities
- `EnrollmentRequest` — id, schoolId, studentName, grade, previousSchool, documents, status
- `Enrollment` — id, schoolId, studentId, enrollmentDate, status
- `NationalExamResult` — id, schoolId, studentId, year, type, totalScore, status
- `NationalExamResultBatch` — id, schoolId, year, source, status
- `Document` — id, schoolId, entityType, entityId, type, url

## Permissions
- `REGISTRAR`: Full registrar operations
- `ADMIN`: Oversight

## Related Documents
- `backend/src/registrar/`
- `backend/src/enrollment/`
- `frontend/src/app/(dashboard)/registrar/`
- `docs/FEATURES/Enrollment/README.md`
