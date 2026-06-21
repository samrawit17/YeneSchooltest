# Class-Subject Module

> Purpose: Linking subjects to classes and sections with teacher assignment.

---

## Responsibilities
- Assign subjects to class-section combinations
- Assign teachers to class-subject combinations
- Bulk assignment operations
- Schedule validation

## Features
- Subject-class-section-teacher mapping
- Bulk assign teachers to multiple sections
- Validation to prevent scheduling conflicts
- ClassSubject CRUD with teacher assignment

## Database Entities
- `ClassSubject` — id, schoolId, classId, sectionId, subjectId, teacherId, academicYearId
- `TeacherSubjectAssignment` — id, schoolId, teacherId, subjectId, classId, sectionId, academicYearId

## Permissions
- `ADMIN`: Manage class-subject assignments
- `TEACHER`: View own assignments

## Related Documents
- `backend/src/class-subject/`
- `docs/FEATURES/Sections/README.md`
- `docs/FEATURES/Subjects/README.md`
