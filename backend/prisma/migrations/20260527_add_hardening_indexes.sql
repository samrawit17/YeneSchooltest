CREATE INDEX IF NOT EXISTS "StudentProfile_schoolId_enrollmentStatus_academicYear_idx"
  ON "StudentProfile" ("schoolId", "enrollmentStatus", "academicYear");

CREATE INDEX IF NOT EXISTS "StudentProfile_schoolId_className_section_academicYear_idx"
  ON "StudentProfile" ("schoolId", "className", "section", "academicYear");

CREATE INDEX IF NOT EXISTS "Enrollment_schoolId_status_academicYear_idx"
  ON "Enrollment" ("schoolId", "status", "academicYear");

CREATE INDEX IF NOT EXISTS "Enrollment_studentId_academicYear_idx"
  ON "Enrollment" ("studentId", "academicYear");

CREATE INDEX IF NOT EXISTS "ClassSubject_classId_subjectId_idx"
  ON "ClassSubject" ("classId", "subjectId");

CREATE INDEX IF NOT EXISTS "ClassSubject_teacherId_academicYear_idx"
  ON "ClassSubject" ("teacherId", "academicYear");

CREATE INDEX IF NOT EXISTS "Grade_schoolId_academicYear_term_idx"
  ON "Grade" ("schoolId", "academicYear", "term");

CREATE INDEX IF NOT EXISTS "Grade_schoolId_studentId_academicYear_term_idx"
  ON "Grade" ("schoolId", "studentId", "academicYear", "term");

CREATE INDEX IF NOT EXISTS "Assessment_schoolId_status_startDate_idx"
  ON "Assessment" ("schoolId", "status", "startDate");

CREATE INDEX IF NOT EXISTS "Assessment_schoolId_type_status_idx"
  ON "Assessment" ("schoolId", "type", "status");

CREATE INDEX IF NOT EXISTS "Attendance_schoolId_date_idx"
  ON "Attendance" ("schoolId", "date");

CREATE INDEX IF NOT EXISTS "Attendance_schoolId_studentId_date_idx"
  ON "Attendance" ("schoolId", "studentId", "date");
