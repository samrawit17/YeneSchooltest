# Students Module

> Purpose: Student profile management, enrollment, academic tracking, and document management.

---

## Responsibilities
- Student profile creation and management
- Student enrollment (self-service + admin)
- Class assignment and academic tracking
- Student code generation
- Document upload and management
- Bulk student import via CSV/Excel

## Features
- Full student profiles with personal, academic, and contact info
- Self-enrollment with approval workflow (PENDING → APPROVED/REJECTED)
- Admin-initiated enrollment
- Student code generation (configurable prefix + school-specific sequence)
- Document management (photos, transcripts, certificates)
- Bulk import via CSV/Excel
- Student class assignment per academic year
- Parent linking (multiple parents per student)

## Business Rules
- Student code is unique per school per academic year
- Enrollment requires approval before profile/user creation
- Student can only be in one active class per academic year
- Parent can be linked to multiple children

## Database Entities
- `StudentProfile` — id, schoolId, firstName, lastName, dateOfBirth, gender, studentCode, address, phone, photoUrl
- `StudentClass` — id, schoolId, studentId, classId, academicYearId
- `EnrollmentRequest` — id, schoolId, studentName, grade, previousSchool, status (PENDING/APPROVED/REJECTED), documents
- `Enrollment` — id, schoolId, studentId, enrollmentDate, status
- `ParentStudent` — id, schoolId, parentId, studentId, relationship
- `Document` — id, schoolId, entityType, entityId, type, url

## Permissions
- `ADMIN`: Full student management
- `REGISTRAR`: Create/update students, manage enrollment
- `TEACHER`: View students in assigned classes
- `PARENT`: View linked children
- `STUDENT`: View own profile

## Workflows
```
Self-Enrollment:
  Student fills form → EnrollmentRequest (PENDING)
    → Admin/Registrar reviews → Approve/Reject
      → If approved: StudentProfile created → User created → StudentClass created

Admin Enrollment:
  Admin fills student form
    → StudentProfile created → User created → Class assigned
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /students | List students (filtered by schoolId) |
| POST | /students | Create student |
| GET | /students/:id | Get student details |
| PATCH | /students/:id | Update student |
| POST | /students/bulk | Bulk import |
| GET | /enrollment-requests | List enrollment requests |
| POST | /enrollment-requests/:id/approve | Approve enrollment |
| POST | /enrollment-requests/:id/reject | Reject enrollment |

## Related Documents
- `docs/BUSINESS_RULES.md` (Section 3) — Enrollment rules
- `docs/FEATURES/Parents/README.md` — Parent linking
- `backend/src/student/` — Implementation
- `backend/src/enrollment/` — Enrollment implementation
- `frontend/src/lib/api/students.ts` — API client
