CREATE INDEX IF NOT EXISTS "StudentFee_school_academic_status_updated_idx"
ON "StudentFee" ("schoolId", "academicYearId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "StudentFee_school_academic_term_status_idx"
ON "StudentFee" ("schoolId", "academicYearId", "termId", "status");

CREATE INDEX IF NOT EXISTS "Payment_school_payment_date_idx"
ON "Payment" ("schoolId", "paymentDate");

CREATE INDEX IF NOT EXISTS "Payment_school_student_payment_date_idx"
ON "Payment" ("schoolId", "studentId", "paymentDate");

CREATE INDEX IF NOT EXISTS "Notification_school_user_read_created_idx"
ON "Notification" ("schoolId", "userId", "isRead", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_school_read_created_idx"
ON "Notification" ("schoolId", "isRead", "createdAt");
