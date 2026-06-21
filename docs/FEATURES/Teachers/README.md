# Teachers Module

> Purpose: Teacher profile management, subject assignment, and academic workload tracking.

---

## Responsibilities
- Teacher profile creation and management
- Subject assignment to teachers
- Class-subject-teacher mapping
- Teacher workload tracking

## Features
- Teacher profiles with personal, academic, and employment info
- Subject specialization tracking
- Class-subject assignment (what teacher teaches which subject to which class)
- Teacher dashboard with assigned classes and schedules

## Database Entities
- `TeacherProfile` — id, schoolId, userId, firstName, lastName, specialization, phone, address, hireDate
- `TeacherSubjectAssignment` — id, schoolId, teacherId, subjectId
- `ClassSubject` — id, schoolId, classId, sectionId, subjectId, teacherId

## Permissions
- `ADMIN`: Create/manage teacher profiles, assign subjects
- `TEACHER`: View own profile, assigned classes

## Related Documents
- `docs/FEATURES/Staff/README.md` — Non-teaching staff
- `backend/src/teacher/` — Implementation
- `frontend/src/lib/api/teachers.ts` — API client
